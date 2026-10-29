/**
 * Real-time recommendation engine.
 *
 * Pipeline: quick filter → semantic-ish match → relevance ranking →
 * permission & dependency check → recommendation. It is deterministic and
 * local: tokenization, IDF-weighted field overlap and trigger-phrase matching
 * over the *real* enriched metadata. No LLM call, no embedding model, no
 * fabricated "semantic" claim — and it is therefore fast enough to run inside
 * the host's pre-step boundary.
 *
 * What it will not do:
 * - recommend on small talk or low-value prompts (value gate);
 * - recommend a skill that is disabled, not user-invocable, or whose declared
 *   dependency is missing;
 * - repeat the same skill for the same task, or re-offer something the user
 *   ignored until the task materially changes;
 * - exceed the configured cooldown and per-session frequency caps.
 *
 * All state (shown / ignored / counters) lives in the launcher state file so
 * "do not disturb" survives a restart.
 */
import { recordUsage, sessionRecOf } from './state.js';

/** Defaults for the configurable knobs. */
export const DEFAULT_RECOMMEND_CONFIG = {
    enabled: true,
    maxItems: 3,
    threshold: 0.18,
    minIntentChars: 10,
    minValueScore: 0.2,
    cooldownMs: 45_000,
    maxPerSession: 8,
    dedupeJaccard: 0.6,
    sameTaskJaccard: 0.55,
    comboRatio: 0.75,
};

/** Latin stop words for intent/field tokenization. */
const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'when', 'use', 'you', 'your', 'are', 'not', 'but',
    'all', 'any', 'can', 'will', 'has', 'have', 'its', 'they', 'them', 'then', 'than', 'also', 'only',
    'more', 'most', 'such', 'each', 'how', 'what', 'which', 'who', 'why', 'where', 'while', 'after',
    'before', 'over', 'under', 'about', 'into', 'from', 'them', 'there', 'here', 'been', 'does', 'did',
    'was', 'were', 'one', 'two', 'three', 'it', 'is', 'of', 'to', 'in', 'on', 'at', 'by', 'as', 'or',
    'an', 'a', 'be', 'do', 'so', 'if', 'no', 'up', 'out', 'off', 'own', 'same', 'other', 'should',
    'would', 'could', 'must', 'may', 'might', 'very', 'just', 'like', 'please', 'help', 'need', 'want',
]);

/** Chinese bigrams that carry no intent. */
const ZH_STOP_BIGRAMS = new Set([
    '我们', '你们', '他们', '这个', '那个', '什么', '怎么', '可以', '需要', '一个', '一下', '现在',
    '然后', '还是', '就是', '没有', '不是', '因为', '所以', '但是', '如果', '已经', '这样', '那样',
    '帮我', '请你', '麻烦', '谢谢', '好的', '嗯嗯', '一下', '看看', '看看', '东西',
]);

/**
 * Small bilingual synonym groups.
 *
 * Skill names, descriptions and user prompts do not agree on language or
 * vocabulary: a Chinese prompt ("建模") meets an English skill description
 * ("modeling"), and "xlsx" meets "表格". These groups are a fixed vocabulary
 * bridge — not per-skill data — so the matcher can connect the two without an
 * embedding model.
 */
