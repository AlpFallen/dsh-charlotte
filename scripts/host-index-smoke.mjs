/**
 * Host-side integration smoke test for the v0.6 index, recommendation engine,
 * permission checks, dependency graph, usage state and local-path installer.
 *
 * Everything runs against temporary directories and a fake host context; the
 * real home is never touched.
 */
import assert from 'node:assert/strict';
import { lstat, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { makeApiHandler } from '../lib/api.js';
import { SkillIndex } from '../lib/catalog.js';
import { readSkillDirectory } from '../lib/importer.js';
import { descriptionHash } from '../lib/i18n.js';
import { resolveRecommendConfig, Recommender } from '../lib/recommend.js';
import { LauncherState } from '../lib/state.js';

const results = [];
const check = async (label, fn) => {
    await fn();
    results.push(label);
    console.log(`PASS  ${label}`);
};

// --- isolated environment ------------------------------------------------------
const sandbox = await mkdtemp(join(tmpdir(), 'charlotte-index-'));
const home = join(sandbox, 'home');
const workspace = join(sandbox, 'workspace');
const userSkills = join(home, 'skills');
const projectSkills = join(workspace, '.dsh', 'skills');
const mountDir = join(sandbox, 'mounted');
const pluginDir = join(sandbox, 'plugin');
process.env.DSH_HOME = home;
process.env.DSH_AGENTS_HOME = join(home, 'agents');
const stateFile = join(home, 'charlotte', 'state.json');
const overrideFile = join(home, 'charlotte', 'overrides.json');
const cacheFile = join(sandbox, 'enrich.json');

const writeSkill = async (dir, name, frontmatter, body = '') => {
    const target = join(dir, name);
    await mkdir(target, { recursive: true });
    const header = Array.isArray(frontmatter) ? frontmatter.join('\n') : frontmatter;
    await writeFile(join(target, 'SKILL.md'), `---\n${header}\n---\n\n${body}\n`, 'utf8');
    return target;
};

await mkdir(userSkills, { recursive: true });
await mkdir(projectSkills, { recursive: true });
await mkdir(pluginDir, { recursive: true });
await mkdir(mountDir, { recursive: true });

const reviewDir = await writeSkill(userSkills, 'demo-review', [
    'name: demo-review',
    'description: 审查 diff 并生成代码审查报告。适用于 review、代码审查、质量把关；用户说“review this diff”时使用。',
    'version: 1.2.0',
    'metadata:',
    '  keywords: [审查, review, diff]',
], 'Read the diff and report findings grouped by Standards and Spec.');
const mailDir = await writeSkill(userSkills, 'demo-mail', [
    'name: demo-mail',
    'description: 发送邮件、回复邮件并整理收件箱。当用户要求发信或回信时使用。',
], 'Use the mail CLI.');
const disabledDir = await writeSkill(userSkills, 'demo-user-only', [
    'name: demo-user-only',
    'description: 只允许用户手动调用的技能。',
    'disable-model-invocation: true',
]);
const grillDir = await writeSkill(userSkills, 'grill-me', [
    'name: grill-me',
    'description: Grill the user relentlessly about a plan or design.',
], 'Ask one question at a time.');
void grillDir;
const missingDepDir = await writeSkill(userSkills, 'demo-needs-missing', [
    'name: demo-needs-missing',
    'description: 依赖一个不存在的技能，用来验证依赖检测。',
    'dependencies: [not-installed]',
], 'steps');
const projectDir = await writeSkill(projectSkills, 'proj-conventions', [
    'name: proj-conventions',
    'description: 为项目编写文档并维护知识库。',
]);
const mentionDir = await writeSkill(userSkills, 'demo-mentions', [
    'name: demo-mentions',
    'description: 通过正文提到另一个技能，用于推导依赖。',
], 'Call the Skill tool with "demo-review" before writing the summary.');
const dupRegistryDir = join(sandbox, 'registry-dup');
await writeSkill(join(sandbox), 'registry-dup', [
    'name: demo-review',
    'description: 注册表里的同名副本，应该被可写根覆盖。',
]);
const mountedPath = join(mountDir, 'demo-mounted', 'SKILL.md');
await mkdir(join(mountDir, 'demo-mounted'), { recursive: true });
await writeFile(mountedPath, '---\nname: demo-mounted\ndescription: 从 Claude Code 挂载的外部只读技能。\n---\n\nbody\n', 'utf8');
const pluginPath = join(pluginDir, 'office-skill', 'SKILL.md');
await mkdir(join(pluginDir, 'office-skill'), { recursive: true });
await writeFile(pluginPath, '---\nname: office-skill\ndescription: 读写 Excel 工作簿并转换 PDF。\n---\n\nbody\n', 'utf8');

// Pre-seed prefs + usage so the index merge can be checked.
await mkdir(join(home, 'charlotte'), { recursive: true });
await writeFile(stateFile, JSON.stringify({
    version: 1,
    prefs: { 'demo-review': { favorite: true, pinned: true, pinnedAt: 11 } },
    usage: { 'demo-review': { loads: 4, invokes: 2, completions: 1, failures: 0, cancelled: 0, lastUsedAt: 1000, lastLoadedAt: 900, recent: [{ at: 1000, kind: 'invoked' }] } },
    rec: { sessions: {} },
}), 'utf8');
await writeFile(overrideFile, JSON.stringify({ [mountedPath]: { disabled: true } }), 'utf8');

const pluginBodyFile = join(mountDir, 'plugin-body.md');
await writeFile(pluginBodyFile, '---\nname: demo-plugin-path\ndescription: 由插件注册、带真实路径的技能。\n---\n\nplugin body\n', 'utf8');

const registrySummaries = [
    {
        name: 'demo-review',
        description: '注册表里的同名副本，应该被可写根覆盖。',
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'user-dsh',
        provider: 'filesystem',
        path: join(dupRegistryDir, 'SKILL.md'),
    },
    {
        name: 'demo-plugin-path',
        description: '由插件注册、带真实路径的技能。',
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'runtime',
        provider: 'runtime',
        path: pluginBodyFile,
    },
    {
        name: 'demo-mounted',
        description: '从 Claude Code 挂载的外部只读技能。',
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'claude-code',
        provider: 'charlotte',
        path: mountedPath,
    },
    {
        name: 'office-skill',
        description: '读写 Excel 工作簿并转换 PDF。',
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'bundled',
        provider: 'dsh-office',
        path: pluginPath,
    },
    {
        name: 'builtin-skill',
        description: 'DSH 自带的系统技能示例。',
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'bundled',
        provider: 'filesystem',
        path: join(sandbox, 'builtin-missing', 'SKILL.md'),
    },
    {
        name: 'runtime-skill',
        description: '运行时内嵌技能，没有文件路径。',
        invocation: { modelInvocable: true, userInvocable: false },
        source: 'runtime',
        provider: 'runtime',
    },
];
// Two skills form a declared cycle.
const englishDir = await writeSkill(userSkills, 'demo-en', [
    'name: demo-en',
    'description: Render product images with a studio lighting preset.',
], 'body');
const staleDir = await writeSkill(userSkills, 'demo-en-stale', [
    'name: demo-en-stale',
    'description: An English skill whose translation is outdated.',
], 'body');
const declaredDir = await writeSkill(userSkills, 'demo-en-declared', [
    'name: demo-en-declared',
    'description: An English skill with its own Chinese summary.',
    'simple-zh: 技能自己声明的一句话简介。',
    'professional-zh: 由技能自己声明的专业版中文简介。',
], 'body');
void englishDir;
void staleDir;
void declaredDir;

const translationsFile = join(sandbox, 'skills.zh.json');
await writeFile(translationsFile, JSON.stringify({
    version: 2,
    entries: {
        'demo-en': {
            sourceHash: descriptionHash('Render product images with a studio lighting preset.'),
            simple: '用灯光把产品拍得好看。',
            professional: '用影棚灯光预设渲染产品图片，并控制曝光与背景。',
        },
        'demo-en-stale': {
            sourceHash: descriptionHash('An older description that no longer exists.'),
            simple: '过期的中文简介。',
            professional: '过期但没有被清理的专业简介。',
        },
    },
}), 'utf8');

const cycleA = await writeSkill(userSkills, 'cycle-a', [
    'name: cycle-a',
    'description: 依赖 cycle-b 的技能。',
    'dependencies: [cycle-b]',
], 'a');
const cycleB = await writeSkill(userSkills, 'cycle-b', [
    'name: cycle-b',
    'description: 依赖 cycle-a 的技能。',
    'dependencies: [cycle-a]',
], 'b');
void cycleA;
void cycleB;

const logger = { warn() {}, info() {}, debug() {} };
const fakeRegistry = {
    snapshot: async () => ({ skills: registrySummaries, complete: true }),
    list: async () => registrySummaries,
    get: async () => undefined,
};
const ctx = {
    get: (name) => (name === 'skills' ? fakeRegistry : undefined),
    logger,
    on: () => () => {},
    effect: () => {},
    inject: (deps, run) => run(ctx),
};
const config = {
    providerName: 'charlotte',
    sources: { claude: { enabled: true }, codex: { enabled: true }, zcode: { enabled: true }, cursor: { enabled: true }, gemini: { enabled: true } },
    extraDirs: [],
    anySourceEnabled: true,
};
const overrides = {
    read: async () => JSON.parse(await readFile(overrideFile, 'utf8')),
    isDisabled: async () => false,
};
const state = new LauncherState(stateFile);
const index = new SkillIndex({ ctx, provider: undefined, overrides, state, cacheFile, translationsFile });
const recommendConfig = resolveRecommendConfig({ threshold: 0.18 });
const recommender = new Recommender({ config: recommendConfig, state });
const pending = new Map();
const latest = new Map();
const handler = makeApiHandler(ctx, config, { list: async () => [], candidateByPath: () => undefined, setDisabled: async () => {} }, {
    index,
    state,
    recommender,
    recommendConfig,
    pending,
    latest,
});

/**
 * Invoke the API handler with a JSON request.
 * @param {string} method - HTTP method.
 * @param {string} path - path after the prefix.
 * @param {object|null} body - JSON body.
 * @returns {Promise<{status: number, body: object}>} response.
 */
async function api(method, path, body, headers = {}) {
    const chunks = body === null || body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
    const request = Readable.from(chunks);
    request.method = method;
    request.url = `/charlotte/api${path}`;
    request.headers = { host: 'localhost', ...headers };
    const response = {
        statusCode: 0,
        headers: {},
        chunks: [],
        writeHead(code, headersValue) {
            this.statusCode = code;
            this.headers = headersValue ?? {};
        },
        end(text) {
            this.chunks.push(Buffer.from(text ?? ''));
        },
    };
    await handler(request, response);
    const text = Buffer.concat(response.chunks).toString('utf8');
    return { status: response.statusCode, body: text === '' ? {} : JSON.parse(text) };
}

// --- index --------------------------------------------------------------------
await check('index merges writable roots, mounts and registry with writable precedence', async () => {
    const built = await index.build(workspace);
    const names = built.skills.map(row => row.name);
    assert.ok(names.includes('demo-review'));
    assert.ok(names.includes('demo-mounted'));
    assert.ok(names.includes('office-skill'));
    assert.ok(names.includes('runtime-skill'));
    assert.ok(names.includes('proj-conventions'));
    // The writable copy wins the duplicate name: its description is ours, not the registry's.
    const review = built.byName['demo-review'];
    assert.match(review.description, /审查 diff/);
    assert.equal(review.source.type, 'user');
    assert.equal(review.management.kind, 'writable');
    assert.equal(review.management.rootId, 'user-dsh');
});

await check('source classification is data-driven: project / user / plugin / system', async () => {
    const built = await index.build(workspace);
    assert.equal(built.byName['proj-conventions'].source.type, 'project');
    assert.equal(built.byName['demo-review'].source.type, 'user');
    assert.equal(built.byName['demo-mounted'].source.type, 'user');
    assert.match(built.byName['demo-mounted'].source.detail, /外部挂载 · Claude Code/);
    assert.equal(built.byName['office-skill'].source.type, 'plugin');
    assert.equal(built.byName['builtin-skill'].source.type, 'system');
    assert.equal(built.byName['runtime-skill'].source.type, 'plugin');
});

await check('availability reflects invocation policy and mount overrides', async () => {
    const built = await index.build(workspace);
    assert.equal(built.byName['demo-review'].policy.availability, 'both');
    assert.equal(built.byName['demo-user-only'].policy.availability, 'user');
    assert.equal(built.byName['runtime-skill'].policy.availability, 'model');
    assert.equal(built.byName['demo-mounted'].policy.disabled, true);
    assert.equal(built.byName['demo-mounted'].policy.availability, 'disabled');
    assert.equal(index.usable(built.byName['demo-mounted']), false);
    assert.equal(index.usable(built.byName['demo-review']), true);
});

await check('categories are computed from each skill text with evidence, never hardcoded', async () => {
    const built = await index.build(workspace);
    assert.equal(built.byName['demo-review'].category.id, 'quality');
    assert.equal(built.byName['demo-mail'].category.id, 'mail');
    assert.equal(built.byName['office-skill'].category.id, 'office');
    assert.equal(built.byName['proj-conventions'].category.id, 'docs');
    assert.equal(built.byName['demo-review'].category.confidence, 'high');
    assert.ok(built.byName['demo-review'].category.evidence.length > 0);
    assert.equal(built.byName['demo-review'].category.evidence.some(row => row.term === '审查'), true);
    const taxonomyIds = ['dev', 'quality', 'understanding', 'docs', 'collab', 'design', 'office', 'mail', 'learning'];
    for (const row of built.skills) {
        assert.ok(taxonomyIds.includes(row.category.id), `${row.name} has a real category id`);
        assert.ok(row.category.label.length > 0);
    }
    // A deliberately signal-free description is reported as weak instead of
    // being silently forced into a confident category.
    assert.equal(built.byName['demo-user-only'].category.confidence, 'weak');
    assert.equal(built.byName['demo-review'].category.confidence, 'high');
    const categorySum = built.categories.reduce((sum, row) => sum + row.count, 0);
    assert.equal(categorySum, built.skills.length);
    assert.equal(built.categories.some(row => row.id === 'general'), false, 'no "other" bucket exists');
});

await check('enrichment carries purpose, keywords, triggers, version and provenance', async () => {
    const built = await index.build(workspace);
    const review = built.byName['demo-review'];
    assert.match(review.purpose, /审查/);
    assert.equal(review.version, '1.2.0');
    assert.equal(review.provenance.version, 'declared');
    assert.ok(review.keywords.includes('review'));
    assert.equal(review.triggers.provenance, 'derived');
    assert.ok(review.triggers.values.length > 0);
    assert.equal(review.description, '审查 diff 并生成代码审查报告。适用于 review、代码审查、质量把关；用户说“review this diff”时使用。');
});

await check('prefs and usage from the state file are merged into the record', async () => {
    const built = await index.build(workspace);
    const review = built.byName['demo-review'];
    assert.equal(review.stats.favorite, true);
    assert.equal(review.stats.pinned, true);
    assert.equal(review.stats.loads, 4);
    assert.equal(review.stats.invokes, 2);
    assert.equal(review.stats.lastUsedAt, 1000);
    assert.equal(review.stats.recent[0].kind, 'invoked');
});

await check('dependency edges resolve declared deps, body mentions and missing deps', async () => {
    const built = await index.build(workspace);
    const mentions = built.byName['demo-mentions'].requires;
    assert.equal(mentions.length, 1);
    assert.equal(mentions[0].name, 'demo-review');
    assert.equal(mentions[0].kind, 'mention');
    assert.equal(mentions[0].satisfied, true);
    const missing = built.byName['demo-needs-missing'].requires;
    assert.equal(missing[0].name, 'not-installed');
    assert.equal(missing[0].satisfied, false);
    assert.equal(built.byName['demo-review'].requires.length, 0);
});

await check('dependency order is topological and cycles are detected', async () => {
    const built = await index.build(workspace);
    const single = index.dependencyOrder(['demo-mentions'], built);
    assert.deepEqual(single.order, ['demo-mentions']);
    const pair = index.dependencyOrder(['demo-review', 'demo-mentions'], built);
    assert.deepEqual(pair.order, ['demo-review', 'demo-mentions']);
    assert.equal(pair.cycles.length, 0);
    const cyclic = index.dependencyOrder(['cycle-a', 'cycle-b'], built);
    assert.ok(cyclic.cycles.length > 0);
    assert.ok(cyclic.cycles[0].includes('cycle-a'));
});

await check('enrichment cache survives a rebuild and invalidates on content change', async () => {
    const first = await index.build(workspace, { force: true });
    await index.enrichment.flush();
    const cacheText = await readFile(cacheFile, 'utf8');
    assert.match(cacheText, /demo-review/);
    const second = await index.build(workspace, { force: true });
    assert.equal(second.byName['demo-review'].purpose, first.byName['demo-review'].purpose);
    await writeFile(join(reviewDir, 'SKILL.md'), '---\nname: demo-review\ndescription: 现在描述改成了只做增量审查。\n---\n\nbody\n', 'utf8');
    const third = await index.build(workspace, { force: true });
    assert.match(third.byName['demo-review'].purpose, /增量审查/);
    // Restore for the remaining checks.
    await writeFile(join(reviewDir, 'SKILL.md'), '---\nname: demo-review\ndescription: 审查 diff 并生成代码审查报告。适用于 review、代码审查、质量把关；用户说“review this diff”时使用。\nversion: 1.2.0\nmetadata:\n  keywords: [审查, review, diff]\n---\n\nRead the diff and report findings grouped by Standards and Spec.\n', 'utf8');
});

await check('Chinese summaries: declared first, hash-guarded catalogue second, stale ignored', async () => {
    const built = await index.build(workspace, { force: true });
    assert.equal(built.byName['demo-en-declared'].i18n.source, 'declared');
    assert.equal(built.byName['demo-en-declared'].i18n.simple, '技能自己声明的一句话简介。');
    assert.equal(built.byName['demo-en-declared'].i18n.professional, '由技能自己声明的专业版中文简介。');
    assert.equal(built.byName['demo-en'].i18n.source, 'catalog');
    assert.equal(built.byName['demo-en'].i18n.simple, '用灯光把产品拍得好看。');
    assert.match(built.byName['demo-en'].i18n.professional, /影棚灯光/);
    assert.equal(built.byName['demo-en-stale'].i18n.source, 'absent', 'stale translation is never shown');
    assert.equal(built.byName['demo-en-stale'].i18n.simple, null);
    assert.equal(built.byName['demo-review'].i18n.source, 'absent', 'Chinese descriptions need no translation');
});

// --- API ----------------------------------------------------------------------
await check('GET /index returns the unified index without internal fields', async () => {
    const response = await api('GET', '/index');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.skills));
    assert.ok(response.body.skills.length >= 8);
    assert.equal(response.body.skills[0].enrichment, undefined);
    const translated = response.body.skills.find(row => row.name === 'demo-en');
    assert.equal(translated.i18n.simple, '用灯光把产品拍得好看。');
    assert.match(translated.i18n.professional, /影棚灯光/);
    assert.equal(translated.i18n.source, 'catalog');
    assert.equal(response.body.totals.all, response.body.skills.length);
    assert.ok(response.body.categories.every(row => row.count > 0));
    assert.ok(response.body.sources.every(row => row.count > 0));
});

