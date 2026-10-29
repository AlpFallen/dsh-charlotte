/**
 * Skill body audit.
 *
 * A SKILL.md is loaded verbatim into the model context, so a few classes of
 * characters can make "I read it" mean something different from what the
 * reader thinks they saw. This module looks for the ones that have no business
 * in a skill body:
 *
 * - bare ESC and other C0 control characters (terminal manipulation);
 * - Unicode tag characters, which are invisible and can carry hidden text;
 * - bidirectional control characters, which reorder what the next reader sees;
 * - zero-width characters, which hide text from a search but not from the model.
 *
 * The audit never edits anything. It reports ids and counts; the client words
 * the finding, so a new finding id never requires touching this file's strings.
 */

/**
 * C0 controls that are not plain whitespace, plus DEL (0x7F). ESC (0x1B) is
 * excluded on purpose: it has its own finding, and reporting it twice would
 * inflate the medium bucket and every aggregate that reads it.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001A\u001C-\u001F\u007F]/;

/** Bare ESC (covered by CONTROL_CHARS too, reported separately: it is worse). */
const ESCAPE_CHAR = /\u001B/;

/** Unicode tag block: invisible, and a known way to smuggle text. */
const TAG_CHARS = /[\u{E0000}-\u{E007F}]/u;

/** Bidirectional overrides and isolates plus the marks that steer them. */
const BIDI_CHARS = /[\u202A-\u202E\u2066-\u2069\u200E\u200F]/;

/** Zero-width joiners/spaces and the byte-order mark mid-text. */
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/;

/** Findings, worst first. `severity` drives the badge colour in the client. */
const FINDINGS = [
    { id: 'escape', severity: 'high', pattern: ESCAPE_CHAR },
    { id: 'tag-chars', severity: 'high', pattern: TAG_CHARS },
    { id: 'bidi', severity: 'high', pattern: BIDI_CHARS },
    { id: 'control', severity: 'medium', pattern: CONTROL_CHARS },
    { id: 'zero-width', severity: 'low', pattern: ZERO_WIDTH_CHARS },
];

/**
 * Count matches for one pattern without building a match array.
 * @param text - body text.
 * @param pattern - regular expression (global flag cloned internally).
 * @returns match count.
 */
function countMatches(text, pattern) {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let count = 0;
    let match = global.exec(text);
    while (match !== null) {
        count += 1;
        if (match.index === global.lastIndex)
            global.lastIndex += 1;
        match = global.exec(text);
    }
    return count;
}

/**
 * Audit one skill body.
 * @param text - SKILL.md content (frontmatter included; it reaches the model too).
 * @returns `{ findings, clean, severity }`; `severity` is `high`, `medium`, `low` or `clean`.
 */
export function auditText(text) {
    if (typeof text !== 'string' || text.length === 0)
        return { findings: [], clean: true, severity: 'clean' };
    const findings = [];
    for (const rule of FINDINGS) {
        const count = countMatches(text, rule.pattern);
        if (count > 0)
            findings.push({ id: rule.id, severity: rule.severity, count });
    }
    const severity = findings.some(f => f.severity === 'high')
        ? 'high'
        : findings.some(f => f.severity === 'medium')
            ? 'medium'
            : findings.length > 0
                ? 'low'
                : 'clean';
    return { findings, clean: findings.length === 0, severity };
}

/**
 * Merge audit results for a list of bodies (the ledger view audits whole
 * categories at once).
 * @param results - audit results.
 * @returns aggregate `{ clean, severity, findings }` with counted ids.
 */
export function mergeAudits(results) {
    const counts = new Map();
    let severity = 'clean';
    const rank = { clean: 0, low: 1, medium: 2, high: 3 };
    for (const result of results) {
        if (rank[result.severity] > rank[severity])
            severity = result.severity;
        for (const finding of result.findings) {
            const row = counts.get(finding.id) ?? { id: finding.id, severity: finding.severity, count: 0 };
            row.count += finding.count;
            counts.set(finding.id, row);
        }
    }
    return { clean: counts.size === 0, severity, findings: [...counts.values()].sort((left, right) => rank[right.severity] - rank[left.severity]) };
}
