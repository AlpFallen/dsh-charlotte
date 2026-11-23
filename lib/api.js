/**
 * HTTP API: route dispatch, request validation, and same-origin enforcement
 * for the `/charlotte/api` prefix. All handlers answer JSON; mutating
 * methods require a same-origin or non-browser request.
 *
 * The merged plugin serves three data sets:
 * - writable dsh roots and their skills (`/roots`, `/skills`, `/skill`),
 *   plus install/toggle/delete/trash — unchanged station surface;
 * - mounted external skills (`/catalog`, `/catalog-skill`) read from the
 *   merged provider instead of the retired copy-import scanner;
 * - mounted-skill switches (`/override`) stored in the dsh-side override file.
 */
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { lstat, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { readSkillMeta, setFlag, splitFrontmatter } from './frontmatter.js';
import { isSafeSkillKey, recordActivity, recordReview, recordUsage, sanitizeTags } from './state.js';
import { buildLedger } from './ledger.js';
import { inspectSkill } from './inspect.js';
import { migrateToSharedPool, MigrationRefused } from './pool.js';
import { installUpload, MAX_FILE_BYTES, MAX_LOCAL_DEPTH, MAX_LOCAL_FILES, MAX_TOTAL_BYTES, MAX_UPLOAD_FILES, readSkillDirectory } from './importer.js';
import { agentsHome, assertContained, assertContainedReal, assertRealContained, assertSafeRelative, enumerateRoot, rootById, writableRoots } from './roots.js';
import { auditRelativePath, isSensitivePath, isWithin } from './security/path-audit.js';
import { emptyTrash, listTrash, moveToTrash, restoreTrash, trashDir, trashPayloadPath } from './trash.js';
import { openZipArchive, zipToUploadFiles } from './zip.js';
const DEFAULT_MAX_BODY_BYTES = 64 * 1024 * 1024;
const API_PREFIX = '/charlotte/api';
/** Routes that only exist as POST mutations. */
const POST_ONLY = new Set([
    '/tags', '/migrate', '/review',
    '/security/scan', '/security/cancel', '/security/finding',
    '/security/fix/preview', '/security/fix/apply',
]);
/**
 * The plugin version reported by `/config`, read from the package manifest so
 * it cannot drift from the published version. A missing manifest is not fatal:
 * the launcher never gates behaviour on this value.
 * @returns package version, or `0.0.0` when unreadable.
 */
const PLUGIN_VERSION = (() => {
    try {
        const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
        return typeof manifest.version === 'string' && manifest.version !== '' ? manifest.version : '0.0.0';
    }
    catch {
        return '0.0.0';
    }
})();
/** Human labels for the external mount sources. */
const SOURCE_LABELS = {
    claude: 'Claude Code',
    codex: 'Codex CLI',
    zcode: 'ZCode',
    cursor: 'Cursor',
    gemini: 'Gemini CLI',
};
/**
 * Source list for the client, derived from the merged config.
 * @param config - resolved merged configuration.
 * @returns enabled sources with display labels.
 */
function sourceList(config) {
    const sources = [];
    for (const [id, option] of Object.entries(config.sources ?? {})) {
        if (option?.enabled === true)
            sources.push({ id, label: SOURCE_LABELS[id] ?? id });
    }
    return sources;
}
/**
 * Build the prefix handler serving the station API.
 * @param ctx - host context; workspace and skill services are read lazily.
 * @param config - resolved merged configuration.
 * @param provider - merged provider, used for the mounted-skill catalog.
 * @returns the node:http handler for the `/charlotte/api` prefix route.
 */
export function makeApiHandler(ctx, config, provider, services = {}) {
    const maxBodyBytes = DEFAULT_MAX_BODY_BYTES;
    /**
     * Log one management event. Bookkeeping only: skill names, roots, statuses
     * and a clipped reason; never file contents, tokens or credentials.
     * @param event - short event name.
     * @param detail - extra non-sensitive context.
     */
    const logEvent = (event, detail = '') => {
        try {
            const line = `dsh-charlotte: ${event}${detail === '' ? '' : ` ${detail}`}`;
            if (event.includes('failed') || event.includes('refused') || event.includes('skipped'))
                ctx.logger?.warn?.(line);
            else
                ctx.logger?.info?.(line);
        }
        catch {
            // Logging must never break a request.
        }
    };
    /**
     * Append one management operation to the persistent activity log. Best
     * effort: a broken log must not fail the operation itself.
     * @param kind - install | delete | migrate.
     * @param name - skill name.
     * @param ok - success flag.
     * @param detail - short reason or status, never file contents.
     */
    const noteActivity = async (kind, name, ok, detail = '') => {
        if (state === undefined) return;
        try {
            await state.update((draft) => recordActivity(draft, kind, name, ok, detail));
        }
        catch {
            // Activity logging is bookkeeping only.
        }
    };
    /**
     * The services the new endpoints need. They are injected by lib/index.js;
     * the old endpoints still work without them (the hermetic host smoke test
     * constructs the handler directly).
     */
    const index = services.index;
    const state = services.state;
    const security = services.security;
    const recommender = services.recommender;
    const recommendConfig = services.recommendConfig ?? { enabled: false, maxItems: 1 };
    const pending = services.pending ?? new Map();
    /**
     * The latest conversation-derived recommendation per session. Unlike
     * `pending` (which the dock consumes once it shows the card) this record is
     * kept so the launcher's recommendation home can still explain the current
     * task when the user opens the management page.
     */
    const latest = services.latest ?? new Map();
    /**
     * Scan a newly installed skill once and save its risk level against the
     * current review hash. The first-use gate still decides whether to allow
     * it; this only makes the risk visible before the user opens the detail.
     * @param outcome - install outcome.
     * @param workspace - install workspace scope.
     */
    const reviewInstalled = async (outcome, workspace) => {
        if (state === undefined || index === undefined) return;
        if (typeof outcome.targetPath !== 'string' || outcome.targetPath === '') return;
        try {
            const report = await inspectSkill({ path: outcome.targetPath, name: String(outcome.name ?? '') });
            const built = await index.build(workspace ?? '');
            const record = built.byName[String(outcome.name ?? '')];
            if (record === undefined || typeof record.reviewHash !== 'string') return;
            const level = report.security?.level === 'high'
                ? 'high'
                : report.security?.level === 'warn' || report.quality?.level === 'error' || report.quality?.level === 'warn'
                    ? 'warn'
                    : 'ok';
            await state.update((draft) => recordReview(draft, record.name, record.reviewHash, null, level));
            index.invalidate();
        }
        catch {
            // Scanning is best effort; the first-use gate still applies.
        }
    };
    /**
     * Finish one install: refresh the index, record the same log/activity
     * shape for upload, local-path and ZIP installs, and scan once.
     * @param outcome - install outcome.
     * @param root - destination root.
     * @param label - route label for the log line.
     * @param workspace - install workspace scope.
     */
    const finishInstall = async (outcome, root, label, workspace) => {
        logEvent(`${label} ${String(outcome.status)}`, `${String(outcome.name ?? '')} -> ${root.id}${outcome.error === undefined ? '' : ` (${String(outcome.error).slice(0, 200)})`}`);
        void noteActivity('install', String(outcome.name ?? ''), outcome.status !== 'skipped', String(outcome.status) + (outcome.error === undefined ? '' : ': ' + String(outcome.error)));
        await reviewInstalled(outcome, workspace);
        if (index !== undefined)
            index.invalidate();
    };
    /**
     * Load authorizations, so `/event` can only confirm a load that this host
     * actually authorized for that session and skill.
     */
    const authorizations = new Map();
    const AUTHORIZATION_TTL_MS = 2 * 60 * 1000;
    const authorize = (sessionId, name) => {
        const now = Date.now();
        let row = authorizations.get(sessionId);
        if (row === undefined) {
            row = new Map();
            authorizations.set(sessionId, row);
        }
        row.set(name, now);
        if (authorizations.size > 64) {
            const oldest = [...authorizations.entries()].sort((left, right) => {
                const leftAt = Math.max(0, ...[...left[1].values()]);
                const rightAt = Math.max(0, ...[...right[1].values()]);
                return leftAt - rightAt;
            })[0];
            if (oldest !== undefined) authorizations.delete(oldest[0]);
        }
    };
    const authorized = (sessionId, name) => {
        const at = authorizations.get(sessionId)?.get(name);
        return at !== undefined && Date.now() - at <= AUTHORIZATION_TTL_MS;
    };
    const workspaces = () => {
        const registry = ctx.get('workspaceRegistry');
        // `undefined` means this composition has no workspace registry at all
        // (headless); an empty array means a registry with no open workspace,
        // or one whose read failed (deny workspace-scoped paths, do not trust).
        if (registry === undefined)
            return undefined;
        try {
            return registry.list().map(ws => ({ path: ws.path, title: ws.title ?? ws.path }));
        }
        catch {
            // The registry exists but is unavailable. Falling back to
            // `undefined` would silently switch to the headless trust mode and
            // let a client turn any path into a writable root.
            return [];
        }
    };
    const knownWorkspace = (requested) => {
        if (typeof requested !== 'string' || requested.length === 0)
            return undefined;
        const list = workspaces();
        // Without a registry (headless compositions) trust the caller's path.
        // With one, only a real open workspace is accepted: an empty registry
        // must not turn a client-supplied path into a writable root.
        if (list === undefined)
            return requested;
        return list.find(ws => ws.path === requested)?.path;
    };
    const rootsFor = (workspace) => writableRoots(workspace !== undefined ? [workspace] : []);
    const skillRegistry = () => ctx.get('skills');
    const listMounted = async (workspace) => {
        const candidates = await provider.list({ cwd: workspace });
        // Several sources can point at the same real skill (a symlink to
        // ~/.agents copied into both ~/.claude and ~/.zcode, say). The registry
        // dedupes by name and rank; the panel should show one card per file too.
        const byRealPath = new Map();
        for (const candidate of candidates) {
            let real = candidate.path;
            try {
                real = await realpath(candidate.path);
            }
            catch {
                // Vanished between listing and here: fall back to the symlink path.
            }
            const previous = byRealPath.get(real);
            if (previous === undefined || (candidate.rank ?? Number.POSITIVE_INFINITY) < (previous.rank ?? Number.POSITIVE_INFINITY)) {
                byRealPath.set(real, candidate);
            }
        }
        const unique = [...byRealPath.values()].sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0) || left.name.localeCompare(right.name));
        return unique.map(candidate => ({
            name: candidate.name,
            description: candidate.description,
            whenToUse: candidate.whenToUse ?? null,
            invocation: candidate.invocation,
            source: candidate.source,
            provider: candidate.provider,
            rank: candidate.rank ?? null,
            path: candidate.path,
            directory: candidate.locator?.directory ?? null,
            metadata: candidate.metadata ?? {},
        }));
    };
    return async (req, res) => {
        // The local API is served on loopback only. Requiring the Host header
        // to name loopback blocks a DNS-rebinding page, which would otherwise
        // arrive as a same-origin request (its Origin matches its own Host).
        if (!isLoopbackHost(req.headers.host)) {
            return sendJson(res, 403, { error: 'unexpected host' });
        }
        // Optional per-caller token for non-browser integrations. The bundled
        // UI is same-origin and loopback-scoped, so reads stay available; every
        // mutation must present the token when one is configured.
        if (!isAuthorizedCaller(req)) {
            return sendJson(res, 401, { error: 'unauthorized caller' });
        }
        const url = new URL(req.url ?? '/', 'http://localhost');
        const path = url.pathname.startsWith(API_PREFIX) ? url.pathname.slice(API_PREFIX.length) : url.pathname;
        try {
            // Mutation-only routes are rejected here, before the GET fallback
            // turns them into 404 and before readJsonBody can turn a malformed
            // body into 500.
            if (POST_ONLY.has(path) && req.method !== 'POST') {
                res.writeHead(405, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: 'method not allowed' }));
                return;
            }
            if (req.method === 'GET') {
                if (path === '/roots')
                    return sendJson(res, 200, { workspaces: workspaces() ?? [], sources: sourceList(config) });
                if (path === '/skills') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    const roots = rootsFor(workspace);
                    const groups = [];
                    for (const root of roots) {
                        groups.push({ rootId: root.id, label: root.label, path: root.path, workspace: root.workspace ?? null, skills: await enumerateRoot(root) });
                    }
                    const registry = skillRegistry();
                    const catalog = registry !== undefined && workspace !== undefined
                        ? await registry.list({ cwd: workspace })
                        : registry !== undefined ? await registry.list({}) : [];
                    return sendJson(res, 200, { groups, registry: catalog });
                }
                if (path === '/skill') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    const rootId = url.searchParams.get('root') ?? '';
                    const name = url.searchParams.get('name') ?? '';
                    const root = rootById(rootsFor(workspace), rootId);
                    if (root === undefined)
                        return sendJson(res, 404, { error: 'unknown root' });
                    const skill = (await enumerateRoot(root)).find(s => s.name === name);
                    if (skill === undefined)
                        return sendJson(res, 404, { error: 'skill not found' });
                    let readable;
                    try {
                        readable = await assertContainedReal(root, skill.path);
                        if (skill.kind !== 'file') await assertRealContained(root, join(readable, 'SKILL.md'));
                    }
                    catch {
                        return sendJson(res, 403, { error: 'skill path escapes its root' });
                    }
                    return sendJson(res, 200, await skillDetail(readable, skill.kind));
                }
                if (path === '/catalog') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    return sendJson(res, 200, { skills: await listMounted(workspace), sources: sourceList(config) });
                }
                if (path === '/catalog-skill') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    const target = url.searchParams.get('path') ?? '';
                    let candidate = provider.candidateByPath(target);
                    if (candidate === undefined) {
                        await provider.list({ cwd: workspace });
                        candidate = provider.candidateByPath(target);
                    }
                    if (candidate === undefined)
                        return sendJson(res, 404, { error: 'mounted skill not found' });
                    return sendJson(res, 200, await mountedDetail(candidate));
                }
                if (path === '/registry-skill') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    const name = url.searchParams.get('name') ?? '';
                    const registry = skillRegistry();
                    if (registry === undefined)
                        return sendJson(res, 503, { error: 'skill registry unavailable' });
                    const skill = await registry.get(name, workspace !== undefined ? { cwd: workspace } : {});
                    if (skill === undefined || skill === null)
                        return sendJson(res, 404, { error: 'registry skill not found' });
                    // A registry entry that lives in a writable root can be a
                    // symlink to a file outside it. The host registry returns
                    // the body; check the real path before handing it out.
                    if (typeof skill.path === 'string' && skill.path !== '') {
                        const roots = rootsFor(workspace);
                        let root = roots.find(candidate => isWithin(candidate.path, skill.path));
                        if (root === undefined) {
                            // The registry may hand back a real path while the
                            // configured root is a symlink (macOS /var). Match
                            // them after resolving both, then still use the
                            // real-path containment check below.
                            for (const candidate of roots) {
                                try {
                                    const [realRoot, realSkill] = await Promise.all([realpath(candidate.path), realpath(skill.path)]);
                                    if (isWithin(realRoot, realSkill)) {
                                        root = candidate;
                                        break;
                                    }
                                }
                                catch {
                                    // A missing root or path cannot contain it.
                                }
                            }
                        }
                        if (root !== undefined) {
                            try {
                                const real = await assertRealContained(root, skill.path);
                                if ((await lstat(real)).isDirectory()) await assertRealContained(root, join(real, 'SKILL.md'));
                            }
                            catch {
                                return sendJson(res, 403, { error: 'skill path escapes its root' });
                            }
                        }
                    }
                    return sendJson(res, 200, skill);
                }
                if (path === '/trash') {
                    return sendJson(res, 200, { entries: await listTrash() });
                }
                if (path === '/index') {
                    if (index === undefined) return sendJson(res, 503, { error: 'skill index unavailable' });
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined) ?? '';
                    const built = await index.build(workspace);
                    return sendJson(res, 200, {
                        skills: built.skills.map(skill => {
                            const { enrichment, reviewHash, ...rest } = skill;
                            void enrichment;
                            void reviewHash;
                            return rest;
                        }),
                        categories: built.categories,
                        sources: built.sources,
                        totals: built.totals,
                        complete: built.complete,
                        diagnostics: built.diagnostics ?? [],
                        audit: built.audit ?? null,
                        generatedAt: built.generatedAt,
                    });
                }
                if (path === '/config') {
                    return sendJson(res, 200, {
                        recommend: recommendConfig,
                        sources: sourceList(config),
                        version: PLUGIN_VERSION,
                    });
                }
                if (path === '/session-state') {
                    const sessionId = url.searchParams.get('session') ?? '';
                    if (sessionId === '') return sendJson(res, 400, { error: 'session is required' });
                    const entry = pending.get(sessionId);
                    const recent = latest.get(sessionId);
                    return sendJson(res, 200, {
                        sessionId,
                        pending: entry === undefined ? null : entry,
                        latest: recent === undefined ? null : recent,
                        recommend: recommendConfig,
                    });
                }
                if (path === '/home') {
                    if (index === undefined || recommender === undefined) {
                        return sendJson(res, 503, { error: 'recommendation unavailable' });
                    }
                    const sessionId = url.searchParams.get('session') ?? '';
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined) ?? '';
                    const built = await index.build(workspace);
                    const recent = sessionId === '' ? undefined : latest.get(sessionId);
                    if (recent !== undefined) {
                        // Re-resolve against the live index: the page must never
                        // show a skill that was disabled, removed or lost a
                        // dependency since the recommendation was computed.
                        const items = (recent.items ?? []).flatMap((item) => {
                            const record = built.byName[item.name];
                            if (record === undefined) return [];
                            if (!built.usable(record)) return [];
                            if (record.requires.some(requirement => !requirement.satisfied)) return [];
                            return [{
                                ...item,
                                purpose: record.purpose,
                                simple: record.i18n?.simple ?? null,
                                category: record.category,
                                source: record.source,
                                availability: record.policy.availability,
                                requires: record.requires,
                            }];
                        });
                        if (items.length > 0) {
                            return sendJson(res, 200, {
                                source: 'conversation',
                                intent: typeof recent.intent === 'string' ? recent.intent : '',
                                at: typeof recent.at === 'number' ? recent.at : 0,
                                items,
                            });
                        }
                    }
                    const items = recommender.history({ index: built });
                    if (items.length > 0) {
                        return sendJson(res, 200, { source: 'history', intent: '', at: Date.now(), items });
                    }
                    return sendJson(res, 200, {
                        source: 'none',
                        reason: sessionId === '' ? 'no-session' : 'no-history',
                        intent: '',
                        at: Date.now(),
                        items: [],
                    });
                }
                if (path === '/body') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined) ?? '';
                    const name = url.searchParams.get('name') ?? '';
                    if (name === '') return sendJson(res, 400, { error: 'name is required' });
                    if (!isSafeSkillKey(name)) return sendJson(res, 400, { error: 'invalid skill name' });
                    if (index === undefined) return sendJson(res, 503, { error: 'skill index unavailable' });
                    const record = await index.find(name, workspace);
                    if (record === undefined) return sendJson(res, 404, { error: 'skill not found' });
                    const target = record.management?.path;
                    if (typeof target !== 'string') return sendJson(res, 404, { error: 'skill has no readable file' });
                    // Only a path this host already resolved for the record is
                    // readable. Writable records are user-controlled, so they
                    // must stay inside their root; mounted and plugin-provided
                    // paths come from the host's own registry summary.
                    if (!isAbsolute(target)) {
                        return sendJson(res, 403, { error: 'skill path is not absolute' });
                    }
                    let readable = target;
                    if (record.management.kind === 'writable') {
                        const root = rootById(rootsFor(workspace), String(record.management.rootId ?? ''));
                        if (root === undefined) {
                            return sendJson(res, 403, { error: 'skill path escapes its root' });
                        }
                        try {
                            // Separate from the `isAbsolute` check above: this is
                            // the boundary-aware containment used by every write
                            // path, so a sibling directory that only shares a
                            // prefix with the root cannot be read either. It also
                            // resolves symlinks: a linked skill must not turn a
                            // read into access outside the root.
                            readable = await assertContainedReal(root, target);
                            if ((await lstat(readable)).isDirectory()) {
                                await assertRealContained(root, join(readable, 'SKILL.md'));
                            }
                        }
                        catch {
                            return sendJson(res, 403, { error: 'skill path escapes its root' });
                        }
                    }
                    // `kind` is not on the index record; ask the filesystem
                    // instead, so a directory bundle named `foo.md` is read
                    // through its SKILL.md rather than opened as a file.
                    let file = readable;
                    try {
                        if ((await lstat(readable)).isDirectory()) file = join(readable, 'SKILL.md');
                    }
                    catch {
                        return sendJson(res, 404, { error: 'body unreadable' });
                    }
                    try {
                        return sendJson(res, 200, { name, content: await readFile(file, 'utf8') });
                    }
                    catch {
                        return sendJson(res, 404, { error: 'body unreadable' });
                    }
                }
                if (path === '/search') {
                    if (index === undefined || recommender === undefined) {
                        return sendJson(res, 503, { error: 'search unavailable' });
                    }
                    const query = (url.searchParams.get('q') ?? '').trim();
                    if (query === '') return sendJson(res, 400, { error: 'q is required' });
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined) ?? '';
                    const built = await index.build(workspace);
                    const requestedMax = Number(url.searchParams.get('max') ?? '');
                    const result = await recommender.search({
                        index: built,
                        intent: query,
                        max: Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : undefined,
                    });
                    return sendJson(res, 200, result);
                }
                if (path === '/inspect') {
                    if (index === undefined) return sendJson(res, 503, { error: 'skill index unavailable' });
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined) ?? '';
                    const name = url.searchParams.get('name') ?? '';
                    if (name === '') return sendJson(res, 400, { error: 'name is required' });
                    if (!isSafeSkillKey(name)) return sendJson(res, 400, { error: 'invalid skill name' });
                    const record = await index.find(name, workspace);
                    if (record === undefined) return sendJson(res, 404, { error: 'skill not found' });
                    let target = record.management?.path;
                    if (typeof target !== 'string' || target === '') {
                        // Plugin-provided skill without a readable file: say so
                        // instead of pretending a scan ran.
                        return sendJson(res, 200, { name, available: false, reason: 'no-readable-path', quality: null, security: null });
                    }
                    if (record.management.kind === 'writable') {
                        const root = rootById(rootsFor(workspace), String(record.management.rootId ?? ''));
                        if (root === undefined) return sendJson(res, 403, { error: 'skill path escapes its root' });
                        try {
                            target = await assertContainedReal(root, target);
                            if ((await lstat(target)).isDirectory()) await assertRealContained(root, join(target, 'SKILL.md'));
                        }
                        catch {
                            return sendJson(res, 403, { error: 'skill path escapes its root' });
                        }
                    }
                    const report = await inspectSkill({ path: target, name: record.name });
                    return sendJson(res, 200, { name, available: true, ...report });
                }
                if (path === '/ledger') {
                    if (state === undefined) return sendJson(res, 503, { error: 'state unavailable' });
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined) ?? '';
                    const built = index === undefined ? undefined : await index.build(workspace);
                    return sendJson(res, 200, buildLedger(await state.read(), built));
                }
                if (path === '/security/status') {
                    if (security === undefined) return sendJson(res, 503, { error: 'security unavailable' });
                    const requested = url.searchParams.get('workspace') ?? '';
                    const workspace = knownWorkspace(requested === '' ? undefined : requested);
                    if (requested !== '' && workspace === undefined) {
                        return sendJson(res, 403, { error: 'unknown workspace' });
                    }
                    let status = await security.status();
                    // First open with no history: begin a quick scan so the modal
                    // never shows a fabricated "all clear". `run` also guards a
                    // failed history write: without it every status poll would
                    // start the same scan again.
                    if (status.lastScan === null && status.running === false && status.run === null) {
                        await security.startScan({ mode: 'quick', trigger: 'first-open', workspace: workspace ?? '' });
                        status = await security.status();
                    }
                    return sendJson(res, 200, status);
                }
                if (path === '/security/review') {
                    if (security === undefined || index === undefined) {
                        return sendJson(res, 503, { error: 'security review unavailable' });
                    }
                    const requested = url.searchParams.get('workspace') ?? '';
                    const workspace = knownWorkspace(requested === '' ? undefined : requested);
                    if (requested !== '' && workspace === undefined) {
                        return sendJson(res, 403, { error: 'unknown workspace' });
                    }
                    const name = url.searchParams.get('name') ?? '';
                    if (name === '') return sendJson(res, 400, { error: 'name is required' });
                    if (!isSafeSkillKey(name)) return sendJson(res, 400, { error: 'invalid skill name' });
                    const record = await index.find(name, workspace ?? '');
                    if (record === undefined) return sendJson(res, 404, { error: 'skill not found' });
                    const base = {
                        name: record.name,
                        source: record.source,
                        management: record.management,
                        reviewHash: record.reviewHash ?? '',
                        contentHash: record.contentHash ?? '',
                        version: record.version ?? null,
                    };
                    const target = record.management?.path;
                    if (typeof target !== 'string' || target === '') {
                        return sendJson(res, 200, { available: false, reason: 'no-readable-path', skill: base, review: null });
                    }
                    let pathToScan = target;
                    let rootPath;
                    if (record.management.kind === 'writable') {
                        const root = rootById(rootsFor(workspace), String(record.management.rootId ?? ''));
                        if (root === undefined) return sendJson(res, 403, { error: 'skill path escapes its root' });
                        try {
                            pathToScan = await assertContainedReal(root, target);
                            if ((await lstat(pathToScan)).isDirectory()) {
                                await assertRealContained(root, join(pathToScan, 'SKILL.md'));
                            }
                        }
                        catch {
                            return sendJson(res, 403, { error: 'skill path escapes its root' });
                        }
                        rootPath = root.path;
                    }
                    const review = await security.reviewSkill({
                        name: record.name,
                        path: pathToScan,
                        rootPath,
                        workspace: workspace ?? '',
                        reviewHash: record.reviewHash ?? '',
                        kind: record.management.kind,
                    });
                    return sendJson(res, 200, { available: true, skill: base, review });
                }
                if (path === '/security/review-all') {
                    if (security === undefined) return sendJson(res, 503, { error: 'security review unavailable' });
                    const requested = url.searchParams.get('workspace') ?? '';
                    const workspace = knownWorkspace(requested === '' ? undefined : requested);
                    if (requested !== '' && workspace === undefined) {
                        return sendJson(res, 403, { error: 'unknown workspace' });
                    }
                    return sendJson(res, 200, await security.reviewAll({ workspace: workspace ?? '' }));
                }
                if (path === '/security/report') {
                    if (security === undefined) return sendJson(res, 503, { error: 'security unavailable' });
                    const result = await security.report();
                    return sendJson(res, 200, { report: result.report });
                }
                if (path === '/security/source') {
                    if (security === undefined) return sendJson(res, 503, { error: 'security unavailable' });
                    const target = url.searchParams.get('path') ?? '';
                    const line = Number(url.searchParams.get('line') ?? '1');
                    const result = await security.viewSource(target, Number.isFinite(line) ? line : 1);
                    if (result.error !== undefined) return sendJson(res, 404, { error: result.error });
                    return sendJson(res, 200, result);
                }
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: 'not found' }));
                return;
            }
            if (!isSameOrigin(req))
                return sendJson(res, 403, { error: 'cross-origin request rejected' });
            const body = await readJsonBody(req, maxBodyBytes);
            if (req.method === 'POST') {
                if (path === '/upload') {
                    const workspace = knownWorkspace(body.workspace);
                    const root = rootById(rootsFor(workspace), typeof body.targetRoot === 'string' ? body.targetRoot : '');
                    if (root === undefined)
                        return sendJson(res, 400, { error: 'unknown target root' });
                    if (!Array.isArray(body.files))
                        return sendJson(res, 400, { error: 'files must be an array' });
                    if (body.files.length > MAX_UPLOAD_FILES) {
                        return sendJson(res, 413, { error: `too many files (${String(body.files.length)} > ${String(MAX_UPLOAD_FILES)})` });
                    }
                    const files = [];
                    for (const raw of body.files) {
                        if (typeof raw !== 'object' || raw === null)
                            return sendJson(res, 400, { error: 'malformed file entry' });
                        const entry = raw;
                        if (typeof entry.path !== 'string' || typeof entry.contentBase64 !== 'string')
                            return sendJson(res, 400, { error: 'malformed file entry' });
                        try {
                            const safePath = assertSafeRelative(entry.path);
                            // assertSafeRelative rejects raw traversal; the audit
                            // also rejects encoded traversal and malformed forms.
                            const pathFindings = auditRelativePath(entry.path, { target: `upload:${root.id}` });
                            const blockingPath = pathFindings.filter(finding => finding.severity === 'CRITICAL' || finding.severity === 'HIGH');
                            if (blockingPath.length > 0) {
                                return sendJson(res, 400, {
                                    error: blockingPath[0].title,
                                    code: 'security-blocked',
                                    findings: blockingPath,
                                });
                            }
                            files.push({ path: safePath, contentBase64: entry.contentBase64 });
                        }
                        catch (error) {
                            return sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
                        }
                    }
                    if (security !== undefined) {
                        const gate = await security.gateUpload({
                            files,
                            target: `upload:${root.id}`,
                            action: 'install',
                            workspace: workspace ?? '',
                            trigger: 'install',
                        });
                        if (gate.allowed !== true) {
                            logEvent('upload blocked', `${gate.reason ?? 'security policy'}`);
                            return sendJson(res, 409, {
                                error: gate.reason ?? 'security policy blocked this upload',
                                code: gate.code,
                                findings: gate.findings,
                                summary: gate.summary,
                                scanId: gate.scanId,
                                notify: gate.notify,
                            });
                        }
                    }
                    const outcome = await installUpload(root, files, toConflict(body.conflict), (p, name, rootId) => moveToTrash(p, name, rootId));
                    await finishInstall(outcome, root, 'upload', workspace);
                    return sendJson(res, outcome.status === 'skipped' && outcome.error !== undefined ? 409 : 200, { outcome });
                }
                if (path === '/import-path') {
                    const workspace = knownWorkspace(body.workspace);
                    const root = rootById(rootsFor(workspace), typeof body.targetRoot === 'string' ? body.targetRoot : '');
                    if (root === undefined)
                        return sendJson(res, 400, { error: 'unknown target root' });
                    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
                        return sendJson(res, 400, { error: 'items must be a non-empty array' });
                    }
                    // Pre-flight every source path before reading or writing
                    // anything, so a blocked path cannot leave a partial batch.
                    // Content is gated per item after it is read; if a later
                    // item's content is blocked, earlier items stay installed
                    // and the response reports the batch as partial.
                    if (security !== undefined) {
                        const blocked = [];
                        for (const raw of body.items) {
                            const sourcePath = typeof raw === 'object' && raw !== null && typeof raw.sourcePath === 'string' ? raw.sourcePath : '';
                            if (sourcePath === '') continue;
                            const gate = await security.gateSourcePath({
                                sourcePath,
                                target: 'import-path',
                                action: 'install',
                                workspace: workspace ?? '',
                            });
                            if (gate.allowed !== true) {
                                blocked.push({ sourcePath, reason: gate.reason, findings: gate.findings, scanId: gate.scanId, notify: gate.notify });
                            }
                        }
                        if (blocked.length > 0) {
                            logEvent('import-path blocked', String(blocked[0].reason ?? 'security policy'));
                            return sendJson(res, 409, {
                                error: blocked[0].reason ?? 'security policy blocked this import',
                                code: 'security-blocked',
                                blocked,
                                notify: blocked.some(row => row.notify === true),
                            });
                        }
                    }
                    const outcomes = [];
                    for (const raw of body.items) {
                        const sourcePath = typeof raw === 'object' && raw !== null && typeof raw.sourcePath === 'string' ? raw.sourcePath : '';
                        if (sourcePath === '') {
                            outcomes.push({ sourcePath, name: '', status: 'skipped', error: 'sourcePath is required' });
                            continue;
                        }
                        if (isAbsolute(sourcePath) && isSensitivePath(sourcePath)) {
                            outcomes.push({ sourcePath, name: '', status: 'skipped', error: 'system or credential directories cannot be imported as skills', code: 'security-blocked' });
                            continue;
                        }
                        let files;
                        try {
                            files = await readSkillDirectory(sourcePath);
                        }
                        catch (error) {
                            outcomes.push({ sourcePath, name: '', status: 'skipped', error: error instanceof Error ? error.message : String(error) });
                            continue;
                        }
                        if (security !== undefined) {
                            const gate = await security.gateUpload({
                                files,
                                target: `import:${sourcePath}`,
                                action: 'install',
                                workspace: workspace ?? '',
                                trigger: 'install',
                            });
                            if (gate.allowed !== true) {
                                outcomes.push({ sourcePath, name: '', status: 'skipped', error: gate.reason, code: 'security-blocked', findings: gate.findings, scanId: gate.scanId, notify: gate.notify });
                                continue;
                            }
                        }
                        const outcome = await installUpload(root, files, toConflict(body.conflict), (p, name, rootId) => moveToTrash(p, name, rootId));
                        outcomes.push({ ...outcome, sourcePath });
                        await finishInstall(outcome, root, 'import-path', workspace);
                    }
                    const blockedOutcomes = outcomes.filter(outcome => outcome.code === 'security-blocked');
                    if (blockedOutcomes.length > 0) {
                        return sendJson(res, 409, {
                            error: blockedOutcomes[0].error ?? 'security policy blocked this import',
                            code: 'security-blocked',
                            outcomes,
                            notify: blockedOutcomes.some(outcome => outcome.notify === true),
                        });
                    }
                    return sendJson(res, 200, { outcomes });
                }
                if (path === '/upload-zip') {
                    const workspace = knownWorkspace(body.workspace);
                    const root = rootById(rootsFor(workspace), typeof body.targetRoot === 'string' ? body.targetRoot : '');
                    if (root === undefined)
                        return sendJson(res, 400, { error: 'unknown target root' });
                    if (typeof body.zipBase64 !== 'string' || body.zipBase64.length === 0) {
                        return sendJson(res, 400, { error: 'zipBase64 must be a non-empty string' });
                    }
                    const zipBuffer = Buffer.from(body.zipBase64, 'base64');
                    let archive;
                    try {
                        // Open only the central directory: no entry is
                        // decompressed before the archive audit.
                        archive = await openZipArchive(zipBuffer);
                    }
                    catch (error) {
                        return sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
                    }
                    if (security !== undefined) {
                        const gate = await security.gateArchive({
                            entries: archive.entries,
                            target: `archive:${root.id}`,
                            action: 'install',
                        });
                        if (gate.allowed !== true) {
                            logEvent('upload-zip blocked', String(gate.reason ?? 'security policy'));
                            return sendJson(res, 409, {
                                error: gate.reason ?? 'security policy blocked this archive',
                                code: gate.code,
                                findings: gate.findings,
                                summary: gate.summary,
                                scanId: gate.scanId,
                                notify: gate.notify,
                            });
                        }
                    }
                    let zipFiles;
                    try {
                        zipFiles = await zipToUploadFiles(zipBuffer, { archive, target: `archive:${root.id}` });
                    }
                    catch (error) {
                        return sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
                    }
                    if (security !== undefined) {
                        const gate = await security.gateUpload({
                            files: zipFiles,
                            target: `upload:${root.id}`,
                            action: 'install',
                            workspace: workspace ?? '',
                            trigger: 'install',
                        });
                        if (gate.allowed !== true) {
                            return sendJson(res, 409, {
                                error: gate.reason ?? 'security policy blocked this archive',
                                code: gate.code,
                                findings: gate.findings,
                                summary: gate.summary,
                                scanId: gate.scanId,
                                notify: gate.notify,
                            });
                        }
                    }
                    const outcome = await installUpload(root, zipFiles, toConflict(body.conflict), (p, name, rootId) => moveToTrash(p, name, rootId));
                    await finishInstall(outcome, root, 'upload-zip', workspace);
                    return sendJson(res, outcome.status === 'skipped' && outcome.error !== undefined ? 409 : 200, { outcome });
                }
                if (path === '/toggle' || path === '/delete') {
                    const workspace = knownWorkspace(body.workspace);
                    const root = rootById(rootsFor(workspace), typeof body.rootId === 'string' ? body.rootId : '');
                    if (root === undefined)
                        return sendJson(res, 400, { error: 'unknown root' });
                    const name = typeof body.name === 'string' ? body.name : '';
                    const skill = (await enumerateRoot(root)).find(s => s.name === name);
                    if (skill === undefined)
                        return sendJson(res, 404, { error: 'skill not found' });
                    if (path === '/delete') {
                        await moveToTrash(skill.path, skill.name, root.id);
                        if (index !== undefined) index.invalidate();
                        logEvent('delete', `${skill.name} <- ${root.id}`);
                        // A deleted skill must not keep a favourite/pin or stale
                        // tags; the usage ledger stays for historical accuracy.
                        if (state !== undefined) {
                            try {
                                await state.update((draft) => {
                                    delete draft.prefs[skill.name];
                                    if (draft.tags !== undefined) delete draft.tags[skill.name];
                                    if (draft.reviews !== undefined) delete draft.reviews[skill.name];
                                    recordActivity(draft, 'delete', skill.name, true, 'trashed');
                                });
                            }
                            catch {
                                // The deletion itself already succeeded.
                            }
                        }
                        return sendJson(res, 200, { deleted: skill.name });
                    }
                    const flag = flagForToggle(body);
                    if (flag === null)
                        return sendJson(res, 400, { error: 'toggle needs modelInvocable or userInvocable' });
                    // Enabling is the dangerous direction: scan before the flag
                    // is written, with the existing first-use review as the only
                    // pre-authorized HIGH exception.
                    const enabling = (flag.key === 'disable-model-invocation' && flag.value === false)
                        || (flag.key === 'user-invocable' && flag.value === true);
                    if (enabling && security !== undefined) {
                        const gate = await security.gateSkill({
                            name: skill.name,
                            path: skill.path,
                            rootPath: root.path,
                            action: 'enable',
                            workspace: workspace ?? '',
                            trigger: 'enable',
                        });
                        // The legacy first-use review only covers the old
                        // inspector's rules. It must not auto-accept a HIGH
                        // finding from the security scanner; the user can
                        // authorize that explicitly in the Security Center.
                        if (gate.allowed !== true) {
                            logEvent('toggle blocked', `${skill.name}: ${gate.reason ?? 'security policy'}`);
                            return sendJson(res, 409, {
                                error: gate.reason ?? 'security policy blocked enabling this skill',
                                code: gate.code,
                                findings: gate.findings,
                                summary: gate.summary,
                                scanId: gate.scanId,
                                notify: gate.notify,
                            });
                        }
                    }
                    // The enumerated path is lexical; a symlinked skill could
                    // pass that check and then the flag write would land outside
                    // the writable root. Resolve the real path first and operate
                    // on it, so a link that escapes is refused and a link that
                    // stays inside cannot be swapped mid-write.
                    let realSkillPath;
                    try {
                        realSkillPath = await assertContainedReal(root, skill.path);
                    }
                    catch {
                        return sendJson(res, 403, { error: 'skill path escapes its root' });
                    }
                    if (skill.kind === 'file') {
                        const text = await readFile(realSkillPath, 'utf8');
                        await writeFile(realSkillPath, setFlag(text, flag.key, flag.value), 'utf8');
                    }
                    else {
                        let skillFile;
                        try {
                            skillFile = await assertRealContained(root, join(realSkillPath, 'SKILL.md'));
                        }
                        catch {
                            return sendJson(res, 403, { error: 'skill path escapes its root' });
                        }
                        const text = await readFile(skillFile, 'utf8');
                        await writeFile(skillFile, setFlag(text, flag.key, flag.value), 'utf8');
                    }
                    if (index !== undefined) index.invalidate();
                    logEvent('toggle', `${skill.name} ${flag.key}=${String(flag.value)} <- ${root.id}`);
                    return sendJson(res, 200, { toggled: skill.name });
                }
                if (path === '/override') {
                    const workspace = knownWorkspace(body.workspace);
                    const target = typeof body.path === 'string' ? body.path : '';
                    if (target.length === 0)
                        return sendJson(res, 400, { error: 'path is required' });
                    if (typeof body.disabled !== 'boolean')
                        return sendJson(res, 400, { error: 'disabled must be a boolean' });
                    let candidate = provider.candidateByPath(target);
                    if (candidate === undefined) {
                        await provider.list({ cwd: workspace });
                        candidate = provider.candidateByPath(target);
                    }
                    if (candidate === undefined)
                        return sendJson(res, 400, { error: 'path is not a mounted skill' });
                    if (body.disabled === false && security !== undefined) {
                        const gate = await security.gateSkill({
                            name: candidate.name,
                            path: candidate.path,
                            action: 'enable-mounted',
                            workspace: workspace ?? '',
                            trigger: 'enable',
                        });
                        if (gate.allowed !== true) {
                            logEvent('override blocked', `${candidate.name}: ${gate.reason ?? 'security policy'}`);
                            return sendJson(res, 409, {
                                error: gate.reason ?? 'security policy blocked enabling this mounted skill',
                                code: gate.code,
                                findings: gate.findings,
                                summary: gate.summary,
                                scanId: gate.scanId,
                                notify: gate.notify,
                            });
                        }
                    }
                    await provider.setDisabled(target, body.disabled);
                    // Mount overrides are merged into the index, so the next
                    // read must rebuild instead of serving the old policy.
                    if (index !== undefined) index.invalidate();
                    return sendJson(res, 200, { path: target, disabled: body.disabled, name: candidate.name });
                }
                if (path === '/trash-restore') {
                    const id = typeof body.id === 'string' ? body.id : '';
                    // Scan the trashed payload before it returns to a live root:
                    // restoring is an enable operation.
                    if (security !== undefined && id !== '') {
                        const entries = await listTrash();
                        const entry = entries.find(row => row.id === id);
                        if (entry !== undefined) {
                            const base = await trashDir();
                            const payload = trashPayloadPath(base, id, entry.manifest);
                            const gate = await security.gateSkill({
                                name: entry.manifest.name,
                                path: payload,
                                action: 'restore',
                                trigger: 'restore',
                            });
                            if (gate.allowed !== true) {
                                logEvent('trash-restore blocked', `${entry.manifest.name}: ${gate.reason ?? 'security policy'}`);
                                return sendJson(res, 409, {
                                    error: gate.reason ?? 'security policy blocked restoring this skill',
                                    code: gate.code,
                                    name: entry.manifest.name,
                                    findings: gate.findings,
                                    summary: gate.summary,
                                    scanId: gate.scanId,
                                    notify: gate.notify,
                                });
                            }
                        }
                    }
                    const error = await restoreTrash(id);
                    if (error === null && index !== undefined) index.invalidate();
                    return error === null ? sendJson(res, 200, { restored: true }) : sendJson(res, 409, { error });
                }
                if (path === '/trash-empty') {
                    await emptyTrash();
                    return sendJson(res, 200, { emptied: true });
                }
                if (path === '/prefs') {
                    if (state === undefined) return sendJson(res, 503, { error: 'state unavailable' });
                    const name = typeof body.name === 'string' ? body.name : '';
                    if (name === '') return sendJson(res, 400, { error: 'name is required' });
                    if (!isSafeSkillKey(name)) return sendJson(res, 400, { error: 'invalid skill name' });
                    if (body.favorite !== undefined && typeof body.favorite !== 'boolean') {
                        return sendJson(res, 400, { error: 'favorite must be a boolean' });
                    }
                    if (body.pinned !== undefined && typeof body.pinned !== 'boolean') {
                        return sendJson(res, 400, { error: 'pinned must be a boolean' });
                    }
                    if (body.favorite === undefined && body.pinned === undefined) {
                        return sendJson(res, 400, { error: 'favorite or pinned is required' });
                    }
                    const workspace = knownWorkspace(body.workspace) ?? '';
                    if (index !== undefined) {
                        const record = await index.find(name, workspace);
                        if (record === undefined) return sendJson(res, 404, { error: 'skill not found' });
                    }
                    await state.update((draft) => {
                        const pref = (draft.prefs[name] ??= {});
                        if (body.favorite !== undefined) {
                            if (body.favorite) pref.favorite = true;
                            else delete pref.favorite;
                        }
                        if (body.pinned !== undefined) {
                            if (body.pinned) {
                                pref.pinned = true;
                                pref.pinnedAt = Date.now();
                            }
                            else {
                                delete pref.pinned;
                                delete pref.pinnedAt;
                            }
                        }
                        if (Object.keys(pref).length === 0) delete draft.prefs[name];
                    });
                    if (index !== undefined) index.invalidate();
                    return sendJson(res, 200, { name, favorite: body.favorite, pinned: body.pinned });
                }
                if (path === '/use') {
                    if (index === undefined) return sendJson(res, 503, { error: 'skill index unavailable' });
                    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
                    if (sessionId === '') return sendJson(res, 400, { error: 'sessionId is required' });
                    const workspace = knownWorkspace(body.workspace) ?? '';
                    const name = typeof body.name === 'string' ? body.name : '';
                    if (!isSafeSkillKey(name)) return sendJson(res, 400, { error: 'invalid skill name' });
                    const record = await index.find(name, workspace);
                    if (record === undefined) return sendJson(res, 404, { error: 'skill not found' });
                    if (!record.policy.userInvocable) {
                        return sendJson(res, 403, { error: 'skill is not user-invocable', code: 'not-user-invocable' });
                    }
                    if (record.policy.disabled) {
                        return sendJson(res, 403, { error: 'skill is disabled', code: 'disabled' });
                    }
                    const missing = record.requires.filter(row => !row.satisfied);
                    if (missing.length > 0) {
                        return sendJson(res, 409, {
                            error: `missing dependency: ${missing.map(row => row.name).join(', ')}`,
                            code: 'missing-dependency',
                            missing: missing.map(row => row.name),
                        });
                    }
                    if (record.review?.reviewed !== true) {
                        return sendJson(res, 409, {
                            error: 'safety review required before use',
                            code: 'review-required',
                            name: record.name,
                        });
                    }
                    // Re-check the content at use time. The index review is
                    // hash-matched, but the file can still have changed after
                    // the index was built; the gate rescans by content hash.
                    if (security !== undefined && typeof record.management?.path === 'string' && record.management.path !== '') {
                        const writableRoot = record.management.kind === 'writable'
                            ? rootById(rootsFor(workspace), String(record.management.rootId ?? ''))
                            : undefined;
                        const gate = await security.gateSkill({
                            name: record.name,
                            path: record.management.path,
                            rootPath: writableRoot?.path,
                            action: 'use',
                            workspace,
                            trigger: 'use',
                        });
                        if (gate.allowed !== true) {
                            logEvent('use blocked', `${record.name}: ${gate.reason ?? 'security policy'}`);
                            return sendJson(res, 409, {
                                error: gate.reason ?? 'security policy blocked this skill',
                                code: gate.code,
                                findings: gate.findings,
                                summary: gate.summary,
                                scanId: gate.scanId,
                                notify: gate.notify,
                            });
                        }
                    }
                    authorize(sessionId, name);
                    if (recommender !== undefined) await recommender.markUsed(sessionId, name);
                    return sendJson(res, 200, {
                        name,
                        token: `/${name} `,
                        availability: record.policy.availability,
                        requires: record.requires,
                    });
                }
                if (path === '/event') {
                    if (state === undefined) return sendJson(res, 503, { error: 'state unavailable' });
                    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
                    const name = typeof body.name === 'string' ? body.name : '';
                    const phase = typeof body.phase === 'string' ? body.phase : '';
                    if (sessionId === '' || name === '') return sendJson(res, 400, { error: 'sessionId and name are required' });
                    if (!isSafeSkillKey(sessionId) || !isSafeSkillKey(name)) return sendJson(res, 400, { error: 'invalid session or skill name' });
                    if (phase === 'recommended') {
                        const pendingEntry = pending.get(sessionId);
                        if (pendingEntry === undefined) return sendJson(res, 409, { error: 'no pending recommendation' });
                        if (recommender !== undefined) {
                            await recommender.markShown(sessionId, pendingEntry.names ?? [], pendingEntry.fingerprint ?? '');
                        }
                        await state.update((draft) => {
                            for (const name of pendingEntry.names ?? []) recordUsage(draft, name, 'recommended');
                        });
                        pending.delete(sessionId);
                        if (index !== undefined) index.invalidate();
                        return sendJson(res, 200, { shown: true });
                    }
                    if (phase === 'accepted' || phase === 'dismissed') {
                        // Client-observed funnel events: no load authorization is
                        // involved, but they still mutate our own counters. The
                        // skill has to exist, so a mistyped or forged name cannot
                        // pollute the adoption rate.
                        if (index !== undefined) {
                            const workspace = knownWorkspace(body.workspace) ?? '';
                            if ((await index.find(name, workspace)) === undefined) {
                                return sendJson(res, 404, { error: 'skill not found' });
                            }
                        }
                        await state.update((draft) => {
                            recordUsage(draft, name, phase);
                        });
                        if (index !== undefined) index.invalidate();
                        return sendJson(res, 200, { recorded: phase });
                    }
                    if (!['loaded', 'load-failed', 'cancelled'].includes(phase)) {
                        return sendJson(res, 400, { error: 'unknown phase' });
                    }
                    if (phase === 'loaded' && !authorized(sessionId, name)) {
                        return sendJson(res, 403, { error: 'load was not authorized', code: 'not-authorized' });
                    }
                    await state.update((draft) => {
                        recordUsage(draft, name, phase, typeof body.reason === 'string' ? body.reason.slice(0, 300) : undefined);
                    });
                    if (index !== undefined) index.invalidate();
                    return sendJson(res, 200, { recorded: phase });
                }
                if (path === '/review') {
                    if (state === undefined) return sendJson(res, 503, { error: 'state unavailable' });
                    if (index === undefined) return sendJson(res, 503, { error: 'skill index unavailable' });
                    const name = typeof body.name === 'string' ? body.name : '';
                    if (name === '') return sendJson(res, 400, { error: 'name is required' });
                    if (!isSafeSkillKey(name)) return sendJson(res, 400, { error: 'invalid skill name' });
                    if (body.decision !== 'accepted') {
                        return sendJson(res, 400, { error: 'decision must be accepted' });
                    }
                    const workspace = knownWorkspace(body.workspace) ?? '';
                    const record = await index.find(name, workspace);
                    if (record === undefined) return sendJson(res, 404, { error: 'skill not found' });
                    if (typeof record.reviewHash !== 'string' || record.reviewHash === '') {
                        return sendJson(res, 409, { error: 'review unavailable', code: 'review-unavailable' });
                    }
                    await state.update((draft) => recordReview(
                        draft,
                        record.name,
                        record.reviewHash,
                        'accepted',
                        record.review?.risk ?? null,
                    ));
                    logEvent('review accepted', record.name);
                    index.invalidate();
                    return sendJson(res, 200, { name: record.name, reviewed: true, risk: record.review?.risk ?? null });
                }
                if (path === '/recommend') {
                    if (index === undefined || recommender === undefined) {
                        return sendJson(res, 503, { error: 'recommendation unavailable' });
                    }
                    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
                    if (sessionId === '') return sendJson(res, 400, { error: 'sessionId is required' });
                    const workspace = knownWorkspace(body.workspace) ?? '';
                    const built = await index.build(workspace);
                    const result = await recommender.evaluate({
                        sessionId,
                        index: built,
                        intent: typeof body.intent === 'string' ? body.intent : '',
                    });
                    if (result.decision === 'recommend') {
                        pending.set(sessionId, {
                            names: result.items.map(item => item.name),
                            fingerprint: result.fingerprint ?? '',
                            items: result.items,
                            at: Date.now(),
                        });
                        if (pending.size > 64) pending.delete(pending.keys().next().value);
                    }
                    return sendJson(res, 200, result);
                }
                if (path === '/recommend/ignore') {
                    if (recommender === undefined) return sendJson(res, 503, { error: 'recommendation unavailable' });
                    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
                    const name = typeof body.name === 'string' ? body.name : '';
                    if (sessionId === '' || name === '') return sendJson(res, 400, { error: 'sessionId and name are required' });
                    if (!isSafeSkillKey(sessionId) || !isSafeSkillKey(name)) return sendJson(res, 400, { error: 'invalid session or skill name' });
                    await recommender.ignore({
                        sessionId,
                        name,
                        fingerprint: typeof body.fingerprint === 'string' ? body.fingerprint : '',
                    });
                    pending.delete(sessionId);
                    return sendJson(res, 200, { ignored: name });
                }
            }
            // The two mutations below are POST-only. They used to fall through
            // from the POST block, which made PUT/DELETE with a JSON body write
            // tags and migrate skills.
            if (req.method !== 'POST') {
                res.writeHead(405, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: 'method not allowed' }));
                return;
            }
            if (path === '/security/scan') {
                if (security === undefined) return sendJson(res, 503, { error: 'security unavailable' });
                const requested = typeof body.workspace === 'string' ? body.workspace : '';
                const workspace = knownWorkspace(requested === '' ? undefined : requested);
                if (requested !== '' && workspace === undefined) {
                    return sendJson(res, 403, { error: 'unknown workspace' });
                }
                let target;
                if (body.target !== null && typeof body.target === 'object' && !Array.isArray(body.target)
                    && typeof body.target.name === 'string' && body.target.name !== '') {
                    if (index === undefined) return sendJson(res, 503, { error: 'skill index unavailable' });
                    const record = await index.find(body.target.name, workspace ?? '');
                    if (record === undefined) return sendJson(res, 404, { error: 'skill not found' });
                    const targetPath = record.management?.path;
                    if (typeof targetPath !== 'string' || targetPath === '') {
                        return sendJson(res, 409, { error: 'skill has no readable file' });
                    }
                    const root = record.management.kind === 'writable'
                        ? rootById(rootsFor(workspace), String(record.management.rootId ?? ''))
                        : undefined;
                    target = { name: record.name, path: targetPath, rootPath: root?.path, kind: record.management.kind };
                }
                const result = await security.startScan({
                    mode: body.mode === 'full' ? 'full' : 'quick',
                    workspace: workspace ?? '',
                    target,
                    trigger: 'manual',
                });
                if (result.started !== true) {
                    return sendJson(res, 409, { error: result.reason, runId: result.runId });
                }
                return sendJson(res, 202, result);
            }
            if (path === '/security/cancel') {
                if (security === undefined) return sendJson(res, 503, { error: 'security unavailable' });
                return sendJson(res, 200, security.cancelScan());
            }
            if (path === '/security/finding') {
                if (security === undefined) return sendJson(res, 503, { error: 'security unavailable' });
                if (body.action === 'accept') {
                    const keys = Array.isArray(body.keys)
                        ? body.keys.filter(key => typeof key === 'string')
                        : (typeof body.key === 'string' ? [body.key] : []);
                    const result = await security.authorizeException({
                        keys,
                        reason: typeof body.reason === 'string' ? body.reason : '',
                        target: typeof body.target === 'string' ? body.target : '',
                    });
                    if (result.error !== undefined) {
                        const critical = result.error.includes('CRITICAL');
                        return sendJson(res, critical ? 403 : 400, { error: result.error, rejected: result.rejected ?? [] });
                    }
                    if (result.accepted === 0) {
                        return sendJson(res, 400, { error: 'no finding was accepted', rejected: result.rejected ?? [] });
                    }
                    return sendJson(res, 200, result);
                }
                if (body.action === 'review' || body.action === 'reopen') {
                    if (typeof body.key !== 'string' || body.key === '') {
                        return sendJson(res, 400, { error: 'key is required' });
                    }
                    const result = await security.setFindingStatus({
                        key: body.key,
                        status: body.action === 'review' ? 'reviewed' : 'unresolved',
                        note: typeof body.note === 'string' ? body.note : '',
                    });
                    if (result.ok !== true) return sendJson(res, 404, { error: result.error });
                    return sendJson(res, 200, { updated: true, state: result.state });
                }
                return sendJson(res, 400, { error: 'action must be accept, review or reopen' });
            }
            if (path === '/security/fix/preview') {
                if (security === undefined) return sendJson(res, 503, { error: 'security unavailable' });
                if (typeof body.key !== 'string' || body.key === '') {
                    return sendJson(res, 400, { error: 'key is required' });
                }
                const result = await security.previewFix(body.key);
                if (result.error !== undefined) return sendJson(res, 400, { error: result.error });
                return sendJson(res, 200, result);
            }
            if (path === '/security/fix/apply') {
                if (security === undefined) return sendJson(res, 503, { error: 'security unavailable' });
                if (typeof body.key !== 'string' || typeof body.expectedHash !== 'string') {
                    return sendJson(res, 400, { error: 'key and expectedHash are required' });
                }
                const result = await security.applyFix({
                    key: body.key,
                    expectedHash: body.expectedHash,
                    confirm: body.confirm === true,
                });
                if (result.applied !== true) return sendJson(res, result.error === undefined ? 400 : 409, { error: result.error });
                if (index !== undefined) index.invalidate();
                return sendJson(res, 200, result);
            }
            if (path === '/tags') {
                if (state === undefined) return sendJson(res, 503, { error: 'state unavailable' });
                if (index === undefined) return sendJson(res, 503, { error: 'skill index unavailable' });
                const name = typeof body.name === 'string' ? body.name : '';
                if (name === '') return sendJson(res, 400, { error: 'name is required' });
                const tags = sanitizeTags(body.tags);
                const workspace = knownWorkspace(body.workspace) ?? '';
                const record = await index.find(name, workspace);
                if (record === undefined) return sendJson(res, 404, { error: 'skill not found' });
                await state.update((draft) => {
                    draft.tags ??= {};
                    if (tags.length === 0) delete draft.tags[name];
                    else draft.tags[name] = tags;
                });
                index.invalidate();
                return sendJson(res, 200, { name, tags });
            }
            if (path === '/migrate') {
                const workspace = knownWorkspace(body.workspace);
                const root = rootById(rootsFor(workspace), typeof body.rootId === 'string' ? body.rootId : '');
                if (root === undefined) return sendJson(res, 400, { error: 'unknown root' });
                const name = typeof body.name === 'string' ? body.name : '';
                const skill = (await enumerateRoot(root)).find(s => s.name === name);
                if (skill === undefined) return sendJson(res, 404, { error: 'skill not found' });
                // The enumerated path is inside this root by construction; assert
                // it anyway so a forged name or a symlinked root cannot move a
                // directory that lives outside the root the user chose.
                let contained;
                try {
                    contained = assertContained(root, skill.path);
                }
                catch (error) {
                    return sendJson(res, 403, { error: error instanceof Error ? error.message : String(error) });
                }
                try {
                    const outcome = await migrateToSharedPool({
                        source: contained,
                        name: skill.name,
                        poolDir: join(agentsHome(), 'skills'),
                    });
                    if (index !== undefined) index.invalidate();
                    logEvent('migrate', `${skill.name} -> shared pool`);
                    void noteActivity('migrate', skill.name, true, 'moved to shared pool');
                    return sendJson(res, 200, outcome);
                }
                catch (error) {
                    if (error instanceof MigrationRefused) {
                        logEvent('migrate refused', `${skill.name}: ${error.code}`);
                        void noteActivity('migrate', skill.name, false, String(error.code));
                        return sendJson(res, 409, { error: error.message, code: error.code });
                    }
                    throw error;
                }
            }
            res.writeHead(405, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'method not allowed' }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            // A malformed JSON body or a non-object body is the caller's
            // mistake: answer 400 with the validation message, not a 500.
            if (error?.statusCode === 400) {
                return sendJson(res, 400, { error: message });
            }
            if (message === 'request body too large') {
                const mb = Math.round(maxBodyBytes / 1024 / 1024);
                const perFileMb = Math.round(MAX_FILE_BYTES / 1024 / 1024);
                const totalMb = Math.round(MAX_TOTAL_BYTES / 1024 / 1024);
                // "Local path install" skips the HTTP body limit, not the file
                // limits: say what is still capped instead of promising none.
                return sendJson(res, 413, {
                    error: `请求体超过上传上限（${String(mb)}MB）。如果文件夹就在本机，请改用「本地路径安装」：它不受浏览器上传请求大小限制，但仍受本地限制（单文件 ${String(perFileMb)}MB、总量 ${String(totalMb)}MB、最多 ${String(MAX_LOCAL_FILES)} 个文件、目录最多 ${String(MAX_LOCAL_DEPTH)} 层）。`
                });
            }
            const requestId = `req-${randomUUID().slice(0, 8)}`;
            try {
                ctx.logger?.warn?.(`dsh-charlotte: api failure ${requestId}: ${message}`);
            }
            catch {
                // Logging must never replace the response.
            }
            // Never disclose an exception message (paths, host names, file
            // contents) to the caller; the request id lets a local operator
            // find the detail in the log.
            sendJson(res, 500, { error: 'internal error', requestId });
        }
    };
}
/**
 * Map a toggle request body to the frontmatter flag it rewrites.
 * @param body - parsed request body.
 * @returns flag key and target value, or null when neither flag is present.
 */
