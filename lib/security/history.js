/**
 * Persistent security history: scans, blocked operations, exceptions and
 * finding lifecycle states.
 *
 * The history exists so that:
 * - an accepted risk survives a restart without ever being reported as fixed;
 * - the same condition does not re-notify on every scan;
 * - a report can list what was blocked and who authorized an exception;
 * - the last scan can be inspected before a new one runs.
 *
 * Only metadata and redacted evidence are stored. File bodies are not copied
 * into the history.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { dshHome } from '../roots.js';
import { dedupeFindings, sortFindings } from './findings.js';

/** Schema version. */
export const HISTORY_VERSION = 1;
/** Events kept. */
const MAX_EVENTS = 1000;
/** Finding states kept. */
const MAX_STATES = 2000;
/** Findings kept in the last scan. */
const MAX_LAST_FINDINGS = 400;
/** Notification keys kept. */
const MAX_NOTIFICATIONS = 2000;

/** Serialize writes so two requests cannot interleave read-modify-write. */
let writeChain = Promise.resolve();

/**
 * Absolute path of the security history file.
 * @returns `$DSH_HOME/charlotte/security-history.json`.
 */
export function historyPath() {
    return join(dshHome(), 'charlotte', 'security-history.json');
}

/**
 * Defensive finding snapshot: only fields the report needs.
 * @param {object} finding - finding.
 * @returns {object} compact snapshot.
 */
function snapshot(finding) {
    return {
        id: finding.id,
        ruleId: finding.ruleId,
        title: finding.title,
        titleZh: finding.titleZh,
        description: finding.description ?? '',
        descriptionZh: finding.descriptionZh,
        severity: finding.severity,
        category: finding.category,
        target: finding.target,
        filePath: finding.filePath ?? null,
        line: finding.line ?? null,
        confidence: finding.confidence,
        status: finding.status,
        evidence: finding.evidence ?? {},
        impact: finding.impact ?? '',
        impactZh: finding.impactZh,
        attackScenario: finding.attackScenario ?? '',
        attackScenarioZh: finding.attackScenarioZh,
        remediation: finding.remediation ?? '',
        remediationZh: finding.remediationZh,
        references: Array.isArray(finding.references) ? finding.references : [],
        fixable: finding.fixable === true,
        scannerVersion: finding.scannerVersion ?? '',
        detectedAt: finding.detectedAt,
    };
}

/**
 * Empty persisted shape.
 * @returns {object} empty history.
 */
function emptyHistory() {
    // Null-prototype tables: a finding key such as `__proto__` must not be able
    // to mutate Object.prototype through a property assignment.
    return { version: HISTORY_VERSION, events: [], states: Object.create(null), notifications: Object.create(null), lastScan: null };
}

/**
 * Normalize one persisted state row.
 * @param {object} row - raw row.
 * @returns {object|null} normalized state.
 */
function normalizeStateRow(row) {
    if (row === null || typeof row !== 'object' || typeof row.id !== 'string') return null;
    const status = ['detected', 'blocked', 'fixed', 'accepted', 'reviewed', 'unresolved'].includes(row.status) ? row.status : 'detected';
    return {
        id: row.id,
        status,
        severity: typeof row.severity === 'string' ? row.severity : 'INFO',
        ruleId: typeof row.ruleId === 'string' ? row.ruleId : '',
        target: typeof row.target === 'string' ? row.target : '',
        filePath: typeof row.filePath === 'string' ? row.filePath : null,
        line: typeof row.line === 'number' ? row.line : null,
        firstSeenAt: typeof row.firstSeenAt === 'number' ? row.firstSeenAt : 0,
        lastSeenAt: typeof row.lastSeenAt === 'number' ? row.lastSeenAt : 0,
        acceptedAt: typeof row.acceptedAt === 'number' ? row.acceptedAt : undefined,
        note: typeof row.note === 'string' ? row.note.slice(0, 500) : '',
        snapshot: row.snapshot !== null && typeof row.snapshot === 'object' ? row.snapshot : null,
    };
}

/**
 * Security history store with an in-memory cache and serialized atomic writes.
 */
export class SecurityHistory {
    /**
     * @param {string} file - history file path.
     */
    constructor(file = historyPath()) {
        this.file = file;
        this.cache = undefined;
        this.pending = undefined;
    }

    /**
     * Read the history, tolerating a missing or corrupted file.
     * @returns {Promise<object>} normalized history.
     */
    async read() {
        if (this.cache !== undefined) return this.cache;
        let raw;
        try {
            raw = await readFile(this.file, 'utf8');
        }
        catch (error) {
            if (error?.code === 'ENOENT') {
                this.cache = emptyHistory();
                return this.cache;
            }
            throw error;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            parsed = {};
        }
        const base = parsed !== null && typeof parsed === 'object' ? parsed : {};
        const history = emptyHistory();
        if (Array.isArray(base.events)) {
            history.events = base.events.filter(row => row !== null && typeof row === 'object' && typeof row.type === 'string').slice(-MAX_EVENTS);
        }
        if (base.states !== null && typeof base.states === 'object') {
            for (const row of Object.values(base.states)) {
                const clean = normalizeStateRow(row);
                if (clean !== null) history.states[clean.id] = clean;
            }
        }
        if (base.notifications !== null && typeof base.notifications === 'object') {
            for (const [key, row] of Object.entries(base.notifications).slice(-MAX_NOTIFICATIONS)) {
                if (row !== null && typeof row === 'object') history.notifications[key] = row;
            }
        }
        if (base.lastScan !== null && typeof base.lastScan === 'object') history.lastScan = base.lastScan;
        this.cache = history;
        return history;
    }

