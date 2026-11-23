/**
 * Archive (ZIP) audit.
 *
 * Validation happens on the central directory, before any entry is
 * decompressed. That ordering matters: a decompression bomb must be rejected
 * from its declared sizes, never after `entry.buffer()` has already allocated
 * the memory.
 *
 * The limits mirror lib/importer.js so an archive that passes here cannot fail
 * later with a different number.
 */
import { extname } from 'node:path';
import { auditRelativePath } from './path-audit.js';
import { EXECUTABLE_EXTENSIONS, NATIVE_EXECUTABLE_EXTENSIONS, ruleFinding } from './rules.js';

/** Entry count cap, matching lib/zip.js. */
export const MAX_ENTRIES = 10_000;
/** Total uncompressed cap, matching lib/importer.js. */
export const MAX_UNCOMPRESSED_BYTES = 256 * 1024 * 1024;
/** Per-file cap, matching lib/importer.js. */
export const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
/** Ratio above which an entry looks like a decompression bomb. */
export const MAX_COMPRESSION_RATIO = 1000;
/** Minimum uncompressed size before the ratio rule applies. */
export const RATIO_MIN_BYTES = 10 * 1024 * 1024;

/**
 * Whether one unzipper entry declares a Unix symlink.
 * @param {object} entry - central-directory entry.
 * @returns {boolean} true for a symlink entry.
 */
export function isSymlinkEntry(entry) {
    const attributes = typeof entry?.externalFileAttributes === 'number' ? entry.externalFileAttributes : 0;
    const mode = (attributes >>> 16) & 0xffff;
    return (mode & 0o170000) === 0o120000;
}

/**
 * Whether an entry declares an executable file mode.
 * @param {object} entry - central-directory entry.
 * @returns {boolean} true when any execute bit is set.
 */
export function isExecutableMode(entry) {
    const attributes = typeof entry?.externalFileAttributes === 'number' ? entry.externalFileAttributes : 0;
    return ((attributes >>> 16) & 0o111) !== 0;
}

/**
 * Whether an entry is encrypted.
 * @param {object} entry - central-directory entry.
 * @returns {boolean} true when the encrypted flag is set.
 */
export function isEncryptedEntry(entry) {
    const flags = typeof entry?.flags === 'number' ? entry.flags : 0;
    return (flags & 0x0001) !== 0;
}

/**
 * Path of an entry after normalizing Windows separators.
 * @param {object} entry - central-directory entry.
 * @returns {string} normalized path.
 */
export function normalizedEntryPath(entry) {
    return String(entry?.path ?? '').replaceAll('\\', '/');
}

/**
 * Audit one archive's central directory.
 * @param {Array<object>} entries - all entries, directories included.
 * @param {object} options - target id.
 * @returns {{findings: Array<object>, facts: object}} audit result.
 */
export function auditArchiveEntries(entries, options = {}) {
    const target = options.target ?? 'archive';
    const list = Array.isArray(entries) ? entries : [];
    const findings = [];
    const seen = new Map();
    const facts = { entries: list.length, files: 0, totalBytes: 0, symlinks: 0, encrypted: 0, executables: 0, duplicates: 0 };

    for (const entry of list) {
        const rawPath = String(entry?.path ?? '');
        const path = normalizedEntryPath(entry);
        if (entry?.type === 'Directory' || path.endsWith('/')) continue;
        facts.files += 1;

        // Traversal and malformed paths, including URL-encoded variants. The
        // underlying check is shared with the upload importer, but an archive
        // finding must speak in archive terms (Zip Slip), not filesystem terms.
        for (const relative of auditRelativePath(rawPath, { target })) {
            findings.push(ruleFinding('SEC-ZIP-001', {
                target,
                filePath: path,
                confidence: relative.confidence,
                evidence: { ...relative.evidence, mappedFrom: relative.ruleId },
            }));
        }

        if (isSymlinkEntry(entry)) {
            facts.symlinks += 1;
            findings.push(ruleFinding('SEC-ZIP-002', {
                target,
                filePath: path,
                evidence: { snippet: path, externalFileAttributes: entry.externalFileAttributes ?? null },
            }));
        }
        if (isEncryptedEntry(entry)) {
            facts.encrypted += 1;
            findings.push(ruleFinding('SEC-ZIP-008', { target, filePath: path, evidence: { snippet: path } }));
        }

        const key = path.toLowerCase();
        if (seen.has(key)) {
            facts.duplicates += 1;
            findings.push(ruleFinding('SEC-ZIP-003', {
                target,
                filePath: path,
                evidence: { snippet: path, first: seen.get(key).slice(0, 160) },
            }));
        }
        else {
            seen.set(key, path);
        }

        const size = Number(entry?.uncompressedSize);
        const compressed = Number(entry?.compressedSize);
        if (Number.isFinite(size) && size >= 0) {
            facts.totalBytes += size;
            if (size > MAX_ENTRY_BYTES) {
                findings.push(ruleFinding('SEC-ZIP-004', {
                    target,
                    filePath: path,
                    evidence: { snippet: path, uncompressedSize: size, limit: MAX_ENTRY_BYTES },
                }));
            }
            if (Number.isFinite(compressed) && compressed > 0 && size > RATIO_MIN_BYTES && size / compressed > MAX_COMPRESSION_RATIO) {
                findings.push(ruleFinding('SEC-ZIP-006', {
                    target,
                    filePath: path,
                    evidence: { snippet: path, uncompressedSize: size, compressedSize: compressed, ratio: Math.round(size / compressed) },
                }));
            }
        }

        const extension = extname(key);
        if (NATIVE_EXECUTABLE_EXTENSIONS.has(extension)) {
            facts.executables += 1;
            findings.push(ruleFinding('SEC-ZIP-007', {
                target,
                filePath: path,
                evidence: { snippet: path, extension, executableMode: isExecutableMode(entry) },
            }));
        }
        else if (EXECUTABLE_EXTENSIONS.has(extension) || isExecutableMode(entry)) {
            // A script with an executable bit is common in skill bundles; report
            // it, but do not block the whole archive for it.
            facts.executables += 1;
            findings.push(ruleFinding('SEC-ZIP-007', {
                target,
                filePath: path,
                severity: 'MEDIUM',
                confidence: 'possible',
                evidence: { snippet: path, extension, executableMode: isExecutableMode(entry) },
            }));
        }
    }

    if (list.length > MAX_ENTRIES || facts.files > MAX_ENTRIES) {
        findings.push(ruleFinding('SEC-ZIP-005', {
            target,
            evidence: { entries: list.length, limit: MAX_ENTRIES },
        }));
    }
    if (facts.totalBytes > MAX_UNCOMPRESSED_BYTES) {
        findings.push(ruleFinding('SEC-ZIP-004', {
            target,
            severity: 'HIGH',
            evidence: { totalBytes: facts.totalBytes, limit: MAX_UNCOMPRESSED_BYTES },
        }));
    }
    return { findings, facts };
}

/**
 * Throw when an archive carries a blocking condition. Used by lib/zip.js before
 * decompression.
 * @param {Array<object>} entries - central-directory entries.
 * @param {object} options - target id.
 * @returns {Array<object>} findings (for the caller to log/report).
 */
export function assertArchiveSafe(entries, options = {}) {
    const { findings } = auditArchiveEntries(entries, options);
    const blocking = findings.find(finding => finding.severity === 'CRITICAL' || finding.severity === 'HIGH');
    if (blocking !== undefined) {
        const error = new Error(`archive rejected: ${blocking.title} (${blocking.ruleId})`);
        error.code = 'security-blocked';
        error.findings = findings;
        throw error;
    }
    return findings;
}
