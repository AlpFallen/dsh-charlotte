/**
 * HTTP API: route dispatch, request validation, and same-origin enforcement
 * for the `/charlotte/api` prefix. All handlers answer JSON; mutating
 * methods require a same-origin or non-browser request.
 *
 * The merged plugin serves three data sets:
 * - writable dsh roots and their skills (`/roots`, `/skills`, `/skill`),
 *   plus install/toggle/delete/trash — unchanged station surface;
 * - mounted external skills (`/catalog`, `/catalog-skill`) read from the
 *   merged provider instead of the retired copy-import scanner;
 * - mounted-skill switches (`/override`) stored in the dsh-side override file.
 */
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readSkillMeta, setFlag, splitFrontmatter } from './frontmatter.js';
import { installUpload } from './importer.js';
import { assertSafeRelative, enumerateRoot, rootById, writableRoots } from './roots.js';
import { emptyTrash, listTrash, moveToTrash, restoreTrash } from './trash.js';
import { zipToUploadFiles } from './zip.js';
const DEFAULT_MAX_BODY_BYTES = 64 * 1024 * 1024;
const API_PREFIX = '/charlotte/api';
/** Human labels for the external mount sources. */
const SOURCE_LABELS = {
    claude: 'Claude Code',
    codex: 'Codex CLI',
    zcode: 'ZCode',
    cursor: 'Cursor',
    gemini: 'Gemini CLI',
};
/**
 * Source list for the client, derived from the merged config.
 * @param config - resolved merged configuration.
 * @returns enabled sources with display labels.
 */
function sourceList(config) {
    const sources = [];
    for (const [id, option] of Object.entries(config.sources ?? {})) {
        if (option?.enabled === true)
            sources.push({ id, label: SOURCE_LABELS[id] ?? id });
    }
    return sources;
}
/**
 * Build the prefix handler serving the station API.
 * @param ctx - host context; workspace and skill services are read lazily.
 * @param config - resolved merged configuration.
 * @param provider - merged provider, used for the mounted-skill catalog.
 * @returns the node:http handler for the `/charlotte/api` prefix route.
 */
