/**
 * One severity scale for every security surface.
 *
 * The previous inspection code used three different vocabularies (high/warn/ok
 * for skills, error/warn/ok for quality, high/medium/low/clean for text
 * audits). The audit system needs one comparable scale, so every finding is
 * normalized here before it reaches a policy decision, the report or the UI.
 *
 * Policy is deliberately conservative:
 * - CRITICAL can never be accepted from the interface; the only way past it is
 *   to remove the condition or fix the code.
 * - HIGH blocks by default and may be exception-authorized with a recorded
 *   reason by the local user.
 * - MEDIUM / LOW / INFO never block an operation.
 */

/** Ordered severity names, worst first. */
export const SEVERITIES = Object.freeze(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);

/** Numeric rank, larger is worse. */
export const SEVERITY_RANK = Object.freeze({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 });

/** How certain the scanner is that a finding describes real behaviour. */
export const CONFIDENCE_LEVELS = Object.freeze(['certain', 'likely', 'possible', 'heuristic']);

/**
 * Whether a value is one of the five severity names.
 * @param {unknown} value - candidate.
 * @returns {boolean} true when it is a severity.
 */
export function isSeverity(value) {
    return typeof value === 'string' && SEVERITIES.includes(value);
}

/**
 * Normalize a loose severity label into the canonical scale.
 * Legacy labels are mapped rather than guessed: `high`/`error`/`warn` came
 * from the old inspectors and are still accepted at the boundary.
 * @param {unknown} value - loose label.
 * @param {string} fallback - severity used when the value is empty/unknown.
 * @returns {string} canonical severity.
 */
export function normalizeSeverity(value, fallback = 'INFO') {
    if (isSeverity(value)) return value;
    if (typeof value !== 'string') return fallback;
    const key = value.trim().toLowerCase();
    if (key === 'critical') return 'CRITICAL';
    if (key === 'high' || key === 'error' || key === 'blocker') return 'HIGH';
    if (key === 'medium' || key === 'warn' || key === 'warning') return 'MEDIUM';
    if (key === 'low') return 'LOW';
    if (key === 'info' || key === 'ok' || key === 'clean') return 'INFO';
    return fallback;
}

/**
 * Normalize a confidence label.
 * @param {unknown} value - loose label.
 * @returns {string} one of {@link CONFIDENCE_LEVELS}.
 */
export function normalizeConfidence(value) {
    if (typeof value === 'string' && CONFIDENCE_LEVELS.includes(value)) return value;
    if (typeof value === 'string') {
        const key = value.toLowerCase();
        if (key === 'high') return 'likely';
        if (key === 'medium') return 'possible';
        if (key === 'low') return 'heuristic';
    }
    return 'possible';
}

/**
 * Worst severity among a list, or INFO for an empty list.
 * @param {Array<string>} values - severity labels.
 * @returns {string} worst severity.
 */
export function maxSeverity(values) {
    let worst = 'INFO';
    for (const value of values ?? []) {
        const next = normalizeSeverity(value);
        if (SEVERITY_RANK[next] > SEVERITY_RANK[worst]) worst = next;
    }
    return worst;
}

/**
 * Step one severity down (used when a pattern appears inside a documentation
 * code fence: an example is weaker evidence than a prose instruction).
 * @param {string} severity - current severity.
 * @param {number} steps - how many levels to step down.
 * @returns {string} downgraded severity.
 */
export function downgradeSeverity(severity, steps = 1) {
    const rank = Math.max(0, (SEVERITY_RANK[normalizeSeverity(severity)] ?? 0) - steps);
    return SEVERITIES.find(name => SEVERITY_RANK[name] === rank) ?? 'INFO';
}

/**
 * Count findings by severity and by lifecycle state.
 * `unresolved` is deliberately not the same as `total`: an accepted or fixed
 * finding stays in the report but is no longer an open risk.
 * @param {Array<object>} findings - normalized findings.
 * @returns {object} counts keyed by lower-case severity plus lifecycle totals.
 */
export function severityCounts(findings) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0, blocked: 0, unresolved: 0, accepted: 0, fixed: 0 };
    for (const finding of findings ?? []) {
        const severity = normalizeSeverity(finding?.severity);
        counts[severity.toLowerCase()] += 1;
        counts.total += 1;
        const status = typeof finding?.status === 'string' ? finding.status : 'detected';
        if (status === 'blocked') counts.blocked += 1;
        if (status === 'accepted') counts.accepted += 1;
        if (status === 'fixed') counts.fixed += 1;
        if (status === 'detected' || status === 'unresolved' || status === 'blocked') counts.unresolved += 1;
    }
    return counts;
}