const SYNONYM_GROUPS = [
    ['建模', '模型', 'model', 'modeling', 'mesh', '网格', '硬表面'],
    ['渲染', 'render', 'rendering', 'lighting', '灯光'],
    ['材质', 'material', 'texture', '纹理', 'uv', '贴图'],
    ['动画', 'animation', 'animate', '骨骼', 'rig', '绑定'],
    ['相机', 'camera', '运镜'],
    ['导出', 'export', 'glb', 'gltf', 'fbx', 'obj'],
    ['表格', 'excel', 'xlsx', 'spreadsheet', 'workbook', '工作簿', '数据表'],
    ['文档', 'document', 'docx', 'word', 'docs', 'readme'],
    ['演示', '幻灯片', 'ppt', 'pptx', 'slides', 'slide'],
    ['pdf', '文档转换', 'convert', '转换'],
    ['邮件', 'email', 'mail', 'inbox', '收件箱', '发信', '回信'],
    ['审查', 'review', '评审', '代码审查'],
    ['测试', 'test', 'testing', '单元测试'],
    ['修复', 'fix', 'bug', '缺陷', 'debug', '诊断'],
    ['重构', 'refactor', '重构建议'],
    ['设计', 'design', 'ui', 'ux', '界面', '视觉'],
    ['前端', 'frontend', '网页', 'website', '页面', 'page'],
    ['代码', 'code', 'coding', '实现', 'implement'],
    ['依赖', 'dependency', 'dependencies', '依赖关系'],
    ['项目', 'project', 'codebase', '代码库', '仓库'],
    ['课程', 'course', 'lesson', '教学', '学习', 'learn'],
    ['计划', 'plan', '规划', 'planning'],
    ['报告', 'report', '汇报', '总结', 'summary'],
];

/** token → set of equivalent tokens. */
const SYNONYMS = (() => {
    const map = new Map();
    for (const group of SYNONYM_GROUPS) {
        const normalized = group.map(term => normalize(term));
        for (const term of normalized) {
            const bucket = map.get(term) ?? new Set();
            for (const other of normalized) if (other !== term) bucket.add(other);
            map.set(term, bucket);
        }
    }
    return map;
})();

/**
 * Expand tokens with their synonym group.
 * @param {string[]} tokens - tokens.
 * @returns {string[]} expanded tokens.
 */
function expandTokens(tokens) {
    const out = [];
    const seen = new Set();
    const add = (token) => {
        if (token.length === 0 || seen.has(token)) return;
        seen.add(token);
        out.push(token);
    };
    for (const token of tokens) {
        add(token);
        for (const other of SYNONYMS.get(token) ?? []) add(other);
    }
    return out;
}

/** Task verbs that signal work worth a skill. */
const TASK_SIGNALS = [
    '实现', '编写', '写', '改', '修复', '重构', '审查', '检查', '排查', '设计', '生成', '创建', '搭建',
    '分析', '调研', '整理', '转换', '导出', '渲染', '建模', '部署', '测试', '优化', '迁移', '拆分',
    'implement', 'write', 'refactor', 'fix', 'review', 'design', 'build', 'create', 'generate',
    'analyze', 'investigate', 'convert', 'export', 'render', 'model', 'deploy', 'test', 'optimize',
    'migrate', 'split', 'debug', 'diagnose', 'audit', 'simplify',
    // Communication and document work is real task work too.
    '发送', '回复', '转发', '起草', '撰写', '整理', '归档', '汇报', '沟通', 'send', 'reply',
    'forward', 'draft', 'organize', 'summarize', 'translate',
    '汇总', '统计', '制表', '制图', '说明', '回信', '发信', '建', '渲染', '导出', '格式化',
];

/** Pure chatter / acknowledgement prompts. */
const SMALL_TALK = /^(?:你好|您好|hi|hello|hey|在吗|在不在|谢谢|多谢|thanks|thank you|好的|好|嗯|嗯嗯|ok|okay|收到|明白了?|继续|go on|continue|不错|厉害|哈哈)[\s!。,.?！？~～]*$/i;

/**
 * Normalize text for matching.
 * @param value - raw text.
 * @returns lowercase, punctuation-free text.
 */
function normalize(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[\u3000]/g, ' ')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Tokenize latin words and CJK bigrams.
 * @param value - raw text.
 * @returns token list.
 */
export function tokenize(value) {
    const text = normalize(value);
    const tokens = [];
    for (const token of text.match(/[a-z][a-z0-9._-]{2,}/g) ?? []) {
        if (!STOP_WORDS.has(token)) tokens.push(token);
    }
    const cjk = text.match(/[\u4e00-\u9fff]+/g) ?? [];
    for (const run of cjk) {
        const chars = Array.from(run);
        for (let index = 0; index < chars.length - 1; index += 1) {
            const bigram = `${chars[index]}${chars[index + 1]}`;
            if (!ZH_STOP_BIGRAMS.has(bigram)) tokens.push(bigram);
        }
        if (chars.length >= 3) {
            for (let index = 0; index < chars.length - 2; index += 1) {
                tokens.push(`${chars[index]}${chars[index + 1]}${chars[index + 2]}`);
            }
        }
    }
    return tokens;
}