export function flagForToggle(body) {
    if (typeof body.modelInvocable === 'boolean') {
        return { key: 'disable-model-invocation', value: !body.modelInvocable };
    }
    if (typeof body.userInvocable === 'boolean') {
        return { key: 'user-invocable', value: body.userInvocable };
    }
    return null;
}
function toConflict(value) {
    return value === 'rename' || value === 'replace' ? value : 'skip';
}
async function skillDetail(path, kind) {
    if (kind === 'file') {
        const content = await readFile(path, 'utf8');
        return { kind, path, content, files: [] };
    }
    const content = await readFile(join(path, 'SKILL.md'), 'utf8');
    const { readdir } = await import('node:fs/promises');
    const files = [];
    const walk = async (dir, prefix, depth) => {
        if (depth > 4 || files.length > 500)
            return;
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            if (entry.isSymbolicLink())
                continue;
            const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
            if (entry.isDirectory())
                await walk(join(dir, entry.name), rel, depth + 1);
            else if (entry.isFile())
                files.push(rel);
        }
    };
    await walk(path, '', 0);
    files.sort();
    const meta = readSkillMeta(content);
    const split = splitFrontmatter(content);
    return { kind, path, content, files, meta: meta ?? null, frontmatter: split?.data ?? null };
}
/**
 * Detail payload for a mounted external skill.
 * Reads the foreign `SKILL.md` as-is; never writes it.
 * @param candidate - provider candidate resolved by absolute path.
 * @returns same shape as {@link skillDetail} plus mount metadata.
 */
