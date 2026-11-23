/**
 * Skill content audit.
 *
 * Walks a skill directory read-only, runs the content rules over bounded text
 * files, checks invisible characters and executable attachments, and checks
 * declared permissions. It never executes anything and never writes.
 *
 * The same logic serves two entry points:
 * - `auditSkill` for an on-disk skill (install, enable, use, full audit);
 * - `auditSkillFiles` for an in-memory upload, so an install is scanned before
 *   a single byte reaches the destination root.
 */
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { auditText } from '../audit.js';
import { readSkillMeta, splitFrontmatter } from '../frontmatter.js';
import { createHash } from 'node:crypto';
import { auditContainment, auditRelativePath, isSensitivePath, isWithin } from './path-audit.js';
import { auditDeclaredPermissions, EXECUTABLE_EXTENSIONS, ruleFinding, scanText, TEXT_EXTENSIONS } from './rules.js';

/** Files walked per skill. */
export const MAX_FILES = 300;
/** Directory depth walked. */
export const MAX_DEPTH = 4;
/** Largest file whose text is scanned. */
export const MAX_TEXT_BYTES = 200 * 1024;
/** Text files scanned per skill. */
export const MAX_SCAN_FILES = 80;
/** Largest single file accepted by the installer. */
export const MAX_FILE_BYTES = 64 * 1024 * 1024;
/** Largest total skill size accepted by the installer. */
export const MAX_TOTAL_BYTES = 256 * 1024 * 1024;

/** Directories never descended into. */
const SKIP_DIRS = new Set(['.git', 'node_modules', '.svn', '.hg']);

/**
 * Whether a path has a text extension worth scanning.
 * @param {string} path - file path.
 * @returns {boolean} whether it is scanned as text.
 */
function isTextFile(path) {
    return TEXT_EXTENSIONS.has(extname(path).toLowerCase());
}

/**
 * Collect the files of one skill, bounded and without following links.
 * @param {string} rootPath - skill directory or flat file.
 * @returns {Promise<{files: Array<object>, issues: Array<string>, truncated: boolean}>} collection.
 */
async function collectSkillFiles(rootPath) {
    const issues = [];
    const files = [];
    let truncated = false;
    let info;
    try {
        info = await lstat(rootPath);
    }
    catch (error) {
        return { files, issues: [`unreadable path: ${error instanceof Error ? error.message : String(error)}`], truncated: true };
    }
    if (info.isFile()) {
        return { files: [{ relative: basename(rootPath), absolute: rootPath, size: info.size, mode: info.mode }], issues, truncated };
    }
    if (!info.isDirectory()) {
        return { files, issues: ['path is not a file or directory'], truncated: true };
    }
    const walk = async (dir, prefix, depth) => {
        if (depth > MAX_DEPTH || files.length >= MAX_FILES) {
            truncated = true;
            return;
        }
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        }
        catch (error) {
            issues.push(`cannot list ${dir}: ${error instanceof Error ? error.message : String(error)}`);
            truncated = true;
            return;
        }
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            if (entry.name === '.DS_Store' || SKIP_DIRS.has(entry.name)) continue;
            const absolute = join(dir, entry.name);
            const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
            if (entry.isSymbolicLink()) {
                files.push({ relative, absolute, size: 0, mode: 0, symlink: true });
                continue;
            }
            if (entry.isDirectory()) {
                await walk(absolute, relative, depth + 1);
                continue;
            }
            if (!entry.isFile()) continue;
            if (files.length >= MAX_FILES) {
                truncated = true;
                return;
            }
            let fileInfo;
            try {
                fileInfo = await lstat(absolute);
            }
            catch {
                truncated = true;
                continue;
            }
            files.push({ relative, absolute, size: fileInfo.size, mode: fileInfo.mode, symlink: false });
        }
    };
    await walk(rootPath, '', 0);
    files.sort((left, right) => left.relative.localeCompare(right.relative));
    return { files, issues, truncated };
}

/**
 * Inspect invisible characters in one file's text.
 * @param {object} input - text, file path and target.
 * @returns {Array<object>} findings.
 */
function auditInvisible(input) {
    const report = auditText(input.text);
    const findings = [];
    for (const row of report.findings) {
        const severity = row.severity === 'high' ? 'HIGH' : row.severity === 'medium' ? 'MEDIUM' : 'LOW';
        findings.push(ruleFinding('SEC-SKILL-010', {
            target: input.target,
            filePath: input.filePath,
            line: 1,
            severity,
            confidence: 'certain',
            evidence: { characterClass: row.id, count: row.count, snippet: `${row.count} × ${row.id}` },
        }));
    }
    return findings;
}