await check('GET /config exposes recommendation knobs and mount sources', async () => {
    const response = await api('GET', '/config');
    assert.equal(response.status, 200);
    assert.equal(response.body.recommend.threshold, 0.18);
    assert.ok(response.body.sources.length >= 1);
});

await check('POST /prefs rejects unknown skills and persists favourites', async () => {
    const missing = await api('POST', '/prefs', { name: 'no-such-skill', favorite: true });
    assert.equal(missing.status, 404);
    const ok = await api('POST', '/prefs', { name: 'demo-mail', favorite: true });
    assert.equal(ok.status, 200);
    const indexed = await api('GET', '/index');
    const mail = indexed.body.skills.find(row => row.name === 'demo-mail');
    assert.equal(mail.stats.favorite, true);
    const invalid = await api('POST', '/prefs', { name: 'demo-mail' });
    assert.equal(invalid.status, 400);
});

await check('mutations reject cross-origin browsers', async () => {
    const blocked = await api('POST', '/prefs', { name: 'demo-mail', favorite: true }, { origin: 'https://evil.example' });
    assert.equal(blocked.status, 403);
});

await check('POST /use enforces visibility, enablement and dependencies', async () => {
    const unknown = await api('POST', '/use', { name: 'no-such-skill', sessionId: 's1' });
    assert.equal(unknown.status, 404);
    const modelOnly = await api('POST', '/use', { name: 'runtime-skill', sessionId: 's1' });
    assert.equal(modelOnly.status, 403);
    assert.equal(modelOnly.body.code, 'not-user-invocable');
    const disabled = await api('POST', '/use', { name: 'demo-mounted', sessionId: 's1' });
    assert.equal(disabled.status, 403);
    assert.equal(disabled.body.code, 'disabled');
    const missingDep = await api('POST', '/use', { name: 'demo-needs-missing', sessionId: 's1' });
    assert.equal(missingDep.status, 409);
    assert.equal(missingDep.body.code, 'missing-dependency');
    const allowed = await api('POST', '/use', { name: 'demo-review', sessionId: 's1' });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.token, '/demo-review ');
});

