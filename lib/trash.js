/**
 * Skill trash: deletions move into `~/.dsh/charlotte/trash` with a
 * manifest recording the origin, and can be restored or emptied. Nothing is
 * hard-deleted from the trash UI path.
 */
import { randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { removePath } from './importer.js';
import { dshHome } from './roots.js';
/**
 * The station's state directory (also hosts the trash).
 * @returns absolute `~/.dsh/charlotte` path.
 */
export function stationHome() {
    return join(dshHome(), 'charlotte');
}
/**
 * The trash directory, created when missing.
 * @returns absolute trash path.
 */
export async function trashDir() {
    const dir = join(stationHome(), 'trash');
    await mkdir(dir, { recursive: true, mode: 0o700 });
    return dir;
}
/**
 * Return an entry id that does not exist yet. Two deletions in the same
 * millisecond with the same name must not share (and overwrite) one entry.
 * @param base - trash directory.
 * @param candidate - preferred id (already sanitized).
 * @returns an unused id.
 */
async function uniqueTrashId(base, candidate) {
    let id = candidate;
    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            await lstat(join(base, id));
        }
        catch {
            return id;
        }
        id = `${candidate}-${randomUUID().slice(0, 6)}`;
    }
    return `${candidate}-${randomUUID()}`;
}
/**
 * Resolve the payload path of one trash entry, refusing a manifest payload
 * that could escape the entry directory.
 * @param base - trash directory.
 * @param id - trash entry id.
 * @param manifest - parsed manifest.
 * @returns payload path, or the entry directory for the legacy layout.
 */
export function trashPayloadPath(base, id, manifest) {
    const entryDir = join(base, id);
    const payload = manifest?.payload;
    if (typeof payload !== 'string' || payload === '' || payload === '.' || payload === '..'
        || payload.includes('/') || payload.includes('\\')) {
        return entryDir;
    }
    const target = resolve(entryDir, payload);
    if (!target.startsWith(`${resolve(entryDir)}${sep}`)) return entryDir;
    return target;
}
/**
 * Move one installed skill into the trash. The entry is always a directory
 * wrapping the payload, so flat-file skills trash exactly like bundles.
 * @param path - absolute skill path (directory bundle or flat file).
 * @param name - skill name for the manifest.
 * @param rootId - root the skill was removed from.
 * @returns the trash entry id.
 */
