/**
 * Persistent launcher state: favourites, pins, usage records, and the
 * per-session recommendation ledger.
 *
 * Everything here is state the plugin itself owns. Skill files are never
 * written by this module. The file lives at `$DSH_HOME/charlotte/state.json`
 * and is replaced atomically (tmp + rename) so a crash cannot truncate it.
 *
 * Shape (schema 2; schema 1 files are upgraded in place on the next write):
 * {
 *   version: 1,
 *   prefs: { [name]: { favorite?: true, pinned?: true, pinnedAt?: number } },
 *   usage: { [name]: { loads, invokes, completions, failures, cancelled,
 *                      recommended, accepted, dismissed,
 *                      lastUsedAt, lastLoadedAt, recent: [{ at, kind }] } },
 *   rec:   { sessions: { [sessionId]: { shown: {[name]: at},
 *                                      ignored: {[name]: fingerprint},
 *                                      fingerprint: string, lastShownAt: number,
 *                                      count: number, updatedAt: number } } }
 * }
 *
 * Missing or malformed state is treated as empty: the launcher must never fail
 * to open because its own bookkeeping is broken.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { dshHome } from './roots.js';

/** Current on-disk schema version. */
export const STATE_VERSION = 2;

/** Recent-event rows kept per skill (oldest dropped first). */
const MAX_RECENT = 12;

/** Day buckets kept per skill (per-skill ledger trend). */
const MAX_DAYS = 30;

/** Tags kept per skill, and their maximum length. */
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;

/** Sessions kept in the recommendation ledger (least recently touched dropped). */
const MAX_SESSIONS = 40;

/** Skills kept in the usage table (highest use dropped last). */
const MAX_SKILLS = 600;

/** Event kinds a client may report for one skill. */
export const CLIENT_EVENTS = ['loaded', 'load-failed', 'cancelled', 'accepted', 'dismissed'];

/**
 * Absolute path of the launcher state file.
 * @returns `$DSH_HOME/charlotte/state.json`.
 */
export function statePath() {
    return join(dshHome(), 'charlotte', 'state.json');
}

/** Serialize read-modify-write cycles so two requests cannot interleave. */
let writeChain = Promise.resolve();

/**
 * Validate and normalize one pref row.
 * @param raw - untrusted value.
 * @returns normalized prefs or undefined.
 */
function normalizePrefs(raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
    const out = {};
    for (const [name, row] of Object.entries(raw)) {
        if (typeof row !== 'object' || row === null) continue;
        const pref = {};
        if (row.favorite === true) pref.favorite = true;
        if (row.pinned === true) {
            pref.pinned = true;
            pref.pinnedAt = typeof row.pinnedAt === 'number' && Number.isFinite(row.pinnedAt) ? row.pinnedAt : 0;
        }
        if (Object.keys(pref).length > 0) out[name] = pref;
    }
    return out;
}

/**
 * Validate and normalize one usage row.
 * @param raw - untrusted value.
 * @returns normalized usage row.
 */
function normalizeUsage(raw) {
    const row = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {};
    const integer = (value) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
    const recent = Array.isArray(row.recent)
        ? row.recent.filter(entry => typeof entry === 'object' && entry !== null
            && typeof entry.kind === 'string'
            && typeof entry.at === 'number'
            && Number.isFinite(entry.at))
            .slice(-MAX_RECENT)
            .map(entry => ({ at: entry.at, kind: entry.kind, ...(typeof entry.reason === 'string' ? { reason: entry.reason } : {}) }))
        : [];
    const days = {};
    if (typeof row.days === 'object' && row.days !== null && !Array.isArray(row.days)) {
        for (const [key, value] of Object.entries(row.days).slice(-MAX_DAYS)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
            const bucket = typeof value === 'object' && value !== null ? value : {};
            days[key] = {
                loads: integer(bucket.loads),
                invokes: integer(bucket.invokes),
                completions: integer(bucket.completions),
                failures: integer(bucket.failures),
            };
        }
    }
    return {
        loads: integer(row.loads),
        invokes: integer(row.invokes),
        completions: integer(row.completions),
        failures: integer(row.failures),
        cancelled: integer(row.cancelled),
        // Recommendation funnel: shown → accepted / dismissed. These are the
        // adoption signals that answer "did the customer use it?", separately
        // from whether the card was ever displayed.
        recommended: integer(row.recommended),
        accepted: integer(row.accepted),
        dismissed: integer(row.dismissed),
        lastUsedAt: typeof row.lastUsedAt === 'number' && Number.isFinite(row.lastUsedAt) ? row.lastUsedAt : 0,
        lastLoadedAt: typeof row.lastLoadedAt === 'number' && Number.isFinite(row.lastLoadedAt) ? row.lastLoadedAt : 0,
        recent,
        days,
    };
}