await check('POST /event records a confirmed load only after authorization', async () => {
    const unauthorized = await api('POST', '/event', { sessionId: 's-other', name: 'demo-review', phase: 'loaded' });
    assert.equal(unauthorized.status, 403);
    const loaded = await api('POST', '/event', { sessionId: 's1', name: 'demo-review', phase: 'loaded' });
    assert.equal(loaded.status, 200);
    const failed = await api('POST', '/event', { sessionId: 's1', name: 'demo-review', phase: 'load-failed', reason: 'composer busy' });
    assert.equal(failed.status, 200);
    const invalid = await api('POST', '/event', { sessionId: 's1', name: 'demo-review', phase: 'made-up' });
    assert.equal(invalid.status, 400);
    const indexed = await api('GET', '/index');
    const review = indexed.body.skills.find(row => row.name === 'demo-review');
    assert.equal(review.stats.loads, 5);
    assert.equal(review.stats.failures, 1);
    assert.ok(review.stats.recent.some(row => row.kind === 'load-failed' && row.reason === 'composer busy'));
});

// --- recommendation -----------------------------------------------------------
const reviewIntent = '帮我审查这次重构的 diff，按 Standards 和 Spec 生成代码审查报告';
const mailIntent = '帮我给客户发一封邮件，回复他关于报价的问题';

