/**
 * The security scan orchestrator.
 *
 * Two execution shapes share one rule engine:
 * - a manual scan (quick/full) with progress, cancellation, timeouts, a single
 *   run at a time, and a persisted result;
 * - an inline gate used by install/import/enable/use, which must finish before
 *   the operation and fail closed on timeout or scanner error.
 *
 * Caching is by content hash (and config/API source signature) and is bypassed
 * by a manual full audit. An incomplete scan is never cached and never treated
 * as safe.
 */
import { randomUUID } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { skillManifestHash } from '../manifest.js';
import { enumerateRoot, writableRoots } from '../roots.js';
import { apiSourcePath, auditApi } from './api-audit.js';
import { auditConfig } from './config-audit.js';
import { auditArchiveEntries } from './archive-audit.js';
import {
    blockingFindings,
    dedupeFindings,
    sortFindings,
    summarizeFindings,
} from './findings.js';
import { SecurityHistory } from './history.js';
import { maxSeverity } from './severity.js';
import { auditSourcePath, isSensitivePath, isWithin, realpathDeep } from './path-audit.js';
import { buildReview } from './review.js';
import { auditSkill, auditSkillFiles } from './skill-audit.js';
import { catalogSummary, lineAt, ruleFinding, SCANNER_VERSION } from './rules.js';

/** How long one object may take before it is marked unverified. */
const DEFAULT_PER_OBJECT_TIMEOUT_MS = 20_000;
/** Targets in one quick scan before it becomes partial. */
const MAX_QUICK_TARGETS = 400;
/** Cached scan results kept in memory. */
const MAX_CACHE_ENTRIES = 600;
/** Delay before a filesystem change triggers a background scan. */
const CHANGE_DEBOUNCE_MS = 750;
/** Text files larger than this are not re-read for the safe-fix preview. */
const MAX_FIX_BYTES = 2 * 1024 * 1024;

/**
 * Invisible characters the safe fix removes; newline and tab are preserved.
 * The Unicode tag block (U+E0000–U+E007F) is included because the content
 * rules report it as SEC-SKILL-010: a fix that omitted it would promise to
 * remove the exact characters it cannot see.
 */
const INVISIBLE_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001A\u001C-\u001F\u007F\u200B-\u200D\u202A-\u202E\u2066-\u2069\u200E\u200F\uFEFF\u{E0000}-\u{E007F}]/gu;

/**
 * Yield to the event loop so a scan cannot monopolise a request thread.
 * @returns {Promise<void>} resolves on the next turn.
 */
function yieldTick() {
    return new Promise(resolve => {
        if (typeof setImmediate === 'function') setImmediate(resolve);
        else setTimeout(resolve, 0);
    });
}

/**
 * Run a promise with a deadline and optional abort signal.
 * @param {Promise} promise - work.
 * @param {number} timeoutMs - deadline.
 * @param {AbortSignal} signal - cancellation.
 * @returns {Promise<object>} `{value}`, `{error}`, `{timeout:true}` or `{cancelled:true}`.
 */
function withTimeout(promise, timeoutMs, signal) {
    return new Promise(resolve => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            signal?.removeEventListener('abort', onAbort);
            resolve(result);
        };
        const onAbort = () => finish({ cancelled: true });
        const timer = setTimeout(() => finish({ timeout: true }), Math.max(1, timeoutMs));
        timer.unref?.();
        if (signal?.aborted === true) {
            finish({ cancelled: true });
            return;
        }
        signal?.addEventListener('abort', onAbort, { once: true });
        promise.then(value => finish({ value }), error => finish({ error }));
    });
}

/**
 * Summarize one scan result consistently.
 * @param {Array<object>} findings - findings.
 * @returns {object} summary.
 */
function summaryOf(findings) {
    return summarizeFindings(findings);
}

/**
 * Everything the scanner needs, with no host services required for the core.
 */
export class SecurityScanner {
    /**
     * @param {object} options - host context, config, provider and stores.
     */
    constructor(options = {}) {
        this.ctx = options.ctx;
        this.config = options.config ?? {};
        this.rawConfig = options.rawConfig;
        this.provider = options.provider;
        this.index = options.index;
        this.history = options.history ?? new SecurityHistory();
        this.logger = options.logger;
        this.perObjectTimeoutMs = Number.isFinite(options.perObjectTimeoutMs) ? options.perObjectTimeoutMs : DEFAULT_PER_OBJECT_TIMEOUT_MS;
        this.scannerVersion = SCANNER_VERSION;
        /** @type {Map<string, object>} */
        this.cache = new Map();
        /** @type {object|null} */
        this.run = null;
        this.scanCounter = 0;
        this.changeTimer = undefined;
        this.disposed = false;
    }

    /**
     * Workspace list from the host registry.
     * @returns {Array<object>|undefined} list, or undefined in headless mode.
     */
    workspaces() {
        const registry = this.ctx?.get?.('workspaceRegistry');
        if (registry === undefined) return undefined;
        try {
            return registry.list().map(workspace => ({ path: workspace.path, title: workspace.title ?? workspace.path }));
        }
        catch {
            return [];
        }
    }

    /**
     * Cache an entry, evicting the oldest when over the bound.
     * @param {string} key - cache key.
     * @param {object} value - cached result.
     */
    cacheSet(key, value) {
        if (this.cache.size >= MAX_CACHE_ENTRIES) {
            const oldest = this.cache.keys().next().value;
            if (oldest !== undefined) this.cache.delete(oldest);
        }
        this.cache.set(key, value);
    }