/**
 * Sanitize one tag list from an untrusted source.
 * @param raw - candidate tag list.
 * @returns cleaned tags, deduplicated, at most {@link MAX_TAGS}.
 */
export function sanitizeTags(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const value of raw) {
        if (typeof value !== 'string') continue;
        // Slice by code point: a UTF-16 slice can cut a surrogate pair in half.
        const tag = Array.from(value.trim().replace(/\s+/g, ' ')).slice(0, MAX_TAG_LENGTH).join('');
        if (tag === '' || out.includes(tag)) continue;
        out.push(tag);
        if (out.length >= MAX_TAGS) break;
    }
    return out;
}

/**
 * Validate and normalize the per-skill tag table.
 * @param raw - untrusted tags object.
 * @returns `{ [name]: string[] }` with empty lists dropped.
 */
function normalizeTags(raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
    const out = {};
    for (const [name, list] of Object.entries(raw)) {
        const tags = sanitizeTags(list);
        if (tags.length > 0) out[name] = tags;
    }
    return out;
}

/**
 * Validate and normalize one session recommendation row.
 * @param raw - untrusted value.
 * @returns normalized session row.
 */
function normalizeSession(raw) {
    const row = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {};
    const shown = {};
    if (typeof row.shown === 'object' && row.shown !== null) {
        for (const [name, at] of Object.entries(row.shown)) {
            if (typeof at === 'number' && Number.isFinite(at)) shown[name] = at;
        }
    }
    const ignored = {};
    if (typeof row.ignored === 'object' && row.ignored !== null) {
        for (const [name, fingerprint] of Object.entries(row.ignored)) {
            if (typeof fingerprint === 'string') ignored[name] = fingerprint;
        }
    }
    const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
    return {
        shown,
        ignored,
        fingerprint: typeof row.fingerprint === 'string' ? row.fingerprint : '',
        lastShownAt: number(row.lastShownAt),
        count: number(row.count),
        updatedAt: number(row.updatedAt),
    };
}

/**
 * Shape one state blob defensively.
 * @param raw - parsed JSON.
 * @returns usable state.
 */
function normalizeState(raw) {
    const base = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {};
    const prefs = normalizePrefs(base.prefs);
    const usage = {};
    if (typeof base.usage === 'object' && base.usage !== null) {
        for (const [name, row] of Object.entries(base.usage)) usage[name] = normalizeUsage(row);
    }
    const sessions = {};
    if (typeof base.rec === 'object' && base.rec !== null
        && typeof base.rec.sessions === 'object' && base.rec.sessions !== null) {
        for (const [id, row] of Object.entries(base.rec.sessions)) sessions[id] = normalizeSession(row);
    }
    return { version: STATE_VERSION, prefs, tags: normalizeTags(base.tags), usage, rec: { sessions } };
}

/**
 * Trim the tables to their caps, dropping least valuable rows first.
 * @param state - normalized state, mutated.
 */
function trim(state) {
    const usageNames = Object.keys(state.usage);
    if (usageNames.length > MAX_SKILLS) {
        const ranked = usageNames
            .map(name => ({ name, weight: state.usage[name].lastUsedAt + state.usage[name].loads + state.usage[name].invokes }))
            .sort((left, right) => left.weight - right.weight);
        for (const row of ranked.slice(0, ranked.length - MAX_SKILLS)) delete state.usage[row.name];
    }
    const sessionIds = Object.keys(state.rec.sessions);
    if (sessionIds.length > MAX_SESSIONS) {
        const ranked = sessionIds
            .map(id => ({ id, at: state.rec.sessions[id].updatedAt }))
            .sort((left, right) => left.at - right.at);
        for (const row of ranked.slice(0, ranked.length - MAX_SESSIONS)) delete state.rec.sessions[row.id];
    }
}

/**
 * Launcher state store with an in-memory cache and serialized atomic writes.
 */
export class LauncherState {
    /**
     * @param file - state file path; defaults to {@link statePath}.
     */
    constructor(file = statePath()) {
        this.file = file;
        this.cache = undefined;
        this.pending = undefined;
    }

