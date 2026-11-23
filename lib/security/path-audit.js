/**
 * Filesystem boundary checks shared by the API routes, the scanners and the
 * import pipeline.
 *
 * Two ideas are enforced here rather than in the UI:
 * - a relative path from a caller must not contain traversal, absolute forms,
 *   Windows separators, NUL bytes or encoded traversal;
 * - a path that is allowed to be written or read must still resolve (through
 *   symlinks) inside its permitted root.
 *
 * The checks return findings instead of throwing where the caller needs to
 * report them, and provide throwing wrappers for the hot write paths.
 */
import { lstat, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { ruleFinding } from './rules.js';

/** Directories that must never be used as a skill source or mount root. */
const SENSITIVE_ROOTS = [
    '/etc', '/private/etc', '/System', '/usr', '/bin', '/sbin', '/dev', '/proc', '/var/root', '/Library/Keychains',
];

/** Relative to the user\'s home directory. */
const SENSITIVE_HOME = [
    '.ssh', '.aws', '.gnupg', '.netrc', '.git-credentials', '.docker', '.kube', '.config/gh',
    '.config/gcloud', 'Library/Keychains', 'Library/Cookies', 'Library/Application Support/Google/Chrome',
];

/**
 * Whether a path points at a system or credential location that a skill
 * install must never read.
 * @param {string} path - absolute path.
 * @returns {boolean} true when the path is sensitive.
 */
export function isSensitivePath(path) {
    if (typeof path !== 'string' || path === '') return false;
    const resolved = resolve(path);
    const home = resolve(homedir());
    if (resolved === home || resolved === resolve('/')) return true;
    for (const root of SENSITIVE_ROOTS) {
        if (resolved === root || resolved.startsWith(`${root}${sep}`)) return true;
    }
    for (const relative of SENSITIVE_HOME) {
        const target = join(home, relative);
        if (resolved === target || resolved.startsWith(`${target}${sep}`)) return true;
    }
    return false;
}

/**
 * Whether a target is inside a root, using a separator-aware comparison.
 * @param {string} root - root path.
 * @param {string} target - candidate path.
 * @returns {boolean} true when contained.
 */
export function isWithin(root, target) {
    const rootResolved = resolve(root);
    const targetResolved = resolve(target);
    return targetResolved === rootResolved || targetResolved.startsWith(`${rootResolved}${sep}`);
}

/**
 * Decode a path repeatedly, to catch single- and double-encoded traversal.
 * @param {string} value - raw path.
 * @returns {Array<string>} distinct decoded forms, including the original.
 */
export function decodedForms(value) {
    const forms = [value];
    let current = value;
    for (let index = 0; index < 2; index += 1) {
        try {
            const next = decodeURIComponent(current);
            if (next === current) break;
            forms.push(next);
            current = next;
        }
        catch {
            break;
        }
    }
    return forms;
}

/**
 * Audit one caller-supplied relative path.
 * @param {string} rel - relative path from an upload or archive.
 * @param {object} options - target id and optional file label.
 * @returns {Array<object>} findings (empty when the path is safe).
 */
export function auditRelativePath(rel, options = {}) {
    const target = options.target ?? 'upload';
    if (typeof rel !== 'string' || rel.length === 0) {
        return [ruleFinding('SEC-FS-002', {
            target,
            filePath: null,
            evidence: { snippet: JSON.stringify(rel), reason: 'empty or non-string path' },
        })];
    }
    const findings = [];
    const forms = decodedForms(rel);
    const inspect = (value, encoded) => {
        if (value.includes('\u0000')) {
            findings.push(ruleFinding('SEC-FS-002', {
                target, filePath: rel,
                evidence: { snippet: value.slice(0, 160), reason: 'NUL byte', encoded },
            }));
            return;
        }
        if (value.includes('\\')) {
            findings.push(ruleFinding('SEC-FS-001', {
                target, filePath: rel,
                evidence: { snippet: value.slice(0, 160), reason: 'Windows separator', encoded },
            }));
            return;
        }
        if (isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('\\\\')) {
            findings.push(ruleFinding('SEC-FS-002', {
                target, filePath: rel,
                evidence: { snippet: value.slice(0, 160), reason: 'absolute path', encoded },
            }));
            return;
        }
        const segments = value.split('/');
        if (segments.some(segment => segment === '..')) {
            findings.push(ruleFinding('SEC-FS-001', {
                target, filePath: rel,
                evidence: { snippet: value.slice(0, 160), reason: encoded ? 'encoded traversal' : 'traversal segment', encoded },
            }));
        }
    };
    inspect(rel, false);
    for (const form of forms.slice(1)) {
        if (form !== rel && (form.includes('..') || isAbsolute(form))) {
            findings.push(ruleFinding('SEC-FS-001', {
                target, filePath: rel,
                evidence: { snippet: form.slice(0, 160), reason: 'encoded traversal', encoded: true },
            }));
            break;
        }
    }
    return findings;
}

/**
 * Real path of a target that may not exist yet: resolve the nearest existing
 * ancestor and re-append the missing segments.
 * @param {string} target - absolute path.
 * @returns {Promise<string>} real path.
 */
export async function realpathDeep(target) {
    const suffix = [];
    let current = resolve(target);
    for (;;) {
        try {
            const real = await realpath(current);
            return suffix.length === 0 ? real : join(real, ...suffix.reverse());
        }
        catch (error) {
            if (error?.code !== 'ENOENT') throw error;
            const parent = dirname(current);
            if (parent === current) return resolve(target);
            suffix.push(basename(current));
            current = parent;
        }
    }
}

/**
 * Audit a target path against its root using both lexical and real paths.
 * @param {object} input - root path, target path, target id and file label.
 * @returns {Promise<Array<object>>} findings.
 */
export async function auditContainment(input) {
    const rootPath = input.rootPath;
    const targetPath = input.targetPath;
    const target = input.target ?? targetPath ?? 'path';
    if (typeof rootPath !== 'string' || typeof targetPath !== 'string') {
        return [ruleFinding('SEC-FS-002', { target, filePath: targetPath ?? null, evidence: { reason: 'non-string path' } })];
    }
    const findings = [];
    if (!isAbsolute(targetPath)) {
        findings.push(ruleFinding('SEC-FS-002', { target, filePath: targetPath, evidence: { snippet: targetPath, reason: 'not absolute' } }));
        return findings;
    }
    if (!isWithin(rootPath, targetPath)) {
        findings.push(ruleFinding('SEC-FS-003', {
            target,
            filePath: targetPath,
            severity: 'CRITICAL',
            evidence: { snippet: targetPath.slice(0, 200), root: rootPath, reason: 'lexical escape' },
        }));
        return findings;
    }
    try {
        const [rootReal, targetReal] = await Promise.all([realpathDeep(rootPath), realpathDeep(targetPath)]);
        if (!isWithin(rootReal, targetReal)) {
            findings.push(ruleFinding('SEC-FS-003', {
                target,
                filePath: targetPath,
                severity: 'CRITICAL',
                evidence: { snippet: targetPath.slice(0, 200), root: rootReal, real: targetReal, reason: 'real path escape' },
            }));
        }
    }
    catch (error) {
        findings.push(ruleFinding('SEC-FS-003', {
            target,
            filePath: targetPath,
            confidence: 'possible',
            severity: 'HIGH',
            evidence: { snippet: targetPath.slice(0, 200), reason: `realpath failed: ${error instanceof Error ? error.message : String(error)}` },
        }));
    }
    return findings;
}

/**
 * Audit a local-path install source before its files are read.
 * @param {string} sourcePath - caller-supplied absolute path.
 * @param {object} options - target id and known workspaces.
 * @returns {Promise<Array<object>>} findings.
 */
export async function auditSourcePath(sourcePath, options = {}) {
    const target = options.target ?? 'import-path';
    if (typeof sourcePath !== 'string' || sourcePath === '' || !isAbsolute(sourcePath)) {
        return [ruleFinding('SEC-FS-002', {
            target,
            filePath: sourcePath ?? null,
            evidence: { snippet: String(sourcePath ?? ''), reason: 'source path must be absolute' },
        })];
    }
    if (sourcePath.includes('\u0000')) {
        return [ruleFinding('SEC-FS-002', { target, filePath: sourcePath, evidence: { snippet: sourcePath.slice(0, 160), reason: 'NUL byte' } })];
    }
    const resolved = resolve(sourcePath);
    if (isSensitivePath(resolved)) {
        return [ruleFinding('SEC-FS-009', {
            target,
            filePath: resolved,
            evidence: { snippet: resolved, reason: 'system or credential directory' },
        })];
    }
    const findings = [];
    let info;
    try {
        info = await lstat(resolved);
    }
    catch {
        return findings; // a missing path is a functional error, not a risk finding
    }
    if (info.isSymbolicLink()) {
        try {
            const real = await realpath(resolved);
            if (isSensitivePath(real)) {
                findings.push(ruleFinding('SEC-FS-009', {
                    target,
                    filePath: resolved,
                    evidence: { snippet: resolved, real, reason: 'symlink to a credential directory' },
                }));
            }
        }
        catch {
            findings.push(ruleFinding('SEC-FS-003', {
                target, filePath: resolved, severity: 'HIGH', confidence: 'possible',
                evidence: { snippet: resolved, reason: 'dangling or unreadable symlink source' },
            }));
        }
    }
    try {
        const mode = (await stat(resolved)).mode;
        if ((mode & 0o002) !== 0) {
            findings.push(ruleFinding('SEC-FS-010', {
                target,
                filePath: resolved,
                evidence: { snippet: resolved, mode: (mode & 0o777).toString(8), reason: 'source directory is world-writable' },
            }));
        }
    }
    catch {
        // Permissions are an extra signal, not a requirement.
    }
    return findings;
}


/**
 * Inspect one root or extra directory for mount-time risk.
 * @param {string} path - absolute directory.
 * @param {string} label - source label for the target id.
 * @returns {Promise<Array<object>>} findings.
 */
export async function auditMountRoot(path, label = 'extraDir') {
    const target = `mount:${label}`;
    if (typeof path !== 'string' || !isAbsolute(path)) {
        return [ruleFinding('SEC-CFG-002', { target, filePath: String(path ?? ''), evidence: { snippet: String(path ?? '') } })];
    }
    const resolved = resolve(path);
    if (isSensitivePath(resolved)) {
        return [ruleFinding('SEC-CFG-003', {
            target, filePath: resolved,
            evidence: { snippet: resolved, reason: 'sensitive system or credential directory' },
        })];
    }
    const findings = [];
    let info;
    try {
        info = await lstat(resolved);
    }
    catch {
        return findings;
    }
    if (info.isSymbolicLink()) {
        findings.push(ruleFinding('SEC-CFG-003', {
            target, filePath: resolved, severity: 'MEDIUM', confidence: 'likely',
            evidence: { snippet: resolved, reason: 'mount root is a symbolic link' },
        }));
    }
    try {
        const real = await realpath(resolved);
        if (isSensitivePath(real)) {
            findings.push(ruleFinding('SEC-CFG-003', {
                target, filePath: resolved,
                evidence: { snippet: resolved, real, reason: 'resolves into a sensitive directory' },
            }));
        }
        // lstat() reports 0777 for the link itself on many systems; the
        // world-writable check must describe the directory the link points at.
        const targetInfo = info.isSymbolicLink() ? await stat(resolved) : info;
        if (targetInfo.isDirectory() && (targetInfo.mode & 0o002) !== 0) {
            findings.push(ruleFinding('SEC-FS-010', {
                target, filePath: resolved, severity: 'MEDIUM',
                evidence: { snippet: resolved, mode: (targetInfo.mode & 0o777).toString(8) },
            }));
        }
    }
    catch {
        // The mount scanner will report unreadable roots.
    }
    return findings;
}