await check('recommendation funnel records shown, accepted and dismissed without faking usage', async () => {
    const before = JSON.parse(await readFile(stateFile, 'utf8'));
    const beforeRow = before.usage['demo-review'] ?? {};
    const recStart = beforeRow.recommended ?? 0;
    const accStart = beforeRow.accepted ?? 0;
    const disStart = beforeRow.dismissed ?? 0;
    const loadsStart = beforeRow.loads ?? 0;
    const pick = await api('POST', '/recommend', { sessionId: 'rec-funnel', intent: reviewIntent });
    assert.equal(pick.body.decision, 'recommend');
    const shown = await api('POST', '/event', { sessionId: 'rec-funnel', name: 'demo-review', phase: 'recommended' });
    assert.equal(shown.status, 200);
    const accepted = await api('POST', '/event', { sessionId: 'rec-funnel', name: 'demo-review', phase: 'accepted' });
    assert.equal(accepted.status, 200);
    const dismissed = await api('POST', '/event', { sessionId: 'rec-funnel', name: 'demo-review', phase: 'dismissed' });
    assert.equal(dismissed.status, 200);
    const after = JSON.parse(await readFile(stateFile, 'utf8'));
    const row = after.usage['demo-review'];
    assert.equal(row.recommended, recStart + 1);
    assert.equal(row.accepted, accStart + 1);
    assert.equal(row.dismissed, disStart + 1);
    assert.equal(row.loads, loadsStart, 'recommendation funnel is not a load');
    assert.equal(row.recent.some(entry => ['recommended', 'accepted', 'dismissed'].includes(entry.kind)), false,
        'funnel counters stay out of the real usage timeline');
    const indexed = await api('GET', '/index');
    const review = indexed.body.skills.find(skill => skill.name === 'demo-review');
    assert.equal(review.stats.recommended, row.recommended);
    assert.equal(review.stats.accepted, row.accepted);
    assert.equal(review.stats.dismissed, row.dismissed);
});