/**
 * Audit one on-disk skill.
 * @param {object} input - path, name, target id and optional root for containment.
 * @returns {Promise<{findings: Array<object>, complete: boolean, issues: Array<string>, files: number, bytes: number, hash: string}>} audit result.
 */
export async function auditSkill(input) {
    const target = input.target ?? `skill:${input.name ?? basename(String(input.path ?? ''))}`;
    const startedFindings = [];
    let scanPath = typeof input.path === 'string' ? resolve(input.path) : '';
    if (scanPath === '') {
        return { findings: [ruleFinding('SEC-SCAN-004', { target, filePath: null, evidence: { reason: 'no path' } })], complete: false, issues: ['no path'], files: 0, bytes: 0, hash: '' };
    }
    let info;
    try {
        info = await lstat(scanPath);
    }
    catch (error) {
        return {
            findings: [ruleFinding('SEC-SCAN-004', {
                target,
                filePath: scanPath,
                evidence: { snippet: `unreadable: ${error instanceof Error ? error.message : String(error)}` },
            })],
            complete: false,
            issues: ['unreadable path'],
            files: 0,
            bytes: 0,
            hash: '',
        };
    }
    if (info.isSymbolicLink()) {
        // A top-level symlink is a documented mount feature; follow it once and
        // report an escape only when a root was provided.
        if (typeof input.rootPath === 'string') {
            startedFindings.push(...await auditContainment({ rootPath: input.rootPath, targetPath: scanPath, target }));
        }
        try {
            scanPath = await realpath(scanPath);
        }
        catch {
            return {
                findings: [...startedFindings, ruleFinding('SEC-FS-003', { target, filePath: input.path, severity: 'HIGH', confidence: 'possible', evidence: { snippet: String(input.path), reason: 'dangling symlink' } })],
                complete: false,
                issues: ['dangling symlink'],
                files: 0,
                bytes: 0,
                hash: '',
            };
        }
        try {
            info = await lstat(scanPath);
        }
        catch {
            return { findings: [...startedFindings, ruleFinding('SEC-SCAN-004', { target, filePath: scanPath })], complete: false, issues: ['unreadable symlink target'], files: 0, bytes: 0, hash: '' };
        }
    }
    // Mounted records point at SKILL.md; inspect the whole directory. Remember
    // the original shape: after this point `info` still describes the file, but
    // `scanPath` is the bundle directory.
    const wasFile = info.isFile();
    const mountedSkillFile = wasFile && basename(scanPath) === 'SKILL.md';
    if (mountedSkillFile) scanPath = dirname(scanPath);
    const bundleDir = wasFile && !mountedSkillFile ? dirname(scanPath) : scanPath;
    const collected = await collectSkillFiles(scanPath);
    const findings = [...startedFindings];
    const issues = [...collected.issues];
    let bytes = 0;
    let scanned = 0;
    let skillText = '';
    // A flat `name.md` skill is its own SKILL.md; its frontmatter must be
    // parsed for declared permissions just like a directory bundle.
    const skillFileName = wasFile && !mountedSkillFile ? basename(scanPath) : 'SKILL.md';
    let bundleReal = '';
    try {
        bundleReal = await realpath(bundleDir);
    }
    catch {
        // The bundle itself was readable a moment ago; an unreadable real path
        // only weakens the symlink comparison, it does not hide the bundle.
    }

    for (const file of collected.files) {
        if (file.symlink) {
            // A link inside a bundle can point at a credential file or outside
            // the reviewed directory. Report that as a real escape, not as a
            // harmless attachment: the model may be told to read through it.
            let linkTarget;
            try {
                linkTarget = await realpath(file.absolute);
            }
            catch {
                linkTarget = undefined;
            }
            const escapes = linkTarget !== undefined && bundleReal !== '' && !isWithin(bundleReal, linkTarget);
            const sensitive = linkTarget !== undefined && isSensitivePath(linkTarget);
            const dangling = linkTarget === undefined;
            findings.push(ruleFinding('SEC-FS-003', {
                target,
                filePath: file.relative,
                severity: escapes || sensitive ? 'CRITICAL' : dangling ? 'HIGH' : 'MEDIUM',
                confidence: escapes || sensitive ? 'certain' : 'possible',
                evidence: {
                    snippet: file.relative,
                    reason: escapes || sensitive
                        ? 'symbolic link inside the skill bundle points outside the reviewed directory'
                        : dangling ? 'symbolic link inside the skill bundle is dangling or unreadable' : 'symbolic link inside the skill bundle',
                    ...(linkTarget === undefined ? {} : { linkTarget }),
                },
            }));
            continue;
        }
        bytes += file.size;
        if (file.size > MAX_FILE_BYTES) {
            findings.push(ruleFinding('SEC-FS-011', {
                target,
                filePath: file.relative,
                severity: 'MEDIUM',
                confidence: 'certain',
                evidence: { snippet: file.relative, size: file.size, reason: 'file exceeds the 64MB install limit' },
            }));
            issues.push(`oversized file skipped: ${file.relative}`);
            continue;
        }
        if (EXECUTABLE_EXTENSIONS.has(extname(file.relative).toLowerCase())) {
            findings.push(ruleFinding('SEC-SKILL-013', { target, filePath: file.relative, evidence: { snippet: file.relative, size: file.size } }));
        }
        if (!isTextFile(file.relative)) continue;
        if (scanned >= MAX_SCAN_FILES) {
            issues.push('scan file limit reached');
            continue;
        }
        if (file.size > MAX_TEXT_BYTES) {
            issues.push(`large text file skipped: ${file.relative}`);
            continue;
        }
        let text;
        try {
            text = await readFile(file.absolute, 'utf8');
        }
        catch (error) {
            issues.push(`unreadable file: ${file.relative}`);
            continue;
        }
        scanned += 1;
        if (file.relative === skillFileName) skillText = text;
        findings.push(...scanText({ text, filePath: file.relative, target }));
        findings.push(...auditInvisible({ text, filePath: file.relative, target }));
    }

    // SKILL.md is the instruction channel; a bundle without one is not a skill.
    if (info.isDirectory() && !collected.files.some(file => file.relative === 'SKILL.md')) {
        findings.push(ruleFinding('SEC-SCAN-004', {
            target,
            filePath: join(scanPath, 'SKILL.md'),
            evidence: { snippet: 'SKILL.md is missing or unreadable' },
        }));
    }

    if (skillText !== '') {
        const meta = readSkillMeta(skillText);
        const frontmatter = splitFrontmatter(skillText)?.data ?? {};
        const declared = [];
        if (Array.isArray(meta?.permissions)) declared.push(...meta.permissions);
        else if (typeof meta?.permissions === 'string') declared.push(...meta.permissions.split(/[,\s]+/));
        const allowed = frontmatter['allowed-tools'] ?? frontmatter.allowedTools;
        if (Array.isArray(allowed)) declared.push(...allowed);
        else if (typeof allowed === 'string') declared.push(...allowed.split(/[,\s]+/));
        findings.push(...auditDeclaredPermissions({ target, filePath: skillFileName, permissions: declared }));
    }

    if (bytes > MAX_TOTAL_BYTES) {
        issues.push('skill exceeds the 256MB total size cap');
        findings.push(ruleFinding('SEC-FS-011', {
            target,
            severity: 'MEDIUM',
            evidence: { totalBytes: bytes, limit: MAX_TOTAL_BYTES },
        }));
    }
    if (collected.truncated) issues.push('file walk was truncated by the inspection limits');
    // Any issue collected during the walk (unreadable file, skipped large text,
    // truncated directory) means the audit is incomplete, not clean.
    const complete = !collected.truncated && issues.length === 0;
    // Attach the absolute path so the source viewer and the safe fix can find
    // the file from a bundle-relative finding.
    const baseDir = bundleDir;
    for (const finding of findings) {
        if (typeof finding.filePath !== 'string' || finding.filePath === '') continue;
        if (finding.evidence === null || typeof finding.evidence !== 'object') continue;
        if (typeof finding.evidence.absolutePath !== 'string') {
            finding.evidence.absolutePath = isAbsolute(finding.filePath)
                ? finding.filePath
                : join(baseDir, finding.filePath);
        }
        // The source viewer may only read files inside this bundle.
        finding.evidence.skillRoot = baseDir;
    }

    return {
        findings,
        complete,
        issues,
        files: collected.files.length,
        scannedFiles: scanned,
        bytes,
        hash: contentHash(findings, bytes, collected.files.length),
    };
}

