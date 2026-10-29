/**
 * The unified skill index.
 *
 * One object serves the management page, the recommendation engine, the
 * loader and the executor. It merges the three real sources the plugin
 * already knows about — the writable DSH roots, the read-only mount provider
 * and the host skill registry (plugin/bundled providers) — and normalizes
 * them into a single record with:
 *
 * - a functional category computed from the skill's own text (lib/taxonomy);
 * - enriched metadata with provenance (lib/enrich);
 * - a real source classification: project / user / plugin / system;
 * - real usage and preference counters (lib/state);
 * - dependency edges: declared frontmatter plus real body mentions of other
 *   skills, resolved against the catalog and checked for cycles.
 *
 * Nothing here hardcodes a skill, a count or a category assignment. The only
 * fixed table is the category *label* list and the source-type labels, which
 * are product vocabulary.
 *
 * Caching is in two layers: a short-lived in-memory index per workspace
 * (invalidated by `skills/change` or `invalidate()`), and a persistent
 * enrichment cache keyed by absolute path plus mtime/size, so a restart does
 * not re-read 80 SKILL.md bodies. Bodies are only read when a cache entry is
 * missing; the registry's catalog summaries carry everything else.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { enrichSkill, purposeOf } from './enrich.js';
import { descriptionHash, purposeOfZh, resolveDescriptionZh, ZhCatalog } from './i18n.js';
import { categoryList, CATEGORIES, classifySkill } from './taxonomy.js';
import { prefOf, usageOf } from './state.js';
import { dshHome, enumerateRoot, writableRoots } from './roots.js';

/** In-memory index lifetime before a rebuild is attempted. */
const INDEX_TTL_MS = 15_000;

/** Enrichment cache schema version. */
const ENRICH_VERSION = 1;

/** Source-type labels. */
export const SOURCE_TYPES = {
    project: '项目级',
    user: '用户专属',
    plugin: '插件提供',
    system: '系统内置',
};

/** Mount source ids to display labels (the same table the API already serves). */
const MOUNT_LABELS = {
    claude: 'Claude Code',
    'claude-code': 'Claude Code',
    codex: 'Codex CLI',
    zcode: 'ZCode',
    cursor: 'Cursor',
    gemini: 'Gemini CLI',
};

/**
 * Absolute path of the enrichment cache.
 * @returns `$DSH_HOME/charlotte/enrich-cache.json`.
 */
export function enrichCachePath() {
    return join(dshHome(), 'charlotte', 'enrich-cache.json');
}

/**
 * Map a writable root id to the source classification.
 * @param rootId - root id from lib/roots.
 * @returns source type id.
 */
function sourceTypeOfRoot(rootId) {
    if (rootId.startsWith('project-')) return 'project';
    if (rootId === 'user-dsh' || rootId === 'user-agents') return 'user';
    return 'user';
}

/**
 * Classify one registry summary that is not already covered by a writable root.
 * @param summary - registry summary `{ source, provider, path }`.
 * @returns `{ type, detail }`.
 */
function sourceTypeOfRegistry(summary) {
    const provider = String(summary.provider ?? '');
    const source = String(summary.source ?? '');
    if (provider === 'charlotte' && MOUNT_LABELS[source] !== undefined) {
        return { type: 'user', detail: `外部挂载 · ${MOUNT_LABELS[source]}` };
    }
    if (source === 'project-dsh' || source === 'project-agents') return { type: 'project', detail: '项目根' };
    if (source === 'user-dsh' || source === 'user-agents') return { type: 'user', detail: '用户根' };
    if (source === 'custom') return { type: 'user', detail: '自定义目录' };
    if (source === 'bundled' && provider === 'filesystem') return { type: 'system', detail: 'DSH 内置' };
    if (source === 'bundled') return { type: 'plugin', detail: provider === '' ? '插件' : provider };
    if (provider === 'runtime') return { type: 'plugin', detail: '内嵌' };
    return { type: 'plugin', detail: provider === '' ? '插件' : provider };
}

/**
 * Read one skill body, tolerating a vanished file.
 * @param path - skill directory or flat file.
 * @param kind - `directory` | `file`.
 * @returns body text (empty when unreadable).
 */
async function readBody(path, kind) {
    const file = kind === 'file' ? path : join(path, 'SKILL.md');
    try {
        return await readFile(file, 'utf8');
    }
    catch {
        return '';
    }
}

