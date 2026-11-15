/**
 * Skill trash: deletions move into `~/.dsh/charlotte/trash` with a
 * manifest recording the origin, and can be restored or emptied. Nothing is
 * hard-deleted from the trash UI path.
 */
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
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
    await mkdir(dir, { recursive: true });
    return dir;
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
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    const id = `${stamp}-${name}`;
    const dest = join(base, id);
    await mkdir(dest, { recursive: true });
    const payload = basename(path);
    const target = join(dest, payload);
    const manifest = { name, rootId, from: path, deletedAt: new Date().toISOString(), payload };
    try {
        // Write the manifest before moving anything: if the process dies after
        // a cross-device copy, the entry is still restorable.
        await writeFile(join(dest, '.station-trash.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
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
    if (!/^[\w.-]+$/.test(id))
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
            await restoreEntry(join(entryDir, manifest.payload), manifest.from);
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