export function makeApiHandler(ctx, config, provider) {
    const maxBodyBytes = DEFAULT_MAX_BODY_BYTES;
    const workspaces = () => {
        const registry = ctx.get('workspaceRegistry');
        if (registry === undefined)
            return [];
        try {
            return registry.list().map(ws => ({ path: ws.path, title: ws.title ?? ws.path }));
        }
        catch {
            return [];
        }
    };
    const knownWorkspace = (requested) => {
        if (typeof requested !== 'string' || requested.length === 0)
            return undefined;
        const list = workspaces();
        // Without a registry (headless compositions) trust the caller's path.
        if (list.length === 0)
            return requested;
        return list.find(ws => ws.path === requested)?.path;
    };
    const rootsFor = (workspace) => writableRoots(workspace !== undefined ? [workspace] : []);
    const skillRegistry = () => ctx.get('skills');
    const listMounted = async (workspace) => {
        const candidates = await provider.list({ cwd: workspace });
        // Several sources can point at the same real skill (a symlink to
        // ~/.agents copied into both ~/.claude and ~/.zcode, say). The registry
        // dedupes by name and rank; the panel should show one card per file too.
        const byRealPath = new Map();
        for (const candidate of candidates) {
            let real = candidate.path;
            try {
                real = await realpath(candidate.path);
            }
            catch {
                // Vanished between listing and here: fall back to the symlink path.
            }
            const previous = byRealPath.get(real);
            if (previous === undefined || (candidate.rank ?? Number.POSITIVE_INFINITY) < (previous.rank ?? Number.POSITIVE_INFINITY)) {
                byRealPath.set(real, candidate);
            }
        }
        const unique = [...byRealPath.values()].sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0) || left.name.localeCompare(right.name));
        return unique.map(candidate => ({
            name: candidate.name,
            description: candidate.description,
            whenToUse: candidate.whenToUse ?? null,
            invocation: candidate.invocation,
            source: candidate.source,
            provider: candidate.provider,
            rank: candidate.rank ?? null,
            path: candidate.path,
            directory: candidate.locator?.directory ?? null,
            metadata: candidate.metadata ?? {},
        }));
    };
    return async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const path = url.pathname.startsWith(API_PREFIX) ? url.pathname.slice(API_PREFIX.length) : url.pathname;
        try {
            if (req.method === 'GET') {
                if (path === '/roots')
                    return sendJson(res, 200, { workspaces: workspaces(), sources: sourceList(config) });
                if (path === '/skills') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    const roots = rootsFor(workspace);
                    const groups = [];
                    for (const root of roots) {
                        groups.push({ rootId: root.id, label: root.label, path: root.path, workspace: root.workspace ?? null, skills: await enumerateRoot(root) });
                    }
                    const registry = skillRegistry();
                    const catalog = registry !== undefined && workspace !== undefined
                        ? await registry.list({ cwd: workspace })
                        : registry !== undefined ? await registry.list({}) : [];
                    return sendJson(res, 200, { groups, registry: catalog });
                }
                if (path === '/skill') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    const rootId = url.searchParams.get('root') ?? '';
                    const name = url.searchParams.get('name') ?? '';
                    const root = rootById(rootsFor(workspace), rootId);
                    if (root === undefined)
                        return sendJson(res, 404, { error: 'unknown root' });
                    const skill = (await enumerateRoot(root)).find(s => s.name === name);
                    if (skill === undefined)
                        return sendJson(res, 404, { error: 'skill not found' });
                    return sendJson(res, 200, await skillDetail(skill.path, skill.kind));
                }
                if (path === '/catalog') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    return sendJson(res, 200, { skills: await listMounted(workspace), sources: sourceList(config) });
                }
                if (path === '/catalog-skill') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    const target = url.searchParams.get('path') ?? '';
                    let candidate = provider.candidateByPath(target);
                    if (candidate === undefined) {
                        await provider.list({ cwd: workspace });
                        candidate = provider.candidateByPath(target);
                    }
                    if (candidate === undefined)
                        return sendJson(res, 404, { error: 'mounted skill not found' });
                    return sendJson(res, 200, await mountedDetail(candidate));
                }
                if (path === '/registry-skill') {
                    const workspace = knownWorkspace(url.searchParams.get('workspace') ?? undefined);
                    const name = url.searchParams.get('name') ?? '';
                    const registry = skillRegistry();
                    if (registry === undefined)
                        return sendJson(res, 503, { error: 'skill registry unavailable' });
                    const skill = await registry.get(name, workspace !== undefined ? { cwd: workspace } : {});
                    if (skill === undefined)
                        return sendJson(res, 404, { error: 'registry skill not found' });
                    return sendJson(res, 200, skill);
                }
                if (path === '/trash') {
                    return sendJson(res, 200, { entries: await listTrash() });
                }
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: 'not found' }));
                return;
            }
            if (!isSameOrigin(req))
                return sendJson(res, 403, { error: 'cross-origin request rejected' });
            const body = await readJsonBody(req, maxBodyBytes);
            if (req.method === 'POST') {
                if (path === '/upload') {
                    const workspace = knownWorkspace(body.workspace);
                    const root = rootById(rootsFor(workspace), typeof body.targetRoot === 'string' ? body.targetRoot : '');
                    if (root === undefined)
                        return sendJson(res, 400, { error: 'unknown target root' });
                    if (!Array.isArray(body.files))
                        return sendJson(res, 400, { error: 'files must be an array' });
                    const files = [];
                    for (const raw of body.files) {
                        if (typeof raw !== 'object' || raw === null)
                            return sendJson(res, 400, { error: 'malformed file entry' });
                        const entry = raw;
                        if (typeof entry.path !== 'string' || typeof entry.contentBase64 !== 'string')
                            return sendJson(res, 400, { error: 'malformed file entry' });
                        try {
                            files.push({ path: assertSafeRelative(entry.path), contentBase64: entry.contentBase64 });
                        }
                        catch (error) {
                            return sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
                        }
                    }
                    const outcome = await installUpload(root, files, toConflict(body.conflict), (p, name, rootId) => moveToTrash(p, name, rootId).then(() => { }));
                    return sendJson(res, outcome.status === 'skipped' && outcome.error !== undefined ? 409 : 200, { outcome });
                }
                if (path === '/upload-zip') {
                    const workspace = knownWorkspace(body.workspace);
                    const root = rootById(rootsFor(workspace), typeof body.targetRoot === 'string' ? body.targetRoot : '');
                    if (root === undefined)
                        return sendJson(res, 400, { error: 'unknown target root' });
                    if (typeof body.zipBase64 !== 'string' || body.zipBase64.length === 0) {
                        return sendJson(res, 400, { error: 'zipBase64 must be a non-empty string' });
                    }
                    let zipFiles;
                    try {
                        zipFiles = await zipToUploadFiles(Buffer.from(body.zipBase64, 'base64'));
                    }
                    catch (error) {
                        return sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
                    }
                    const outcome = await installUpload(root, zipFiles, toConflict(body.conflict), (p, name, rootId) => moveToTrash(p, name, rootId).then(() => { }));
                    return sendJson(res, outcome.status === 'skipped' && outcome.error !== undefined ? 409 : 200, { outcome });
                }
                if (path === '/toggle' || path === '/delete') {
                    const workspace = knownWorkspace(body.workspace);
                    const root = rootById(rootsFor(workspace), typeof body.rootId === 'string' ? body.rootId : '');
                    if (root === undefined)
                        return sendJson(res, 400, { error: 'unknown root' });
                    const name = typeof body.name === 'string' ? body.name : '';
                    const skill = (await enumerateRoot(root)).find(s => s.name === name);
                    if (skill === undefined)
                        return sendJson(res, 404, { error: 'skill not found' });
                    if (path === '/delete') {
                        await moveToTrash(skill.path, skill.name, root.id);
                        return sendJson(res, 200, { deleted: skill.name });
                    }
                    const flag = flagForToggle(body);
                    if (flag === null)
                        return sendJson(res, 400, { error: 'toggle needs modelInvocable or userInvocable' });
                    if (skill.kind === 'file') {
                        const text = await readFile(skill.path, 'utf8');
                        await writeFile(skill.path, setFlag(text, flag.key, flag.value), 'utf8');
                    }
                    else {
                        const skillFile = join(skill.path, 'SKILL.md');
                        const text = await readFile(skillFile, 'utf8');
                        await writeFile(skillFile, setFlag(text, flag.key, flag.value), 'utf8');
                    }
                    return sendJson(res, 200, { toggled: skill.name });
                }
                if (path === '/override') {
                    const workspace = knownWorkspace(body.workspace);
                    const target = typeof body.path === 'string' ? body.path : '';
                    if (target.length === 0)
                        return sendJson(res, 400, { error: 'path is required' });
                    if (typeof body.disabled !== 'boolean')
                        return sendJson(res, 400, { error: 'disabled must be a boolean' });
                    let candidate = provider.candidateByPath(target);
                    if (candidate === undefined) {
                        await provider.list({ cwd: workspace });
                        candidate = provider.candidateByPath(target);
                    }
                    if (candidate === undefined)
                        return sendJson(res, 400, { error: 'path is not a mounted skill' });
                    await provider.setDisabled(target, body.disabled);
                    return sendJson(res, 200, { path: target, disabled: body.disabled, name: candidate.name });
                }
                if (path === '/trash-restore') {
                    const error = await restoreTrash(typeof body.id === 'string' ? body.id : '');
                    return error === null ? sendJson(res, 200, { restored: true }) : sendJson(res, 409, { error });
                }
                if (path === '/trash-empty') {
                    await emptyTrash();
                    return sendJson(res, 200, { emptied: true });
                }
            }
            res.writeHead(405, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'method not allowed' }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message === 'request body too large') {
                const mb = Math.round(maxBodyBytes / 1024 / 1024);
                return sendJson(res, 413, {
                    error: `请求体超过上传上限（${String(mb)}MB）。如果文件夹就在本机，请改用「本地路径安装」——直接读盘拷贝，没有大小限制。`
                });
            }
            sendJson(res, 500, { error: String(error) });
        }
    };
}
/**
 * Map a toggle request body to the frontmatter flag it rewrites.
 * @param body - parsed request body.
 * @returns flag key and target value, or null when neither flag is present.
 */