/**
 * Stable hash of an audit result plus size/count; the cache key must change
 * when the skill changes, and the manifest hash is already content-based.
 * @param {Array<object>} findings - findings.
 * @param {number} bytes - total bytes.
 * @param {number} files - file count.
 * @returns {string} 16-char hex digest.
 */
function contentHash(findings, bytes, files) {
    return createHash('sha256')
        .update(`${files}:${bytes}:${findings.map(finding => finding.id).sort().join(',')}`)
        .digest('hex')
        .slice(0, 16);
}

/**
 * Audit an in-memory upload file set before it is written anywhere.
 * @param {Array<{path: string, contentBase64?: string, content?: string}>} files - uploaded files.
 * @param {object} options - target and name.
 * @returns {{findings: Array<object>, complete: boolean, issues: Array<string>, hash: string}} audit result.
 */
export function auditSkillFiles(files, options = {}) {
    const target = options.target ?? 'upload';
    const findings = [];
    const issues = [];
    const digest = createHash('sha256');
    let total = 0;
    let seen = 0;
    for (const file of files ?? []) {
        const path = typeof file?.path === 'string' ? file.path : '';
        if (path === '') {
            issues.push('file without a path');
            continue;
        }
        findings.push(...auditRelativePath(path, { target }));
        let buffer;
        try {
            buffer = typeof file.content === 'string'
                ? Buffer.from(file.content, 'utf8')
                : Buffer.from(String(file.contentBase64 ?? ''), 'base64');
        }
        catch {
            issues.push(`undecodable file: ${path}`);
            continue;
        }
        digest.update(path).update('\u0000').update(buffer);
        total += buffer.byteLength;
        const extension = extname(path).toLowerCase();
        if (EXECUTABLE_EXTENSIONS.has(extension)) {
            findings.push(ruleFinding('SEC-SKILL-013', { target, filePath: path, evidence: { snippet: path, size: buffer.byteLength } }));
        }
        if (!TEXT_EXTENSIONS.has(extension)) {
            if (buffer.byteLength > MAX_FILE_BYTES) {
                issues.push(`file exceeds the 64MB limit: ${path}`);
                findings.push(ruleFinding('SEC-FS-011', {
                    target,
                    filePath: path,
                    severity: 'MEDIUM',
                    evidence: { size: buffer.byteLength, limit: MAX_FILE_BYTES },
                }));
            }
            continue;
        }
        if (buffer.byteLength > MAX_FILE_BYTES) {
            issues.push(`file exceeds the 64MB limit: ${path}`);
            findings.push(ruleFinding('SEC-FS-011', {
                target,
                filePath: path,
                severity: 'MEDIUM',
                evidence: { size: buffer.byteLength, limit: MAX_FILE_BYTES },
            }));
            continue;
        }
        // A text file too large to scan is unverified, exactly as on disk: do
        // not report the upload as fully scanned just because its body was
        // skipped. The install gate treats an incomplete audit as blocking.
        if (buffer.byteLength > MAX_TEXT_BYTES) {
            issues.push(`large text file skipped: ${path}`);
            continue;
        }
        if (seen >= MAX_SCAN_FILES) {
            issues.push('scan file limit reached');
            continue;
        }
        seen += 1;
        const text = buffer.toString('utf8');
        findings.push(...scanText({ text, filePath: path, target }));
        findings.push(...auditInvisible({ text, filePath: path, target }));
        if (path === 'SKILL.md' || path.endsWith('/SKILL.md')) {
            const meta = readSkillMeta(text);
            const frontmatter = splitFrontmatter(text)?.data ?? {};
            const declared = [];
            if (Array.isArray(meta?.permissions)) declared.push(...meta.permissions);
            else if (typeof meta?.permissions === 'string') declared.push(...meta.permissions.split(/[,\s]+/));
            const allowed = frontmatter['allowed-tools'] ?? frontmatter.allowedTools;
            if (Array.isArray(allowed)) declared.push(...allowed);
            else if (typeof allowed === 'string') declared.push(...allowed.split(/[,\s]+/));
            findings.push(...auditDeclaredPermissions({ target, filePath: path, permissions: declared }));
        }
    }
    if (total > MAX_TOTAL_BYTES) {
        findings.push(ruleFinding('SEC-FS-011', { target, severity: 'HIGH', evidence: { totalBytes: total, limit: MAX_TOTAL_BYTES } }));
    }
    return { findings, complete: issues.length === 0, issues, hash: digest.digest('hex').slice(0, 16) };
}
