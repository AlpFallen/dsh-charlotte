/**
 * Skill review view-model.
 *
 * The scanner already decides which findings exist and whether an operation is
 * blocked. This module only turns one completed inline scan into the check
 * rows and state the Security Review modal renders; it never re-implements a
 * rule and never upgrades an unchecked row to "passed".
 */
import { blockingFindings, summarizeFindings } from './findings.js';
import { SEVERITIES, maxSeverity } from './severity.js';

/** Rows shown in the modal, in product order. */
export const REVIEW_CHECKS = Object.freeze([
    { id: 'body', rulePrefix: 'SEC-SKILL-' },
    { id: 'injection', rules: ['SEC-SKILL-001', 'SEC-SKILL-002'] },
    { id: 'suspicious', rules: ['SEC-SKILL-004', 'SEC-SKILL-005', 'SEC-SKILL-008', 'SEC-SKILL-011', 'SEC-SKILL-012', 'SEC-SKILL-015', 'SEC-SKILL-016'] },
    { id: 'path', rules: ['SEC-FS-001', 'SEC-FS-002', 'SEC-FS-003', 'SEC-FS-009', 'SEC-FS-010', 'SEC-FS-011'] },
    { id: 'symlink', rules: ['SEC-FS-003'] },
    { id: 'dependencies', rules: ['SEC-SKILL-005'] },
    { id: 'permissions', rules: ['SEC-SKILL-018'] },
    { id: 'dangerous', rules: ['SEC-SKILL-006', 'SEC-SKILL-015', 'SEC-SKILL-016'] },
    { id: 'sensitive', rules: ['SEC-SKILL-003', 'SEC-SKILL-007', 'SEC-SKILL-017'] },
]);

/**
 * Whether one finding belongs to one check row.
 * @param {object} check - check definition.
 * @param {object} finding - finding.
 * @returns {boolean} whether it matches.
 */
function owns(check, finding) {
    if (typeof check.rulePrefix === 'string') return String(finding.ruleId).startsWith(check.rulePrefix);
    return Array.isArray(check.rules) && check.rules.includes(finding.ruleId);
}

/**
 * Worst open severity for one group of findings.
 * @param {Array<object>} findings - owned findings.
 * @returns {string} severity or CLEAN.
 */
function worstOpen(findings) {
    const open = findings.filter(finding => finding.status !== 'accepted' && finding.status !== 'fixed');
    if (open.length === 0) return findings.length > 0 ? 'ACCEPTED' : 'CLEAN';
    return maxSeverity(open.map(finding => finding.severity));
}

/**
 * Build the check rows for one scan.
 * @param {Array<object>} findings - findings for this skill.
 * @param {boolean} complete - whether the scan completed.
 * @returns {Array<object>} check rows.
 */
export function buildReviewChecks(findings, complete) {
    return REVIEW_CHECKS.map(check => {
        const owned = findings.filter(finding => owns(check, finding));
        const worst = worstOpen(owned);
        let status;
        if (!complete) status = 'partial';
        else if (worst === 'CRITICAL' || worst === 'HIGH') status = 'failed';
        else if (worst === 'ACCEPTED') status = 'warning';
        else if (worst === 'MEDIUM' || worst === 'LOW' || worst === 'INFO') status = 'warning';
        else status = 'passed';
        return {
            id: check.id,
            status,
            findings: owned.map(finding => finding.id),
            count: owned.length,
        };
    });
}

/**
 * State for one completed inline review.
 * @param {object} input - complete flag, scan status, findings.
 * @returns {string} PASSED | WARNING | BLOCKED | FAILED | PARTIAL.
 */
export function reviewState(input) {
    if (input.scanStatus === 'failed') return 'FAILED';
    if (input.complete !== true) return 'PARTIAL';
    const blocking = blockingFindings(input.findings ?? []);
    if (blocking.length > 0) return 'BLOCKED';
    const open = (input.findings ?? []).filter(finding => finding.status !== 'fixed');
    if (open.length > 0) return 'WARNING';
    return 'PASSED';
}

/**
 * Decision the modal and the host agree on.
 * @param {string} state - review state.
 * @param {Array<object>} findings - findings.
 * @returns {{action: string, acceptable: Array<string>, critical: boolean}} decision.
 */
export function reviewAction(state, findings) {
    const blocking = blockingFindings(findings ?? []);
    const critical = blocking.some(finding => finding.severity === 'CRITICAL');
    if (critical) return { action: 'block', acceptable: [], critical: true };
    if (state === 'BLOCKED') {
        return { action: 'authorize', acceptable: blocking.filter(finding => finding.severity === 'HIGH').map(finding => finding.id), critical: false };
    }
    if (state === 'WARNING') return { action: 'confirm', acceptable: [], critical: false };
    if (state === 'PASSED') return { action: 'allow', acceptable: [], critical: false };
    return { action: 'block', acceptable: [], critical: false };
}

/**
 * Shape the review payload the API returns.
 * @param {object} input - skill, scan result, hash, review hash and source.
 * @returns {object} review payload.
 */
export function buildReview(input) {
    const findings = input.findings ?? [];
    const summary = summarizeFindings(findings);
    const state = reviewState({
        complete: input.complete === true,
        scanStatus: input.scanStatus ?? 'complete',
        findings,
    });
    const decision = reviewAction(state, findings);
    const risks = SEVERITIES.map(severity => ({ severity, count: summary[severity.toLowerCase()] ?? 0 }));
    return {
        state,
        risk: maxSeverity(findings.map(finding => finding.severity)),
        complete: input.complete === true,
        hash: String(input.hash ?? ''),
        reviewHash: String(input.reviewHash ?? ''),
        scanId: String(input.scanId ?? ''),
        checkedAt: Date.now(),
        durationMs: Number.isFinite(input.durationMs) ? input.durationMs : 0,
        summary,
        risks,
        findings,
        checks: buildReviewChecks(findings, input.complete === true),
        blocking: blockingFindings(findings).map(finding => ({ ...finding, status: 'blocked' })),
        acceptable: decision.acceptable,
        action: decision.action,
        critical: decision.critical,
    };
}