await check('a Chinese prompt matches an English skill through its Chinese summary', async () => {
    const response = await api('POST', '/recommend', { sessionId: 'rec-zh', intent: '用影棚灯光渲染这个产品的图片' });
    assert.equal(response.body.decision, 'recommend');
    assert.ok(response.body.items.some(item => item.name === 'demo-en'), 'translated skill is recommendable from Chinese');
    const zhItem = response.body.items.find(item => item.name === 'demo-en');
    assert.equal(typeof zhItem.reason, 'string');
    assert.equal(typeof zhItem.reasonEn, 'string');
});

await check('low-value prompts never produce a recommendation', async () => {
    const short = await api('POST', '/recommend', { sessionId: 'rec-1', intent: '你好' });
    assert.equal(short.body.decision, 'none');
    assert.equal(short.body.reason, 'intent-too-short');
    const chat = await api('POST', '/recommend', { sessionId: 'rec-1', intent: '你好呀，今天天气怎么样，随便聊聊' });
    assert.equal(chat.body.decision, 'none');
    assert.equal(chat.body.reason, 'low-value');
});

await check('an explicitly named skill bypasses the terse/low-value gate', async () => {
    const terse = await api('POST', '/recommend', { sessionId: 'rec-direct', intent: '点名grill' });
    assert.equal(terse.body.decision, 'recommend', 'direct trigger should not be treated as low value');
    assert.ok(terse.body.items.some(item => item.name === 'grill-me'), 'the named grill skill is recommended');
    const grill = terse.body.items.find(item => item.name === 'grill-me');
    assert.match(grill.reason, /点名|触发/);
    const named = await api('POST', '/recommend', { sessionId: 'rec-direct-2', intent: 'demo-review' });
    assert.equal(named.body.decision, 'recommend');
    assert.equal(named.body.items[0].name, 'demo-review');
    assert.match(named.body.items[0].reason, /点名/);
    const noise = await api('POST', '/recommend', { sessionId: 'rec-direct-noise', intent: '随便问问' });
    assert.equal(noise.body.decision, 'none');
    assert.equal(noise.body.reason, 'intent-too-short');
});

await check('a matching prompt recommends the relevant skill with reason and evidence', async () => {
    const response = await api('POST', '/recommend', { sessionId: 'rec-2', intent: reviewIntent });
    assert.equal(response.body.decision, 'recommend');
    assert.ok(response.body.items.length >= 1 && response.body.items.length <= 3);
    assert.equal(response.body.items[0].name, 'demo-review');
    assert.match(response.body.items[0].reason, /审查|review/);
    assert.ok(response.body.items.every(item => item.score >= 0.18));
    assert.equal(response.body.items.some(item => item.name === 'demo-mounted'), false, 'disabled skills are never recommended');
    assert.equal(response.body.items.some(item => item.name === 'runtime-skill'), false, 'model-only skills cannot be user-loaded');
    assert.equal(response.body.items.some(item => item.name === 'demo-needs-missing'), false, 'missing dependencies are not recommended');
});

await check('session state exposes the parked recommendation, then shown clears it', async () => {
    const stateResponse = await api('GET', '/session-state?session=rec-2');
    assert.equal(stateResponse.status, 200);
    assert.ok(stateResponse.body.pending);
    assert.equal(stateResponse.body.pending.items[0].name, 'demo-review');
    const shown = await api('POST', '/event', { sessionId: 'rec-2', name: 'demo-review', phase: 'recommended' });
    assert.equal(shown.status, 200);
    const after = await api('GET', '/session-state?session=rec-2');
    assert.equal(after.body.pending, null);
});

await check('the same task is not recommended twice within the cooldown', async () => {
    const again = await api('POST', '/recommend', { sessionId: 'rec-2', intent: reviewIntent });
    assert.equal(again.body.decision, 'none');
    assert.equal(again.body.reason, 'cooldown');
});

await check('ignore suppresses the skill until the need materially changes', async () => {
    const ignored = await api('POST', '/recommend/ignore', { sessionId: 'rec-3', name: 'demo-review', fingerprint: '' , });
    void ignored;
    const first = await api('POST', '/recommend', { sessionId: 'rec-3', intent: reviewIntent });
    assert.equal(first.body.decision, 'recommend');
    const fingerprint = first.body.fingerprint;
    await api('POST', '/recommend/ignore', { sessionId: 'rec-3', name: 'demo-review', fingerprint });
    const afterIgnore = await api('POST', '/recommend', { sessionId: 'rec-3', intent: reviewIntent });
    assert.equal(afterIgnore.body.items.some(item => item.name === 'demo-review'), false);
    const changed = await api('POST', '/recommend', { sessionId: 'rec-3', intent: mailIntent });
    assert.equal(changed.body.decision, 'recommend');
    assert.ok(changed.body.items.some(item => item.name === 'demo-mail'), 'a mail skill is recommended');
});