    /**
     * Apply one mutation with serialized read-modify-write and persist it.
     * @param {Function} mutate - receives the live history.
     * @returns {Promise<*>} the mutation result.
     */
    async update(mutate) {
        const run = async () => {
            const history = await this.read();
            const result = mutate(history);
            this.trim(history);
            await this.flush(history);
            return result;
        };
        const next = writeChain.then(run, run);
        writeChain = next.then(() => undefined, () => undefined);
        return next;
    }

    /**
     * Trim history to its caps.
     * @param {object} history - mutated history.
     */
    trim(history) {
        if (history.events.length > MAX_EVENTS) history.events = history.events.slice(-MAX_EVENTS);
        const ids = Object.keys(history.states);
        if (ids.length > MAX_STATES) {
            const ranked = ids.map(id => ({ id, at: history.states[id].lastSeenAt })).sort((left, right) => left.at - right.at);
            for (const row of ranked.slice(0, ranked.length - MAX_STATES)) delete history.states[row.id];
        }
        const keys = Object.keys(history.notifications);
        if (keys.length > MAX_NOTIFICATIONS) {
            const ranked = keys.map(key => ({ key, at: history.notifications[key].at ?? 0 })).sort((left, right) => left.at - right.at);
            for (const row of ranked.slice(0, ranked.length - MAX_NOTIFICATIONS)) delete history.notifications[row.key];
        }
        if (history.lastScan?.findings?.length > MAX_LAST_FINDINGS) {
            history.lastScan.findings = sortFindings(history.lastScan.findings).slice(0, MAX_LAST_FINDINGS);
        }
    }

    /**
     * Persist atomically.
     * @param {object} history - history to write.
     */
    async flush(history) {
        await mkdir(dirname(this.file), { recursive: true });
        const temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
        // The history contains finding evidence and host paths; keep it
        // readable only by the current user.
        await writeFile(temporary, `${JSON.stringify(history)}\n`, { encoding: 'utf8', mode: 0o600 });
        await rename(temporary, this.file);
    }

    /**
     * Record a completed (or failed) scan and merge finding lifecycle states.
     * @param {object} scan - scan result.
     * @returns {Promise<Array<object>>} findings with merged status.
     */
    async recordScan(scan) {
        return this.update(history => {
            const at = Number.isFinite(scan.at) ? scan.at : Date.now();
            const merged = dedupeFindings(scan.findings ?? []).map(finding => {
                const existing = history.states[finding.id];
                let status = 'detected';
                if (existing !== undefined) {
                    if (existing.status === 'fixed') {
                        // A fixed condition that reappears is unresolved again.
                        status = 'detected';
                    }
                    else if (existing.status === 'accepted' || existing.status === 'reviewed' || existing.status === 'blocked') {
                        // Acceptance, review and a historical block survive a
                        // rescan of the same condition; a block is not a fix.
                        status = existing.status;
                    }
                    if (existing.severity !== finding.severity) status = 'detected';
                    if (existing.severity === 'INFO' && finding.severity !== 'INFO') status = 'detected';
                }
                history.states[finding.id] = {
                    id: finding.id,
                    status,
                    severity: finding.severity,
                    ruleId: finding.ruleId,
                    target: finding.target,
                    filePath: finding.filePath ?? null,
                    line: finding.line ?? null,
                    firstSeenAt: existing?.firstSeenAt ?? at,
                    lastSeenAt: at,
                    acceptedAt: existing?.acceptedAt,
                    note: existing?.note ?? '',
                    snapshot: snapshot({ ...finding, status }),
                };
                return { ...finding, status };
            });
            if (scan.recordLast !== false) {
                history.lastScan = {
                    scanId: scan.scanId,
                    at,
                    mode: scan.mode,
                    trigger: scan.trigger,
                    workspace: scan.workspace ?? '',
                    status: scan.status,
                    durationMs: scan.durationMs ?? 0,
                    scope: scan.scope ?? [],
                    summary: scan.summary,
                    scannerVersion: scan.scannerVersion,
                    complete: scan.status === 'complete',
                    findings: merged,
                    facts: scan.facts ?? {},
                    errors: Array.isArray(scan.errors) ? scan.errors.slice(0, 50) : [],
                };
            }
            history.events.push({
                type: 'scan',
                at,
                scanId: scan.scanId,
                mode: scan.mode,
                trigger: scan.trigger,
                status: scan.status,
                summary: scan.summary,
            });
            return merged;
        });
    }

