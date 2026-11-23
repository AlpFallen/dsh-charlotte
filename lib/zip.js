/**
 * ZIP upload decoding.
 *
 * The central directory is validated as a whole (paths, symlinks, duplicates,
 * declared sizes) before a single entry is decompressed, then each entry is
 * size-checked again before it is buffered. The resulting UploadFile list goes
 * through the same install safeguards as a folder upload.
 */
import unzipper from 'unzipper';
import { assertSafeRelative } from './roots.js';
import { assertArchiveSafe } from './security/archive-audit.js';

/** Bounded entry count so a hostile archive cannot exhaust memory by entry spam. */
const MAX_ENTRIES = 10_000;
/** Decompressed total cap, mirroring the importer's install bound. */
const MAX_UNCOMPRESSED_BYTES = 256 * 1024 * 1024;
/** Per-entry cap, mirroring the importer's install bound. */
const MAX_FILE_BYTES = 64 * 1024 * 1024;

/**
 * Open one archive and return its central-directory entries without
 * decompressing anything.
 * @param {Buffer|Uint8Array} data - complete archive bytes.
 * @returns {Promise<{entries: Array<object>}>} opened archive.
 * @throws when the bytes are not a valid zip.
 */
export async function openZipArchive(data) {
    try {
        const directory = await unzipper.Open.buffer(Buffer.from(data));
        return { entries: directory.files };
    }
    catch {
        throw new Error('not a valid zip archive');
    }
}

/**
 * Decode one zip archive into upload files.
 * @param {Buffer|Uint8Array} data - complete archive bytes.
 * @param {object} options - optional opened archive to avoid reopening.
 * @returns {Promise<Array<{path: string, contentBase64: string}>>} upload files.
 * @throws when the archive is invalid, empty, over a cap, or carries an unsafe path.
 */
export async function zipToUploadFiles(data, options = {}) {
    const archive = options.archive ?? await openZipArchive(data);
    const entries = archive.entries.filter(file => file.type === 'File');
    if (entries.length === 0)
        throw new Error('the zip archive contains no files');
    if (entries.length > MAX_ENTRIES) {
        throw new Error(`the zip archive has too many files (${String(entries.length)} > ${String(MAX_ENTRIES)})`);
    }
    // Fail closed on the central directory before allocating any entry body.
    assertArchiveSafe(entries, { target: options.target ?? 'archive' });
    const files = [];
    let total = 0;
    for (const entry of entries) {
        const normalized = entry.path.replaceAll('\\', '/');
        const segments = normalized.split('/');
        if (segments[0] === '__MACOSX')
            continue;
        if (segments[segments.length - 1] === '.DS_Store')
            continue;
        // Validate the path before decompression, then again after normalization.
        const declared = Number(entry.uncompressedSize);
        if (Number.isFinite(declared)) {
            if (declared > MAX_FILE_BYTES)
                throw new Error(`entry too large: ${normalized}`);
            if (total + declared > MAX_UNCOMPRESSED_BYTES)
                throw new Error('the zip archive exceeds the size cap after decompression');
        }
        const safePath = assertSafeRelative(normalized);
        const buffer = await entry.buffer();
        total += buffer.byteLength;
        if (buffer.byteLength > MAX_FILE_BYTES)
            throw new Error(`entry too large: ${safePath}`);
        if (total > MAX_UNCOMPRESSED_BYTES)
            throw new Error('the zip archive exceeds the size cap after decompression');
        files.push({ path: safePath, contentBase64: buffer.toString('base64') });
    }
    return files;
}