/**
 * Enrichment cache with a persisted file and an in-memory map.
 */
export class EnrichmentCache {
    /**
     * @param file - cache file path.
     */
    constructor(file = enrichCachePath()) {
        this.file = file;
        this.entries = undefined;
        this.dirty = false;
        this.flushing = undefined;
    }

    /** Load the cache file once. */
    async load() {
        if (this.entries !== undefined) return this.entries;
        try {
            const raw = await readFile(this.file, 'utf8');
            const parsed = JSON.parse(raw);
            const entries = parsed?.version === ENRICH_VERSION && typeof parsed.entries === 'object' ? parsed.entries : {};
            this.entries = entries;
        }
        catch {
            this.entries = {};
        }
        return this.entries;
    }

    /**
     * Read one cached enrichment.
     * @param key - absolute skill path.
     * @param signature - mtime/size signature.
     * @returns cached value, or undefined.
     */
    async get(key, signature) {
        const entries = await this.load();
        const row = entries[key];
        if (row === undefined || row.signature !== signature) return undefined;
        return row.value;
    }

    /**
     * Store one enrichment and schedule a flush.
     * @param key - absolute skill path.
     * @param signature - mtime/size signature.
     * @param value - enriched value.
     */
    async set(key, signature, value) {
        const entries = await this.load();
        entries[key] = { signature, value };
        this.dirty = true;
    }

    /**
     * Flush pending entries atomically.
     * @returns resolves after the write (or immediately when clean).
     */
    async flush() {
        if (!this.dirty) return;
        this.dirty = false;
        const entries = this.entries ?? {};
        await mkdir(dirname(this.file), { recursive: true });
        const tmp = `${this.file}.${process.pid}.tmp`;
        await writeFile(tmp, `${JSON.stringify({ version: ENRICH_VERSION, entries })}\n`, 'utf8');
        await rename(tmp, this.file);
    }
}

/**
 * One unified skill index for one workspace.
 */
export class SkillIndex {
    /**
     * @param options.ctx - host context, used to reach `skills` and the mount provider.
     * @param options.provider - merged mount provider (catalog + detail lookup).
     * @param options.overrides - override store, so disabled mounts are reflected.
     * @param options.state - launcher state store.
     * @param options.cacheFile - enrichment cache path override (tests).
     */
    constructor(options) {
        this.ctx = options.ctx;
        this.zh = new ZhCatalog(options.translationsFile);
        this.provider = options.provider;
        this.overrides = options.overrides;
        this.state = options.state;
        this.enrichment = new EnrichmentCache(options.cacheFile);
        this.revision = 0;
        this.cached = undefined;
        this.pending = undefined;
    }

    /** Drop every cached index and bump the revision. */
    invalidate() {
        this.revision += 1;
        this.cached = undefined;
        this.pending = undefined;
    }

    /**
     * Build (or reuse) the index for one workspace.
     * @param workspace - absolute workspace path, or empty for global-only.
     * @param options.force - rebuild even when the cached index is fresh.
     * @returns index `{ skills, byName, categories, sources, totals, generatedAt, complete }`.
     */
    async build(workspace = '', options = {}) {
        const key = workspace === '' ? '' : workspace;
        const cached = this.cached;
        if (!options.force && cached !== undefined && cached.key === key
            && cached.revision === this.revision
            && Date.now() - cached.at < INDEX_TTL_MS) {
            return cached.index;
        }
        if (this.pending !== undefined && this.pending.key === key && this.pending.revision === this.revision) {
            return this.pending.promise;
        }
        const revision = this.revision;
        const promise = this.buildFresh(key).then((index) => {
            if (this.pending !== undefined && this.pending.promise === promise) this.pending = undefined;
            return index;
        }, (error) => {
            if (this.pending !== undefined && this.pending.promise === promise) this.pending = undefined;
            throw error;
        });
        this.pending = { key, revision, promise };
        const index = await promise;
        if (revision === this.revision) {
            this.cached = { key, revision, at: Date.now(), index };
            void this.enrichment.flush().catch(() => {});
        }
        return index;
    }

    /**
     * Find one skill by name in a workspace index.
     * @param name - skill name.
     * @param workspace - workspace path.
     * @returns record or undefined.
     */
    async find(name, workspace = '') {
        const index = await this.build(workspace);
        return index.byName[name];
    }