export function flagForToggle(body) {
    if (typeof body.modelInvocable === 'boolean') {
        return { key: 'disable-model-invocation', value: !body.modelInvocable };
    }
    if (typeof body.userInvocable === 'boolean') {
        return { key: 'user-invocable', value: body.userInvocable };
    }
    return null;
}
function toConflict(value) {
    return value === 'rename' || value === 'replace' ? value : 'skip';
}
async function skillDetail(path, kind) {
    if (kind === 'file') {
        const content = await readFile(path, 'utf8');
        return { kind, path, content, files: [] };
    }
    const content = await readFile(join(path, 'SKILL.md'), 'utf8');
    const { readdir } = await import('node:fs/promises');
    const files = [];
    const walk = async (dir, prefix, depth) => {
        if (depth > 4 || files.length > 500)
            return;
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            if (entry.isSymbolicLink())
                continue;
            const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
            if (entry.isDirectory())
                await walk(join(dir, entry.name), rel, depth + 1);
            else if (entry.isFile())
                files.push(rel);
        }
    };
    await walk(path, '', 0);
    files.sort();
    const meta = readSkillMeta(content);
    const split = splitFrontmatter(content);
    return { kind, path, content, files, meta: meta ?? null, frontmatter: split?.data ?? null };
}
/**
 * Detail payload for a mounted external skill.
 * Reads the foreign `SKILL.md` as-is; never writes it.
 * @param candidate - provider candidate resolved by absolute path.
 * @returns same shape as {@link skillDetail} plus mount metadata.
 */