    /**
     * Mark every cached skill result stale (config or rule change).
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Start a manual scan. Only one manual scan runs at a time.
     * @param {object} input - mode, workspace, optional target and trigger.
     * @returns {Promise<object>} `{started, runId, mode}` or a conflict reason.
     */
    async start(input = {}) {
        const mode = input.mode === 'full' ? 'full' : 'quick';
        if (this.run !== null && this.run.status === 'running') {
            return { started: false, reason: 'scan already running', runId: this.run.runId };
        }
        const workspace = typeof input.workspace === 'string' ? input.workspace : '';
        const run = {
            runId: `scan-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
            mode,
            trigger: typeof input.trigger === 'string' ? input.trigger : 'manual',
            workspace,
            startedAt: Date.now(),
            finishedAt: 0,
            status: 'running',
            phase: 'collecting',
            current: '',
            done: 0,
            total: 0,
            findings: [],
            errors: [],
            scope: [],
            facts: {},
            cancelRequested: false,
            controller: new AbortController(),
            target: input.target ?? null,
        };
        this.run = run;
        void this.execute(run).catch(error => {
            this.logger?.warn?.(`dsh-charlotte: security scan crashed: ${error instanceof Error ? error.message : String(error)}`);
        });
        return { started: true, runId: run.runId, mode };
    }

    /**
     * Request cancellation of the active scan.
     * @returns {{cancelled: boolean, runId: string}} outcome.
     */
    cancel() {
        const run = this.run;
        if (run === null || run.status !== 'running') return { cancelled: false, runId: run?.runId ?? '' };
        run.cancelRequested = true;
        run.controller.abort();
        return { cancelled: true, runId: run.runId };
    }

    /**
     * Execute one manual run.
     * @param {object} run - run state.
     */
    async execute(run) {
        const startedAt = Date.now();
        try {
            const collected = await this.collectTargets(run);
            run.scope = collected.scope;
            run.total = collected.steps.length;
            run.phase = 'scanning';
            if (run.cancelRequested) throw new ScanCancelled();
            for (const step of collected.steps) {
                if (run.cancelRequested) throw new ScanCancelled();
                run.current = step.label;
                await yieldTick();
                const result = await this.executeStep(step, run, run.mode === 'full');
                run.findings.push(...result.findings);
                if (result.error !== undefined) run.errors.push(result.error);
                run.done += 1;
            }
            run.phase = 'finalizing';
            run.findings = dedupeFindings(run.findings);
            const summary = summaryOf(run.findings);
            const complete = run.errors.length === 0 && collected.complete;
            const status = complete ? 'complete' : (run.findings.length > 0 || run.done > 0 ? 'partial' : 'failed');
            if (!complete) {
                run.findings.push(ruleFinding('SEC-SCAN-003', {
                    target: `scan:${run.runId}`,
                    evidence: { errors: run.errors.slice(0, 10), skipped: collected.skipped },
                }));
            }
            const mergedFindings = await this.history.recordScan({
                scanId: run.runId,
                at: startedAt,
                mode: run.mode,
                trigger: run.trigger,
                workspace: run.workspace,
                status,
                durationMs: Date.now() - startedAt,
                scope: run.scope,
                findings: run.findings,
                summary: summaryOf(run.findings),
                errors: run.errors,
                facts: run.facts,
                recordLast: true,
            });
            run.findings = mergedFindings;
            run.status = status;
        }
        catch (error) {
            const cancelled = error instanceof ScanCancelled || run.cancelRequested;
            const finding = ruleFinding(cancelled ? 'SEC-SCAN-003' : 'SEC-SCAN-002', {
                target: `scan:${run.runId}`,
                severity: cancelled ? 'MEDIUM' : 'HIGH',
                evidence: { snippet: cancelled ? 'scan cancelled by the user' : String(error instanceof Error ? error.message : error).slice(0, 300) },
            });
            run.findings = dedupeFindings([...run.findings, finding]);
            run.errors.push(cancelled ? 'cancelled' : String(error instanceof Error ? error.message : error));
            const status = cancelled ? 'cancelled' : 'failed';
            try {
                const merged = await this.history.recordScan({
                    scanId: run.runId,
                    at: startedAt,
                    mode: run.mode,
                    trigger: run.trigger,
                    workspace: run.workspace,
                    status,
                    durationMs: Date.now() - startedAt,
                    scope: run.scope,
                    findings: run.findings,
                    summary: summaryOf(run.findings),
                    errors: run.errors,
                    facts: run.facts,
                    recordLast: true,
                });
                run.findings = merged;
            }
            catch {
                // The in-memory result is still returned to the caller.
            }
            run.status = status;
        }
        finally {
            run.phase = 'done';
            run.current = '';
            run.finishedAt = Date.now();
        }
    }

    /**
     * Collect the ordered scan steps and the scope description.
     * @param {object} run - run state.
     * @returns {Promise<{steps: Array<object>, scope: Array<object>, complete: boolean, skipped: Array<string>}>} plan.
     */
    async collectTargets(run) {
        const steps = [];
        const scope = [];
        const skipped = [];
        let complete = true;

        if (run.target !== null && typeof run.target === 'object' && typeof run.target.path === 'string') {
            const target = run.target;
            steps.push({ kind: 'skill', label: `skill:${target.name ?? basename(target.path)}`, name: String(target.name ?? basename(target.path)), path: target.path, rootPath: target.rootPath, scopeKind: target.kind ?? 'target' });
            scope.push({ kind: target.kind ?? 'target', name: target.name ?? basename(target.path), path: target.path });
            return { steps, scope, complete, skipped };
        }

        if (run.mode === 'full' || (run.target === null && run.mode === 'quick')) {
            steps.push({ kind: 'config', label: 'configuration' });
            steps.push({ kind: 'api', label: 'api handlers' });
            scope.push({ kind: 'config', name: 'configuration', path: null });
            scope.push({ kind: 'api', name: 'api handlers', path: null });
        }

        const workspaces = run.workspace !== ''
            ? [run.workspace]
            : (this.workspaces() ?? []).map(workspace => workspace.path);
        const seen = new Set();
        for (const root of writableRoots(workspaces)) {
            let skills = [];
            const issues = [];
            try {
                skills = await enumerateRoot(root, issues);
            }
            catch (error) {
                complete = false;
                run.errors.push(`${root.id}: ${error instanceof Error ? error.message : String(error)}`);
                continue;
            }
            issues.forEach(issue => skipped.push(issue));
            for (const skill of skills) {
                const key = `${skill.path}`;
                if (seen.has(key)) continue;
                seen.add(key);
                steps.push({ kind: 'skill', label: skill.name, name: skill.name, path: skill.path, rootPath: root.path, scopeKind: 'writable' });
                scope.push({ kind: 'writable', name: skill.name, path: skill.path, root: root.id });
            }
        }

        if (this.provider !== undefined && typeof this.provider.list === 'function') {
            try {
                const candidates = await this.provider.list({ cwd: run.workspace === '' ? undefined : run.workspace });
                for (const candidate of candidates) {
                    const path = typeof candidate?.path === 'string' ? candidate.path : '';
                    if (path === '' || seen.has(path)) continue;
                    seen.add(path);
                    steps.push({ kind: 'skill', label: candidate.name, name: candidate.name, path, scopeKind: 'mounted' });
                    scope.push({ kind: 'mounted', name: candidate.name, path });
                }
            }
            catch (error) {
                complete = false;
                run.errors.push(`mounted provider: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        const registry = this.ctx?.get?.('skills');
        if (registry !== undefined && typeof registry.snapshot === 'function') {
            try {
                const snapshot = await registry.snapshot(run.workspace === '' ? {} : { cwd: run.workspace });
                if (snapshot?.complete === false) complete = false;
                for (const summary of snapshot?.skills ?? []) {
                    const path = typeof summary?.path === 'string' ? summary.path : '';
                    if (path === '') {
                        scope.push({ kind: 'registry', name: summary?.name ?? '', path: null, skipped: 'no-readable-path' });
                        continue;
                    }
                    if (seen.has(path)) continue;
                    seen.add(path);
                    steps.push({ kind: 'skill', label: summary.name, name: summary.name, path, scopeKind: 'registry' });
                    scope.push({ kind: 'registry', name: summary.name, path });
                }
            }
            catch (error) {
                complete = false;
                run.errors.push(`skill registry: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        if (run.mode === 'quick' && steps.length > MAX_QUICK_TARGETS) {
            skipped.push(`quick scan limited to ${String(MAX_QUICK_TARGETS)} targets`);
            steps.length = MAX_QUICK_TARGETS;
            complete = false;
        }
        if (skipped.length > 0) complete = false;
        return { steps, scope, complete, skipped };
    }

    /**
     * Execute one step with a deadline.
     * @param {object} step - step descriptor.
     * @param {object} run - run state.
     * @param {boolean} force - bypass the cache.
     * @returns {Promise<{findings: Array<object>, error?: string}>} step result.
     */
    async executeStep(step, run, force) {
        try {
            if (step.kind === 'config') {
                const result = await withTimeout(this.auditConfigStep(force), this.perObjectTimeoutMs, run.controller.signal);
                if (result.cancelled) throw new ScanCancelled();
                if (result.timeout) return this.timeoutResult(step, run);
                if (result.error !== undefined) return this.errorResult(step, result.error);
                run.facts.config = result.value.facts;
                return { findings: result.value.findings };
            }
            if (step.kind === 'api') {
                const result = await withTimeout(this.auditApiStep(), this.perObjectTimeoutMs, run.controller.signal);
                if (result.cancelled) throw new ScanCancelled();
                if (result.timeout) return this.timeoutResult(step, run);
                if (result.error !== undefined) return this.errorResult(step, result.error);
                run.facts.api = result.value.facts;
                return { findings: result.value.findings };
            }
            const result = await withTimeout(
                this.auditSkillStep(step, force),
                this.perObjectTimeoutMs,
                run.controller.signal,
            );
            if (result.cancelled) throw new ScanCancelled();
            if (result.timeout) return this.timeoutResult(step, run);
            if (result.error !== undefined) return this.errorResult(step, result.error);
            if (step.kind === 'skill' && typeof step.name === 'string' && step.name !== '') {
                run.facts.skillHashes ??= {};
                run.facts.skillHashes[step.name] = result.value.manifestHash ?? '';
            }
            return { findings: result.value.findings };
        }
        catch (error) {
            if (error instanceof ScanCancelled) throw error;
            return this.errorResult(step, error);
        }
    }

    /**
     * Build a timeout result for one step.
     * @param {object} step - step.
     * @param {object} run - run state.
     * @returns {{findings: Array<object>, error: string}} result.
     */
    timeoutResult(step, run) {
        const message = `${step.label} timed out after ${String(this.perObjectTimeoutMs)}ms`;
        run.errors.push(message);
        return {
            findings: [ruleFinding('SEC-SCAN-001', {
                target: `skill:${step.name ?? step.label}`,
                filePath: step.path ?? null,
                evidence: { snippet: message, phase: step.kind },
            })],
            error: message,
        };
    }

    /**
     * Build an error result for one step (fail closed).
     * @param {object} step - step.
     * @param {unknown} error - thrown value.
     * @returns {{findings: Array<object>, error: string}} result.
     */
    errorResult(step, error) {
        const message = `${step.label}: ${error instanceof Error ? error.message : String(error)}`;
        return {
            findings: [ruleFinding('SEC-SCAN-002', {
                target: step.kind === 'skill' ? `skill:${step.name ?? step.label}` : step.kind,
                filePath: step.path ?? null,
                evidence: { snippet: message.slice(0, 300) },
            })],
            error: message,
        };
    }

    /**
     * Config step with content/source caching.
     * @param {boolean} force - bypass cache.
     * @returns {Promise<object>} audit result.
     */
    async auditConfigStep(force) {
        const key = `config:${JSON.stringify(this.config)}`;
        if (!force) {
            const cached = this.cache.get(key);
            if (cached !== undefined) return cached;
        }
        const result = await auditConfig({ resolved: this.config, raw: this.rawConfig });
        const value = { findings: result.findings, facts: result.facts };
        this.cacheSet(key, value);
        return value;
    }

    /**
     * API source step with mtime/size caching.
     * @param {boolean} force - bypass cache.
     * @returns {Promise<object>} audit result.
     */
    async auditApiStep() {
        const result = await auditApi();
        return { findings: result.findings, facts: result.facts };
    }

    /**
     * One skill step with manifest-hash caching.
     * @param {object} step - skill step.
     * @param {boolean} force - bypass cache.
     * @returns {Promise<object>} audit result.
     */
    async auditSkillStep(step, force) {
        const hash = await skillManifestHash(step.path);
        const key = `skill:${step.path}:${hash}:${step.name ?? ''}:${step.rootPath ?? ''}`;
        if (!force) {
            const cached = this.cache.get(key);
            if (cached !== undefined) return cached;
        }
        const result = await auditSkill({
            path: step.path,
            name: step.name,
            target: `skill:${step.name}`,
            rootPath: step.rootPath,
        });
        const value = {
            findings: result.findings,
            complete: result.complete,
            issues: result.issues,
            files: result.files,
            bytes: result.bytes,
            hash: result.hash,
            manifestHash: hash,
        };
        // Only a complete result is safe to reuse.
        if (result.complete) this.cacheSet(key, value);
        return value;
    }

    /**
     * Inline scan for an operation gate. Never returns a cached "safe" answer
     * for an incomplete earlier scan.
     * @param {object} step - skill descriptor.
     * @returns {Promise<object>} scan result.
     */
    async scanSkillInline(step) {
        const startedAt = Date.now();
        const scanId = `auto-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
        try {
            const hash = await skillManifestHash(step.path);
            const key = `skill:${step.path}:${hash}:${step.name ?? ''}:${step.rootPath ?? ''}`;
            const cached = this.cache.get(key);
            let value;
            if (cached !== undefined) {
                value = cached;
            }
            else {
                const result = await withTimeout(auditSkill({
                    path: step.path,
                    name: step.name,
                    target: step.target,
                    rootPath: step.rootPath,
                }), this.perObjectTimeoutMs);
                if (result.timeout) {
                    return {
                        scanId,
                        findings: [ruleFinding('SEC-SCAN-001', { target: step.target, filePath: step.path, evidence: { snippet: 'inline scan timed out' } })],
                        complete: false,
                        status: 'failed',
                        durationMs: Date.now() - startedAt,
                    };
                }
                if (result.error !== undefined) {
                    return {
                        scanId,
                        findings: [ruleFinding('SEC-SCAN-002', { target: step.target, filePath: step.path, evidence: { snippet: String(result.error).slice(0, 300) } })],
                        complete: false,
                        status: 'failed',
                        durationMs: Date.now() - startedAt,
                    };
                }
                value = result.value;
                if (value.complete) this.cacheSet(key, value);
            }
            return {
                scanId,
                findings: value.findings,
                complete: value.complete,
                status: value.complete ? 'complete' : 'partial',
                durationMs: Date.now() - startedAt,
                hash,
            };
        }
        catch (error) {
            return {
                scanId,
                findings: [ruleFinding('SEC-SCAN-002', { target: step.target, filePath: step.path, evidence: { snippet: String(error instanceof Error ? error.message : error).slice(0, 300) } })],
                complete: false,
                status: 'failed',
                durationMs: Date.now() - startedAt,
            };
        }
    }

    /**
     * Apply the persisted exceptions to a fresh result.
     * @param {Array<object>} findings - fresh findings.
     * @returns {Promise<Array<object>>} findings with accepted status where an exception applies.
     */
    async applyExceptions(findings) {
        const history = await this.history.read();
        return findings.map(finding => {
            const state = history.states[finding.id];
            if (state !== undefined && state.status === 'accepted' && state.severity === finding.severity) {
                return { ...finding, status: 'accepted', note: state.note };
            }
            return finding;
        });
    }

    /**
     * Decide and persist one gate result.
     * @param {object} input - scan result, action, target and optional review flag.
     * @returns {Promise<object>} gate decision.
     */
    async decide(input) {
        // Only an explicit Security Center authorization can mark a HIGH
        // finding accepted. A legacy first-use review covers a different rule
        // set and must not silently bypass the scanner.
        const findings = dedupeFindings(await this.applyExceptions(input.findings ?? []));
        // A partial scan is a failure to verify, not a pass. Fail closed for
        // gates: an unreadable file must not make the skill look safe.
        if (input.complete !== true) {
            const partial = ruleFinding('SEC-SCAN-003', {
                target: input.target ?? `scan:${String(input.scanId ?? '')}`,
                filePath: input.path ?? null,
                severity: 'HIGH',
                confidence: 'certain',
                evidence: { reason: 'the target could not be fully scanned', scanStatus: input.complete === false ? 'partial' : 'unknown' },
            });
            // A partial scan can only pass after an explicit, recorded HIGH
            // acceptance of this exact condition; otherwise it stays blocked.
            const [resolved] = await this.applyExceptions([partial]);
            if (resolved.status !== 'accepted') findings.push(partial);
        }
        const blocking = blockingFindings(dedupeFindings(findings));
        const summary = summaryOf(findings);
        const risk = maxSeverity(findings.map(finding => finding.severity));
        const status = input.complete === true ? 'complete' : 'partial';
        let notify = false;
        try {
            await this.history.recordScan({
                scanId: input.scanId,
                at: Date.now(),
                mode: 'auto',
                trigger: input.trigger ?? 'gate',
                workspace: input.workspace ?? '',
                status: blocking.length > 0 && status === 'complete' ? 'complete' : status,
                durationMs: input.durationMs ?? 0,
                scope: [{ kind: input.targetKind ?? 'skill', name: input.name ?? '', path: input.path ?? null, action: input.action }],
                findings,
                summary,
                errors: [],
                recordLast: false,
            });
            if (blocking.length > 0) {
                await this.history.recordBlocked({
                    scanId: input.scanId,
                    action: input.action,
                    target: input.target,
                    findings: blocking,
                });
                // Only a condition the user has not been shown yet deserves a
                // popup; a repeated attempt still returns the findings inline.
                const pending = await this.history.pendingNotifications(blocking);
                notify = pending.length > 0;
                await this.history.markNotified(blocking);
            }
        }
        catch (error) {
            this.logger?.warn?.(`dsh-charlotte: security gate persistence failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (blocking.length > 0) {
            return {
                allowed: false,
                code: 'security-blocked',
                reason: `Security policy blocked this ${input.action}: ${blocking.map(finding => finding.ruleId).join(', ')}`,
                findings: blocking.map(finding => ({ ...finding, status: 'blocked' })),
                allFindings: findings,
                summary,
                risk,
                scanId: input.scanId,
                notify,
            };
        }
        return { allowed: true, findings, summary, risk, scanId: input.scanId, notify: false };
    }

    /**
     * Gate an on-disk skill before install/enable/use.
     * @param {object} input - name, path, root, action and review flag.
     * @returns {Promise<object>} gate decision.
     */
    async gateSkill(input) {
        const target = input.target ?? `skill:${input.name ?? basename(input.path ?? '')}`;
        const startedAt = Date.now();
        const result = await this.scanSkillInline({
            path: input.path,
            name: input.name,
            target,
            rootPath: input.rootPath,
        });
        return this.decide({
            ...result,
            scanId: result.scanId ?? `auto-${randomUUID().slice(0, 8)}`,
            action: input.action ?? 'use',
            target,
            name: input.name ?? '',
            path: input.path ?? null,
            workspace: input.workspace ?? '',
            trigger: input.trigger ?? 'gate',
            durationMs: Date.now() - startedAt,
            complete: result.complete === true,
            targetKind: input.kind ?? 'skill',
        });
    }

    /**
     * Gate an in-memory upload before it is written.
     * @param {object} input - files, target, action and workspace.
     * @returns {Promise<object>} gate decision.
     */
    async gateUpload(input) {
        const target = input.target ?? 'upload';
        try {
            const result = auditSkillFiles(input.files ?? [], { target });
            return this.decide({
                scanId: `auto-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`,
                findings: result.findings,
                complete: result.complete,
                action: input.action ?? 'install',
                target,
                name: input.name ?? '',
                path: null,
                workspace: input.workspace ?? '',
                trigger: input.trigger ?? 'install',
                durationMs: 0,
                targetKind: 'upload',
            });
        }
        catch (error) {
            return this.decide({
                scanId: `auto-${randomUUID().slice(0, 8)}`,
                findings: [ruleFinding('SEC-SCAN-002', {
                    target,
                    evidence: { snippet: String(error instanceof Error ? error.message : error).slice(0, 300) },
                })],
                complete: false,
                action: input.action ?? 'install',
                target,
                name: input.name ?? '',
                path: null,
                workspace: input.workspace ?? '',
                trigger: input.trigger ?? 'install',
                targetKind: 'upload',
            });
        }
    }

    /**
     * Gate a ZIP central directory before decompression.
     * @param {object} input - entries, target and action.
     * @returns {Promise<object>} gate decision.
     */
    async gateArchive(input) {
        const target = input.target ?? 'archive';
        const result = auditArchiveEntries(input.entries ?? [], { target });
        return this.decide({
            scanId: `auto-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`,
            findings: result.findings,
            complete: true,
            action: input.action ?? 'install',
            target,
            name: input.name ?? '',
            path: null,
            workspace: input.workspace ?? '',
            trigger: input.trigger ?? 'archive',
            targetKind: 'archive',
        });
    }

    /**
     * Gate a local-path install source before reading its files.
     * @param {object} input - source path, target and action.
     * @returns {Promise<object>} gate decision.
     */
    async gateSourcePath(input) {
        const target = input.target ?? 'import-path';
        // Shared with the standalone path audit: sensitive roots, symlink
        // indirection and world-writable sources are all covered there.
        const findings = await auditSourcePath(input.sourcePath, { target });
        return this.decide({
            scanId: `auto-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`,
            findings,
            complete: true,
            action: input.action ?? 'install',
            target,
            name: '',
            path: input.sourcePath ?? null,
            workspace: input.workspace ?? '',
            trigger: 'import-path',
            targetKind: 'source-path',
        });
    }

    /**
     * Scan one skill read-only and shape the Security Review payload. This is
     * not an operation gate: it records the review scan but never executes or
     * blocks an install/use.
     * @param {object} input - name, path, root, review hash and workspace.
     * @returns {Promise<object>} review payload.
     */
    async reviewSkill(input) {
        const target = `skill:${input.name ?? basename(input.path ?? '')}`;
        const startedAt = Date.now();
        const result = await this.scanSkillInline({
            path: input.path,
            name: input.name,
            target,
            rootPath: input.rootPath,
        });
        const findings = dedupeFindings(await this.applyExceptions(result.findings ?? []));
        const reviewInput = {
            findings,
            complete: result.complete === true,
            scanStatus: result.status ?? 'complete',
            hash: result.hash,
            reviewHash: input.reviewHash,
            scanId: result.scanId,
            durationMs: Date.now() - startedAt,
        };
        let review = buildReview(reviewInput);
        try {
            const merged = await this.history.recordScan({
                scanId: result.scanId,
                at: startedAt,
                mode: 'auto',
                trigger: 'review',
                workspace: input.workspace ?? '',
                status: review.state === 'FAILED' ? 'failed' : review.complete ? 'complete' : 'partial',
                durationMs: Date.now() - startedAt,
                scope: [{ kind: input.kind ?? 'skill', name: input.name ?? '', path: input.path ?? null, action: 'review', hash: result.hash ?? '' }],
                findings,
                summary: review.summary,
                errors: [],
                recordLast: false,
            });
            // A historical block is a real blocked operation; merge it into the
            // review so the blocked count and state reflect persisted history.
            review = buildReview({ ...reviewInput, findings: dedupeFindings(merged) });
        }
        catch (error) {
            this.logger?.warn?.(`dsh-charlotte: security review persistence failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return review;
    }

    /**
     * Aggregate the last completed scan into per-skill pass/fail rows for the
     * persistent "all skills" review view. It never starts or mutates a scan.
     * @param {object} input - workspace.
     * @returns {Promise<object>} aggregate review.
     */
    async reviewAll(input = {}) {
        const workspace = typeof input.workspace === 'string' ? input.workspace : '';
        const built = this.index === undefined ? undefined : await this.index.build(workspace);
        if (built === undefined) return { available: false, items: [], lastScan: null, counts: {}, allPassed: false };
        const history = await this.history.read();
        // The persistent all-skills verdict is only valid after a full audit;
        // a first-open quick scan or a target rescan must not be shown as one.
        const lastScan = history.lastScan !== null && history.lastScan.mode === 'full' ? history.lastScan : null;
        const scope = Array.isArray(lastScan?.scope) ? lastScan.scope : [];
        const items = [];
        for (const skill of built.skills ?? []) {
            const name = String(skill.name ?? '');
            const path = skill.management?.path;
            const source = skill.source ?? null;
            const base = { name, source, reviewHash: skill.reviewHash ?? '', contentHash: skill.contentHash ?? '' };
            if (typeof path !== 'string' || path === '' || name === '') {
                items.push({ ...base, state: 'UNCHECKED', summary: summarizeFindings([]), stale: false });
                continue;
            }
            const inScope = lastScan !== null && scope.some(row => row.name === name || row.path === path);
            const currentHash = await skillManifestHash(path);
            const recordedHash = lastScan?.facts?.skillHashes?.[name] ?? '';
            const stale = lastScan !== null && (recordedHash === '' || currentHash === '' || recordedHash !== currentHash);
            if (lastScan === null || !inScope) {
                items.push({ ...base, state: 'UNCHECKED', summary: summarizeFindings([]), hash: currentHash, stale: false });
                continue;
            }
            if (lastScan.status === 'failed' || lastScan.status === 'cancelled') {
                items.push({ ...base, state: lastScan.status === 'failed' ? 'FAILED' : 'CANCELLED', summary: summarizeFindings([]), hash: currentHash, stale: false });
                continue;
            }
            if (stale) {
                items.push({ ...base, state: 'STALE', summary: summarizeFindings([]), hash: currentHash, stale: true });
                continue;
            }
            if (lastScan.complete !== true) {
                items.push({ ...base, state: 'PARTIAL', summary: summarizeFindings([]), hash: currentHash, stale: false });
                continue;
            }
            const findings = (lastScan.findings ?? []).filter(finding => finding.target === `skill:${name}`);
            const merged = dedupeFindings(await this.applyExceptions(findings));
            const review = buildReview({ findings: merged, complete: true, scanStatus: 'complete', hash: currentHash, reviewHash: skill.reviewHash });
            items.push({
                ...base,
                state: review.state,
                summary: review.summary,
                checks: review.checks.map(check => ({ id: check.id, status: check.status, count: check.count })),
                hash: currentHash,
                stale: false,
            });
        }
        const counts = { total: items.length, passed: 0, warning: 0, blocked: 0, failed: 0, cancelled: 0, partial: 0, unchecked: 0, stale: 0 };
        for (const item of items) {
            if (item.state === 'PASSED') counts.passed += 1;
            else if (item.state === 'WARNING') counts.warning += 1;
            else if (item.state === 'BLOCKED') counts.blocked += 1;
            else if (item.state === 'FAILED') counts.failed += 1;
            else if (item.state === 'CANCELLED') counts.cancelled += 1;
            else if (item.state === 'PARTIAL') counts.partial += 1;
            else if (item.state === 'STALE') counts.stale += 1;
            else counts.unchecked += 1;
        }
        return {
            available: true,
            workspace,
            lastScan: lastScan === null ? null : {
                scanId: lastScan.scanId,
                at: lastScan.at,
                status: lastScan.status,
                complete: lastScan.complete,
                durationMs: lastScan.durationMs,
                errors: Array.isArray(lastScan.errors) ? lastScan.errors.slice(0, 10) : [],
            },
            items,
            counts,
            allPassed: items.length > 0 && items.every(item => item.state === 'PASSED'),
            generatedAt: Date.now(),
        };
    }

    /**
     * Authorize an exception for HIGH/MEDIUM findings. CRITICAL is never accepted.
     * @param {object} input - finding keys, reason, target and actor.
     * @returns {Promise<{accepted: number, rejected: Array<string>, error?: string}>} outcome.
     */
    async authorizeException(input) {
        const keys = Array.isArray(input.keys) ? input.keys.filter(key => typeof key === 'string').slice(0, 20) : [];
        const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
        if (keys.length === 0) return { accepted: 0, rejected: [], error: 'finding keys are required' };
        const history = await this.history.read();
        const critical = keys.filter(key => history.states[key]?.severity === 'CRITICAL');
        if (critical.length > 0) {
            return { accepted: 0, rejected: critical, error: 'CRITICAL findings cannot be authorized; fix the condition instead' };
        }
        const ineligible = keys.filter(key => {
            const severity = history.states[key]?.severity;
            return severity !== 'HIGH' && severity !== 'MEDIUM';
        });
        if (ineligible.length > 0) {
            return { accepted: 0, rejected: ineligible, error: 'only HIGH or MEDIUM findings may be accepted' };
        }
        const result = await this.history.recordAuthorization({
            keys,
            reason,
            target: input.target ?? '',
            actor: input.actor ?? 'local-user',
        });
        return result;
    }

    /**
     * Change a finding's lifecycle state.
     * @param {object} input - key, status, note.
     * @returns {Promise<{ok: boolean, error?: string, state?: object}>} outcome.
     */
    async setFindingStatus(input) {
        const allowed = ['reviewed', 'unresolved', 'detected'];
        if (!allowed.includes(input.status)) {
            return { ok: false, error: `status must be one of ${allowed.join(', ')}` };
        }
        const state = await this.history.setFindingStatus(input.key, input.status, input.note ?? '');
        return state === null ? { ok: false, error: 'finding not found' } : { ok: true, state };
    }

    /**
     * Preview the only automated fix: stripping invisible characters from a
     * writable skill file.
     * @param {string} key - finding id.
     * @returns {Promise<object>} preview or an error.
     */
    async previewFix(key) {
        const found = await this.resolveFixTarget(key);
        if (found.error !== undefined) return { error: found.error };
        const { path, content } = found;
        const matches = [...content.matchAll(INVISIBLE_PATTERN)];
        if (matches.length === 0) return { error: 'no invisible characters remain in the file' };
        const locations = matches.slice(0, 20).map(match => ({
            line: lineAt(content, match.index ?? 0),
            codePoint: 'U+' + (String(match[0]).codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0'),
        }));
        const next = content.replace(INVISIBLE_PATTERN, '');
        const lines = content.split('\n');
        const nextLines = next.split('\n');
        const firstLine = Math.max(1, (locations[0]?.line ?? 1) - 2);
        const lastLine = Math.min(lines.length, (locations[locations.length - 1]?.line ?? 1) + 2);
        return {
            key,
            path,
            removed: matches.length,
            locations,
            hash: (await import('node:crypto')).createHash('sha256').update(content).digest('hex'),
            before: lines.slice(firstLine - 1, lastLine).join('\n'),
            after: nextLines.slice(firstLine - 1, lastLine).join('\n'),
            safeFix: 'strip-invisible-characters',
        };
    }

    /**
     * Apply the safe fix after verifying the file did not change since preview.
     * @param {object} input - key, expected hash and confirm flag.
     * @returns {Promise<object>} outcome.
     */
    async applyFix(input) {
        if (input.confirm !== true) return { applied: false, error: 'explicit confirmation is required' };
        const found = await this.resolveFixTarget(input.key);
        if (found.error !== undefined) return { applied: false, error: found.error };
        const { path, content } = found;
        const { createHash } = await import('node:crypto');
        const current = createHash('sha256').update(content).digest('hex');
        if (current !== input.expectedHash) {
            // The file changed between preview and apply: a real TOCTOU
            // observation, not just an error message.
            const finding = ruleFinding('SEC-FS-005', {
                target: `file:${path}`,
                filePath: path,
                evidence: { expectedHash: input.expectedHash.slice(0, 32), currentHash: current.slice(0, 32) },
            });
            try {
                await this.history.recordScan({
                    scanId: `fix-${randomUUID().slice(0, 8)}`,
                    at: Date.now(),
                    mode: 'auto',
                    trigger: 'safe-fix',
                    status: 'partial',
                    durationMs: 0,
                    scope: [{ kind: 'file', name: basename(path), path, action: 'safe-fix' }],
                    findings: [finding],
                    summary: summaryOf([finding]),
                    errors: [],
                    recordLast: false,
                });
                await this.history.markNotified([finding]);
            }
            catch {
                // The refusal itself is still returned.
            }
            return { applied: false, error: 'the file changed after the preview; preview again', finding };
        }
        const next = content.replace(INVISIBLE_PATTERN, '');
        if (next === content) return { applied: false, error: 'nothing to remove' };
        const info = await lstat(path);
        if (info.isSymbolicLink()) return { applied: false, error: 'refusing to write through a symbolic link' };
        try {
            const { writeFile, rename } = await import('node:fs/promises');
            const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
            // rename() replaces the inode; without copying the mode a 0600
            // skill file would silently become world-readable.
            await writeFile(temporary, next, { encoding: 'utf8', mode: info.mode & 0o777 });
            await rename(temporary, path);
        }
        catch (error) {
            return { applied: false, error: `write failed: ${error instanceof Error ? error.message : String(error)}` };
        }
        await this.history.setFindingStatus(input.key, 'fixed', 'invisible characters stripped by the safe fix');
        this.clearCache();
        return { applied: true, path, remaining: next.match(INVISIBLE_PATTERN)?.length ?? 0 };
    }

    /**
     * Resolve and validate the fix target for one finding.
     * @param {string} key - finding id.
     * @returns {Promise<{path?: string, content?: string, error?: string}>} target.
     */
    async resolveFixTarget(key) {
        const history = await this.history.read();
        const state = history.states[key];
        if (state === undefined) return { error: 'finding not found' };
        if (state.ruleId !== 'SEC-SKILL-010') return { error: 'this finding has no automated safe fix' };
        const path = state.filePath;
        if (typeof path !== 'string' || path === '') return { error: 'finding has no file path' };
        // Skill findings store a bundle-relative path plus the absolute path in
        // evidence; the fix must operate on the absolute one.
        const absolute = typeof state.snapshot?.evidence?.absolutePath === 'string'
            ? state.snapshot.evidence.absolutePath
            : path;
        if (!absolute.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(absolute)) {
            return { error: 'finding has no absolute source path' };
        }
        const resolved = await realpathDeep(absolute);
        const workspaces = (this.workspaces() ?? []).map(workspace => workspace.path);
        const roots = writableRoots(workspaces);
        // Compare real paths: on macOS /var is /private/var, so a lexical
        // comparison against the configured home would miss the file.
        let root;
        for (const candidate of roots) {
            const realRoot = await realpathDeep(candidate.path);
            if (isWithin(realRoot, resolved)) {
                root = candidate;
                break;
            }
        }
        if (root === undefined) return { error: 'the file is not inside a writable skill root (mounted skills are read-only)' };
        let info;
        try {
            info = await lstat(resolved);
        }
        catch {
            return { error: 'the file no longer exists' };
        }
        if (!info.isFile()) return { error: 'the finding does not point at a file' };
        if (info.size > MAX_FIX_BYTES) return { error: 'the file is too large for the safe fix' };
        try {
            return { path: resolved, content: await readFile(resolved, 'utf8') };
        }
        catch (error) {
            return { error: `cannot read the file: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * Read a source excerpt for a path that appears in a finding.
     * @param {string} path - absolute path.
     * @param {number} line - 1-based line.
     * @returns {Promise<{path: string, line: number, content: string, redacted: boolean}>} source view.
     */
    async viewSource(path, line) {
        if (typeof path !== 'string' || path === '') return { error: 'path is required' };
        const history = await this.history.read();
        // Only a path that appears in a recorded finding is viewable. Skill
        // findings may be relative to the bundle; map them to the absolute path
        // captured at scan time.
        const apiSource = apiSourcePath();
        const allowed = new Map();
        // Bundle-relative paths are not unique: every skill has a "SKILL.md".
        // Remember when a relative name maps to more than one absolute file so
        // a request for it cannot silently show another skill's source.
        const ambiguous = new Set();
        for (const state of Object.values(history.states)) {
            const absolute = typeof state.snapshot?.evidence?.absolutePath === 'string'
                ? state.snapshot.evidence.absolutePath
                : undefined;
            const stored = typeof state.filePath === 'string' && state.filePath !== '' ? state.filePath : undefined;
            const candidate = absolute ?? (stored !== undefined && isAbsolute(stored) ? stored : undefined);
            if (candidate === undefined) continue;
            // Never read a credential store just because a finding named it.
            if (isSensitivePath(candidate)) continue;
            // A skill finding may only expose its own bundle; an API finding may
            // only expose the handler source. Anything else stays unreadable.
            const skillRoot = typeof state.snapshot?.evidence?.skillRoot === 'string'
                ? state.snapshot.evidence.skillRoot
                : undefined;
            const withinSkill = skillRoot !== undefined && isWithin(skillRoot, candidate);
            const isApi = candidate === apiSource;
            if (!withinSkill && !isApi) continue;
            allowed.set(candidate, candidate);
            if (stored !== undefined && stored !== candidate && !isAbsolute(stored)) {
                if (ambiguous.has(stored)) continue;
                if (allowed.has(stored) && allowed.get(stored) !== candidate) {
                    allowed.delete(stored);
                    ambiguous.add(stored);
                }
                else {
                    allowed.set(stored, candidate);
                }
            }
        }
        const resolved = allowed.get(path);
        if (resolved === undefined) return { error: 'path is not part of a readable finding' };
        let info;
        try {
            info = await lstat(resolved);
        }
        catch {
            return { error: 'file not found' };
        }
        if (!info.isFile() || info.size > MAX_FIX_BYTES) return { error: 'file is not readable in the source viewer' };
        let text;
        try {
            text = await readFile(resolved, 'utf8');
        }
        catch {
            return { error: 'file is not readable' };
        }
        const lines = text.split('\n');
        const targetLine = Number.isFinite(line) && line > 0 ? Math.min(lines.length, Math.floor(line)) : 1;
        const start = Math.max(1, targetLine - 5);
        const end = Math.min(lines.length, targetLine + 5);
        const snippet = lines.slice(start - 1, end).join('\n');
        // Source view is shown locally, but still redact credentials.
        const { redactText } = await import('./findings.js');
        const redacted = redactText(snippet, 4000);
        return { path: resolved, requestedPath: path, line: targetLine, start, end, content: redacted, redacted: redacted !== snippet };
    }

    /**
     * Current status for the UI: active run, last scan and merged findings.
     * @param {object} options - workspace filter and whether to mark notifications.
     * @returns {Promise<object>} status payload.
     */
    async status(options = {}) {
        const history = await this.history.read();
        const lastScan = history.lastScan;
        const run = this.run;
        // The last scan defines the current scope, but a just-blocked operation
        // (for example an upload that was never installed) is not part of that
        // scan. Include blocked states so the modal that opens on a block shows
        // the exact findings that caused it.
        const merged = [...(lastScan?.findings ?? [])];
        const mergedIds = new Set(merged.map(finding => finding.id));
        for (const state of Object.values(history.states)) {
            if (state.snapshot === null || mergedIds.has(state.id)) continue;
            if (state.status !== 'blocked' && state.status !== 'accepted') continue;
            merged.push(state.snapshot);
            mergedIds.add(state.id);
        }
        const findings = sortFindings(merged.map(finding => {
            const state = history.states[finding.id];
            return state === undefined ? finding : { ...finding, status: state.status, note: state.note };
        }));
        const visibleFindings = findings.slice(0, 400);
        const summary = summaryOf(visibleFindings);
        const pending = await this.history.pendingNotifications(visibleFindings);
        const notifications = pending.slice(0, 20).map(row => ({
            findingId: row.finding.id,
            ruleId: row.finding.ruleId,
            severity: row.finding.severity,
            target: row.finding.target,
            reason: row.reason,
        }));
        if (options.markNotifications !== false && pending.length > 0) {
            await this.history.markNotified(pending.map(row => row.finding));
        }
        const accepted = await this.history.accepted();
        return {
            scannerVersion: this.scannerVersion,
            catalog: catalogSummary(),
            running: run !== null && run.status === 'running',
            run: run === null ? null : {
                runId: run.runId,
                mode: run.mode,
                trigger: run.trigger,
                status: run.status,
                phase: run.phase,
                current: run.current,
                done: run.done,
                total: run.total,
                startedAt: run.startedAt,
                finishedAt: run.finishedAt,
                elapsedMs: (run.finishedAt || Date.now()) - run.startedAt,
                cancelRequested: run.cancelRequested,
                errors: run.errors.slice(0, 20),
            },
            lastScan: lastScan === null ? null : {
                scanId: lastScan.scanId,
                at: lastScan.at,
                mode: lastScan.mode,
                trigger: lastScan.trigger,
                status: lastScan.status,
                complete: lastScan.complete,
                durationMs: lastScan.durationMs,
                workspace: lastScan.workspace,
                scope: lastScan.scope,
                errors: lastScan.errors,
                facts: lastScan.facts ?? {},
                // Recompute from the merged states so an acceptance made after
                // the scan is reflected without rescanning.
                summary,
            },
            summary,
            findings: visibleFindings,
            acceptedCount: accepted.length,
            notifications,
            checkedAt: Date.now(),
        };
    }

    /**
     * Debounced background scan after a watched skill directory changed.
     */
    onSkillsChanged() {
        if (this.disposed) return;
        if (this.changeTimer !== undefined) clearTimeout(this.changeTimer);
        this.changeTimer = setTimeout(() => {
            this.changeTimer = undefined;
            if (this.disposed) return;
            if (this.run !== null && this.run.status === 'running') {
                // A change that lands during a scan still needs a scan after it;
                // dropping the notification would leave the new content
                // unreviewed until some later change happens.
                this.onSkillsChanged();
                return;
            }
            void this.start({ mode: 'quick', trigger: 'skills-change' });
        }, CHANGE_DEBOUNCE_MS);
        this.changeTimer.unref?.();
    }

    /**
     * Stop timers and abort an active run on plugin disposal.
     */
    dispose() {
        this.disposed = true;
        if (this.changeTimer !== undefined) {
            clearTimeout(this.changeTimer);
            this.changeTimer = undefined;
        }
        if (this.run !== null && this.run.status === 'running') {
            this.run.cancelRequested = true;
            this.run.controller.abort();
        }
        this.cache.clear();
    }
}

/** Internal cancellation signal. */
class ScanCancelled extends Error {
    constructor() {
        super('scan cancelled');
        this.name = 'ScanCancelled';
    }
}