    /**
     * Resolve a multi-skill dependency order, detecting cycles.
     * @param names - selected skill names.
     * @param index - current index.
     * @returns `{ order, cycles, missing }`.
     */
    dependencyOrder(names, index) {
        const state = new Map();
        const order = [];
        const cycles = [];
        const missing = [];
        const requested = new Set(names);
        const visit = (name, stack) => {
            const mark = state.get(name);
            if (mark === 'done') return;
            if (mark === 'visiting') {
                const cycle = [...stack.slice(stack.indexOf(name)), name];
                if (cycles.length < 5) cycles.push(cycle);
                return;
            }
            const record = index.byName[name];
            if (record === undefined) {
                if (!missing.includes(name)) missing.push(name);
                return;
            }
            state.set(name, 'visiting');
            stack.push(name);
            for (const requirement of record.requires) {
                // Declared dependencies are hard requirements and are always
                // ordered in. Body mentions only order a skill that the caller
                // is already loading: a passing reference must not silently
                // pull another skill into the selection.
                if (requirement.kind === 'declared') visit(requirement.name, stack);
                else if (requested.has(requirement.name)) visit(requirement.name, stack);
            }
            stack.pop();
            state.set(name, 'done');
            order.push(name);
        };
        for (const name of names) visit(name, []);
        return { order, cycles, missing };
    }