    /**
     * Mark findings as blocked by an operation.
     * @param {object} input - scan id, target, action and findings.
     * @returns {Promise<number>} number of findings marked blocked.
     */
    async recordBlocked(input) {
        return this.update(history => {
            const at = Date.now();
            let marked = 0;
            for (const finding of input.findings ?? []) {
                const state = history.states[finding.id];
                if (state !== undefined && state.status !== 'accepted' && state.status !== 'fixed') {
                    state.status = 'blocked';
                    if (state.snapshot !== null) state.snapshot.status = 'blocked';
                    marked += 1;
                }
            }
            history.events.push({
                type: 'blocked',
                at,
                scanId: input.scanId ?? '',
                action: String(input.action ?? ''),
                target: String(input.target ?? ''),
                findings: (input.findings ?? []).map(finding => finding.id).slice(0, 50),
            });
            return marked;
        });
    }

    /**
     * Record an explicit exception authorization.
     * @param {object} input - finding keys, reason, target and actor.
     * @returns {Promise<{accepted: number, rejected: Array<string>}>} outcome.
     */
    async recordAuthorization(input) {
        return this.update(history => {
            const at = Date.now();
            const accepted = [];
            const rejected = [];
            for (const key of input.keys ?? []) {
                const state = history.states[key];
                if (state === undefined) {
                    rejected.push(key);
                    continue;
                }
                if (state.severity !== 'HIGH' && state.severity !== 'MEDIUM') {
                    rejected.push(key);
                    continue;
                }
                state.status = 'accepted';
                state.acceptedAt = at;
                state.note = String(input.reason ?? '').slice(0, 500);
                if (state.snapshot !== null) {
                    state.snapshot.status = 'accepted';
                    state.snapshot.note = state.note;
                }
                accepted.push(key);
            }
            history.events.push({
                type: 'authorization',
                at,
                target: String(input.target ?? ''),
                actor: String(input.actor ?? 'local-user'),
                reason: String(input.reason ?? '').slice(0, 500),
                findings: accepted.slice(0, 50),
            });
            return { accepted: accepted.length, rejected };
        });
    }

    /**
     * Change one finding's lifecycle state.
     * @param {string} key - finding id.
     * @param {string} status - new status.
     * @param {string} note - optional note.
     * @returns {Promise<object|null>} updated state.
     */
    async setFindingStatus(key, status, note = '') {
        return this.update(history => {
            const state = history.states[key];
            if (state === undefined) return null;
            state.status = status;
            state.note = String(note ?? '').slice(0, 500);
            if (state.snapshot !== null) {
                state.snapshot.status = status;
                if (state.note !== '') state.snapshot.note = state.note;
            }
            history.events.push({ type: 'finding-status', at: Date.now(), finding: key, status, note: state.note });
            return state;
        });
    }

    /**
     * Findings that have not been notified yet, or whose severity went up, or
     * whose target content changed.
     * @param {Array<object>} findings - current findings.
     * @returns {Promise<Array<{finding: object, reason: string}>>} notifications.
     */
    async pendingNotifications(findings) {
        const history = await this.read();
        const pending = [];
        for (const finding of findings ?? []) {
            const key = `${finding.ruleId}|${finding.target}|${finding.filePath ?? ''}|${finding.line ?? 0}|${finding.id}`;
            const previous = history.notifications[key];
            if (previous === undefined) {
                pending.push({ finding, reason: 'new' });
            }
            else if (previous.severity !== finding.severity) {
                pending.push({ finding, reason: 'severity-changed' });
            }
            else if (previous.findingHash !== finding.id) {
                pending.push({ finding, reason: 'target-changed' });
            }
        }
        return pending;
    }

    /**
     * Mark notifications as delivered.
     * @param {Array<object>} findings - findings that were shown.
     */
    async markNotified(findings) {
        await this.update(history => {
            for (const finding of findings ?? []) {
                const key = `${finding.ruleId}|${finding.target}|${finding.filePath ?? ''}|${finding.line ?? 0}|${finding.id}`;
                history.notifications[key] = { at: Date.now(), severity: finding.severity, findingHash: finding.id };
            }
        });
    }

    /**
     * Last scan snapshot.
     * @returns {Promise<object|null>} last scan.
     */
    async lastScan() {
        return (await this.read()).lastScan;
    }

    /**
     * Recent events, newest first.
     * @param {number} limit - maximum events.
     * @returns {Promise<Array<object>>} events.
     */
    async events(limit = 20) {
        return [...(await this.read()).events].reverse().slice(0, Math.max(1, limit));
    }

    /**
     * All accepted risks (for the report's authorization section).
     * @returns {Promise<Array<object>>} accepted states.
     */
    async accepted() {
        const history = await this.read();
        return Object.values(history.states).filter(state => state.status === 'accepted').slice(0, 500);
    }

    /** Drop the cache so the next read sees an external write (tests). */
    invalidate() {
        this.cache = undefined;
    }
}