async function mountedDetail(candidate) {
    const path = candidate.path;
    const directory = candidate.locator?.directory ?? (candidate.path.endsWith('SKILL.md') ? candidate.path.slice(0, -'SKILL.md'.length).replace(/\/$/, '') : undefined);
    let content = '';
    try {
        content = await readFile(path, 'utf8');
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    const files = [];
    if (directory !== undefined) {
        const walk = async (dir, prefix, depth) => {
            if (depth > 4 || files.length > 500)
                return;
            for (const entry of await readdir(dir, { withFileTypes: true })) {
                if (entry.isSymbolicLink())
                    continue;
                const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
                if (entry.isDirectory())
                    await walk(join(dir, entry.name), rel, depth + 1);
                else if (entry.isFile())
                    files.push(rel);
            }
        };
        try {
            await walk(directory, '', 0);
        }
        catch {
            // Directory vanished between list and detail: still return the file.
        }
        files.sort();
    }
    const meta = readSkillMeta(content);
    const split = splitFrontmatter(content);
    return {
        kind: 'mounted',
        path,
        directory: directory ?? null,
        source: candidate.source,
        provider: candidate.provider,
        invocation: candidate.invocation,
        content,
        files,
        meta: meta ?? null,
        frontmatter: split?.data ?? null,
    };
}
/**
 * Enforce same-origin for browser mutations: an absent Origin header means a
 * non-browser caller; otherwise the Origin host must match the request host.
 * @param req - inbound request.
 * @returns whether the request may mutate state.
 */
export function isSameOrigin(req) {
    const origin = req.headers.origin;
    if (origin === undefined || origin === 'null')
        return true;
    try {
        return new URL(origin).host === req.headers.host;
    }
    catch {
        return false;
    }
}
function sendJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
}
async function readJsonBody(req, maxBytes) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = chunk;
        size += buffer.byteLength;
        if (size > maxBytes)
            throw new Error('request body too large');
        chunks.push(buffer);
    }
    if (chunks.length === 0)
        return {};
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('body must be a JSON object');
    return parsed;
}