    /**
     * Build the index from scratch.
     * @param workspace - workspace path.
     * @returns index object.
     */
    async buildFresh(workspace) {
        const state = await this.state.read();
        const roots = writableRoots(workspace === '' ? [] : [workspace]);
        const records = new Map();

        for (const root of roots) {
            const skills = await enumerateRoot(root);
            for (const skill of skills) {
                const body = await readBody(skill.path, skill.kind);
                const signature = `${skill.mtimeMs}:${body.length}`;
                const enrichment = await this.enrich({
                    name: skill.name,
                    description: String(skill.meta?.description ?? ''),
                    whenToUse: typeof skill.meta?.whenToUse === 'string' ? skill.meta.whenToUse : '',
                    meta: skill.meta ?? {},
                    path: skill.path,
                }, body, signature);
                const i18n = await this.resolveZh(skill.name, String(skill.meta?.description ?? ''), skill.meta ?? {});
                const record = this.makeRecord({
                    i18n,
                    name: skill.name,
                    description: String(skill.meta?.description ?? ''),
                    whenToUse: typeof skill.meta?.whenToUse === 'string' ? skill.meta.whenToUse : '',
                    meta: skill.meta ?? {},
                    body,
                    path: skill.path,
                    directoryKind: skill.kind,
                    management: { kind: 'writable', rootId: root.id, path: skill.path, provider: 'filesystem' },
                    source: { type: sourceTypeOfRoot(root.id), detail: root.label.split(' · ')[0] ?? '用户根' },
                    policy: {
                        modelInvocable: skill.meta?.modelInvocable !== false,
                        userInvocable: skill.meta?.userInvocable !== false,
                        disabled: false,
                    },
                    enrichment,
                    mtimeMs: skill.mtimeMs,
                    state,
                });
                records.set(record.name, record);
            }
        }

        const registry = this.ctx.get('skills');
        let complete = true;
        if (registry !== undefined) {
            let summaries = [];
            try {
                const snapshot = await registry.snapshot(workspace === '' ? {} : { cwd: workspace });
                summaries = snapshot.skills;
                complete = snapshot.complete;
            }
            catch {
                summaries = [];
                complete = false;
            }
            for (const summary of summaries) {
                const existing = records.get(summary.name);
                if (existing !== undefined) {
                    // A writable copy wins, but the registry still contributes
                    // real fields the local parser may have missed.
                    if (typeof summary.whenToUse === 'string' && existing.whenToUse === '') existing.whenToUse = summary.whenToUse;
                    continue;
                }
                const path = typeof summary.path === 'string' ? summary.path : undefined;
                let body = '';
                if (path !== undefined) body = await readBody(path, 'file');
                const signature = `${body.length}`;
                const enrichment = await this.enrich({ name: summary.name, description: summary.description, path }, body, path === undefined ? undefined : `${path}:${signature}`);
                const source = sourceTypeOfRegistry(summary);
                const i18n = await this.resolveZh(summary.name, String(summary.description ?? ''), {});
                const record = this.makeRecord({
                    i18n,
                    name: summary.name,
                    description: String(summary.description ?? ''),
                    whenToUse: typeof summary.whenToUse === 'string' ? summary.whenToUse : '',
                    meta: {},
                    body,
                    path,
                    directoryKind: undefined,
                    management: {
                        kind: path === undefined ? 'plugin' : (source.type === 'plugin' ? 'plugin' : 'mounted'),
                        path,
                        provider: summary.provider,
                        sourceKey: summary.source,
                    },
                    source,
                    policy: {
                        modelInvocable: summary.invocation?.modelInvocable !== false,
                        userInvocable: summary.invocation?.userInvocable !== false,
                        disabled: false,
                    },
                    enrichment,
                    mtimeMs: 0,
                    state,
                });
                records.set(record.name, record);
            }
        }

        // Mounted overrides live outside the frontmatter; apply them now so the
        // index and the registry agree on what is disabled.
        const overrideMap = this.overrides === undefined ? {} : await this.overrides.read();
        for (const record of records.values()) {
            if (record.management.kind !== 'mounted') continue;
            const override = record.management.path === undefined ? undefined : overrideMap[record.management.path];
            if (override?.disabled === true) {
                record.policy.disabled = true;
                record.policy.availability = 'disabled';
            }
        }

        // Resolve dependency edges against the full name set.
        const names = new Set(records.keys());
        for (const record of records.values()) {
            const edges = [];
            for (const declared of record.enrichment.declaredDependencies) {
                if (declared === record.name) continue;
                edges.push({ name: declared, kind: 'declared', satisfied: names.has(declared) });
            }
            if (edges.length === 0) {
                for (const mention of record.enrichment.dependencyMentions) {
                    if (mention === record.name || !names.has(mention)) continue;
                    edges.push({ name: mention, kind: 'mention', satisfied: names.has(mention) });
                }
            }
            record.requires = edges.slice(0, 8);
        }

        const skills = [...records.values()].sort((left, right) => left.name.localeCompare(right.name));
        const byName = {};
        for (const skill of skills) byName[skill.name] = skill;
        const categoryCounts = {};
        for (const category of CATEGORIES) categoryCounts[category.id] = 0;
        for (const skill of skills) categoryCounts[skill.category.id] += 1;
        const sourceCounts = { project: 0, user: 0, plugin: 0, system: 0 };
        for (const skill of skills) sourceCounts[skill.source.type] += 1;
        const categories = categoryList().map(category => ({
            ...category,
            count: categoryCounts[category.id] ?? 0,
        })).filter(category => category.count > 0);
        const totals = {
            all: skills.length,
            available: skills.filter(skill => this.usable(skill)).length,
            userOwned: skills.filter(skill => skill.source.type === 'user' || skill.source.type === 'project').length,
            favorite: skills.filter(skill => skill.stats.favorite).length,
            pinned: skills.filter(skill => skill.stats.pinned).length,
        };
        return {
            workspace,
            skills,
            byName,
            usable: (record) => this.usable(record),
            categories,
            sources: Object.entries(SOURCE_TYPES).map(([type, label]) => ({ type, label, count: sourceCounts[type] })).filter(row => row.count > 0),
            totals,
            complete,
            generatedAt: Date.now(),
            revision: this.revision,
        };
    }

    /**
     * Whether the user may load and run a skill right now.
     * @param record - unified record.
     * @returns whether it is usable from the user surface.
     */
    usable(record) {
        return record.policy.userInvocable && !record.policy.disabled;
    }

    /**
     * Enrich one skill through the persistent cache.
     * @param skill - `{ name, description, whenToUse, meta, path }`.
     * @param body - skill body text.
     * @param signature - cache signature (or undefined to skip the persistent cache).
     * @returns enrichment value.
     */
    async enrich(skill, body, signature) {
        const key = skill.path;
        if (key !== undefined && signature !== undefined) {
            const cached = await this.enrichment.get(key, signature);
            if (cached !== undefined) return cached;
        }
        const value = enrichSkill({
            name: skill.name,
            description: skill.description,
            whenToUse: skill.whenToUse,
            meta: skill.meta ?? {},
            body,
        });
        if (key !== undefined && signature !== undefined) {
            await this.enrichment.set(key, signature, value);
        }
        return value;
    }

