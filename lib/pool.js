/**
 * Shared-pool migration.
 *
 * Several agents read `~/.agents/skills`, so a skill that only lives in one
 * agent's private root is invisible to the others. Migration copies a real
 * skill directory into the shared pool and leaves a relative symlink at the
 * original place, so every source keeps working and there is still exactly one
 * copy on disk.
 *
 * Ordering matters: copy first, verify the copy, then swap the original for a
 * link. A failure at any step restores the original directory, so this never
 * leaves a skill half-moved.
 */
import { cp, lstat, mkdir, readdir, rename, rm, symlink } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

/** Migration outcomes that are refusals rather than failures. */
const MESSAGES = {
    'already-linked': '这个技能已经是软链接，不需要迁移',
    'already-in-pool': '这个技能已经在共享池里',
    'target-exists': '共享池里已有同名技能',
    'not-a-directory': '只有目录形式的技能可以迁移，单个 .md 文件不能建链接',
    'missing-source': '技能目录不存在',
    'invalid-name': '技能名不能用作共享池子目录名',
};

/**
 * Refusal with a stable code, so the API can answer 409 instead of 500.
 */
export class MigrationRefused extends Error {
    /**
     * @param code - one of the {@link MESSAGES} keys.
     */
    constructor(code) {
        super(MESSAGES[code] ?? code);
        this.code = code;
    }
}

/**
 * Verify a copied skill looks complete before the original is touched.
 * @param dir - copied directory.
 * @returns true when a SKILL.md exists inside.
 */
async function hasSkillFile(dir) {
    try {
        const entries = await readdir(dir);
        return entries.includes('SKILL.md');
    }
    catch {
        return false;
    }
}

/**
 * Move one skill directory into the shared pool and link it back.
 * @param options.source - absolute path of the skill directory.
 * @param options.name - skill name, used as the pool directory name.
 * @param options.poolDir - absolute shared pool root (`~/.agents/skills`).
 * @returns `{ target, link, linkTarget }`.
 * @throws {MigrationRefused} when the migration is not applicable.
 */
export async function migrateToSharedPool(options) {
    const source = resolve(options.source);
    const poolDir = resolve(options.poolDir);
    const name = options.name.trim();
    if (name === '' || name === '.' || name === '..' || name.includes('/') || name.includes('\\')
        || name.includes('\0') || name.startsWith('.')) {
        throw new MigrationRefused('invalid-name');
    }
    const target = join(poolDir, name);
    let info;
    try {
        info = await lstat(source);
    }
    catch {
        throw new MigrationRefused('missing-source');
    }
    if (info.isSymbolicLink()) throw new MigrationRefused('already-linked');
    if (!info.isDirectory()) throw new MigrationRefused('not-a-directory');
    if (source === poolDir || source.startsWith(`${poolDir}${sep}`)) throw new MigrationRefused('already-in-pool');
    try {
        await lstat(target);
        throw new MigrationRefused('target-exists');
    }
    catch (error) {
        if (error instanceof MigrationRefused) throw error;
        if (error.code !== 'ENOENT') throw error;
    }
    await mkdir(poolDir, { recursive: true });
    // 1. Copy into the pool, then prove the copy is a skill. A failed copy
    // must not leave a partial target behind: every later retry would then be
    // refused as target-exists.
    try {
        await cp(source, target, { recursive: true, errorOnExist: true, force: false });
    }
    catch (error) {
        await rm(target, { recursive: true, force: true }).catch(() => undefined);
        throw error;
    }
    if (!(await hasSkillFile(target))) {
        await rm(target, { recursive: true, force: true });
        throw new MigrationRefused('not-a-directory');
    }
    // 2. Swap the original for a relative link; restore on any failure.
    const parked = `${source}.migrating-${String(process.pid)}`;
    const linkTarget = relative(dirname(source), target);
    // Re-check identity right before the rename: a directory swapped for a
    // symlink between the first lstat and here must be refused, not moved.
    let current;
    try {
        current = await lstat(source);
    }
    catch {
        await rm(target, { recursive: true, force: true }).catch(() => undefined);
        throw new MigrationRefused('missing-source');
    }
    if (current.isSymbolicLink() || current.ino !== info.ino || current.dev !== info.dev) {
        await rm(target, { recursive: true, force: true }).catch(() => undefined);
        throw new MigrationRefused('already-linked');
    }
    try {
        await rename(source, parked);
    }
    catch (error) {
        await rm(target, { recursive: true, force: true });
        throw error;
    }
    try {
        await symlink(linkTarget, source, 'dir');
    }
    catch (error) {
        try {
            await rename(parked, source);
        }
        catch (restoreError) {
            // Leaving this silent would strand the skill: surface both the
            // failure and where the original now lives.
            await rm(target, { recursive: true, force: true }).catch(() => undefined);
            throw new Error(`迁移失败且原目录还原失败：${source} 的内容仍在 ${parked}（${restoreError instanceof Error ? restoreError.message : String(restoreError)}）`);
        }
        await rm(target, { recursive: true, force: true }).catch(() => undefined);
        throw error;
    }
    await rm(parked, { recursive: true, force: true }).catch(() => undefined);
    return { target, link: source, linkTarget, original: basename(source) };
}

