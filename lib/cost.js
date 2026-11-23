/**
 * Injection-cost estimate for one skill body.
 *
 * The number answers one question: how much context does loading this skill
 * cost? It is a heuristic, not a tokenizer — no vocabulary ships with the
 * plugin, and a real BPE tokenizer would add megabytes for a number nobody
 * bills against. The heuristic splits CJK from everything else:
 *
 * - CJK characters: about one token each;
 * - ASCII/Latin text: about one token per four characters;
 * - everything else (symbols, emoji, other scripts): one token per two code
 *   points.
 *
 * The result is labelled `heuristic` everywhere it surfaces, so it is never
 * mistaken for a measured count.
 */

/** CJK ranges that tokenizers usually keep at roughly one token per glyph. */
const CJK = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF65-\uFF9F]/;

/**
 * Count code points by class in one pass.
 * @param text - body text.
 * @returns `{ cjk, ascii, other }` code-point counts.
 */
function classify(text) {
    let cjk = 0;
    let ascii = 0;
    let other = 0;
    for (const char of text) {
        if (CJK.test(char))
            cjk += 1;
        else if (char.codePointAt(0) < 0x80)
            ascii += 1;
        else
            other += 1;
    }
    return { cjk, ascii, other };
}

/**
 * Estimate the context cost of injecting one body.
 * @param text - SKILL.md content.
 * @param extra - extra text that rides with the skill (name, description).
 * @returns `{ chars, cjk, tokens, method }`; `method` is always `heuristic`.
 */
export function estimateInjection(text, extra = '') {
    const all = `${extra === '' ? '' : `${extra}\n`}${typeof text === 'string' ? text : ''}`;
    if (all.length === 0)
        return { chars: 0, cjk: 0, tokens: 0, method: 'heuristic' };
    const counts = classify(all);
    const tokens = Math.max(1, Math.round(counts.cjk + counts.ascii / 4 + counts.other / 2));
    return { chars: counts.cjk + counts.ascii + counts.other, cjk: counts.cjk, tokens, method: 'heuristic' };
}
