/**
 * Read-only quality and security inspection for one installed skill.
 *
 * This module never writes to the skill, never runs anything it finds and
 * never claims a skill is "safe". It walks the readable files, reports factual
 * structural problems, and matches a small set of high-signal patterns.
 * Every finding carries both Chinese and English copy so the client can show
 * it in either language without a second translation layer.
 *
 * Scope and limits are returned with the report (`disclaimer`): rule matching
 * only, no code execution, no sandboxing, no semantic understanding.
 */
import { lstat, readdir, readFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { auditText } from './audit.js';
import { readSkillMeta, splitFrontmatter } from './frontmatter.js';

/** Files walked per skill. */
const MAX_FILES = 300;
/** Directory depth walked. */
const MAX_DEPTH = 4;
/** Largest file whose text is scanned for patterns. */
const MAX_SCAN_BYTES = 200 * 1024;
/** Files whose text is scanned. */
const MAX_SCAN_FILES = 60;
/** Largest finding list returned. */
const MAX_FINDINGS = 60;
/** Per-file cap that mirrors the installer. */
const MAX_FILE_BYTES = 64 * 1024 * 1024;
/** Total cap that mirrors the installer. */
const MAX_TOTAL_BYTES = 256 * 1024 * 1024;
/** Extensions worth scanning as text. */
const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.sh', '.bash', '.zsh', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rb', '.pl', '.php', '.ps1', '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env', '.sql']);
/** Extensions whose external URLs deserve a report. */
const SCRIPT_EXTENSIONS = new Set(['.sh', '.bash', '.zsh', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rb', '.pl', '.php', '.ps1']);
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Pattern rules. Each rule is deliberately narrow and explained; a match is a
 * reason to look, not a verdict.
 */
const RULES = [
    {
        id: 'remote-pipe',
        severity: 'high',
        pattern: /\b(?:curl|wget)\b[^\n|]{0,240}\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/g,
        zh: '把网络内容直接交给 shell 执行',
        en: 'Executes downloaded content directly in a shell',
        whyZh: '下载内容一旦被换掉，执行的就是攻击者的代码。',
        whyEn: 'If the download changes, attacker code runs.',
        adviceZh: '确认下载来源，改为先下载、检查、再执行。',
        adviceEn: 'Check the source; download, inspect, then run.',
    },
    {
        id: 'destructive',
        severity: 'high',
        pattern: /\b(?:rm\s+-[a-zA-Z]*r[a-zA-Z]*f|rm\s+-[a-zA-Z]*f[a-zA-Z]*r|mkfs\.\w+|dd\s+if=|shutdown\s+|reboot\s*$)/g,
        zh: '包含删除文件或破坏系统的命令',
        en: 'Contains file-deleting or system-damaging commands',
        whyZh: '误执行可能删除用户数据或让机器无法使用。',
        whyEn: 'A wrong execution can delete data or break the machine.',
        adviceZh: '不要在不了解内容的情况下执行；确认路径与备份。',
        adviceEn: 'Do not run it blindly; check paths and back up first.',
    },
    {
        id: 'sudo',
        severity: 'warn',
        pattern: /\bsudo\b/g,
        zh: '要求管理员权限',
        en: 'Requests administrator privileges',
        whyZh: '提权执行会把影响范围扩大到整个系统。',
        whyEn: 'Elevated execution expands the blast radius to the whole system.',
        adviceZh: '确认为什么需要提权，能不用就不用。',
        adviceEn: 'Confirm why elevation is needed; avoid it when possible.',
    },
    {
        id: 'chmod-777',
        severity: 'warn',
        pattern: /\bchmod\s+(?:-R\s+)?777\b/g,
        zh: '把文件权限改成所有人可读写执行',
        en: 'Sets world-writable and executable permissions',
        whyZh: '任何本机进程都能修改这些文件。',
        whyEn: 'Any local process can modify those files.',
        adviceZh: '改用更小的权限范围。',
        adviceEn: 'Use the narrowest permissions that work.',
    },
    {
        id: 'sensitive-path',
        severity: 'high',
        pattern: /(?:~|\$HOME)\/\.ssh|\.aws\/credentials|\/etc\/(?:passwd|shadow)|Keychains?\/|Cookies\s*\/|Login Data/g,
        zh: '访问敏感目录或凭据文件',
        en: 'Touches sensitive directories or credential files',
        whyZh: '这些位置通常存放密钥、密码或会话凭据。',
        whyEn: 'These paths usually hold keys, passwords or session credentials.',
        adviceZh: '确认确有需要；优先使用专用令牌而不是读取凭据。',
        adviceEn: 'Confirm it is needed; prefer scoped tokens over reading credentials.',
    },
    {
        id: 'secret-like',
        severity: 'high',
        pattern: /(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|password|secret|token)\s*[:=]\s*["'][^"'\n]{8,})/gi,
        zh: '疑似密钥、令牌或密码',
        en: 'Looks like a key, token or password',
        whyZh: '凭据写进技能文件后，任何能读文件的人都能拿到。',
        whyEn: 'Once a credential is in the file, anyone who can read it gets it.',
        adviceZh: '删除真实凭据并轮换；改用环境变量或凭据存储。',
        adviceEn: 'Remove and rotate the real credential; use env vars or a credential store.',
    },
    {
        id: 'self-declared-safe',
        severity: 'high',
        pattern: /(?:本|这个|该|此|这份)?(?:文档|技能|插件|工具|项目)(?:非常|很|绝对|完全|100%|百分百|特别|极其|保证)?(?:安全|无风险)(?!性|模型|检查|策略|规则|问题|风险|边界|说明|机制)|(?:this|the)\s+(?:skill|document|plugin|tool|project)\s+is\s+(?:very\s+|completely\s+|totally\s+|100%\s+|perfectly\s+|absolutely\s+)?(?:safe|risk-free)/gi,
        zh: '自称“绝对安全/无风险”',
        en: 'Claims the skill or document is completely safe',
        whyZh: '安全需要证据，不是自我声明；这种话常用来降低读者的警惕。',
        whyEn: 'Safety needs evidence; a self-declaration usually lowers the reader’s guard.',
        adviceZh: '不要相信自称安全；看具体命令、权限和来源。',
        adviceEn: 'Do not trust the claim; inspect the commands, permissions and source.',
    },
    {
        id: 'obfuscation',
        severity: 'warn',
        pattern: /(?:base64\s+-d|\batob\s*\(|String\.fromCharCode\s*\(|\\x[0-9a-f]{2})/g,
        zh: '包含解码或转义执行，可能用于隐藏逻辑',
        en: 'Contains decoding or escaped execution that can hide logic',
        whyZh: '隐藏的逻辑无法人工审阅，也就无法判断它做什么。',
        whyEn: 'Hidden logic cannot be reviewed, so its behaviour is unknown.',
        adviceZh: '要求作者给出明文说明，或不要启用该技能。',
        adviceEn: 'Ask for a plain-text explanation, or do not enable the skill.',
    },
    {
        id: 'network',
        severity: 'warn',
        pattern: /https?:\/\/[^\s"'`)<\]]+/g,
        zh: '脚本中包含外部网络地址',
        en: 'A script contains external network addresses',
        whyZh: '技能可能把数据发送到外部服务。',
        whyEn: 'The skill may send data to an external service.',
        adviceZh: '确认域名可信、发送的数据范围可接受。',
        adviceEn: 'Confirm the domain is trusted and the data sent is acceptable.',
        only: 'script',
    },
];

/** Human copy for the report's limits. */
const DISCLAIMER = {
    zh: '规则扫描只检查文本里的高风险模式，不执行代码、不做沙箱验证，也不能证明技能安全。命中不等于恶意，未命中也不等于无害；启用前请自己审阅正文。',
    en: 'This is a rule scan over text only: it does not execute code, sandbox anything, or prove a skill safe. A hit is not proof of malice and a miss is not proof of safety; review the body before enabling.',
};

/**
 * Line number of one string offset.
 * @param text - file text.
 * @param index - character offset.
 * @returns 1-based line number.
 */
function lineOf(text, index) {
    return text.slice(0, index).split('\n').length;
}

/**
 * Collect the files of one skill directory, read-only and bounded.
 * @param rootPath - directory or file to inspect.
 * @returns `{ files, totalBytes, truncated, isFile }`.
 */
async function collectFiles(rootPath) {
    const info = await lstat(rootPath);
    if (info.isFile()) {
        return { files: [{ path: rootPath.split('/').pop() ?? 'SKILL.md', absolute: rootPath, size: info.size }], totalBytes: info.size, truncated: false, isFile: true };
    }
    if (!info.isDirectory()) return { files: [], totalBytes: 0, truncated: false, isFile: false };
    const files = [];
    let totalBytes = 0;
    let truncated = false;
    const walk = async (dir, prefix, depth) => {
        if (depth > MAX_DEPTH || files.length >= MAX_FILES) {
            truncated = truncated || depth > MAX_DEPTH || files.length >= MAX_FILES;
            return;
        }
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (entry.name === '.DS_Store') continue;
            if (entry.isSymbolicLink()) continue;
            const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
            const absolute = join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(absolute, rel, depth + 1);
                continue;
            }
            if (!entry.isFile()) continue;
            if (files.length >= MAX_FILES) {
                truncated = true;
                return;
            }
            let size = 0;
            try {
                size = (await lstat(absolute)).size;
            }
            catch {
                continue;
            }
            totalBytes += size;
            files.push({ path: rel, absolute, size });
        }
    };
    await walk(rootPath, '', 0);
    files.sort((left, right) => left.path.localeCompare(right.path));
    return { files, totalBytes, truncated, isFile: false };
}

/**
 * Structural quality checks over the collected file list.
 * @param files - collected files.
 * @param totalBytes - summed size.
 * @param truncated - whether the walk was cut short.
 * @param skillPath - SKILL.md path or the file to read.
 * @returns `{ level, findings, meta }`.
 */
async function qualityOf(files, totalBytes, truncated, skillPath, isFile = false) {
    const findings = [];
    let meta = null;
    let bodyText = '';
    if (skillPath !== undefined) {
        try {
            bodyText = await readFile(skillPath, 'utf8');
        }
        catch {
            findings.push({ id: 'unreadable', severity: 'error', zh: 'SKILL.md 无法读取', en: 'SKILL.md cannot be read' });
        }
    }
    // A flat .md skill is its own SKILL.md; only a directory can "miss" one.
    const skillFile = isFile ? files[0] : files.find(row => row.path === 'SKILL.md' || row.path.endsWith('/SKILL.md'));
    if (skillFile === undefined) {
        findings.push({ id: 'missing-skill-md', severity: 'error', zh: '缺少 SKILL.md', en: 'SKILL.md is missing' });
    }
    if (bodyText !== '') {
        const split = splitFrontmatter(bodyText);
        meta = readSkillMeta(bodyText);
        if (split === null) findings.push({ id: 'missing-frontmatter', severity: 'error', zh: 'SKILL.md 没有 YAML frontmatter', en: 'SKILL.md has no YAML frontmatter' });
        const name = typeof meta?.name === 'string' ? meta.name : '';
        if (name === '') findings.push({ id: 'missing-name', severity: 'error', zh: 'frontmatter 缺少 name', en: 'frontmatter has no name' });
        else if (!SKILL_NAME_RE.test(name)) findings.push({ id: 'invalid-name', severity: 'error', zh: `技能名不是 kebab-case：${name}`, en: `Skill name is not kebab-case: ${name}` });
        const description = typeof meta?.description === 'string' ? meta.description.trim() : '';
        if (description === '') findings.push({ id: 'missing-description', severity: 'warn', zh: '缺少 description，列表里不会展示用途', en: 'No description; the list cannot show its purpose' });
    }
    const empty = files.filter(row => row.size === 0);
    if (empty.length > 0) {
        findings.push({ id: 'empty-files', severity: 'warn', zh: `${empty.length} 个空文件：${empty.slice(0, 5).map(row => row.path).join('、')}`, en: `${empty.length} empty files: ${empty.slice(0, 5).map(row => row.path).join(', ')}` });
    }
    const oversized = files.filter(row => row.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
        findings.push({ id: 'large-files', severity: 'warn', zh: `${oversized.length} 个文件超过单文件上限（64MB）`, en: `${oversized.length} files exceed the 64MB per-file cap` });
    }
    if (totalBytes > MAX_TOTAL_BYTES) findings.push({ id: 'too-large', severity: 'warn', zh: '目录总大小超过 256MB', en: 'Directory exceeds 256MB' });
    if (truncated) findings.push({ id: 'too-many-files', severity: 'warn', zh: `文件数或目录层级超过检查上限（${MAX_FILES} 个 / ${MAX_DEPTH} 层），结果不完整`, en: `File count or depth exceeds the inspection cap (${MAX_FILES} files / ${MAX_DEPTH} levels); results are partial` });
    const level = findings.some(row => row.severity === 'error') ? 'error' : findings.some(row => row.severity === 'warn') ? 'warn' : 'ok';
    return { level, findings, meta };
}

/**
 * Pattern scan over the readable text files.
 * @param files - collected files.
 * @returns security report.
 */
async function securityOf(files) {
    const findings = [];
    let scanned = 0;
    let skipped = 0;
    for (const file of files) {
        if (findings.length >= MAX_FINDINGS || scanned >= MAX_SCAN_FILES) {
            skipped += 1;
            continue;
        }
        const extension = extname(file.path).toLowerCase();
        if (!TEXT_EXTENSIONS.has(extension)) continue;
        if (file.size > MAX_SCAN_BYTES) {
            skipped += 1;
            continue;
        }
        let text;
        try {
            text = await readFile(file.absolute, 'utf8');
        }
        catch {
            skipped += 1;
            continue;
        }
        scanned += 1;
        for (const rule of RULES) {
            if (findings.length >= MAX_FINDINGS) break;
            if (rule.only === 'script' && !SCRIPT_EXTENSIONS.has(extension)) continue;
            rule.pattern.lastIndex = 0;
            const match = rule.pattern.exec(text);
            if (match === null) continue;
            findings.push({
                id: rule.id,
                severity: rule.severity,
                file: file.path,
                line: lineOf(text, match.index),
                match: String(match[0]).slice(0, 120),
                messageZh: rule.zh,
                messageEn: rule.en,
                whyZh: rule.whyZh,
                whyEn: rule.whyEn,
                adviceZh: rule.adviceZh,
                adviceEn: rule.adviceEn,
            });
        }
        const audit = auditText(text);
        const hidden = audit.findings.filter(row => row.severity === 'high');
        if (hidden.length > 0) {
            findings.push({
                id: 'hidden-characters',
                severity: 'high',
                file: file.path,
                line: 1,
                match: hidden.map(row => row.id).join(', '),
                messageZh: '正文包含不可见的控制字符或标签字符',
                messageEn: 'The text contains invisible control or tag characters',
                whyZh: '它们能在人看不见的情况下改变显示或藏入内容。',
                whyEn: 'They can change what is displayed or hide content from a human reader.',
                adviceZh: '用审计面板查看具体字符，必要时重写该文件。',
                adviceEn: 'Inspect the exact characters in the audit panel; rewrite the file if needed.',
            });
        }
    }
    findings.sort((left, right) => (left.severity === right.severity ? 0 : left.severity === 'high' ? -1 : 1));
    const level = findings.some(row => row.severity === 'high') ? 'high' : findings.length > 0 ? 'warn' : 'ok';
    return {
        level,
        findings: findings.slice(0, MAX_FINDINGS),
        scanned,
        skipped,
        limit: { files: MAX_SCAN_FILES, bytes: MAX_SCAN_BYTES, depth: MAX_DEPTH, findings: MAX_FINDINGS },
        disclaimer: DISCLAIMER,
    };
}

/**
 * Inspect one skill path read-only.
 * @param options.path - absolute path of the skill directory or SKILL.md.
 * @param options.name - skill name from the index (metadata only).
 * @returns quality + security report.
 */
export async function inspectSkill(options) {
    const target = String(options.path ?? '');
    let collected;
    try {
        // Mounted/plugin records point at SKILL.md; inspect its directory so the
        // whole skill (scripts included) is scanned, while a flat `name.md`
        // skill stays a single file.
        const initial = await lstat(target);
        const scanTarget = initial.isFile() && basename(target) === 'SKILL.md' ? dirname(target) : target;
        collected = await collectFiles(scanTarget);
    }
    catch (error) {
        return {
            path: target,
            name: String(options.name ?? ''),
            error: 'not-readable',
            quality: { level: 'error', findings: [{ id: 'unreadable-path', severity: 'error', zh: '无法读取技能路径', en: 'The skill path cannot be read' }], meta: null },
            security: { level: 'ok', findings: [], scanned: 0, skipped: 0, disclaimer: DISCLAIMER },
            files: [],
            totalBytes: 0,
            truncated: false,
            generatedAt: Date.now(),
        };
    }
    const skillEntry = collected.isFile ? collected.files[0] : collected.files.find(row => row.path === 'SKILL.md');
    const skillPath = skillEntry === undefined ? undefined : skillEntry.absolute;
    const quality = await qualityOf(collected.files, collected.totalBytes, collected.truncated, skillPath, collected.isFile);
    const security = await securityOf(collected.files);
    return {
        path: target,
        name: typeof quality.meta?.name === 'string' && quality.meta.name !== '' ? quality.meta.name : String(options.name ?? ''),
        quality,
        security,
        files: collected.files.map(row => ({ path: row.path, size: row.size })),
        totalBytes: collected.totalBytes,
        truncated: collected.truncated,
        generatedAt: Date.now(),
    };
}
