/**
 * Security Center facade.
 *
 * The HTTP layer talks to this object only: no route reaches into the scanner,
 * the history or a rule module directly. That keeps the security decisions in
 * one place and makes the API surface testable without a host.
 */
import { buildReport, serializeReport } from './report.js';
import { SecurityHistory } from './history.js';
import { SecurityScanner } from './scanner.js';

/**
 * One object the API and the tests use for every security operation.
 */
export class SecurityCenter {
    /**
     * @param {object} options - host context, config, provider and stores.
     */
    constructor(options = {}) {
        this.history = options.history ?? new SecurityHistory(options.historyFile);
        this.scanner = new SecurityScanner({
            ctx: options.ctx,
            config: options.config,
            rawConfig: options.rawConfig,
            provider: options.provider,
            index: options.index,
            logger: options.logger,
            history: this.history,
            perObjectTimeoutMs: options.perObjectTimeoutMs,
        });
    }

    /**
     * Start a manual scan.
     * @param {object} input - mode, workspace, target.
     * @returns {Promise<object>} start result.
     */
    async startScan(input) {
        return this.scanner.start(input);
    }

    /**
     * Cancel the active scan.
     * @returns {object} outcome.
     */
    cancelScan() {
        return this.scanner.cancel();
    }

    /**
     * Current status.
     * @param {object} options - include settings.
     * @returns {Promise<object>} status.
     */
    async status(options = {}) {
        return this.scanner.status(options);
    }

    /**
     * Build and serialize the JSON report.
     * @returns {Promise<{report: object, json: string}>} report.
     */
    async report() {
        const report = await buildReport({ history: this.history });
        return { report, json: serializeReport(report) };
    }

    /**
     * Read-only skill review for the Security Review modal.
     * @param {object} input - skill descriptor and review hash.
     * @returns {Promise<object>} review payload.
     */
    async reviewSkill(input) {
        return this.scanner.reviewSkill(input);
    }

    /**
     * Aggregate the last scan into per-skill pass/fail rows.
     * @param {object} input - workspace.
     * @returns {Promise<object>} aggregate review.
     */
    async reviewAll(input) {
        return this.scanner.reviewAll(input);
    }

    /**
     * Gate an on-disk skill operation.
     * @param {object} input - skill descriptor and action.
     * @returns {Promise<object>} decision.
     */
    async gateSkill(input) {
        return this.scanner.gateSkill(input);
    }

    /**
     * Gate an in-memory upload.
     * @param {object} input - files and action.
     * @returns {Promise<object>} decision.
     */
    async gateUpload(input) {
        return this.scanner.gateUpload(input);
    }

    /**
     * Gate a ZIP central directory.
     * @param {object} input - entries and action.
     * @returns {Promise<object>} decision.
     */
    async gateArchive(input) {
        return this.scanner.gateArchive(input);
    }

    /**
     * Gate a local install source path.
     * @param {object} input - source path and action.
     * @returns {Promise<object>} decision.
     */
    async gateSourcePath(input) {
        return this.scanner.gateSourcePath(input);
    }

    /**
     * Accept a HIGH/MEDIUM finding; the actor, target and time are recorded.
     * @param {object} input - keys, reason, target.
     * @returns {Promise<object>} outcome.
     */
    async authorizeException(input) {
        return this.scanner.authorizeException(input);
    }

    /**
     * Mark a finding reviewed/unresolved.
     * @param {object} input - key, status, note.
     * @returns {Promise<object>} outcome.
     */
    async setFindingStatus(input) {
        return this.scanner.setFindingStatus(input);
    }

    /**
     * Preview the safe fix.
     * @param {string} key - finding id.
     * @returns {Promise<object>} preview.
     */
    async previewFix(key) {
        return this.scanner.previewFix(key);
    }

    /**
     * Apply the safe fix.
     * @param {object} input - key, expected hash, confirm.
     * @returns {Promise<object>} outcome.
     */
    async applyFix(input) {
        return this.scanner.applyFix(input);
    }

    /**
     * Read a source excerpt.
     * @param {string} path - path from a finding.
     * @param {number} line - line number.
     * @returns {Promise<object>} source view.
     */
    async viewSource(path, line) {
        return this.scanner.viewSource(path, line);
    }

    /**
     * Notify the scanner that skill files changed (debounced quick scan).
     */
    onSkillsChanged() {
        this.scanner.onSkillsChanged();
    }

    /**
     * Stop timers and abort work.
     */
    dispose() {
        this.scanner.dispose();
    }
}
