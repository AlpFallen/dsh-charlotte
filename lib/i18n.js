/**
 * Chinese descriptions for skills whose own text is not Chinese.
 *
 * The product rule is: in the Chinese interface a skill's **name may stay in
 * its original form, but the list summary must be Chinese and readable by a
 * high-school student**. The detail panel then shows:
 *
 * - the skill's **official description** — Chinese when the skill declares
 *   Chinese, otherwise the English original, exactly as written;
 * - a **professional summary** — one technical paragraph below it.
 *
 * Both Chinese fields are resolved in a strict priority order:
 *
 * 1. `declared` — the skill's own frontmatter (`simple-zh`, `professional-zh`,
 *    `description-zh`, or the same keys under `metadata`). Always wins.
 * 2. `catalog` — the shipped catalogue (`locale/skills.zh.json`). An entry is
 *    only used when its stored `sourceHash` equals the hash of the skill's
 *    *current* description, so a changed skill loses its old summary instead
 *    of showing stale text.
 * 3. `absent` — nothing trustworthy exists. The list shows a Chinese "no
 *    summary yet" line (a Chinese-described skill falls back to its own text),
 *    and the official description stays visible in the detail panel.
 *
 * The catalogue is a localization resource, not skill data: it contains no
 * categories, counts or capabilities, only plain-language and professional
 * summaries of the real description.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Catalogue schema version. */
export const ZH_CATALOG_VERSION = 2;

/**
 * Absolute path of the shipped Chinese translation catalogue.
 * @returns `locale/skills.zh.json` next to the package root.
 */
export function zhTranslationsPath() {
    return join(dirname(dirname(fileURLToPath(import.meta.url))), 'locale', 'skills.zh.json');
}

/**
 * Normalize text before hashing: the same function must be used by the
 * catalogue generator and by the runtime lookup.
 * @param text - raw description.
 * @returns whitespace-collapsed, trimmed text.
 */
export function normalizeForHash(text) {
    return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Fingerprint one description.
 * @param text - description text.
 * @returns 16-character hex hash.
 */
export function descriptionHash(text) {
    return createHash('sha256').update(normalizeForHash(text), 'utf8').digest('hex').slice(0, 16);
}

/**
 * First sentence of a Chinese description, used when only a native Chinese
 * description exists (no simple/professional pair).
 * @param text - Chinese description.
 * @param max - character budget.
 * @returns first sentence, clipped.
 */
export function purposeOfZh(text, max = 90) {
    const value = normalizeForHash(text);
    if (value.length === 0) return '';
    const match = /^([^。！？；]+[。！？；]?)/.exec(value);
    const first = (match === null ? value : match[1]).trim();
    const chars = Array.from(first);
    return chars.length <= max ? first : `${chars.slice(0, Math.max(1, max - 1)).join('')}…`;
}

/**
 * Read a Chinese description declared by the skill itself.
 * @param meta - parsed local frontmatter (may be undefined).
 * @returns declared string, or undefined.
 */
export function declaredDescriptionZh(meta) {
    if (meta === null || meta === undefined || typeof meta !== 'object') return undefined;
    const bag = typeof meta.metadata === 'object' && meta.metadata !== null && !Array.isArray(meta.metadata) ? meta.metadata : {};
    const candidates = [
        meta['description-zh'],
        meta['description_zh'],
        meta.descriptionZh,
        bag['description-zh'],
        bag['description_zh'],
        bag.descriptionZh,
    ];
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    }
    return undefined;
}

/**
 * Read optional declared simple / professional Chinese fields.
 * @param meta - parsed local frontmatter.
 * @returns `{ simple, professional }` strings when declared.
 */
export function declaredZhPair(meta) {
    if (meta === null || meta === undefined || typeof meta !== 'object') return {};
    const bag = typeof meta.metadata === 'object' && meta.metadata !== null && !Array.isArray(meta.metadata) ? meta.metadata : {};
    const read = (keys) => {
        for (const key of keys) {
            const value = meta[key] ?? bag[key];
            if (typeof value === 'string' && value.trim().length > 0) return value.trim();
        }
        return undefined;
    };
    return {
        simple: read(['simple-zh', 'simpleZh', 'summary-zh']),
        professional: read(['professional-zh', 'professionalZh', 'description-zh', 'description_zh', 'descriptionZh']),
    };
}

/**
 * Translation catalogue with hash-guarded lookup.
 */
export class ZhCatalog {
    /**
     * @param file - catalogue path; defaults to the shipped file.
     */
    constructor(file = zhTranslationsPath()) {
        this.file = file;
        this.entries = undefined;
    }

    /**
     * Load the catalogue once.
     * @returns map of skill name to entry.
     */
    async load() {
        if (this.entries !== undefined) return this.entries;
        try {
            const parsed = JSON.parse(await readFile(this.file, 'utf8'));
            const entries = parsed?.version === ZH_CATALOG_VERSION && typeof parsed.entries === 'object' && parsed.entries !== null
                ? parsed.entries
                : {};
            this.entries = entries;
        }
        catch {
            this.entries = {};
        }
        return this.entries;
    }

    /**
     * Look up the Chinese summary for one skill, guarded by its source hash.
     * @param name - skill name.
     * @param description - the skill's current description.
     * @returns entry, or undefined when absent or stale.
     */
    async lookup(name, description) {
        const entries = await this.load();
        const entry = entries[name];
        if (entry === undefined || typeof entry !== 'object' || entry === null) return undefined;
        const simple = typeof entry.simple === 'string' ? entry.simple.trim() : '';
        const professional = typeof entry.professional === 'string' ? entry.professional.trim() : '';
        if (simple.length === 0 && professional.length === 0) return undefined;
        if (entry.sourceHash !== descriptionHash(description)) return undefined;
        return {
            simple: simple.length > 0 ? simple : null,
            professional: professional.length > 0 ? professional : null,
            source: 'catalog',
        };
    }
}

/**
 * Resolve the Chinese summary for one skill.
 * @param options.catalog - loaded catalogue.
 * @param options.name - skill name.
 * @param options.description - current description.
 * @param options.meta - local frontmatter, when available.
 * @returns `{ simple, professional, source }`.
 */
export async function resolveDescriptionZh(options) {
    const pair = declaredZhPair(options.meta);
    const declared = declaredDescriptionZh(options.meta);
    if (pair.simple !== undefined || pair.professional !== undefined) {
        return {
            simple: pair.simple ?? pair.professional ?? null,
            professional: pair.professional ?? pair.simple ?? null,
            source: 'declared',
        };
    }
    if (declared !== undefined) {
        return { simple: purposeOfZh(declared), professional: declared, source: 'declared' };
    }
    const hit = await options.catalog.lookup(options.name, options.description);
    if (hit !== undefined) return hit;
    return { simple: null, professional: null, source: 'absent' };
}