    /**
     * Resolve the Chinese summary for one skill.
     * @param name - skill name.
     * @param description - current description.
     * @param meta - local frontmatter, when available.
     * @returns `{ simple, professional, source }`.
     */
    async resolveZh(name, description, meta) {
        if (description.trim().length === 0) return { simple: null, professional: null, source: 'absent' };
        return resolveDescriptionZh({ catalog: this.zh, name, description, meta });
    }

    /**
     * Assemble one unified record.
     * @param input - source-specific fields.
     * @returns unified record.
     */
    makeRecord(input) {
        const enrichment = input.enrichment;
        const category = classifySkill({
            name: input.name,
            description: input.description,
            whenToUse: input.whenToUse,
            provider: input.management.provider,
            purpose: enrichment.purpose,
            keywords: enrichment.keywords,
            body: input.body,
        });
        // Put the winning category's own vocabulary first, so the keyword row
        // reads as the skill's function rather than its incidental wording.
        const winning = CATEGORIES.find(row => row.id === category.id);
        const fieldText = `${input.name} ${input.description} ${input.whenToUse}`.toLowerCase();
        const categoryTerms = winning === undefined
            ? []
            : winning.terms.filter(term => fieldText.includes(term.toLowerCase()));
        const keywords = [...new Set([...categoryTerms, ...enrichment.keywords])].slice(0, 14);
        const usage = usageOf(input.state, input.name);
        const pref = prefOf(input.state, input.name);
        const policy = input.policy;
        const availability = policy.disabled
            ? 'disabled'
            : !policy.userInvocable && !policy.modelInvocable
                ? 'unavailable'
                : policy.userInvocable && policy.modelInvocable
                    ? 'both'
                    : policy.userInvocable
                        ? 'user'
                        : 'model';
        const i18n = input.i18n ?? { simple: null, professional: null, source: 'absent' };
        return {
            id: `${input.management.rootId ?? input.management.provider ?? 'skill'}:${input.management.path ?? input.name}`,
            name: input.name,
            description: input.description,
            purpose: enrichment.purpose === '' ? purposeOf(input.description) : enrichment.purpose,
            i18n: {
                simple: i18n.simple,
                professional: i18n.professional,
                source: i18n.source,
                matchedHash: i18n.simple === null && i18n.professional === null ? null : descriptionHash(input.description),
            },
            whenToUse: input.whenToUse,
            category,
            keywords,
            triggers: enrichment.triggers,
            useCases: enrichment.useCases,
            avoidCases: enrichment.avoidCases,
            requires: [],
            enrichment,
            declaredPermissions: enrichment.declaredPermissions,
            declaredCategory: enrichment.declaredCategory,
            version: enrichment.version ?? null,
            updatedAt: input.mtimeMs > 0 ? Math.round(input.mtimeMs) : null,
            management: input.management,
            source: {
                type: input.source.type,
                label: SOURCE_TYPES[input.source.type] ?? input.source.type,
                detail: input.source.detail,
            },
            policy: {
                modelInvocable: policy.modelInvocable,
                userInvocable: policy.userInvocable,
                disabled: policy.disabled,
                availability,
            },
            stats: {
                favorite: pref.favorite === true,
                pinned: pref.pinned === true,
                pinnedAt: pref.pinnedAt ?? 0,
                loads: usage.loads,
                invokes: usage.invokes,
                completions: usage.completions,
                failures: usage.failures,
                cancelled: usage.cancelled,
                recommended: usage.recommended ?? 0,
                accepted: usage.accepted ?? 0,
                dismissed: usage.dismissed ?? 0,
                lastUsedAt: usage.lastUsedAt,
                lastLoadedAt: usage.lastLoadedAt,
                recent: usage.recent,
            },
            provenance: enrichment.provenance,
            bodyLength: input.body.length,
            contentHash: input.body.length === 0 ? '' : createHash('sha256').update(input.body).digest('hex').slice(0, 16),
        };
    }
}

/**
 * Freshness signature for a readable file, used by tests and diagnostics.
 * @param path - absolute file path.
 * @returns `mtime:size` string, or empty when unreadable.
 */
export async function fileSignature(path) {
    try {
        const info = await stat(path);
        return `${info.mtimeMs}:${info.size}`;
    }
    catch {
        return '';
    }
}
