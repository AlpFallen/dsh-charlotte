/**
 * Metadata enrichment for one skill.
 *
 * The host catalog gives every skill a name, a description, an invocation
 * policy and (often) a `whenToUse` and a `metadata` bag. The launcher needs
 * more for search, detail and recommendation: a one-line purpose, keywords,
 * trigger phrases, use / avoid cases, declared dependencies and a version.
 *
 * Every derived field carries provenance. Nothing here invents a capability:
 * a field is either `declared` (the skill's own frontmatter said it) or
 * `derived` (a deterministic extraction from the skill's own text) or
 * `absent`. The detail panel shows which one it is.
 *
 * The module is pure: no I/O, no clock. The catalog layer reads files, hashes
 * them and caches the result.
 */
import { CATEGORIES } from './taxonomy.js';

/** Latin tokens ignored when extracting keywords. */
const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'when', 'use', 'uses', 'used', 'using', 'from',
    'into', 'your', 'you', 'are', 'not', 'but', 'all', 'any', 'can', 'will', 'has', 'have', 'its',
    'their', 'they', 'them', 'then', 'than', 'also', 'only', 'more', 'most', 'such', 'each', 'how',
    'what', 'which', 'who', 'why', 'where', 'while', 'after', 'before', 'over', 'under', 'about',
    'across', 'within', 'without', 'between', 'through', 'these', 'those', 'there', 'here', 'been',
    'being', 'does', 'did', 'was', 'were', 'one', 'two', 'three', 'it', 'is', 'of', 'to', 'in', 'on',
    'at', 'by', 'as', 'or', 'an', 'a', 'be', 'do', 'so', 'if', 'no', 'up', 'out', 'off', 'own',
    'same', 'other', 'should', 'would', 'could', 'must', 'may', 'might', 'very', 'just', 'like',
    // Generic workspace vocabulary: present in almost every skill body and
    // therefore useless as a search keyword.
    'code', 'script', 'api', 'build', 'file', 'files', 'tool', 'tools', 'skill', 'skills',
    'command', 'commands', 'run', 'running', 'text', 'data', 'output', 'input', 'step', 'steps',
    'work', 'works', 'task', 'tasks', 'project', 'projects', 'user', 'users', 'doc', 'docs',
    'document', 'documents', 'page', 'pages', 'new', 'existing', 'case', 'cases', 'example',
    'examples', 'result', 'results', 'value', 'values', 'follow', 'following', 'instead',
]);

/** Trigger markers that introduce an explicit "use when" clause. */
const TRIGGER_MARKERS = [
    /(?:当|在)?用户(?:想|要|需要|说|问|要求)[^。；;!?\n]{2,80}/g,
    /适用于[^。；;!?\n]{2,80}/g,
    /(?:用于|用来|适合)[^。；;!?\n]{2,80}/g,
    /use (?:this|it|whenever)[^.;!?\n]{4,120}/gi,
    /use when[^.;!?\n]{4,120}/gi,
    /triggers? on[^.;!?\n]{4,120}/gi,
];

