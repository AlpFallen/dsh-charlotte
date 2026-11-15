/**
 * Stable fingerprint of a skill's readable files.
 *
 * The safety review must be invalidated when a script or asset changes, not
 * only when SKILL.md changes. Reading every byte on every index build would be
 * too expensive, so the manifest uses path, size and mtime for each file. A
 * normal edit changes mtime and/or size; a same-size, same-mtime rewrite is
 * intentionally out of scope for this cheap freshness check.
 */
import { createHash } from 'node:crypto';
import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Files walked per skill. */
const MAX_FILES = 500;
/** Directory depth walked. */
const MAX_DEPTH = 6;

/**
 * Hash one list of manifest rows.
 * @param rows - stable path/size/mtime rows.
 * @returns 16-character hex hash.
 */
function digest(rows) {
    return createHash('sha256').update(rows.join('\n')).digest('hex').slice(0, 16);
}

/**
 * Fingerprint one skill directory or flat skill file.
 * @param path - absolute skill path; empty/unreadable yields an empty string.
 * @param kind - `directory` or `file`; inferred from lstat when omitted.
 * @returns 16-character hex hash, or '' when the path is unreadable.
 */
export async function skillManifestHash(path, kind) {
    if (typeof path !== 'string' || path === '') return '';
    try {
        const info = await lstat(path);
        if (kind === 'file' || info.isFile()) {
            return digest([`file\0${info.size}\0${Math.round(info.mtimeMs)}`]);
        }
        if (!info.isDirectory()) return '';
        const rows = [];
        let truncated = false;
        const walk = async (dir, prefix, depth) => {
            if (depth > MAX_DEPTH || rows.length >= MAX_FILES) {
                truncated = true;
                return;
            }
            let entries;
            try {
                entries = await readdir(dir, { withFileTypes: true });
            }
            catch {
                truncated = true;
                return;
            }
            entries.sort((left, right) => left.name.localeCompare(right.name));
            for (const entry of entries) {
                if (entry.name.startsWith('.')) continue;
                const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
                const absolute = join(dir, entry.name);
                let fileInfo;
                try {
                    fileInfo = await lstat(absolute);
                }
                catch {
                    truncated = true;
                    continue;
                }
                if (fileInfo.isSymbolicLink()) continue;
                if (fileInfo.isDirectory()) {
                    await walk(absolute, relative, depth + 1);
                    continue;
                }
                if (!fileInfo.isFile()) continue;
                if (rows.length >= MAX_FILES) {
                    truncated = true;
                    break;
                }
                rows.push(`${relative}\0${fileInfo.size}\0${Math.round(fileInfo.mtimeMs)}`);
            }
        };
        await walk(path, '', 0);
        rows.sort();
        if (truncated) rows.push('truncated');
        return digest(rows);
    }
    catch {
        return '';
    }
}
