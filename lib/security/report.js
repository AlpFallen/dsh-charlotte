/**
 * JSON security report.
 *
 * The report is built from the last scan plus the persistent history, and it is
 * explicit about what it does not know: a partial or failed scan is labelled as
 * such, never presented as a full audit. Evidence is already redacted at
 * finding creation; this module additionally strips host paths and environment
 * values from the report metadata.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { summarizeFindings, sortFindings } from './findings.js';
import { SCANNER_VERSION } from './rules.js';

/** Report schema version. */
export const REPORT_VERSION = 1;

/** Plugin version, read once from the package manifest. */
function pluginVersion() {
    try {
        const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
        return typeof manifest.version === 'string' ? manifest.version : 'unknown';
    }
    catch {
        return 'unknown';
    }
}

/**
 * Normalize a scan status for the report. Only `complete` may be presented as a
 * finished full audit.
 * @param {string} status - scan status.
 * @returns {'complete'|'partial'|'failed'|'cancelled'} report status.
 */
export function reportStatus(status) {
    if (status === 'complete') return 'complete';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'failed') return 'failed';
    return 'partial';
}

/**
 * Build one report.
 * @param {object} input - history store, optional scan override and generation time.
 * @returns {Promise<object>} report.
 */
export async function buildReport(input) {
    const history = input.history;
    const generatedAt = Number.isFinite(input.now) ? input.now : Date.now();
    const historyState = await history.read();
    const scan = input.scan ?? historyState.lastScan;
    const events = await history.events(1000);
    const accepted = await history.accepted();

    const scanFindings = [...(scan?.findings ?? [])];
    const seen = new Set(scanFindings.map(finding => finding.id));
    // A blocked operation is part of the report even when it never reached the
    // last scan (for example a rejected upload).
    for (const state of Object.values(historyState.states)) {
        if (state.snapshot === null || seen.has(state.id)) continue;
        if (state.status !== 'blocked' && state.status !== 'accepted') continue;
        scanFindings.push(state.snapshot);
        seen.add(state.id);
    }
    const findings = sortFindings(scanFindings.map(finding => {
        const state = historyState.states[finding.id];
        return state === undefined ? finding : { ...finding, status: state.status, note: state.note };
    }));
    const summary = summarizeFindings(findings);
    const blockedOperations = events
        .filter(event => event.type === 'blocked')
        .map(event => ({
            at: event.at,
            action: event.action,
            target: event.target,
            scanId: event.scanId,
            findings: event.findings ?? [],
        }));
    const authorizations = events
        .filter(event => event.type === 'authorization')
        .map(event => ({
            at: event.at,
            target: event.target,
            actor: event.actor,
            reason: event.reason,
            findings: event.findings ?? [],
        }));
    const unresolvedRisks = findings
        .filter(finding => finding.status === 'detected' || finding.status === 'unresolved' || finding.status === 'blocked')
        .map(finding => ({
            id: finding.id,
            ruleId: finding.ruleId,
            severity: finding.severity,
            status: finding.status,
            target: finding.target,
            filePath: finding.filePath ?? null,
            line: finding.line ?? null,
        }));
    const status = scan === null || scan === undefined ? 'never-scanned' : reportStatus(scan.status);
    const reportId = createHash('sha256')
        .update(`${scan?.scanId ?? 'none'}|${generatedAt}|${String(history.file ?? '')}`)
        .digest('hex')
        .slice(0, 20);
    const version = pluginVersion();
    return {
        reportId: `sec-report-${reportId}`,
        reportVersion: REPORT_VERSION,
        pluginVersion: version,
        dshVersion: typeof process.env.DSH_VERSION === 'string' && process.env.DSH_VERSION !== '' ? process.env.DSH_VERSION : 'unknown',
        scannerVersion: scan?.scannerVersion ?? SCANNER_VERSION,
        generatedAt,
        scan: scan === null || scan === undefined ? null : {
            scanId: scan.scanId,
            startedAt: scan.at,
            mode: scan.mode,
            trigger: scan.trigger,
            status,
            rawStatus: scan.status,
            durationMs: scan.durationMs ?? 0,
            workspace: scan.workspace ?? '',
            scope: scan.scope ?? [],
            complete: status === 'complete',
            errors: scan.errors ?? [],
        },
        summary,
        findings,
        blockedOperations,
        authorizations,
        acceptedRisks: accepted.map(state => ({
            id: state.id,
            ruleId: state.ruleId,
            severity: state.severity,
            target: state.target,
            filePath: state.filePath,
            note: state.note,
            acceptedAt: state.acceptedAt ?? state.lastSeenAt,
        })),
        unresolvedRisks,
        limitations: [
            'Rule-based static analysis only: no code execution, no sandbox detonation and no semantic proof of intent.',
            'A matched pattern is evidence to review, not proof of malice; a miss is not proof of safety.',
            'Scan caches are keyed by content hash; manual full audits bypass the cache.',
            status === 'complete' ? 'The scan completed over the declared scope.' : 'This report is not a completed full audit; treat it as partial.',
        ],
    };
}

/**
 * Serialize a report for download. Pretty-printed so a human can read it.
 * @param {object} report - report object.
 * @returns {string} JSON text.
 */
export function serializeReport(report) {
    return `${JSON.stringify(report, null, 2)}\n`;
}
