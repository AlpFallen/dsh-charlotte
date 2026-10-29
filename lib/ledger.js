/**
 * Usage ledger aggregation.
 *
 * The launcher already records real events per skill (loads, invocations,
 * completions, failures, recommendation funnel counters, and one bucket per
 * calendar day). This module turns that table into the numbers a ledger view
 * needs, without inventing anything: a rate is `null` when its denominator is
 * zero, never 0% or 100%.
 */
import { dayKey, usageOf } from './state.js';

/** Days shown in the ledger trend. */
const TREND_DAYS = 14;

/**
 * Build a dense day series for the last {@link TREND_DAYS} calendar days.
 * @param counts - `{ [date]: number }`.
 * @returns `{ date, value }[]`, oldest first, zero-filled.
 */
function denseDays(counts) {
    const series = [];
    const today = new Date();
    for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
        const key = dayKey(date.getTime());
        series.push({ date: key, value: counts[key] ?? 0 });
    }
    return series;
}

/**
 * Aggregate one skill's usage row into a ledger row.
 * @param name - skill name.
 * @param row - normalized usage row.
 * @param record - index record when the skill still exists.
 * @returns ledger row.
 */
function ledgerRow(name, row, record) {
    const attempts = row.completions + row.failures;
    const shown = row.recommended;
    return {
        name,
        category: record?.category?.id ?? null,
        source: record?.source?.type ?? null,
        loads: row.loads,
        invokes: row.invokes,
        completions: row.completions,
        failures: row.failures,
        cancelled: row.cancelled,
        successRate: attempts === 0 ? null : row.completions / attempts,
        recommended: shown,
        accepted: row.accepted,
        dismissed: row.dismissed,
        adoptionRate: shown === 0 ? null : row.accepted / shown,
        lastUsedAt: row.lastUsedAt,
        lastLoadedAt: row.lastLoadedAt,
        loadsByDay: denseDays(Object.fromEntries(Object.entries(row.days ?? {}).map(([date, bucket]) => [date, bucket.loads]))),
        failuresByDay: denseDays(Object.fromEntries(Object.entries(row.days ?? {}).map(([date, bucket]) => [date, bucket.failures]))),
    };
}

/**
 * Build the whole ledger for one index snapshot.
 * @param state - launcher state.
 * @param index - built index (may be undefined when unavailable).
 * @returns `{ generatedAt, totals, trend, skills }`.
 */
export function buildLedger(state, index) {
    const records = index?.byName ?? {};
    const names = new Set([...Object.keys(state.usage ?? {}), ...Object.keys(records)]);
    const skills = [];
    for (const name of names) {
        const row = usageOf(state, name);
        const record = records[name];
        // A skill with neither usage nor a live record is noise.
        if (record === undefined && row.loads === 0 && row.invokes === 0 && row.completions === 0 && row.failures === 0 && row.recommended === 0) {
            continue;
        }
        skills.push(ledgerRow(name, row, record));
    }
    skills.sort((left, right) => right.loads + right.invokes - (left.loads + left.invokes)
        || right.lastUsedAt - left.lastUsedAt
        || left.name.localeCompare(right.name));
    const totals = {
        skills: skills.length,
        loads: skills.reduce((sum, row) => sum + row.loads, 0),
        invokes: skills.reduce((sum, row) => sum + row.invokes, 0),
        completions: skills.reduce((sum, row) => sum + row.completions, 0),
        failures: skills.reduce((sum, row) => sum + row.failures, 0),
        recommended: skills.reduce((sum, row) => sum + row.recommended, 0),
        accepted: skills.reduce((sum, row) => sum + row.accepted, 0),
        dismissed: skills.reduce((sum, row) => sum + row.dismissed, 0),
    };
    totals.successRate = totals.completions + totals.failures === 0
        ? null
        : totals.completions / (totals.completions + totals.failures);
    totals.adoptionRate = totals.recommended === 0 ? null : totals.accepted / totals.recommended;
    const loadsByDate = {};
    const failuresByDate = {};
    for (const name of Object.keys(state.usage ?? {})) {
        for (const [date, bucket] of Object.entries(state.usage[name].days ?? {})) {
            loadsByDate[date] = (loadsByDate[date] ?? 0) + bucket.loads;
            failuresByDate[date] = (failuresByDate[date] ?? 0) + bucket.failures;
        }
    }
    return {
        generatedAt: Date.now(),
        totals,
        trend: denseDays(loadsByDate),
        failureTrend: denseDays(failuresByDate),
        skills,
    };
}