    /**
     * Read the current state, creating an empty one when the file is absent.
     * @returns normalized state.
     */
    async read() {
        if (this.cache !== undefined) return this.cache;
        let raw;
        try {
            raw = await readFile(this.file, 'utf8');
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                this.cache = normalizeState({});
                return this.cache;
            }
            throw error;
        }
        try {
            this.cache = normalizeState(JSON.parse(raw));
        }
        catch {
            this.cache = normalizeState({});
        }
        return this.cache;
    }

    /**
     * Apply one mutation and persist it. Mutations run serialized.
     * @param mutate - receives the live state; may mutate it.
     * @returns the mutation's result.
     */
    async update(mutate) {
        const run = async () => {
            const state = await this.read();
            const result = mutate(state);
            trim(state);
            await this.flush(state);
            return result;
        };
        const next = writeChain.then(run, run);
        writeChain = next.then(() => undefined, () => undefined);
        return next;
    }

    /**
     * Write the state atomically.
     * @param state - state to persist.
     */
    async flush(state) {
        await mkdir(dirname(this.file), { recursive: true });
        const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(tmp, `${JSON.stringify(state)}\n`, 'utf8');
        await rename(tmp, this.file);
    }

    /**
     * Drop the in-memory cache, so the next read sees external edits.
     */
    invalidate() {
        this.cache = undefined;
    }
}

/**
 * Read the pref row for one skill.
 * @param state - launcher state.
 * @param name - skill name.
 * @returns pref row (possibly empty).
 */
export function prefOf(state, name) {
    return state.prefs[name] ?? {};
}

/**
 * Read the usage row for one skill.
 * @param state - launcher state.
 * @param name - skill name.
 * @returns usage row.
 */
export function usageOf(state, name) {
    return state.usage[name] ?? normalizeUsage({});
}

/**
 * Read the recommendation ledger row for one session.
 * @param state - launcher state.
 * @param sessionId - session id.
 * @returns session row.
 */
export function sessionRecOf(state, sessionId) {
    return state.rec.sessions[sessionId] ?? normalizeSession({});
}

/**
 * Read the tag list for one skill.
 * @param state - launcher state.
 * @param name - skill name.
 * @returns sanitized tag list.
 */
export function tagsOf(state, name) {
    return sanitizeTags(state.tags?.[name]);
}

/**
 * Calendar day key for a timestamp, in local time.
 * @param at - epoch milliseconds.
 * @returns `YYYY-MM-DD`.
 */
export function dayKey(at = Date.now()) {
    const date = new Date(at);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${String(date.getFullYear())}-${month}-${day}`;
}

/**
 * Record one usage event on a skill row.
 * @param state - launcher state, mutated.
 * @param name - skill name.
 * @param kind - loaded | invoked | completed | failed | load-failed | cancelled.
 * @param detail - optional reason text.
 * @param at - event time (defaults to now).
 */
export function recordUsage(state, name, kind, detail, at = Date.now()) {
    const row = (state.usage[name] ??= normalizeUsage({}));
    // Recommendation-funnel events are counters, not skill usage: keep them out
    // of `recent` so the detail drawer's usage history stays about real loads
    // and invocations.
    if (kind === 'recommended') {
        row.recommended += 1;
        return;
    }
    if (kind === 'accepted') {
        row.accepted += 1;
        return;
    }
    if (kind === 'dismissed') {
        row.dismissed += 1;
        return;
    }
    if (kind === 'loaded') {
        row.loads += 1;
        row.lastLoadedAt = at;
        row.lastUsedAt = at;
    }
    else if (kind === 'invoked') {
        row.invokes += 1;
        row.lastUsedAt = at;
    }
    else if (kind === 'completed') row.completions += 1;
    else if (kind === 'failed' || kind === 'load-failed') row.failures += 1;
    else if (kind === 'cancelled') row.cancelled += 1;
    row.recent.push({ at, kind, ...(detail === undefined ? {} : { reason: detail }) });
    if (row.recent.length > MAX_RECENT) row.recent = row.recent.slice(-MAX_RECENT);
    // Per-day buckets are what makes the ledger's trend real rather than a
    // guess from the twelve most recent events.
    const key = dayKey(at);
    const bucket = (row.days[key] ??= { loads: 0, invokes: 0, completions: 0, failures: 0 });
    if (kind === 'loaded') bucket.loads += 1;
    else if (kind === 'invoked') bucket.invokes += 1;
    else if (kind === 'completed') bucket.completions += 1;
    else if (kind === 'failed' || kind === 'load-failed') bucket.failures += 1;
    const days = Object.keys(row.days);
    if (days.length > MAX_DAYS) {
        for (const stale of days.sort().slice(0, days.length - MAX_DAYS)) delete row.days[stale];
    }
}
