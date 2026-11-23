/**
 * The one Finding shape every scanner, report and UI row uses.
 *
 * Rules:
 * - an id is derived from rule + target + file + line + evidence, so the same
 *   condition keeps its id across scans and automatically changes when the
 *   evidence changes;
 * - evidence is redacted and truncated at creation time, never at render time;
 * - status is a lifecycle state, not a severity: accepting a risk never turns
 *   it into `fixed`, and a blocked finding is not a resolved finding.
 */
import { createHash } from 'node:crypto';
import { normalizeConfidence, normalizeSeverity, SEVERITIES, severityCounts } from './severity.js';

/** Lifecycle states a finding can be in. */
export const FINDING_STATUSES = Object.freeze(['detected', 'blocked', 'fixed', 'accepted', 'reviewed', 'unresolved']);

/** Maximum evidence characters kept in a finding. */
const MAX_EVIDENCE = 500;

/** Maximum free-text field length kept in a finding. */
const MAX_TEXT = 2000;

/** Credential-shaped strings that must never leave the process in a report. */
const SECRET_PATTERNS = [
    [/\b(?:sk|rk)-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_KEY]'],
    [/\bghp_[A-Za-z0-9]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]'],
    [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]'],
    [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]'],
    [/\bAIza[0-9A-Za-z_-]{30,}\b/g, '[REDACTED_GOOGLE_KEY]'],
    [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, '[REDACTED_SLACK_TOKEN]'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]'],
    [/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer [REDACTED]'],
    [/(\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret)\b\s*[:=]\s*)(["'`]?)[^\s"'`]{6,}\2/gi, '$1$2[REDACTED]$2'],
    [/(?:[?&](?:token|key|secret|password)=)[^&\s]{6,}/gi, '[REDACTED]'],
];

/**
 * Redact credential-shaped text and collapse it to one bounded line.
 * This runs on every piece of evidence before it is stored or returned; the
 * report and the API never see the raw match.
 * @param {unknown} value - raw text.
 * @param {number} max - maximum characters kept.
 * @returns {string} safe, single-line text.
 */
export function redactText(value, max = MAX_EVIDENCE) {
    if (value === undefined || value === null) return '';
    let text = String(value);
    for (const [pattern, replacement] of SECRET_PATTERNS) {
        text = text.replace(pattern, replacement);
    }
    text = text.replace(/\u0000/g, '').replace(/\r/g, '').replace(/[\t ]+/g, ' ').trim();
    if (text.length > max) text = `${text.slice(0, max - 1)}…`;
    return text;
}

/**
 * Short, stable fingerprint of one evidence value.
 * @param {unknown} value - evidence text.
 * @returns {string} 12-character hex digest.
 */
export function evidenceHash(value) {
    return createHash('sha256').update(String(value ?? '')).digest('hex').slice(0, 12);
}

/**
 * Deterministic finding id.
 * @param {object} parts - rule id, target, file, line and evidence fingerprint.
 * @returns {string} `sec_<16 hex>`.
 */
export function findingIdFor(parts) {
    const seed = [
        parts.ruleId ?? '',
        parts.target ?? '',
        parts.filePath ?? '',
        String(parts.line ?? 0),
        parts.fingerprint ?? evidenceHash(parts.evidence ?? ''),
    ].join('\u0000');
    return `sec_${createHash('sha256').update(seed).digest('hex').slice(0, 16)}`;
}

/**
 * Shape one evidence object without dropping the useful context.
 * @param {unknown} evidence - string or object.
 * @returns {object} plain JSON evidence.
 */
function normalizeEvidence(evidence) {
    if (typeof evidence === 'string') return { snippet: redactText(evidence) };
    if (evidence === null || typeof evidence !== 'object' || Array.isArray(evidence)) return {};
    const out = {};
    for (const [key, value] of Object.entries(evidence)) {
        if (value === undefined) continue;
        if (typeof value === 'string') out[key] = redactText(value);
        else if (typeof value === 'number' || typeof value === 'boolean' || value === null) out[key] = value;
        else if (Array.isArray(value)) out[key] = value.slice(0, 20).map(row => (typeof row === 'string' ? redactText(row, 200) : row));
    }
    return out;
}

/**
 * Build one finding. Unknown fields are dropped, not passed through, so a rule
 * cannot smuggle a function or a credential into the report.
 * @param {object} spec - finding fields.
 * @returns {object} normalized finding.
 */
export function createFinding(spec) {
    const evidence = normalizeEvidence(spec.evidence);
    const fingerprint = spec.fingerprint ?? evidenceHash(evidence.snippet ?? JSON.stringify(evidence));
    const severity = normalizeSeverity(spec.severity, 'INFO');
    const finding = {
        id: spec.id ?? findingIdFor({ ...spec, fingerprint }),
        ruleId: String(spec.ruleId ?? 'SEC-UNKNOWN-000'),
        title: redactText(spec.title ?? 'Security finding', MAX_TEXT),
        titleZh: spec.titleZh === undefined ? undefined : redactText(spec.titleZh, MAX_TEXT),
        description: redactText(spec.description ?? '', MAX_TEXT),
        descriptionZh: spec.descriptionZh === undefined ? undefined : redactText(spec.descriptionZh, MAX_TEXT),
        severity,
        confidence: normalizeConfidence(spec.confidence),
        category: String(spec.category ?? 'other'),
        target: String(spec.target ?? ''),
        filePath: spec.filePath === undefined || spec.filePath === null ? null : String(spec.filePath),
        line: Number.isFinite(spec.line) && spec.line > 0 ? Math.floor(spec.line) : null,
        evidence,
        impact: redactText(spec.impact ?? '', MAX_TEXT),
        impactZh: spec.impactZh === undefined ? undefined : redactText(spec.impactZh, MAX_TEXT),
        attackScenario: redactText(spec.attackScenario ?? '', MAX_TEXT),
        attackScenarioZh: spec.attackScenarioZh === undefined ? undefined : redactText(spec.attackScenarioZh, MAX_TEXT),
        remediation: redactText(spec.remediation ?? '', MAX_TEXT),
        remediationZh: spec.remediationZh === undefined ? undefined : redactText(spec.remediationZh, MAX_TEXT),
        references: Array.isArray(spec.references) ? spec.references.filter(row => typeof row === 'string').slice(0, 8) : [],
        detectedAt: Number.isFinite(spec.detectedAt) ? spec.detectedAt : Date.now(),
        scannerVersion: String(spec.scannerVersion ?? '0.0.0'),
        status: FINDING_STATUSES.includes(spec.status) ? spec.status : 'detected',
        hash: spec.hash === undefined || spec.hash === null ? null : String(spec.hash),
        fixable: spec.fixable === true,
    };
    // Omit optional bilingual fields when absent instead of shipping undefined.
    for (const key of Object.keys(finding)) {
        if (finding[key] === undefined) delete finding[key];
    }
    return finding;
}

/**
 * Sort findings worst-first, then by rule id and path.
 * @param {Array<object>} findings - findings.
 * @returns {Array<object>} sorted copy.
 */
export function sortFindings(findings) {
    const rank = new Map(SEVERITIES.map((severity, index) => [severity, index]));
    return [...(findings ?? [])].sort((left, right) => {
        const severityDelta = (rank.get(left.severity) ?? 99) - (rank.get(right.severity) ?? 99);
        if (severityDelta !== 0) return severityDelta;
        const ruleDelta = String(left.ruleId).localeCompare(String(right.ruleId));
        if (ruleDelta !== 0) return ruleDelta;
        return String(left.filePath ?? '').localeCompare(String(right.filePath ?? ''));
    });
}

/**
 * Remove duplicate findings by id, keeping the first.
 * @param {Array<object>} findings - findings.
 * @returns {Array<object>} deduplicated copy.
 */
export function dedupeFindings(findings) {
    const seen = new Set();
    const out = [];
    for (const finding of findings ?? []) {
        if (finding === null || typeof finding !== 'object') continue;
        const id = typeof finding.id === 'string' ? finding.id : findingIdFor(finding);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(finding);
    }
    return out;
}

/**
 * Aggregate findings for a summary header.
 * @param {Array<object>} findings - findings.
 * @returns {object} severity + lifecycle counts.
 */
export function summarizeFindings(findings) {
    return severityCounts(findings);
}

/**
 * The set of findings that block an operation by default.
 * Accepted findings are filtered out here; CRITICAL findings are never
 * filtered by acceptance because the policy forbids accepting them.
 * @param {Array<object>} findings - findings.
 * @returns {Array<object>} blocking findings.
 */
export function blockingFindings(findings) {
    return (findings ?? []).filter(finding => {
        if (finding.status === 'accepted' || finding.status === 'fixed') return false;
        return finding.severity === 'CRITICAL' || finding.severity === 'HIGH';
    });
}