export async function moveToTrash(path, name, rootId) {
    const base = await trashDir();
    const absolute = typeof path === 'string' && isAbsolute(path);
    if (!absolute) throw new Error('trash source must be an absolute path');
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    // A skill name comes from foreign frontmatter and is not a path segment:
    // `../` in it used to move the payload outside the trash directory.
    const safe = String(name ?? '').trim().replace(/[^\w.-]+/gu, '-').replace(/^[.-]+|[.-]+$/g, '').slice(0, 80) || 'skill';
    const id = await uniqueTrashId(base, `${stamp}-${safe}`);
    const dest = join(base, id);
    const payload = basename(path);
    const target = join(dest, payload);
    const manifest = { name, rootId, from: path, deletedAt: new Date().toISOString(), payload };
    try {
        // Write the manifest before moving anything: if the process dies after
        // a cross-device copy, the entry is still restorable. The trash holds
        // skill content, so keep the directory and manifest private.
        await mkdir(dest, { recursive: true, mode: 0o700 });
        await writeFile(join(dest, '.station-trash.json'), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
        await rename(path, target);
    }
    catch (error) {
        if (error.code !== 'EXDEV') {
            await rm(dest, { recursive: true, force: true }).catch(() => undefined);
            throw error;
        }
        try {
            await cp(path, target, { recursive: true, errorOnExist: true, force: false });
        }
        catch (copyError) {
            await rm(dest, { recursive: true, force: true }).catch(() => undefined);
            throw copyError;
        }
        try {
            await rm(path, { recursive: true, force: true });
        }
        catch (removeError) {
            // The complete copy and its manifest stay in the trash; the source
            // may be partially removed, so never delete the trash copy here.
            throw removeError;
        }
    }
    return id;
}
/**
 * List current trash entries, newest first.
 * @returns entries with readable manifests; unreadable entries are skipped.
 */
export async function listTrash() {
    const base = await trashDir();
    const entries = [];
    for (const id of await readdir(base)) {
        if (id.startsWith('.'))
            continue;
        try {
            const text = await readFile(join(base, id, '.station-trash.json'), 'utf8');
            const manifest = JSON.parse(text);
            if (typeof manifest.name === 'string' && typeof manifest.from === 'string') {
                entries.push({ id, manifest });
            }
        }
        catch {
            continue;
        }
    }
    entries.sort((a, b) => b.id.localeCompare(a.id));
    return entries;
}
/**
 * Move one entry back, falling back to copy+remove across filesystems.
 * @param source - path inside the trash.
 * @param target - original path to restore to.
 */
async function restoreEntry(source, target) {
    try {
        await rename(source, target);
        return;
    }
    catch (error) {
        if (error.code !== 'EXDEV')
            throw error;
    }
    try {
        await cp(source, target, { recursive: true, errorOnExist: true, force: false });
    }
    catch (error) {
        await rm(target, { recursive: true, force: true }).catch(() => undefined);
        throw error;
    }
    // The origin is restored. A failed cleanup only leaves an extra copy in
    // the trash; do not turn that into a failed restore.
    await rm(source, { recursive: true, force: true }).catch(() => undefined);
}

/**
 * Restore one trash entry to its recorded origin.
 * @param id - trash entry id.
 * @returns null on success, or an error message when the origin is occupied.
 */
export async function restoreTrash(id) {
    // One path segment only: `.`, `..` and separators would let the caller
    // address a directory outside the trash.
    if (typeof id !== 'string' || !/^[\w.-]+$/.test(id) || id === '.' || id === '..')
        return 'invalid trash entry id';
    const base = await trashDir();
    const entryDir = join(base, id);
    let manifest;
    try {
        manifest = JSON.parse(await readFile(join(entryDir, '.station-trash.json'), 'utf8'));
    }
    catch {
        return 'trash entry not found';
    }
    if (manifest === null || typeof manifest !== 'object'
        || typeof manifest.from !== 'string' || !isAbsolute(manifest.from) || manifest.from.includes('\u0000')) {
        return 'trash entry is corrupted';
    }
    if (manifest.payload !== undefined
        && (typeof manifest.payload !== 'string' || manifest.payload === '' || manifest.payload === '.'
            || manifest.payload === '..' || manifest.payload.includes('/') || manifest.payload.includes('\\'))) {
        return 'trash entry is corrupted';
    }
    // POSIX rename replaces an empty target directory, which would silently
    // discard whatever now occupies the origin; probe it first.
    try {
        await stat(manifest.from);
        return 'restore failed (origin occupied): a file or folder already exists at the original path';
    }
    catch {
        // Absent origin is the expected case; continue with the restore.
    }
    try {
        await rename(join(entryDir, '.station-trash.json'), join(entryDir, `.manifest-${id}`));
    }
    catch {
        return 'trash entry is corrupted';
    }
    try {
        if (manifest.payload !== undefined) {
            // Current layout: the entry directory wraps the payload.
            await restoreEntry(trashPayloadPath(base, id, manifest), manifest.from);
            await removePath(entryDir).catch(() => undefined);
        }
        else {
            // Legacy layout: the entry directory IS the (directory) payload.
            await restoreEntry(entryDir, manifest.from);
        }
    }
    catch (error) {
        // Put the manifest back; the entry stays restorable.
        await rename(join(entryDir, `.manifest-${id}`), join(entryDir, '.station-trash.json')).catch(() => { });
        return `restore failed (origin occupied?): ${String(error)}`;
    }
    return null;
}
/**
 * Permanently delete every trash entry.
 */
export async function emptyTrash() {
    const base = await trashDir();
    for (const id of await readdir(base)) {
        if (id.startsWith('.'))
            continue;
        await removePath(join(base, id));
    }
}
