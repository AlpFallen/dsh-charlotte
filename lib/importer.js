/**
 * Uploaded / dropped skill installation into a writable root, with conflict
 * policies and replace-through-trash.
 *
 * The copy-import flow is retired (external directories are mounted
 * read-only now), so this module only keeps the upload installer. Uploads
 * validate their SKILL.md before writing anything, so a failed validation
 * leaves the target root untouched.
 */
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { readSkillMeta, repairFrontmatter } from './frontmatter.js';
import { assertContained, ensureRoot, enumerateRoot } from './roots.js';
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/**
 * Return whether a string is a valid kebab-case skill name.
 * @param name - candidate skill name.
 * @returns whether it matches the DSH skill-name grammar.
 */
export function isSkillName(name) {
    return SKILL_NAME_RE.test(name);
}
/**
 * Install an uploaded file set as one skill directory. The set must contain a
 * top-level SKILL.md after stripping a shared folder prefix; the skill name
 * comes from its frontmatter.
 * @param root - writable destination root.
 * @param files - uploaded files with safe relative paths.
 * @param conflict - policy applied when the name already exists.
 * @param moveToTrash - called with the existing skill path on `replace`.
 * @returns the import outcome.
 */
export async function installUpload(root, files, conflict, moveToTrash) {
    try {
        // Dropped folders on macOS always carry .DS_Store; never install it.
        const usable = files.filter(file => file.path.split('/').pop() !== '.DS_Store');
        if (usable.length === 0)
            throw new Error('no files uploaded');
        const stripped = stripCommonPrefix(usable);
        const skillEntry = stripped.find(file => file.path === 'SKILL.md');
        if (skillEntry === undefined)
            throw new Error('the dropped folder has no SKILL.md at its top level');
        let totalBytes = 0;
        for (const file of stripped) {
            totalBytes += Math.floor(file.contentBase64.length * 3 / 4);
            if (totalBytes > MAX_TOTAL_BYTES)
                throw new Error('upload exceeds the size cap');
        }
        const text = Buffer.from(skillEntry.contentBase64, 'base64').toString('utf8');
        const meta = readSkillMeta(text);
        // Repair sloppy frontmatter so the strict host loader registers the copy.
        const repaired = repairFrontmatter(text);
        const name = meta?.name ?? '';
        if (!isSkillName(name))
            throw new Error(`SKILL.md frontmatter needs a valid kebab-case name, got "${name}"`);
        if (meta?.description === undefined || meta.description === '') {
            throw new Error('SKILL.md frontmatter needs a description');
        }
        const taken = new Set((await enumerateRoot(root)).map(skill => skill.name));
        let status = 'imported';
        if (taken.has(name)) {
            if (conflict === 'skip')
                return { sourcePath: 'upload', name, status: 'skipped' };
            if (conflict === 'rename')
                return { sourcePath: 'upload', name, status: 'skipped', error: 'rename is not supported for uploads; delete or rename the existing skill first' };
            await moveToTrash(join(root.path, name), name, root.id);
            status = 'replaced';
        }
        const targetDir = assertContained(root, join(root.path, name));
        await ensureRoot(root);
        // Stage inside the root and rename into place, so a failed write
        // leaves no partial skill behind.
        const staging = assertContained(root, join(root.path, `.staging-${randomUUID()}`));
        const toWrite = repaired === null
            ? stripped
            : stripped.map(file => file.path === 'SKILL.md'
                ? { ...file, contentBase64: Buffer.from(repaired, 'utf8').toString('base64') }
                : file);
        try {
            for (const file of toWrite) {
                const target = assertContained(root, join(staging, file.path));
                await mkdir(dirname(target), { recursive: true });
                const buffer = Buffer.from(file.contentBase64, 'base64');
                if (buffer.byteLength > MAX_FILE_BYTES)
                    throw new Error(`file too large: ${file.path}`);
                await writeFile(target, buffer);
            }
            await rename(staging, targetDir);
        }
        catch (error) {
            await rm(staging, { recursive: true, force: true }).catch(() => { });
            throw error;
        }
        return { sourcePath: 'upload', name, status, targetPath: targetDir };
    }
    catch (error) {
        return { sourcePath: 'upload', name: '', status: 'skipped', error: String(error) };
    }
}
/**
 * Remove the single shared top-level folder from a dropped file set, so
 * `foo/SKILL.md` and `foo/assets/x.png` become `SKILL.md` and `assets/x.png`.
 * @param files - uploaded files with relative paths.
 * @returns files with the common prefix stripped (unchanged when there is none).
 */
export function stripCommonPrefix(files) {
    if (files.length === 0)
        return [];
    const firstSegments = new Set(files.map(file => file.path.split('/')[0]));
    if (firstSegments.size !== 1)
        return [...files];
    const hasTopLevelFile = files.some(file => !file.path.includes('/'));
    if (hasTopLevelFile)
        return [...files];
    const prefix = `${files[0].path.split('/')[0]}/`;
    return files.map(file => ({ ...file, path: file.path.slice(prefix.length) })).filter(file => file.path.length > 0);
}
/**
 * Remove one installed skill directory or file from disk. Used only after the
 * caller has already moved the skill into the trash; kept as a bounded `rm`
 * for trash-empty.
 * @param path - absolute path to remove.
 */
export async function removePath(path) {
    await rm(path, { recursive: true, force: true });
}

/**
 * Read one local skill directory into the upload file shape.
 *
 * The path installer is a convenience for "the skill is already on this
 * machine": the host reads the directory it was pointed at and installs it
 * through the same validated upload path. Symlinks are not followed, hidden
 * files are skipped, and the same size caps as an upload apply.
 * @param sourcePath - absolute directory path.
 * @returns uploaded files with safe relative paths.
 */
export async function readSkillDirectory(sourcePath) {
    if (typeof sourcePath !== 'string' || !isAbsolute(sourcePath)) {
        throw new Error('source path must be absolute');
    }
    const rootPath = resolve(sourcePath);
    const rootReal = await realpath(rootPath).catch(() => rootPath);
    const info = await lstat(rootPath);
    if (!info.isDirectory()) throw new Error('source path is not a directory');
    const files = [];
    let totalBytes = 0;
    const walk = async (dir, prefix, depth) => {
        if (depth > 6) throw new Error('skill directory is nested too deeply');
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === '.DS_Store' || entry.name.startsWith('.')) continue;
            if (entry.isSymbolicLink()) continue;
            const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
            const absolute = join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(absolute, rel, depth + 1);
                continue;
            }
            if (!entry.isFile()) continue;
            // Never read through a symlink that appeared between readdir and now.
            const real = await realpath(absolute).catch(() => absolute);
            if (!real.startsWith(rootReal)) continue;
            const fileInfo = await lstat(absolute);
            totalBytes += fileInfo.size;
            if (totalBytes > MAX_TOTAL_BYTES) throw new Error('skill directory exceeds the size cap');
            if (fileInfo.size > MAX_FILE_BYTES) throw new Error(`file too large: ${rel}`);
            if (files.length >= 500) throw new Error('skill directory has too many files');
            const buffer = await readFile(absolute);
            files.push({ path: rel, contentBase64: buffer.toString('base64') });
        }
    };
    await walk(rootPath, '', 0);
    if (!files.some(file => file.path === 'SKILL.md' || file.path.endsWith('/SKILL.md'))) {
        throw new Error('the directory has no SKILL.md');
    }
    return files;
}
