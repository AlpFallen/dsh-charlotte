/**
 * 技能根目录解析：把配置展开成一组待扫描的 RootSpec。
 *
 * rank 约定（越小越优先，与 dsh 官方 skill-filesystem 对齐）：
 *   project-dsh 100 < project-agents 200 < [外部 210–300] <
 *   user-dsh 400 < [外部 450–491] < user-agents 500 < bundled 600
 *
 * 即：dsh 原生技能永远压过同名的导入技能；项目级导入压过用户级导入；
 * ~/.agents/skills 不在本插件范围内（dsh 原生已扫该目录）。
 */
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
export const DEFAULT_RANKS = {
    claudeProject: 210,
    zcodeProject: 220,
    codexProject: 225,
    cursorProject: 230,
    geminiProject: 240,
    extra: 300,
    claudeUser: 450,
    codexUser: 460,
    zcodeUser: 470,
    cursorUser: 480,
    geminiUser: 490,
    geminiAntigravityUser: 491,
};
async function pathExists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        // 向上逐级查找时缺失的目录是预期情况。
        return false;
    }
}
/**
 * 从 cwd 向上找最近的 .git 祖先作为项目根；找不到时回退 cwd 本身。
 * 语义对齐官方 skill-filesystem 的 findProjectRoot。
 */
export async function findProjectRoot(cwd) {
    let current = resolve(cwd);
    for (;;) {
        if (await pathExists(join(current, '.git')))
            return current;
        const parent = dirname(current);
        if (parent === current)
            return resolve(cwd);
        current = parent;
    }
}
/**
 * 展开全部根目录并按 rank 升序（同 rank 按路径字典序，保证 localOrder 确定）。
 * 同一路径只保留首次出现（rank 最高者）。
 */
export async function resolveRoots(config, cwd) {
    const roots = [];
    const home = homedir();
    if (cwd !== undefined) {
        const projectRoot = await findProjectRoot(cwd);
        if (config.sources.claude.enabled && config.sources.claude.project) {
            roots.push({
                path: join(projectRoot, '.claude', 'skills'),
                source: 'claude-code',
                rank: DEFAULT_RANKS.claudeProject,
                kind: 'project',
            });
        }
        if (config.sources.codex.enabled && config.sources.codex.project) {
            roots.push({
                path: join(projectRoot, '.codex', 'skills'),
                source: 'codex',
                rank: DEFAULT_RANKS.codexProject,
                kind: 'project',
            });
        }
        if (config.sources.zcode.enabled && config.sources.zcode.project) {
            roots.push({
                path: join(projectRoot, '.zcode', 'skills'),
                source: 'zcode',
                rank: DEFAULT_RANKS.zcodeProject,
                kind: 'project',
            });
        }
        if (config.sources.cursor.enabled && config.sources.cursor.project) {
            roots.push({
                path: join(projectRoot, '.cursor', 'skills'),
                source: 'cursor',
                rank: DEFAULT_RANKS.cursorProject,
                kind: 'project',
            });
        }
        if (config.sources.gemini.enabled && config.sources.gemini.project) {
            roots.push({
                path: join(projectRoot, '.gemini', 'skills'),
                source: 'gemini',
                rank: DEFAULT_RANKS.geminiProject,
                kind: 'project',
            });
        }
    }
    for (const dir of config.extraDirs) {
        roots.push({ path: resolve(dir.path), source: dir.label, rank: dir.rank, kind: 'extra' });
    }
    const claude = config.sources.claude;
    if (claude.enabled) {
        roots.push({
            path: resolve(claude.root ?? join(home, '.claude', 'skills')),
            source: 'claude-code',
            rank: claude.rank ?? DEFAULT_RANKS.claudeUser,
            kind: 'user',
        });
    }
    const codex = config.sources.codex;
    if (codex.enabled) {
        roots.push({
            path: resolve(codex.root ?? join(home, '.codex', 'skills')),
            source: 'codex',
            rank: codex.rank ?? DEFAULT_RANKS.codexUser,
            kind: 'user',
        });
    }
    const zcode = config.sources.zcode;
    if (zcode.enabled) {
        roots.push({
            path: resolve(zcode.root ?? join(home, '.zcode', 'skills')),
            source: 'zcode',
            rank: zcode.rank ?? DEFAULT_RANKS.zcodeUser,
            kind: 'user',
        });
    }
    const cursor = config.sources.cursor;
    if (cursor.enabled) {
        roots.push({
            path: resolve(cursor.root ?? join(home, '.cursor', 'skills')),
            source: 'cursor',
            rank: cursor.rank ?? DEFAULT_RANKS.cursorUser,
            kind: 'user',
        });
    }
    const gemini = config.sources.gemini;
    if (gemini.enabled) {
        if (gemini.root !== undefined) {
            roots.push({ path: resolve(gemini.root), source: 'gemini', rank: gemini.rank ?? DEFAULT_RANKS.geminiUser, kind: 'user' });
        }
        else {
            roots.push({
                path: resolve(join(home, '.gemini', 'skills')),
                source: 'gemini',
                rank: gemini.rank ?? DEFAULT_RANKS.geminiUser,
                kind: 'user',
            });
            roots.push({
                path: resolve(join(home, '.gemini', 'antigravity', 'skills')),
                source: 'gemini',
                rank: (gemini.rank ?? DEFAULT_RANKS.geminiUser) + 1,
                kind: 'user',
            });
        }
    }
    roots.sort((left, right) => left.rank - right.rank || left.path.localeCompare(right.path));
    const seen = new Set();
    const unique = [];
    for (const root of roots) {
        if (seen.has(root.path))
            continue;
        seen.add(root.path);
        unique.push(root);
    }
    return unique;
}