await check('frequency cap stops recommendations after the configured count', async () => {
    const session = 'rec-cap';
    for (let round = 0; round < recommendConfig.maxPerSession; round += 1) {
        await recommender.markShown(session, ['demo-review'], `task-signature-${String(round)}`);
    }
    const builtIndex = await index.build(workspace);
    const capped = await recommender.evaluate({ sessionId: session, index: builtIndex, intent: reviewIntent });
    assert.equal(capped.decision, 'none');
    assert.equal(capped.reason, 'frequency-cap');
});

await check('recommendation respects the disabled and per-session knobs', async () => {
    const off = new Recommender({ config: { ...recommendConfig, enabled: false }, state });
    const result = await off.evaluate({ sessionId: 'rec-off', index: await index.build(workspace), intent: reviewIntent });
    assert.equal(result.decision, 'none');
    assert.equal(result.reason, 'disabled');
});

// --- recommendation home ------------------------------------------------------
await check('GET /home falls back to real usage history and keeps only runnable skills', async () => {
    const response = await api('GET', '/home?session=home-empty');
    assert.equal(response.status, 200);
    assert.equal(response.body.source, 'history');
    assert.ok(Array.isArray(response.body.items) && response.body.items.length > 0);
    for (const item of response.body.items) {
        assert.equal(typeof item.name, 'string');
        assert.equal(typeof item.reason, 'string');
        assert.equal(typeof item.reasonEn, 'string');
        assert.ok(item.score > 0);
    }
    assert.ok(response.body.items.some(item => item.name === 'demo-review'), 'the used/favourited skill is picked');
    const review = response.body.items.find(item => item.name === 'demo-review');
    assert.match(review.reason, /收藏|置顶|使用/);
    assert.equal(response.body.items.some(item => item.name === 'demo-mounted'), false, 'disabled mount is not picked');
    assert.equal(response.body.items.some(item => item.name === 'runtime-skill'), false, 'model-only skill is not picked');
    assert.equal(response.body.items.some(item => item.name === 'demo-needs-missing'), false, 'missing dependency is not picked');
});

await check('GET /home prefers the conversation recommendation and re-checks permissions', async () => {
    latest.set('home-conv', {
        names: ['demo-review', 'demo-mounted', 'demo-needs-missing'],
        fingerprint: 'home-task',
        intent: '帮我审查这次重构的 diff',
        at: Date.now(),
        items: [
            { name: 'demo-review', reason: '对话里直接点名了这个技能；无额外依赖。', reasonEn: 'the task names this skill directly; no extra dependencies.', score: 0.91 },
            { name: 'demo-mounted', reason: '已停用的挂载技能。', reasonEn: 'disabled mount.', score: 0.7 },
            { name: 'demo-needs-missing', reason: '依赖缺失。', reasonEn: 'missing dependency.', score: 0.6 },
        ],
    });
    const response = await api('GET', '/home?session=home-conv');
    assert.equal(response.body.source, 'conversation');
    assert.equal(response.body.intent, '帮我审查这次重构的 diff');
    assert.deepEqual(response.body.items.map(item => item.name), ['demo-review']);
    const item = response.body.items[0];
    assert.match(item.reason, /点名/);
    assert.equal(item.purpose.length > 0, true);
    assert.equal(typeof item.category.id, 'string');
    assert.equal(item.availability, 'both');
    assert.equal(item.source.type, 'user');
    assert.deepEqual(item.requires, []);
    // The conversation pick stays available after the dock consumes `pending`.
    const sessionState = await api('GET', '/session-state?session=home-conv');
    assert.equal(sessionState.body.pending, null);
    assert.ok(sessionState.body.latest);
    assert.equal(sessionState.body.latest.intent, '帮我审查这次重构的 diff');
});

await check('the history ranker uses only loadable, real usage rows', async () => {
    const built = await index.build(workspace);
    const rows = recommender.history({ index: built });
    assert.ok(rows.length > 0 && rows.length <= recommendConfig.maxItems);
    assert.equal(rows[0].name, 'demo-review');
    assert.equal(rows.some(row => row.name === 'demo-mounted'), false);
    assert.equal(rows.some(row => row.name === 'demo-needs-missing'), false);
    assert.match(rows[0].reason, /你已使用 7 次/);
    assert.match(rows[0].reasonEn, /7 times/);
});

// --- host execution observer --------------------------------------------------
await check('agent/pre-step records a real invocation and turn-stopping records completion', async () => {
    const listeners = new Map();
    const hookCtx = {
        get: (name) => (name === 'skills' ? fakeRegistry : undefined),
        logger,
        on: (event, handler) => {
            listeners.set(event, handler);
            return () => {};
        },
        effect: () => {},
        inject: (deps, run) => run(hookCtx),
        slots: { inject: () => () => {}, register: () => ({}) },
        webServer: { register: () => () => {} },
    };
    const { apply } = await import('../lib/index.js');
    apply(hookCtx, {});
    const preStep = listeners.get('agent/pre-step');
    const turnStopping = listeners.get('agent/turn-stopping');
    assert.equal(typeof preStep, 'function');
    assert.equal(typeof turnStopping, 'function');
    const before = JSON.parse(await readFile(stateFile, 'utf8'));
    void before;
    const decision = await preStep({
        agent: { session: { id: 'hook-session' } },
        signal: { throwIfAborted() {} },
    }, async () => ({
        kind: 'enter',
        messages: [
            { id: 'm1', role: 'user', content: [{ type: 'text', text: '/demo-review 帮我审查这个 diff' }] },
        ],
    }));
    assert.equal(decision.kind, 'enter');
    const afterPre = JSON.parse(await readFile(stateFile, 'utf8'));
    assert.equal(afterPre.usage['demo-review'].invokes, 3);
    // `agent/turn-stopping` is a serial event: the listener must work with the
    // payload alone (calling next() here used to fail the whole turn).
    await turnStopping({ agent: { session: { id: 'hook-session' } }, turn: 1 });
    const afterTurn = JSON.parse(await readFile(stateFile, 'utf8'));
    assert.equal(afterTurn.usage['demo-review'].completions, 2);
});