async function mountedDetail(candidate) {
    const path = candidate.path;
    const directory = candidate.locator?.directory ?? (candidate.path.endsWith('SKILL.md') ? candidate.path.slice(0, -'SKILL.md'.length).replace(/\/$/, '') : undefined);
    let content = '';
    try {
        content = await readFile(path, 'utf8');
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    const files = [];
    if (directory !== undefined) {
        const walk = async (dir, prefix, depth) => {
            if (depth > 4 || files.length > 500)
                return;
            for (const entry of await readdir(dir, { withFileTypes: true })) {
                if (entry.isSymbolicLink())
                    continue;
                const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
                if (entry.isDirectory())
                    await walk(join(dir, entry.name), rel, depth + 1);
                else if (entry.isFile())
                    files.push(rel);
            }
        };
        try {
            await walk(directory, '', 0);
        }
        catch {
            // Directory vanished between list and detail: still return the file.
        }
        files.sort();
    }
    const meta = readSkillMeta(content);
    const split = splitFrontmatter(content);
    return {
        kind: 'mounted',
        path,
        directory: directory ?? null,
        source: candidate.source,
        provider: candidate.provider,
        invocation: candidate.invocation,
        content,
        files,
        meta: meta ?? null,
        frontmatter: split?.data ?? null,
    };
}
/**
 * Whether one HTTP `Host` header points at this machine's loopback interface.
 *
 * A browser cannot forge `Host` for a request it sends, so demanding loopback
 * here rejects DNS-rebinding pages that resolve their own hostname to
 * 127.0.0.1 and then look same-origin to {@link isSameOrigin}.
 * @param host - raw `Host` header value, optional port included.
 * @returns whether the host is 127.0.0.1, localhost or ::1.
 */
export function isLoopbackHost(host) {
    if (typeof host !== 'string' || host.length === 0)
        return false;
    // A Host header has no userinfo, path, query or fragment. Reject them
    // before URL parsing can turn `evil@127.0.0.1` into a loopback hostname.
    if (/[@/?#\s]/.test(host)) return false;
    let hostname;
    try {
        hostname = new URL(`http://${host}`).hostname.toLowerCase();
    }
    catch {
        return false;
    }
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]' || hostname === '::1';
}
/**
 * Optional per-caller token for non-browser integrations.
 *
 * When CHARLOTTE_API_TOKEN is set (at least 16 characters), every mutating
 * request must carry the same value in `x-charlotte-token`. Reads remain
 * loopback-scoped and same-origin-protected; the bundled UI is unaffected
 * because the token is opt-in.
 * @param req - inbound request.
 * @returns whether the caller may proceed.
 */
export function isAuthorizedCaller(req) {
    const token = process.env.CHARLOTTE_API_TOKEN;
    if (typeof token !== 'string' || token.length < 16) return true;
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
    const header = req.headers['x-charlotte-token'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (typeof provided !== 'string' || provided.length !== token.length) return false;
    try {
        return timingSafeEqual(Buffer.from(provided), Buffer.from(token));
    }
    catch {
        return false;
    }
}

/**
 * Enforce same-origin for browser mutations: an absent Origin header means a
 * non-browser caller; otherwise the Origin host must match the request host.
 * A literal `null` origin (sandboxed iframe, `file://` page, some extensions)
 * is a web origin too: it is treated as cross-origin so no web page can drive
 * local writes by stripping its identity.
 * @param req - inbound request.
 * @returns whether the request may mutate state.
 */
export function isSameOrigin(req) {
    const origin = req.headers.origin;
    if (origin === undefined)
        return true;
    if (origin === 'null')
        return false;
    try {
        return new URL(origin).host === req.headers.host;
    }
    catch {
        return false;
    }
}
function sendJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
}
async function readJsonBody(req, maxBytes) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = chunk;
        size += buffer.byteLength;
        if (size > maxBytes)
            throw new Error('request body too large');
        chunks.push(buffer);
    }
    if (chunks.length === 0)
        return {};
    let parsed;
    try {
        parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        throw clientBodyError('body must be valid JSON');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
        throw clientBodyError('body must be a JSON object');
    return parsed;
}
/**
 * Mark one parse/validation failure as a caller error rather than a server
 * error, so the handler can answer 400 without exposing internals.
 * @param message - safe message for the caller.
 * @returns tagged error.
 */
function clientBodyError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}