/** Sentences that read as "avoid" guidance. */
const AVOID_MARKERS = /(?:不适用|不适用于|不要用|避免|不推荐|not for|avoid|do not use|don't use)/i;

/** Sentences that read as "use" guidance. */
const USE_MARKERS = /(?:适用于|适合|用于|用来|场景|use when|use whenever|use this|for tasks|intended for)/i;

/**
 * Collapse whitespace.
 * @param value - raw text.
 * @returns normalized text.
 */
function tidy(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Cut text to a display budget without splitting a surrogate pair.
 * @param text - source text.
 * @param max - maximum characters.
 * @returns clipped text.
 */
export function clip(text, max) {
    const chars = Array.from(text);
    if (chars.length <= max) return text;
    return chars.slice(0, Math.max(1, max - 1)).join('') + '…';
}

/**
 * First sentence of a description, used as the one-line purpose.
 * @param description - full description.
 * @param max - character budget.
 * @returns purpose line, or empty string.
 */
export function purposeOf(description, max = 120) {
    const text = tidy(description);
    if (text.length === 0) return '';
    const match = /^([^。！？!?]+[。！？!?]?)/.exec(text);
    const first = tidy(match === null ? text : match[1]);
    return clip(first, max);
}

/**
 * Split text into sentence-ish segments.
 * @param text - body or description.
 * @returns segments.
 */
function sentences(text) {
    return String(text ?? '')
        .replace(/\r/g, '')
        .split(/(?<=[。！？!?])|\n{2,}/)
        .map(row => tidy(row.replace(/^[#>*\-\s]+/, '')))
        .filter(row => row.length > 0);
}

/**
 * Latin-ish tokens from mixed text.
 * @param text - source text.
 * @returns lowercase tokens.
 */
function latinTokens(text) {
    return (String(text ?? '').toLowerCase().match(/[a-z][a-z0-9._-]{2,}/g) ?? [])
        .filter(token => !STOP_WORDS.has(token));
}

/**
 * Category terms that literally occur in the skill's own text.
 * @param fields - joined text fields.
 * @returns matched terms in taxonomy order.
 */
function matchedTaxonomyTerms(fields) {
    const text = fields.toLowerCase();
    const terms = [];
    for (const category of CATEGORIES) {
        for (const term of category.terms) {
            if (!text.includes(term.toLowerCase())) continue;
            if (!terms.includes(term)) terms.push(term);
        }
    }
    return terms;
}

/**
 * Extract quoted phrases (they are usually the author's own trigger examples).
 * @param text - source text.
 * @returns phrases without quotes.
 */
function quotedPhrases(text) {
    const phrases = [];
    for (const match of String(text ?? '').matchAll(/["“”'「」『』《》]([^"“”'「」『』《》\n]{2,40})["“”'「」『』《》]/g)) {
        const phrase = tidy(match[1]);
        if (phrase.length > 0 && !phrases.includes(phrase)) phrases.push(phrase);
    }
    return phrases;
}

/**
 * Read a frontmatter value that may be a string, an array or a `{zh,en}` map.
 * @param value - raw value.
 * @returns flat string list.
 */
function stringList(value) {
    if (typeof value === 'string') return value.trim().length === 0 ? [] : [value.trim()];
    if (Array.isArray(value)) return value.filter(row => typeof row === 'string' && row.trim().length > 0).map(row => row.trim());
    if (typeof value === 'object' && value !== null) {
        return Object.values(value).filter(row => typeof row === 'string' && row.trim().length > 0).map(row => row.trim());
    }
    return [];
}

/**
 * Plain frontmatter bag (the mounted provider and the local parser both keep
 * an object there).
 * @param meta - parsed metadata.
 * @returns metadata object.
 */
function metadataBag(meta) {
    const bag = meta?.metadata;
    return typeof bag === 'object' && bag !== null && !Array.isArray(bag) ? bag : {};
}

/**
 * Enrich one skill from its own declared data and text.
 * @param input - `{ name, description, whenToUse, meta, body, keywords? }`.
 * @returns enriched fields plus provenance.
 */
export function enrichSkill(input) {
    const name = String(input.name ?? '');
    const description = tidy(input.description);
    const whenToUse = tidy(input.whenToUse);
    const meta = input.meta ?? {};
    const bag = metadataBag(meta);
    const body = String(input.body ?? '');
    const purpose = purposeOf(description);

    const declaredKeywords = [
        ...stringList(bag.keywords),
        ...stringList(meta.keywords),
        ...stringList(bag.tags),
        ...stringList(meta.tags),
    ];
    const latin = new Map();
    for (const token of latinTokens(`${name} ${description} ${whenToUse}`)) {
        latin.set(token, (latin.get(token) ?? 0) + 1);
    }
    const taxonomyTerms = matchedTaxonomyTerms(`${name} ${description} ${whenToUse}`);
    const keywords = [...new Set([
        ...declaredKeywords,
        ...taxonomyTerms.slice(0, 8),
        ...[...latin.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 8).map(([token]) => token),
    ])].slice(0, 14);

    const declaredTriggers = [
        ...stringList(bag.triggers),
        ...stringList(bag['when-to-use']),
        ...stringList(meta.triggers),
    ];
    const triggerText = `${whenToUse} ${description}`;
    const derivedTriggers = [];
    for (const marker of TRIGGER_MARKERS) {
        for (const match of triggerText.matchAll(marker)) {
            const phrase = tidy(match[0]).replace(/^(当|在)?用户(想|要|需要|说|问|要求)/, '').trim();
            if (phrase.length >= 2 && derivedTriggers.length < 6 && !derivedTriggers.includes(phrase)) derivedTriggers.push(clip(phrase, 60));
        }
    }
    for (const phrase of quotedPhrases(triggerText).slice(0, 4)) {
        if (!derivedTriggers.includes(phrase)) derivedTriggers.push(phrase);
    }
    const triggers = declaredTriggers.length > 0
        ? { values: declaredTriggers.slice(0, 6), provenance: 'declared' }
        : { values: derivedTriggers.slice(0, 6), provenance: derivedTriggers.length > 0 ? 'derived' : 'absent' };

    const useCases = [];
    const avoidCases = [];
    for (const sentence of sentences(`${description} ${body.slice(0, 4000)}`)) {
        if (sentence.length < 6 || sentence.length > 160) continue;
        if (AVOID_MARKERS.test(sentence)) {
            if (avoidCases.length < 4) avoidCases.push(clip(sentence, 100));
            continue;
        }
        if (USE_MARKERS.test(sentence) && useCases.length < 4) useCases.push(clip(sentence, 100));
    }

    const declaredDependencies = [
        ...stringList(meta.dependencies),
        ...stringList(meta.requires),
        ...stringList(bag.dependencies),
        ...stringList(bag.requires),
    ].filter(row => /^[a-z0-9][a-z0-9-]{0,63}$/.test(row));
    const mentions = new Set();
    for (const match of body.matchAll(/(?:^|[\s(])\/([a-z][a-z0-9-]{1,63})/g)) mentions.add(match[1]);
    for (const match of body.matchAll(/(?:Skill|skill)\s+(?:tool\s+)?(?:with|named|:)\s*["“]([a-z][a-z0-9-]{1,63})["”]/g)) mentions.add(match[1]);

    const version = typeof meta.version === 'string' && meta.version.trim().length > 0
        ? meta.version.trim()
        : (typeof meta.Version === 'string' ? meta.Version.trim() : undefined);
    const declaredPermissions = [
        ...stringList(meta.permissions),
        ...stringList(bag.permissions),
        ...stringList(bag['allowed-tools']),
        ...stringList(meta['allowed-tools']),
    ];
    const declaredCategory = typeof bag.category === 'string' ? bag.category : (typeof meta.category === 'string' ? meta.category : undefined);

    return {
        purpose,
        keywords,
        triggers,
        useCases,
        avoidCases,
        declaredDependencies: [...new Set(declaredDependencies)],
        dependencyMentions: [...mentions],
        version,
        declaredPermissions,
        declaredCategory,
        provenance: {
            purpose: description.length > 0 ? 'derived' : 'absent',
            keywords: declaredKeywords.length > 0 ? 'declared' : 'derived',
            triggers: triggers.provenance,
            useCases: useCases.length > 0 ? 'derived' : 'absent',
            avoidCases: avoidCases.length > 0 ? 'derived' : 'absent',
            dependencies: declaredDependencies.length > 0 ? 'declared' : (mentions.size > 0 ? 'derived' : 'absent'),
            version: version === undefined ? 'absent' : 'declared',
        },
    };
}