await check('plugin config accepts the recommend block; invalid values only disable recommendations', async () => {
    const listeners = new Map();
    const hookCtx = {
        get: () => undefined,
        logger,
        on: (event, handler) => { listeners.set(event, handler); return () => {}; },
        effect: () => {},
        inject: (deps, run) => run(hookCtx),
        slots: { inject: () => () => {}, register: () => ({}) },
        webServer: { register: () => () => {} },
    };
    const { apply } = await import('../lib/index.js');
    apply(hookCtx, { recommend: { threshold: 0.2, maxItems: 2 } });
    assert.equal(typeof listeners.get('agent/pre-step'), 'function', 'plugin stays enabled with a valid recommend block');
    const warned = [];
    const second = { ...hookCtx, logger: { ...logger, warn: (message) => warned.push(String(message)) }, on: () => () => {} };
    apply(second, { recommend: { maxItems: 99 } });
    assert.ok(warned.some(message => /recommend config/i.test(message)), 'invalid recommend config is reported');
});

// --- local path installer -----------------------------------------------------
await check('local directory install validates and copies a real skill', async () => {
    const source = join(sandbox, 'path-source', 'path-skill');
    await mkdir(source, { recursive: true });
    await writeFile(join(source, 'SKILL.md'), '---\nname: path-skill\ndescription: 从本地路径安装的技能。\n---\n\nbody\n', 'utf8');
    await writeFile(join(source, 'notes.txt'), 'asset', 'utf8');
    const tree = await readSkillDirectory(source);
    assert.equal(tree.some(file => file.path === 'SKILL.md'), true);
    assert.equal(tree.some(file => file.path === 'notes.txt'), true);
    const installed = await api('POST', '/import-path', { items: [{ sourcePath: source }], targetRoot: 'user-dsh', conflict: 'skip' });
    assert.equal(installed.status, 200);
    assert.equal(installed.body.outcomes[0].status, 'imported');
    const installedFile = await readFile(join(home, 'skills', 'path-skill', 'SKILL.md'), 'utf8');
    assert.match(installedFile, /path-skill/);
});

await check('local directory install reports real reasons for bad input', async () => {
    const empty = join(sandbox, 'path-empty');
    await mkdir(empty, { recursive: true });
    const response = await api('POST', '/import-path', { items: [{ sourcePath: empty }], targetRoot: 'user-dsh' });
    assert.equal(response.status, 200);
    assert.equal(response.body.outcomes[0].status, 'skipped');
    assert.match(response.body.outcomes[0].error, /SKILL\.md/);
    const relative = await api('POST', '/import-path', { items: [{ sourcePath: 'relative/path' }], targetRoot: 'user-dsh' });
    assert.match(relative.body.outcomes[0].error, /absolute/);
});

// --- state robustness ---------------------------------------------------------
await check('corrupted state is tolerated instead of breaking the launcher', async () => {
    const broken = join(sandbox, 'broken-state.json');
    await writeFile(broken, '{not json', 'utf8');
    const store = new LauncherState(broken);
    const stateValue = await store.read();
    assert.deepEqual(stateValue.prefs, {});
    await store.update((draft) => {
        draft.prefs['x'] = { favorite: true };
    });
    const reread = await new LauncherState(broken).read();
    assert.equal(reread.prefs.x.favorite, true);
});

await check('GET /body reads the host-resolved path and refuses virtual skills', async () => {
    const writable = await api('GET', '/body?name=demo-review');
    assert.equal(writable.status, 200);
    assert.match(writable.body.content, /demo-review|diff/i);
    assert.equal('path' in writable.body, false, 'the host path is not leaked to the client');
    const registry = await api('GET', '/body?name=demo-plugin-path');
    assert.equal(registry.status, 200);
    assert.match(registry.body.content, /plugin body/);
    const virtual = await api('GET', '/body?name=runtime-skill');
    assert.equal(virtual.status, 404);
});

await check('the two mutations reject non-POST methods', async () => {
    const put = await api('PUT', '/tags', { name: 'demo-review', tags: ['x'] });
    assert.equal(put.status, 405);
    const del = await api('DELETE', '/migrate', { name: 'demo-mail', rootId: 'user-dsh' });
    assert.equal(del.status, 405);
});

await check('a version 1 state file still loads and keeps its rows', async () => {
    const legacyFile = join(sandbox, 'state-v1.json');
    await writeFile(legacyFile, JSON.stringify({
        version: 1,
        prefs: { 'demo-review': { favorite: true, pinned: true, pinnedAt: 111 } },
        usage: { 'demo-review': { loads: 4, invokes: 2, completions: 1, failures: 0, cancelled: 0, recommended: 2, accepted: 1, dismissed: 0, lastUsedAt: 222, lastLoadedAt: 222, recent: [{ at: 222, kind: 'loaded' }] } },
        rec: { sessions: { s1: { shown: { 'demo-review': 222 }, ignored: {}, fingerprint: 'fp', lastShownAt: 222, count: 1, updatedAt: 222 } } },
    }), 'utf8');
    const store = new LauncherState(legacyFile);
    const loaded = await store.read();
    assert.equal(loaded.prefs['demo-review'].favorite, true);
    assert.equal(loaded.usage['demo-review'].loads, 4);
    assert.equal(loaded.usage['demo-review'].days['2020-01-01'], undefined);
    assert.deepEqual(loaded.tags, {});
    assert.equal(loaded.rec.sessions.s1.fingerprint, 'fp');
    await store.update((draft) => { draft.tags['demo-review'] = ['legacy']; });
    const raw = JSON.parse(await readFile(legacyFile, 'utf8'));
    assert.equal(raw.version, 2, 'the next write upgrades the file');
    assert.equal(raw.usage['demo-review'].loads, 4, 'old usage counters survive the upgrade');
});

