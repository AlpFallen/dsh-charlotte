/**
 * Chinese-summary coverage check.
 *
 * The Chinese interface must not show an English paragraph as a skill's
 * summary. This script takes a snapshot of the live catalog and reports every
 * skill whose description is not Chinese but whose translation is missing or
 * stale (the source text changed since the catalogue entry was written).
 *
 * Usage:
 *   curl -s http://127.0.0.1:57930/charlotte/api/skills  > /tmp/skills.json
 *   curl -s http://127.0.0.1:57930/charlotte/api/catalog > /tmp/catalog.json
 *   node scripts/zh-coverage.mjs /tmp/skills.json /tmp/catalog.json
 *
 * Exit code 1 when anything is missing or stale, so it can gate a release.
 */
import { readFile } from 'node:fs/promises';
import { descriptionHash, ZH_CATALOG_VERSION } from '../lib/i18n.js';

/**
 * Read the live catalog when no snapshot files were given.
 * @returns `{ skills, catalog }` plain objects.
 */
async function fetchLive() {
    const base = process.env.DSH_WEB_URL ?? 'http://127.0.0.1:57930';
    const read = async (path) => {
        const response = await fetch(`${base}/charlotte/api${path}`);
        if (!response.ok) throw new Error(`${path}: HTTP ${String(response.status)}`);
        return response.json();
    };
    return { skills: await read('/skills'), catalog: await read('/catalog') };
}

/** name → description, from any of the API shapes this plugin serves. */
const rows = new Map();

/**
 * Remember one skill row.
 * @param {object} row - API skill row.
 */
function remember(row) {
    if (typeof row !== 'object' || row === null) return;
    const name = typeof row.name === 'string' ? row.name : '';
    const description = typeof row.description === 'string'
        ? row.description
        : (typeof row.meta?.description === 'string' ? row.meta.description : '');
    if (name === '' || description === '') return;
    if (!rows.has(name)) rows.set(name, description);
}

let files = process.argv.slice(2);
if (files.length === 0) {
    try {
        const live = await fetchLive();
        for (const group of live.skills.groups ?? []) {
            for (const skill of group.skills ?? []) remember(skill);
        }
        for (const skill of live.skills.registry ?? []) remember(skill);
        for (const skill of live.catalog.skills ?? []) remember(skill);
        console.log(`read the live catalog from ${process.env.DSH_WEB_URL ?? 'http://127.0.0.1:57930'}`);
    }
    catch (error) {
        console.error(`cannot read the live catalog (${error instanceof Error ? error.message : String(error)});`);
        console.error('pass snapshot files instead: node scripts/zh-coverage.mjs <skills.json> [catalog.json ...]');
        process.exit(2);
    }
    files = [];
}

for (const file of files) {
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    if (Array.isArray(parsed)) {
        for (const row of parsed) remember(row);
        continue;
    }
    for (const group of parsed.groups ?? []) {
        for (const skill of group.skills ?? []) remember(skill);
    }
    for (const skill of parsed.registry ?? []) remember(skill);
    for (const skill of parsed.skills ?? []) remember(skill);
}

const catalogPath = new URL('../locale/skills.zh.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
if (catalog.version !== ZH_CATALOG_VERSION) {
    console.error(`catalogue version ${String(catalog.version)} is not ${String(ZH_CATALOG_VERSION)}`);
    process.exit(1);
}

const missing = [];
const stale = [];
const incomplete = [];
const covered = [];
for (const [name, description] of rows.entries()) {
    const entry = catalog.entries[name];
    if (entry === undefined) {
        missing.push(name);
        continue;
    }
    if (entry.sourceHash !== descriptionHash(description)) {
        stale.push({ name, stored: entry.sourceHash, current: descriptionHash(description) });
        continue;
    }
    if (typeof entry.simple !== 'string' || entry.simple.trim().length === 0
        || typeof entry.professional !== 'string' || entry.professional.trim().length === 0) {
        incomplete.push(name);
        continue;
    }
    covered.push(name);
}

console.log(`skills with descriptions:   ${String(rows.size)}`);
console.log(`with simple + professional: ${String(covered.length)}`);
if (missing.length > 0) console.log(`missing:     ${missing.join(', ')}`);
if (incomplete.length > 0) console.log(`incomplete:  ${incomplete.join(', ')}`);
if (stale.length > 0) {
    for (const row of stale) console.log(`stale:       ${row.name} (catalogue ${row.stored} → current ${row.current})`);
}
if (missing.length > 0 || stale.length > 0 || incomplete.length > 0) {
    console.error('\nAdd simple + professional to locale/skills.zh.json (or declare description-zh / simple-zh / professional-zh in SKILL.md), then re-run.');
    process.exit(1);
}
console.log('\nChinese coverage complete.');