/**
 * Jaccard similarity of two token sets.
 * @param left - string list.
 * @param right - string list.
 * @returns 0..1 similarity.
 */
export function jaccard(left, right) {
    const a = new Set(left);
    const b = new Set(right);
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const token of a) if (b.has(token)) intersection += 1;
    return intersection / (a.size + b.size - intersection);
}

/**
 * Resolve and validate the recommendation configuration.
 * @param raw - untrusted config value from the profile.
 * @returns validated config.
 */
export function resolveRecommendConfig(raw) {
    const input = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {};
    const number = (key, min, max, fallback, integer = false) => {
        const value = input[key];
        if (value === undefined) return fallback;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
            throw new Error(`config recommend.${key} must be a finite number in [${min}, ${max}]`);
        }
        return integer ? Math.round(value) : value;
    };
    const enabled = input.enabled;
    if (enabled !== undefined && typeof enabled !== 'boolean') {
        throw new Error('config recommend.enabled must be a boolean');
    }
    return {
        enabled: enabled ?? DEFAULT_RECOMMEND_CONFIG.enabled,
        maxItems: number('maxItems', 1, 3, DEFAULT_RECOMMEND_CONFIG.maxItems, true),
        threshold: number('threshold', 0, 1, DEFAULT_RECOMMEND_CONFIG.threshold),
        minIntentChars: number('minIntentChars', 0, 2000, DEFAULT_RECOMMEND_CONFIG.minIntentChars, true),
        minValueScore: number('minValueScore', 0, 1, DEFAULT_RECOMMEND_CONFIG.minValueScore),
        cooldownMs: number('cooldownMs', 0, 24 * 60 * 60 * 1000, DEFAULT_RECOMMEND_CONFIG.cooldownMs, true),
        maxPerSession: number('maxPerSession', 0, 200, DEFAULT_RECOMMEND_CONFIG.maxPerSession, true),
        dedupeJaccard: number('dedupeJaccard', 0, 1, DEFAULT_RECOMMEND_CONFIG.dedupeJaccard),
        sameTaskJaccard: number('sameTaskJaccard', 0, 1, DEFAULT_RECOMMEND_CONFIG.sameTaskJaccard),
        comboRatio: number('comboRatio', 0, 1, DEFAULT_RECOMMEND_CONFIG.comboRatio),
    };
}

/**
 * Value gate: is this prompt worth a recommendation at all?
 * @param intent - normalized prompt text.
 * @returns score in 0..1.
 */
export function valueScore(intent) {
    const text = String(intent ?? '');
    if (text.trim().length === 0) return 0;
    if (SMALL_TALK.test(text.trim())) return 0;
    const tokens = tokenize(text);
    if (tokens.length === 0) return 0;
    const taskHits = TASK_SIGNALS.filter(signal => text.toLowerCase().includes(signal)).length;
    const codeHint = /[\w./-]+\.(?:js|mjs|ts|tsx|jsx|py|go|rs|json|md|ya?ml|css|html|sh|sql|blend|glb)\b/i.test(text);
    const lengthFactor = Math.min(1, text.length / 40);
    const score = 0.55 * Math.min(1, taskHits / 2) + (codeHint ? 0.2 : 0) + 0.25 * lengthFactor;
    return Math.min(1, score);
}

/**
 * Build the IDF table for the current index.
 * @param skills - unified skill records.
 * @returns map token → idf.
 */