await check('recommend config validation rejects nonsense', async () => {
    assert.throws(() => resolveRecommendConfig({ maxItems: 9 }), /maxItems/);
    assert.throws(() => resolveRecommendConfig({ enabled: 'yes' }), /enabled/);
    assert.throws(() => resolveRecommendConfig({ cooldownMs: -1 }), /cooldownMs/);
});


// --- audit, cost, ledger, tags, shared pool -----------------------------------
const hiddenDir = await writeSkill(userSkills, 'hidden-skill', [
    'name: hidden-skill',
    'description: 正文里夹带隐藏控制字符的技能，用来验证审计。',
], `visible text \u001b[31m and a tag char \u{E0041} and a bidi mark \u202E end`);
void hiddenDir;

await check('the index audits skill bodies for hidden characters', async () => {
    index.invalidate();
    const built = await index.build(workspace);
    const hidden = built.byName['hidden-skill'];
    assert.ok(hidden.audit, 'audit rides with the record');
    const ids = hidden.audit.findings.map(finding => finding.id).sort();
    assert.ok(ids.includes('escape'), 'bare ESC is reported');
    assert.ok(ids.includes('tag-chars'), 'unicode tag characters are reported');
    assert.ok(ids.includes('bidi'), 'bidi controls are reported');
    assert.equal(hidden.audit.severity, 'high');
    assert.equal(built.byName['demo-review'].audit.clean, true, 'a clean body has no findings');
    assert.equal(built.audit.severity, 'high', 'the aggregate carries the worst severity');
});

await check('injection cost is an explicit heuristic and scales with the body', async () => {
    const built = await index.build(workspace);
    const review = built.byName['demo-review'];
    assert.equal(review.cost.method, 'heuristic');
    assert.ok(review.cost.tokens > 0);
    assert.ok(review.cost.chars >= review.bodyLength);
    assert.ok(review.cost.cjk > 0, 'CJK characters are counted separately');
    // A skill with no readable body still pays for its name and description,
    // which are what the model actually sees before the instructions.
    const noBody = built.skills.find(skill => skill.bodyLength === 0);
    if (noBody !== undefined) assert.ok(noBody.cost.tokens > 0);
});

await check('GET /ledger reports real ratios and null when nothing was attempted', async () => {
    const use = await api('POST', '/use', { sessionId: 'ledger-1', name: 'demo-mail' });
    assert.equal(use.status, 200);
    await api('POST', '/event', { sessionId: 'ledger-1', name: 'demo-mail', phase: 'loaded' });
    await api('POST', '/event', { sessionId: 'ledger-1', name: 'demo-mail', phase: 'loaded' });
    const response = await api('GET', '/ledger');
    assert.equal(response.status, 200);
    assert.equal(typeof response.body.generatedAt, 'number');
    assert.ok(response.body.totals.loads >= 2);
    const mail = response.body.skills.find(row => row.name === 'demo-mail');
    assert.ok(mail.loads >= 2);
    assert.equal(mail.successRate, null, 'no completion/failure yet means no invented rate');
    assert.equal(Array.isArray(response.body.trend) && response.body.trend.length, 14, 'the trend stays a dense 14-day series');
    const review = response.body.skills.find(row => row.name === 'demo-review');
    if (review !== undefined && review.completions + review.failures > 0) {
        assert.ok(review.successRate >= 0 && review.successRate <= 1);
    }
});

await check('POST /tags stores tags and the index exposes them', async () => {
    const saved = await api('POST', '/tags', { name: 'demo-review', tags: ['审查', ' 审查 ', 'git'] });
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.tags, ['审查', 'git'], 'tags are trimmed and deduplicated');
    const built = await index.build(workspace);
    assert.deepEqual(built.byName['demo-review'].tags, ['审查', 'git']);
    const cleared = await api('POST', '/tags', { name: 'demo-review', tags: [] });
    assert.deepEqual(cleared.body.tags, []);
    const missing = await api('POST', '/tags', { name: 'no-such-skill', tags: ['x'] });
    assert.equal(missing.status, 404);
});

await check('a skill used in the session is not recommended again', async () => {
    const session = 'rec-used';
    const first = await api('POST', '/recommend', { sessionId: session, intent: reviewIntent });
    assert.equal(first.body.decision, 'recommend');
    const picked = first.body.items[0].name;
    await api('POST', '/event', { sessionId: session, name: picked, phase: 'recommended' });
    const use = await api('POST', '/use', { sessionId: session, name: picked });
    assert.equal(use.status, 200);
    const nextTask = await api('POST', '/recommend', { sessionId: session, intent: mailIntent });
    assert.ok(nextTask.body.items.every(item => item.name !== picked), 'the used skill is not offered again in this session');
    // A different session still sees it.
    const otherSession = await api('POST', '/recommend', { sessionId: 'rec-used-other', intent: reviewIntent });
    assert.ok(otherSession.body.items.some(item => item.name === picked), 'another session is unaffected');
});

await check('POST /migrate moves a skill into the shared pool and leaves a relative link', async () => {
    const before = await lstat(userSkills + '/demo-mail');
    assert.equal(before.isSymbolicLink(), false);
    const response = await api('POST', '/migrate', { name: 'demo-mail', rootId: 'user-dsh' });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const poolCopy = join(home, 'agents', 'skills', 'demo-mail');
    assert.equal((await lstat(poolCopy)).isDirectory(), true);
    const after = await lstat(userSkills + '/demo-mail');
    assert.equal(after.isSymbolicLink(), true);
    assert.equal(response.body.linkTarget.startsWith('..'), true, 'the link stays portable (relative)');
    const skillText = await readFile(join(poolCopy, 'SKILL.md'), 'utf8');
    assert.match(skillText, /demo-mail/);
    const again = await api('POST', '/migrate', { name: 'demo-mail', rootId: 'user-dsh' });
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'already-linked');
});

// --- summary ------------------------------------------------------------------
await rm(join(sandbox, 'registry-dup'), { recursive: true, force: true }).catch(() => {});
console.log(`\n${results.length} host index checks passed`);