function buildIdf(skills) {
    const documentFrequency = new Map();
    const documents = [];
    for (const skill of skills) {
        const tokens = new Set(tokenize(`${skill.name} ${skill.purpose} ${skill.description} ${skill.keywords.join(' ')}`));
        documents.push(tokens);
        for (const token of tokens) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
    const total = Math.max(1, documents.length);
    const idf = new Map();
    for (const [token, frequency] of documentFrequency) {
        idf.set(token, Math.log((total + 1) / (frequency + 0.5)));
    }
    return idf;
}

/**
 * How much of a field's own vocabulary the prompt covers.
 *
 * Normalizing by the intent length punishes any prompt longer than a phrase;
 * normalizing by the field (capped) asks the useful question instead: does this
 * skill's distinguishing vocabulary actually occur in what the user said?
 * @param intentTokens - intent token list.
 * @param fieldText - field text.
 * @returns 0..1 coverage.
 */
function fieldCoverage(intentTokens, fieldText) {
    const fieldTokens = new Set(expandTokens(tokenize(fieldText)));
    if (fieldTokens.size === 0) return 0;
    const intent = new Set(expandTokens(intentTokens));
    let hits = 0;
    for (const token of fieldTokens) if (intent.has(token)) hits += 1;
    return Math.min(1, hits / Math.min(fieldTokens.size, 12));
}

/**
 * How many of one skill's short keywords literally occur in the prompt.
 * @param intent - normalized prompt text.
 * @param keywords - skill keywords.
 * @returns 0..1 coverage.
 */
function keywordCoverage(intent, keywords) {
    const list = keywords.filter(keyword => String(keyword).trim().length >= 2);
    if (list.length === 0) return 0;
    const intentWords = new Set(tokenize(intent));
    let hits = 0;
    for (const keyword of list) {
        const normalized = normalize(keyword);
        if (intent.includes(normalized)) {
            hits += 1;
            continue;
        }
        const equivalents = SYNONYMS.get(normalized);
        if (equivalents !== undefined && [...equivalents].some(other => intent.includes(other))) hits += 1;
        else if (equivalents !== undefined && [...equivalents].some(other => intentWords.has(other))) hits += 1;
    }
    return Math.min(1, hits / Math.min(list.length, 4));
}

/**
 * Whether a trigger phrase is present in the prompt.
 * @param intent - normalized prompt.
 * @param triggers - trigger phrases.
 * @returns 0..1 score plus the matched phrase.
 */
function triggerScore(intent, triggers) {
    const text = normalize(intent);
    let best = 0;
    let matched;
    for (const trigger of triggers) {
        const phrase = normalize(trigger);
        if (phrase.length < 2) continue;
        if (text.includes(phrase)) {
            const score = Math.min(1, 0.6 + phrase.length / 120);
            if (score > best) {
                best = score;
                matched = trigger;
            }
            continue;
        }
        const overlap = jaccard(tokenize(intent), tokenize(trigger));
        if (overlap >= 0.5 && overlap * 0.7 > best) {
            best = overlap * 0.7;
            matched = trigger;
        }
    }
    return { score: best, matched };
}

/**
 * Fingerprint the current task from intent tokens.
 *
 * The tokens themselves are kept (sorted, de-duplicated, capped) instead of a
 * hash: "is this a materially different request?" is answered by Jaccard
 * similarity, not by equality. The file is local and the tokens are the
 * user's own words already present in the conversation.
 * @param tokens - intent tokens.
 * @returns space-separated token signature.
 */
function fingerprint(tokens) {
    const unique = [...new Set(tokens)].filter(token => token.length > 0).sort();
    return unique.slice(0, 48).join(' ');
}

/**
 * Compare a stored token signature with the current tokens.
 * @param stored - stored fingerprint string.
 * @param tokens - current tokens.
 * @returns Jaccard similarity.
 */
function signatureOverlap(stored, tokens) {
    return jaccard(String(stored ?? '').split(' ').filter(token => token.length > 0), tokens);
}

/**
 * Normalize a name or trigger for direct-mention matching: lower-case, hyphens
 * and underscores treated as spaces, punctuation stripped.
 * @param value - raw phrase.
 * @returns normalized phrase.
 */
function normalizedPhrase(value) {
    return normalize(String(value ?? '')).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Whether a phrase occurs in the intent at a word boundary. Chinese characters
 * count as boundaries, so "点名grill" matches the trigger "grill".
 * @param text - normalized intent.
 * @param phrase - normalized phrase.
 * @returns whether the phrase is present.
 */
function phrasePresent(text, phrase) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}(?![a-z0-9])`).test(text);
}

/**
 * Skills the user explicitly names or triggers in the prompt.
 *
 * This is intentionally narrow: a full skill name, a hyphen-separated name
 * part (>=4 latin chars), or a short single-token declared/derived trigger.
 * It does not use description keywords, so "plan" or "design" in ordinary prose
 * cannot bypass the value gate.
 * @param index - current index.
 * @param intentText - raw prompt.
 * @returns names of explicitly mentioned, loadable skills.
 */
function directMentionNames(index, intentText) {
    const text = normalizedPhrase(intentText);
    const names = new Set();
    if (text === '') return names;
    for (const skill of index.skills) {
        if (!index.usable(skill)) continue;
        if (skill.requires.some(requirement => !requirement.satisfied)) continue;
        const candidates = new Set();
        const full = normalizedPhrase(skill.name);
        if (full.length >= 3) candidates.add(full);
        for (const part of String(skill.name).split('-')) {
            const phrase = normalizedPhrase(part);
            const minLength = /[\u4e00-\u9fff]/.test(phrase) ? 2 : 4;
            if (phrase.length >= minLength) candidates.add(phrase);
        }
        for (const trigger of skill.triggers?.values ?? []) {
            const phrase = normalizedPhrase(trigger);
            if (phrase.length >= 4 && phrase.length <= 40 && !phrase.includes(' ')) candidates.add(phrase);
        }
        for (const phrase of candidates) {
            if (phrasePresent(text, phrase)) {
                names.add(skill.name);
                break;
            }
        }
    }
    return names;
}

/**
 * Ranking engine over one index snapshot.
 */
export class Recommender {
    /**
     * @param options.config - resolved recommendation config.
     * @param options.state - launcher state store.
     * @param options.clock - time source (tests).
     */
    constructor(options) {
        this.config = options.config;
        this.state = options.state;
        this.clock = options.clock ?? (() => Date.now());
    }

    /**
     * Evaluate one prompt and return at most `maxItems` recommendations.
     * @param input - `{ sessionId, index, intent, history }`.
     * @returns `{ decision: 'recommend'|'none', reason, items, fingerprint, value }`.
     */
    async evaluate(input) {
        const { index, sessionId, intent } = input;
        const config = this.config;
        const now = this.clock();
        const intentText = String(intent ?? '').trim();
        const value = valueScore(intentText);
        if (!config.enabled) return { decision: 'none', reason: 'disabled', items: [], value };
        // An explicit skill name/trigger is the strongest signal the user can
        // give. It bypasses the short-prompt, small-talk and low-value gates,
        // plus cooldown/frequency caps, so "点名grill" works even on a terse
        // message. Permission, enablement and dependency checks still apply.
        const directNames = directMentionNames(index, intentText);
        const direct = directNames.size > 0;
        if (!direct) {
            if (intentText.length < config.minIntentChars) return { decision: 'none', reason: 'intent-too-short', items: [], value };
            if (SMALL_TALK.test(intentText)) return { decision: 'none', reason: 'small-talk', items: [], value };
            if (value < config.minValueScore) return { decision: 'none', reason: 'low-value', items: [], value };
        }

        const state = await this.state.read();
        const ledger = sessionRecOf(state, sessionId);
        if (!direct && ledger.count >= config.maxPerSession) return { decision: 'none', reason: 'frequency-cap', items: [], value };
        const tokens = tokenize(intentText);
        const current = fingerprint(tokens);
        const sameTask = signatureOverlap(ledger.fingerprint, tokens) >= config.sameTaskJaccard;
        if (!direct && sameTask && now - ledger.lastShownAt < config.cooldownMs) {
            return { decision: 'none', reason: 'cooldown', items: [], value, fingerprint: current };
        }

        const scored = [];
        for (const skill of index.skills) {
            if (!index.usable(skill)) continue;
            const missing = skill.requires.filter(requirement => !requirement.satisfied);
            if (missing.length > 0) continue;
            const isDirect = directNames.has(skill.name);
            const ignored = ledger.ignored[skill.name];
            if (!isDirect && ignored !== undefined && signatureOverlap(ignored, tokens) >= config.sameTaskJaccard) continue;
            const shownAt = ledger.shown[skill.name];
            if (!isDirect && shownAt !== undefined && sameTask) continue;

            const intentNormalized = normalize(intentText);
            const nameParts = String(skill.name).split('-').filter(part => part.length >= 3 || /[\u4e00-\u9fff]/.test(part));
            const nameHits = nameParts.filter(part => intentNormalized.includes(normalize(part))).length;
            const nameMention = intentNormalized.includes(normalize(skill.name).replace(/-/g, ' '))
                || intentNormalized.includes(normalize(skill.name))
                ? 1
                : (nameHits > 0 ? Math.min(0.8, 0.45 + 0.2 * nameHits) : 0);
            const trigger = triggerScore(intentText, skill.triggers.values);
            const keywordHit = keywordCoverage(intentNormalized, skill.keywords);
            const descriptionHit = Math.max(
                fieldCoverage(tokens, `${skill.purpose} ${skill.description}`),
                // A Chinese summary makes Chinese prompts match English
                // skills without machine translation at request time.
                skill.i18n?.simple || skill.i18n?.professional
                    ? fieldCoverage(tokens, `${skill.i18n.simple ?? ''} ${skill.i18n.professional ?? ''}`) * 0.95
                    : 0,
            );
            const categoryHit = fieldCoverage(tokens, `${skill.category.label} ${skill.category.labelEn}`);
            let score = 0.2 * nameMention + 0.26 * trigger.score + 0.34 * keywordHit
                + 0.15 * descriptionHit + 0.05 * categoryHit;
            if (!isDirect && skill.avoidCases.length > 0) {
                const avoid = fieldCoverage(tokens, skill.avoidCases.join(' '));
                score *= 1 - Math.min(0.7, avoid * 0.7);
            }
            if (isDirect) score = Math.max(score, config.threshold + 0.01);
            if (score <= 0) continue;
            scored.push({ skill, score, trigger: trigger.matched, nameMention: nameMention === 1, direct: isDirect });
        }
        scored.sort((left, right) => right.score - left.score || left.skill.name.localeCompare(right.skill.name));

        const picked = [];
        const topScore = scored.length === 0 ? 0 : scored[0].score;
        for (const candidate of scored) {
            if (candidate.score < config.threshold) break;
            if (picked.length >= config.maxItems) break;
            // Combining is the exception: a second skill must be close to the
            // best one, otherwise one clear recommendation is less noise.
            if (picked.length > 0 && candidate.score < topScore * config.comboRatio) break;
            const duplicate = picked.some((row) => {
                if (row.skill.name === candidate.skill.name) return true;
                if (row.skill.category.id !== candidate.skill.category.id) return false;
                return jaccard(tokenize(`${row.skill.keywords.join(' ')} ${row.skill.purpose}`),
                    tokenize(`${candidate.skill.keywords.join(' ')} ${candidate.skill.purpose}`)) >= config.dedupeJaccard;
            });
            if (duplicate) continue;
            picked.push(candidate);
        }
        if (picked.length === 0) return { decision: 'none', reason: 'no-match', items: [], value, fingerprint: current };

        const items = picked.map(candidate => {
            const reason = this.reasonOf(candidate);
            return {
                name: candidate.skill.name,
                category: candidate.skill.category,
                purpose: candidate.skill.purpose,
                simple: candidate.skill.i18n?.simple ?? null,
                source: candidate.skill.source,
                availability: candidate.skill.policy.availability,
                score: Number(candidate.score.toFixed(3)),
                reason: reason.zh,
                reasonEn: reason.en,
                requires: candidate.skill.requires,
            };
        });
        return { decision: 'recommend', reason: 'matched', items, value, fingerprint: current };
    }

    /**
     * Explain one recommendation using only matched evidence, in both UI
     * languages.
     * @param candidate - scored candidate.
     * @returns `{ zh, en }` one-sentence reasons.
     */
    reasonOf(candidate) {
        const zh = [];
        const en = [];
        if (candidate.direct) {
            zh.push('对话里直接点名了这个技能');
            en.push('the task names this skill directly');
        }
        else if (candidate.nameMention) {
            zh.push('对话里直接点名了这个技能');
            en.push('the task names this skill directly');
        }
        if (candidate.trigger !== undefined) {
            zh.push(`命中触发条件「${candidate.trigger}」`);
            en.push(`it matches the trigger "${candidate.trigger}"`);
        }
        if (zh.length === 0) {
            const keywords = candidate.skill.keywords.slice(0, 3).join('、');
            if (keywords.length > 0) {
                zh.push(`与当前任务的关键词「${keywords}」相关`);
                en.push(`it relates to the task keywords "${candidate.skill.keywords.slice(0, 3).join(', ')}"`);
            }
        }
        if (zh.length === 0) {
            zh.push(`与当前任务同属「${candidate.skill.category.label}」`);
            en.push(`it belongs to the task's area (${candidate.skill.category.labelEn})`);
        }
        const dependencyZh = candidate.skill.requires.length === 0
            ? '无额外依赖'
            : `依赖 ${candidate.skill.requires.map(row => row.name).join('、')} 已就绪`;
        const dependencyEn = candidate.skill.requires.length === 0
            ? 'no extra dependencies'
            : `its dependencies (${candidate.skill.requires.map(row => row.name).join(', ')}) are ready`;
        return { zh: `${zh[0]}；${dependencyZh}。`, en: `${en[0]}; ${dependencyEn}.` };
    }

    /**
     * Rank the user's own history for the recommendation home.
     *
     * This is the fallback the launcher shows when the current conversation has
     * no live match: only skills the user can actually run, whose declared
     * dependencies are satisfied, and which they have really used, pinned or
     * favourited. The score is deterministic and derived from stored events —
     * no sample list, no guessed interest.
     * @param input - `{ index, now }`.
     * @returns recommendation items ready for the client.
     */
    history(input) {
        const { index } = input;
        const now = input.now ?? this.clock();
        const rows = [];
        for (const skill of index.skills) {
            if (!index.usable(skill)) continue;
            if (skill.requires.some(requirement => !requirement.satisfied)) continue;
            const loads = Number(skill.stats?.loads ?? 0);
            const invokes = Number(skill.stats?.invokes ?? 0);
            const uses = loads + invokes;
            const favorite = skill.stats?.favorite === true;
            const pinned = skill.stats?.pinned === true;
            if (uses === 0 && !favorite && !pinned) continue;
            const lastUsedAt = Number(skill.stats?.lastUsedAt ?? 0);
            const age = lastUsedAt > 0 ? Math.max(0, now - lastUsedAt) : Number.POSITIVE_INFINITY;
            // Usage dominates; a recent call and an explicit pin/favourite are
            // real deliberate signals, not inferred preferences.
            const recency = Number.isFinite(age) ? 0.6 * Math.exp(-age / (14 * 24 * 60 * 60 * 1000)) : 0;
            const score = Math.log1p(uses) * 0.5 + (pinned ? 0.35 : 0) + (favorite ? 0.25 : 0) + recency;
            const reason = this.historyReason({ uses, favorite, pinned, lastUsedAt }, now);
            rows.push({ skill, score, reason });
        }
        rows.sort((left, right) => right.score - left.score || left.skill.name.localeCompare(right.skill.name));
        const limit = Math.max(1, this.config.maxItems);
        return rows.slice(0, limit).map((row) => ({
            name: row.skill.name,
            category: row.skill.category,
            purpose: row.skill.purpose,
            simple: row.skill.i18n?.simple ?? null,
            source: row.skill.source,
            availability: row.skill.policy.availability,
            score: Number(row.score.toFixed(3)),
            reason: row.reason.zh,
            reasonEn: row.reason.en,
            requires: row.skill.requires,
            stats: {
                loads: row.skill.stats.loads,
                invokes: row.skill.stats.invokes,
                lastUsedAt: row.skill.stats.lastUsedAt,
                favorite: row.skill.stats.favorite,
                pinned: row.skill.stats.pinned,
            },
        }));
    }

    /**
     * Explain a history-based recommendation from stored facts only.
     * @param facts - real counters and flags.
     * @param now - current timestamp.
     * @returns `{ zh, en }` reasons.
     */
    historyReason(facts, now) {
        const partsZh = [];
        const partsEn = [];
        if (facts.pinned) {
            partsZh.push('你置顶了这个技能');
            partsEn.push('you pinned this skill');
        }
        if (facts.favorite) {
            partsZh.push('你收藏了这个技能');
            partsEn.push('you favourited this skill');
        }
        if (facts.uses > 0) {
            partsZh.push(`你已使用 ${String(facts.uses)} 次`);
            partsEn.push(`you used it ${String(facts.uses)} time${facts.uses === 1 ? '' : 's'}`);
            if (facts.lastUsedAt > 0) {
                const days = Math.floor(Math.max(0, now - facts.lastUsedAt) / (24 * 60 * 60 * 1000));
                const months = Math.max(1, Math.floor(days / 30));
                const ageZh = days <= 0 ? '今天' : days < 30 ? `${String(days)} 天前` : days < 365 ? `${String(months)} 个月前` : '很久以前';
                const ageEn = days <= 0 ? 'today' : days < 30 ? `${String(days)} day${days === 1 ? '' : 's'} ago` : days < 365 ? `${String(months)} month${months === 1 ? '' : 's'} ago` : 'a long time ago';
                partsZh.push(`最近使用：${ageZh}`);
                partsEn.push(`last used ${ageEn}`);
            }
        }
        if (partsZh.length === 0) {
            partsZh.push('来自你的使用记录');
            partsEn.push('from your usage history');
        }
        return { zh: `${partsZh.join('；')}。`, en: `${partsEn.join('; ')}.` };
    }

    /**
     * Mark recommendations as shown for a session/task.
     * @param sessionId - session id.
     * @param names - recommended skill names.
     * @param taskFingerprint - fingerprint returned by {@link evaluate}.
     */
    async markShown(sessionId, names, taskFingerprint) {
        const now = this.clock();
        await this.state.update((state) => {
            const ledger = (state.rec.sessions[sessionId] ??= {
                shown: {}, ignored: {}, fingerprint: '', lastShownAt: 0, count: 0, updatedAt: 0,
            });
            for (const name of names) ledger.shown[name] = now;
            ledger.fingerprint = taskFingerprint;
            ledger.lastShownAt = now;
            ledger.count += 1;
            ledger.updatedAt = now;
        });
    }

    /**
     * Remember that the user ignored one recommendation for this task.
     * @param input - `{ sessionId, name, fingerprint }`.
     */
    async ignore(input) {
        const now = this.clock();
        const value = typeof input.fingerprint === 'string' && input.fingerprint.length > 0
            ? input.fingerprint.slice(0, 2000)
            : '';
        await this.state.update((state) => {
            const ledger = (state.rec.sessions[input.sessionId] ??= {
                shown: {}, ignored: {}, fingerprint: '', lastShownAt: 0, count: 0, updatedAt: 0,
            });
            ledger.ignored[input.name] = value;
            ledger.updatedAt = now;
        });
    }

    /**
     * Record a host-observed invocation outcome (called from the agent hook).
     * @param names - skill names injected into the request.
     * @param kind - `invoked` | `completed` | `failed`.
     * @param detail - optional failure text.
     */
    async observe(names, kind, detail) {
        if (names.length === 0) return;
        await this.state.update((state) => {
            for (const name of names) recordUsage(state, name, kind, detail);
        });
    }
}
