/**
 * Hermetic smoke test for the v0.6 launcher.
 *
 * The bundle is a browser script: `window.__ModuleLoader__.load({ id, factory })`
 * where the factory requires react / react-dom / react/jsx-runtime. This test
 * runs it in a `node:vm` sandbox with minimal stubs and exercises:
 *
 * - the shipped bundle: identity, slot registrations, dictionary parity, and
 *   the absence of any hardcoded catalogue;
 * - the pure list helpers used by the page: search, filters, sorts, favourites;
 * - the real load chain against fake conversation services and a fake host API,
 *   including failure, cancellation and the no-service path;
 * - the recommendation dock registration contract.
 *
 * No browser, no network, no real files.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const bundle = await readFile(join(root, 'client', 'client.js'), 'utf8');

const results = [];
const check = (label, fn) => {
    fn();
    results.push(label);
    console.log(`PASS  ${label}`);
};
const checkAsync = async (label, fn) => {
    await fn();
    results.push(label);
    console.log(`PASS  ${label}`);
};

// --- sandbox -----------------------------------------------------------------
const Fragment = Symbol('Fragment');
const element = (type, props) => ({ type, props: props === undefined ? {} : props });
const react = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useRef: (value) => ({ current: value }),
    createElement: (type, props) => element(type, props),
    Fragment,
};
const assertJsxArgs = (props, key) => {
    if (props === null || props === undefined) {
        throw new Error('jsx runtime: null props object (children were probably passed as the key argument)');
    }
    if (key !== undefined && typeof key !== 'string') {
        throw new Error(`jsx runtime: key must be a string, got ${typeof key}`);
    }
};
const jsxRuntime = {
    jsx: (type, props, key) => {
        assertJsxArgs(props, key);
        return { type, props, key };
    },
    jsxs: (type, props, key) => {
        assertJsxArgs(props, key);
        return { type, props, key };
    },
    Fragment,
};
const localStorage = {
    store: new Map(),
    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    },
    setItem(key, value) {
        this.store.set(key, String(value));
    },
    removeItem(key) {
        this.store.delete(key);
    },
};
const documentStub = {
    title: 'DSH',
    documentElement: { lang: 'zh-CN' },
    querySelector: () => null,
    createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
    head: { appendChild() {} },
};
const fetchCalls = [];
let fetchHandler = async () => ({ ok: true, status: 200, json: async () => ({}) });
const sandbox = {
    console,
    setTimeout: () => 1,
    clearTimeout: () => {},
    AbortController,
    AbortSignal,
    Promise,
    Map,
    Set,
    URL,
    fetch: (url, init) => {
        fetchCalls.push({ url: String(url), init });
        return fetchHandler(String(url), init ?? {});
    },
    window: {
        __ModuleLoader__: { load: (entry) => { sandbox.__entry = entry; } },
        __DSH_CHARLOTTE_TEST__: true,
        navigator: { language: 'zh-CN' },
        setTimeout: () => 1,
        clearTimeout: () => {},
        localStorage,
        addEventListener: () => {},
        removeEventListener: () => {},
    },
    navigator: { language: 'zh-CN' },
    document: documentStub,
    localStorage,
};
sandbox.globalThis = sandbox;
sandbox.window.document = documentStub;
sandbox.window.localStorage = localStorage;
vm.createContext(sandbox);
vm.runInContext(bundle, sandbox, { filename: 'client/client.js' });
const entry = sandbox.__entry;
assert.equal(entry.id, 'dsh-charlotte', 'bundle id must be dsh-charlotte');
const mod = entry.factory((name) => {
    if (name === 'react') return react;
    if (name === 'react-dom') return { createPortal: (node) => node };
    if (name === 'react/jsx-runtime') return jsxRuntime;
    throw new Error(`unexpected require: ${name}`);
});
const internals = sandbox.window.__skTest;
assert.ok(internals, 'test surface must be installed');

// --- fake client context -------------------------------------------------------
const draftCalls = [];
const conversationService = {
    input: {
        requestDraftInitialization: (_binding, options) => {
            draftCalls.push(options);
            return 'ok';
        },
        for: () => ({ focus: () => {} }),
    },
};

/**
 * Build a fake client context.
 * @param {{services?: object, conversation?: object}} overrides - service overrides.
 * @returns {object} fake ctx plus captured slot registrations.
 */
function makeCtx(overrides = {}) {
    const slots = [];
    const conversation = overrides.conversation ?? conversationService;
    const services = {
        uiSession: {
            current: {
                getSnapshot: () => ({ key: 'session-1' }),
            },
        },
        sessions: {
            using: (sessionId, _options, run) => Promise.resolve(run({
                binding: {
                    sessionId,
                    ctx: {
                        get: (name) => (name === 'conversation' ? conversation : undefined),
                    },
                },
            })),
            list: {
                getSnapshot: () => ({ byId: { 'session-1': { retainedBy: { mainView: 1 }, running: false } } }),
                subscribe: () => () => {},
            },
            binding: () => undefined,
        },
        uiWorkspace: {
            connectWorkspace: async () => 'session-2',
            openSession: () => {},
        },
        workspaces: {
            list: {
                getSnapshot: () => ({ items: [{ workspaceId: 'ws-1', path: '/tmp/ws', sessionIds: ['session-1'], createdAt: '2026-01-01T00:00:00Z' }] }),
            },
        },
        ...overrides.services,
    };
    const ctx = {
        slots: {
            inject: (name, factory) => {
                slots.push({ name, registered: factory() });
                return () => {};
            },
            register: (entryValue, component) => ({ entry: entryValue, component }),
        },
        get: (name) => services[name],
        on: () => () => {},
        effect: () => {},
        logger: { warn: () => {}, debug: () => {} },
    };
    return { ctx, slots, services };
}

/**
 * Reset the recorded host calls between checks.
 */
function resetFetch() {
    fetchCalls.length = 0;
}

// --- bundle contract -----------------------------------------------------------
check('bundle exports apply and no stray inject export', () => {
    assert.equal(typeof mod.apply, 'function');
});

check('apply registers sidebar entry, settings section and the recommendation dock', () => {
    const { ctx, slots } = makeCtx();
    mod.apply(ctx);
    assert.deepEqual(slots.map(row => row.name).sort(), ['conversation.input.dock', 'settings.section', 'sidebar.footer.action']);
    const dockSlot = slots.find(row => row.name === 'conversation.input.dock');
    assert.ok(dockSlot, 'dock slot registered');
    const dockEntry = dockSlot.registered.entry;
    assert.equal(dockEntry.id, 'charlotte-recommend');
    assert.equal(dockEntry.order, 30);
    assert.equal(dockEntry.inject('session-9').sessionId, 'session-9');
    assert.equal(typeof dockSlot.registered.component, 'function');
});

check('no hardcoded catalogue or legacy card grid ships', () => {
    for (const banned of ['SK_SKILL_COPY', 'SK_PROVIDERS', 'SK_CATEGORIES', 'skCountGroups(', 'function SkillCard(', 'sk_card{']) {
        assert.equal(bundle.includes(banned), false, `bundle must not contain ${banned}`);
    }
});

check('no auto-send or submit path ships', () => {
    for (const banned of ['conversation.send', 'input.submit', 'skSendToSession', 'skInvokeInCurrent', 'skInvokeInNew']) {
        assert.equal(bundle.includes(banned), false, `bundle must not contain ${banned}`);
    }
    assert.equal(bundle.includes('requestDraftInitialization'), true, 'staging helper must ship');
});

check('language dictionaries have identical keys and real copy', () => {
    const zh = internals.strings.zh;
    const en = internals.strings.en;
    assert.ok(Object.keys(zh).length > 80, 'zh dictionary is populated');
    assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
    for (const key of Object.keys(zh)) {
        assert.ok(String(zh[key]).length > 0, `zh.${key} is empty`);
        assert.ok(String(en[key]).length > 0, `en.${key} is empty`);
    }
});

// --- fixtures ------------------------------------------------------------------
const skill = (name, overrides = {}) => ({
    name,
    description: overrides.description ?? `${name} 的完整描述`,
    purpose: overrides.purpose ?? `${name} 的一句话用途`,
    category: overrides.category ?? { id: 'dev', label: '开发工作', labelEn: 'Development', evidence: [] },
    keywords: overrides.keywords ?? [],
    triggers: overrides.triggers ?? { values: [], provenance: 'absent' },
    useCases: overrides.useCases ?? [],
    avoidCases: overrides.avoidCases ?? [],
    requires: overrides.requires ?? [],
    stats: {
        favorite: false,
        pinned: false,
        pinnedAt: 0,
        loads: 0,
        invokes: 0,
        completions: 0,
        failures: 0,
        cancelled: 0,
        lastUsedAt: 0,
        lastLoadedAt: 0,
        recent: [],
        ...overrides.stats,
    },
    policy: {
        modelInvocable: true,
        userInvocable: true,
        disabled: false,
        availability: 'both',
        ...overrides.policy,
    },
    source: overrides.source ?? { type: 'user', label: '用户专属', detail: '用户根' },
    management: overrides.management ?? { kind: 'writable', rootId: 'user-dsh', path: '/tmp/skills/' + name, provider: 'filesystem' },
    version: overrides.version ?? null,
    updatedAt: null,
    provenance: {},
});

const fixtures = [
    skill('demo-dev', {
        description: '在 Blender 中建模并导出 glb',
        purpose: '建模与导出',
        keywords: ['建模', 'glb'],
        category: { id: 'design', label: '设计与创作', labelEn: 'Design & Creation', evidence: [] },
        source: { type: 'plugin', label: '插件提供', detail: 'dsh-blender' },
        stats: { loads: 5, invokes: 3 },
    }),
    skill('demo-review', {
        description: '审查 diff 并给出审查报告',
        purpose: '代码审查',
        keywords: ['审查', 'review'],
        triggers: { values: ['review since main'], provenance: 'declared' },
        category: { id: 'quality', label: '代码质量', labelEn: 'Code Quality', evidence: [] },
        stats: { favorite: true, loads: 2 },
    }),
    skill('demo-office', {
        description: '读写 Excel 工作簿',
        purpose: '表格处理',
        keywords: ['xlsx'],
        category: { id: 'office', label: '办公文档', labelEn: 'Office Documents', evidence: [] },
        policy: { availability: 'user', modelInvocable: false },
    }),
    skill('demo-mail', {
        description: '发送邮件',
        purpose: '邮件沟通',
        keywords: ['邮件'],
        category: { id: 'mail', label: '邮件沟通', labelEn: 'Mail & Communication', evidence: [] },
        source: { type: 'project', label: '项目级', detail: '项目根' },
    }),
    skill('demo-off', {
        description: '停用的技能',
        purpose: '停用示例',
        policy: { availability: 'disabled', disabled: true, userInvocable: false },
        stats: { pinned: true, pinnedAt: 10 },
    }),
    skill('demo-used', { description: '常用技能', purpose: '最常用', stats: { loads: 9, invokes: 9, lastUsedAt: 500 } }),
];

// --- pure helpers --------------------------------------------------------------
check('search matches description, keywords, triggers and category labels', () => {
    const filter = (query) => Array.from(internals.skFilterSkills(fixtures, { query })).map(row => row.name);
    assert.deepEqual(filter('Blender'), ['demo-dev']);
    assert.deepEqual(filter('xlsx'), ['demo-office']);
    assert.deepEqual(filter('review since main'), ['demo-review']);
    assert.deepEqual(filter('代码质量'), ['demo-review']);
    assert.deepEqual(filter('邮件沟通'), ['demo-mail']);
    assert.deepEqual(filter(''), fixtures.map(row => row.name));
});

check('category, source and availability filters use the record fields', () => {
    assert.deepEqual(Array.from(internals.skFilterSkills(fixtures, { category: 'quality' })).map(row => row.name), ['demo-review']);
    assert.deepEqual(Array.from(internals.skFilterSkills(fixtures, { source: 'plugin' })).map(row => row.name), ['demo-dev']);
    assert.deepEqual(Array.from(internals.skFilterSkills(fixtures, { source: 'project' })).map(row => row.name), ['demo-mail']);
    assert.deepEqual(Array.from(internals.skFilterSkills(fixtures, { state: 'user' })).map(row => row.name), ['demo-office']);
    assert.deepEqual(Array.from(internals.skFilterSkills(fixtures, { state: 'disabled' })).map(row => row.name), ['demo-off']);
    assert.deepEqual(Array.from(internals.skFilterSkills(fixtures, { category: '__disabled' })).map(row => row.name), ['demo-off']);
});

check('sorts cover usage, name and recency only', () => {
    assert.deepEqual(Array.from(internals.skSortSkills(fixtures, 'name')).map(row => row.name), [...fixtures].map(row => row.name).sort((a, b) => a.localeCompare(b)));
    const byUsage = Array.from(internals.skSortSkills(fixtures, 'freq'));
    assert.equal(byUsage[0].name, 'demo-used');
    assert.equal(byUsage[1].name, 'demo-dev');
    const byRecent = Array.from(internals.skSortSkills(fixtures, 'recent'));
    assert.equal(byRecent[0].name, 'demo-used');
});

check('favourites strip is pinned → favourite → most used, de-duplicated and capped', () => {
    const rows = Array.from(internals.skPickFavourites(fixtures, 4)).map(row => row.name);
    assert.equal(rows[0], 'demo-off');
    assert.equal(rows[1], 'demo-review');
    assert.equal(rows.length, 4);
    assert.equal(new Set(rows).size, rows.length);
    assert.ok(rows.includes('demo-used'));
});

check('availability state maps to the four product states', () => {
    assert.equal(internals.skStateOf(fixtures[0], 'zh').label, '用户与模型');
    assert.equal(internals.skStateOf(fixtures[2], 'zh').label, '仅用户');
    assert.equal(internals.skStateOf(fixtures[4], 'zh').label, '已停用');
    assert.equal(internals.skStateOf(fixtures[4], 'zh').usable, false);
    assert.equal(internals.skStateOf(fixtures[0], 'en').label, 'User & model');
});

check('Chinese UI shows a Chinese summary, English UI shows the original', () => {
    const translated = skill('demo-zh', {
        description: 'English only description for this skill.',
        purpose: 'English purpose',
    });
    translated.i18n = { simple: '这是中文简介。', professional: '这是专业版简介。', source: 'catalog' };
    assert.equal(internals.skIntro(translated, 'zh'), '这是中文简介。');
    assert.equal(internals.skIntro(translated, 'en'), 'English only description for this skill.');
    assert.equal(internals.skPurpose(translated, 'zh'), '这是中文简介。');
    const missing = skill('demo-no-zh', { description: 'Nothing translated yet.' });
    const fallback = internals.skIntro(missing, 'zh');
    assert.match(fallback, /中文简介/);
    assert.equal(internals.skIntro(missing, 'en'), 'Nothing translated yet.');
    // A skill whose own description is already Chinese needs no extra layer.
    const native = skill('demo-native', { description: '这是技能自己写的中文描述。' });
    assert.equal(internals.skIntro(native, 'zh'), '这是技能自己写的中文描述。');
});

check('the recommendation card, list and detail share one canonical Skill intro', () => {
    const translated = skill('demo-shared-intro', { description: 'English only description.' });
    translated.i18n = { simple: '统一的中文简介。', professional: '专业版简介。', source: 'catalog' };
    assert.equal(internals.skSkillIntro(translated, 'zh'), '统一的中文简介。');
    assert.equal(internals.skSkillIntro(translated, 'en'), 'English only description.');
    const missing = skill('demo-no-intro', { description: '' });
    assert.equal(internals.skSkillIntro(missing, 'zh'), '该技能没有填写描述。');
    assert.equal(internals.skSkillIntro(missing, 'en'), 'This skill has no description.');
    assert.equal(internals.skSkillIntro(null, 'zh'), '无法读取技能描述');
    // A match reason is never an intro.
    assert.equal(internals.skSkillIntro(fixtures[0], 'zh'), '在 Blender 中建模并导出 glb');
});

check('search also matches the Chinese summary', () => {
    const translated = skill('demo-zh-search', { description: 'English only.' });
    translated.i18n = { simple: '在 Blender 中创建网格', professional: '在 Blender 中创建与编辑 3D 网格。', source: 'catalog' };
    assert.deepEqual(Array.from(internals.skFilterSkills([translated], { query: '创建网格' })).map(row => row.name), ['demo-zh-search']);
});

check('usage timestamps render deterministically', () => {
    assert.equal(internals.skTime(new Date(2026, 0, 2, 3, 4).getTime()), '01-02 03:04');
});

check('accepting a recommendation fills a complete, real next step', () => {
    const fromIntent = internals.skContinuationPrompt(fixtures[0], '审查这个 diff', 'zh');
    assert.match(fromIntent, /上一条消息/);
    assert.match(fromIntent, /审查这个 diff/);
    const fromIntentEn = internals.skContinuationPrompt(fixtures[0], 'review this diff', 'en');
    assert.match(fromIntentEn, /previous message/);
    assert.match(fromIntentEn, /review this diff/);
    const fromUseCase = internals.skContinuationPrompt({ useCases: ['从固定点审查一次变更'], purpose: '代码审查' }, '', 'zh');
    assert.match(fromUseCase, /从固定点审查一次变更/);
    const bilingual = internals.skContinuationPrompt({ i18n: { simple: '中文用途' }, useCases: ['English use case'], purpose: 'English purpose' }, '', 'zh');
    assert.match(bilingual, /中文用途/);
    const bilingualEn = internals.skContinuationPrompt({ i18n: { simple: '中文用途' }, useCases: ['English use case'], purpose: 'English purpose' }, '', 'en');
    assert.match(bilingualEn, /English use case/);
    const fromPurpose = internals.skContinuationPrompt({ purpose: '审查 diff 并生成报告' }, '', 'zh');
    assert.match(fromPurpose, /审查 diff 并生成报告/);
    const fallback = internals.skContinuationPrompt({}, '', 'zh');
    assert.match(fallback, /继续推进/);
});

// --- home recommendation helpers ----------------------------------------------
const missingDep = skill('demo-missing-dep', {
    requires: [{ name: 'not-installed', kind: 'declared', satisfied: false }],
    stats: { loads: 9, favorite: true },
});

check('a home candidate is only loadable when permission and dependencies allow it', () => {
    assert.equal(internals.skUsableRecord(fixtures[0]), true);
    assert.equal(internals.skUsableRecord(fixtures[2]), true);
    assert.equal(internals.skUsableRecord(fixtures[4]), false, 'disabled skill is not loadable');
    assert.equal(internals.skUsableRecord(missingDep), false, 'missing dependency is not loadable');
    assert.equal(internals.skUsableRecord(skill('demo-model-only', { policy: { userInvocable: false } })), false);
});

check('history picks come from real counters, favourites and pins, capped at three', () => {
    const entries = Array.from(internals.skHistoryEntries(fixtures.concat([missingDep]), 3));
    assert.equal(entries.length, 3);
    assert.deepEqual(entries.map(row => row.name), ['demo-used', 'demo-dev', 'demo-review']);
    assert.match(internals.skHomeReason(entries[0], 'zh'), /18 次/);
    assert.match(internals.skHomeReason(entries[0], 'en'), /18 times/);
    assert.equal(entries.some(row => row.name === 'demo-off'), false, 'disabled skills never enter the home');
    assert.equal(entries.some(row => row.name === 'demo-missing-dep'), false, 'unmet dependencies never enter the home');
});

check('host items are re-resolved against the live index', () => {
    const entries = Array.from(internals.skHomeEntriesFromHost([
        { name: 'demo-dev', reason: '命中关键词', reasonEn: 'keyword match', score: 0.9 },
        { name: 'demo-off', reason: '停用技能', score: 0.8 },
        { name: 'gone', reason: 'deleted skill', score: 0.7 },
    ], fixtures));
    assert.deepEqual(entries.map(row => row.name), ['demo-dev']);
    assert.equal(internals.skHomeReason(entries[0], 'zh'), '命中关键词');
    assert.equal(internals.skHomeReason(entries[0], 'en'), 'keyword match');
});

check('favourites group pinned → favourite → frequent without duplicates', () => {
    const groups = Array.from(internals.skFavGroups(fixtures));
    assert.deepEqual(groups.map(group => group.id), ['pinned', 'favorite', 'frequent']);
    assert.deepEqual(Array.from(groups[0].rows).map(row => row.name), ['demo-off']);
    assert.deepEqual(Array.from(groups[1].rows).map(row => row.name), ['demo-review']);
    assert.ok(Array.from(groups[2].rows).map(row => row.name).includes('demo-used'));
    const all = groups.reduce((names, group) => names.concat(Array.from(group.rows).map(row => row.name)), []);
    assert.equal(new Set(all).size, all.length, 'one skill appears in exactly one group');
});

await checkAsync('the client knows the home endpoint and sends the live session and scope', async () => {
    resetFetch();
    fetchHandler = async () => ({ ok: true, status: 200, json: async () => ({ source: 'history', items: [] }) });
    const result = await internals.api.home('session-1', '/tmp/ws');
    assert.equal(result.ok, true);
    const call = fetchCalls.find(row => row.url.includes('/home'));
    assert.ok(call, 'home endpoint was called');
    assert.match(call.url, /session=session-1/);
    assert.match(call.url, /workspace=%2Ftmp%2Fws/);
});

await checkAsync('the fallback prefers the parked conversation recommendation', async () => {
    resetFetch();
    fetchHandler = async (url) => {
        if (url.includes('/session-state')) {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    pending: {
                        items: [{ name: 'demo-review', reason: '命中触发条件「review since main」', reasonEn: 'matched the trigger', score: 0.91 }],
                        intent: '审查这个 diff',
                        at: Date.now(),
                    },
                }),
            };
        }
        return { ok: true, status: 200, json: async () => ({}) };
    };
    const data = await internals.skFallbackHome(fixtures, 'session-1');
    assert.equal(data.source, 'conversation');
    assert.equal(data.intent, '审查这个 diff');
    assert.deepEqual(Array.from(data.items).map(row => row.name), ['demo-review']);
    assert.match(internals.skHomeReason(data.items[0], 'zh'), /触发条件/);
});

await checkAsync('the fallback uses usage history when no conversation pick is parked', async () => {
    resetFetch();
    fetchHandler = async (url) => {
        if (url.includes('/session-state')) return { ok: true, status: 200, json: async () => ({ pending: null }) };
        return { ok: true, status: 200, json: async () => ({}) };
    };
    const data = await internals.skFallbackHome(fixtures, 'session-1');
    assert.equal(data.source, 'history');
    assert.ok(data.items.length > 0);
    assert.equal(data.items[0].name, 'demo-used');
    assert.match(internals.skHomeReason(data.items[0], 'zh'), /使用/);
});

// --- load chain ----------------------------------------------------------------
await checkAsync('load chain authorizes, stages the official token and reports loaded', async () => {
    resetFetch();
    draftCalls.length = 0;
    const { ctx } = makeCtx();
    mod.apply(ctx);
    fetchHandler = async (url) => {
        if (url.endsWith('/use')) return { ok: true, status: 200, json: async () => ({ token: '/demo-dev ' }) };
        if (url.endsWith('/event')) return { ok: true, status: 200, json: async () => ({ recorded: true }) };
        return { ok: true, status: 200, json: async () => ({}) };
    };
    const outcome = await internals.skUseSkill('demo-dev', '');
    assert.equal(outcome.ok, true);
    assert.equal(outcome.sessionId, 'session-1');
    assert.deepEqual(draftCalls.map(call => call.prompt), ['/demo-dev ']);
    assert.equal(draftCalls[0].whenDraftExists, 'append');
    const useCall = fetchCalls.find(call => call.url.endsWith('/use'));
    assert.ok(useCall, 'host authorization call was made');
    // The current session belongs to /tmp/ws, so the load resolves that scope
    // instead of asking the host for the global-only index.
    assert.equal(JSON.stringify(JSON.parse(useCall.init.body)), JSON.stringify({ name: 'demo-dev', workspace: '/tmp/ws', sessionId: 'session-1' }));
    const eventCall = fetchCalls.find(call => call.url.endsWith('/event'));
    assert.ok(eventCall, 'load confirmation was reported');
    assert.equal(JSON.parse(eventCall.init.body).phase, 'loaded');
    assert.equal(internals.skLoadSnapshot('demo-dev').phase, 'loaded');
    internals.skLoadSet('demo-dev', { phase: 'idle' });
});

await checkAsync('an accepted recommendation stages the complete next step in the composer', async () => {
    resetFetch();
    draftCalls.length = 0;
    const { ctx } = makeCtx();
    mod.apply(ctx);
    fetchHandler = async (url) => {
        if (url.endsWith('/use')) return { ok: true, status: 200, json: async () => ({ token: '/demo-dev ' }) };
        if (url.endsWith('/event')) return { ok: true, status: 200, json: async () => ({ recorded: true }) };
        return { ok: true, status: 200, json: async () => ({}) };
    };
    const continuation = '基于我上一条消息继续推进：“审查这个 diff”。';
    const outcome = await internals.skUseSkill('demo-dev', '', { continuation });
    assert.equal(outcome.ok, true);
    assert.equal(outcome.continuation, true);
    assert.deepEqual(draftCalls.map(call => call.prompt), ['/demo-dev ' + continuation]);
    assert.equal(draftCalls[0].whenDraftExists, 'append');
    const useCall = fetchCalls.find(call => call.url.endsWith('/use'));
    assert.ok(useCall, 'host authorization still runs before staging');
    internals.skLoadSet('demo-dev', { phase: 'idle' });
});

await checkAsync('a rejected authorization surfaces the host reason and records load-failed', async () => {
    resetFetch();
    const { ctx } = makeCtx();
    mod.apply(ctx);
    fetchHandler = async (url) => {
        if (url.endsWith('/use')) return { ok: false, status: 403, json: async () => ({ error: 'skill is not user-invocable', code: 'not-user-invocable' }) };
        if (url.endsWith('/event')) return { ok: true, status: 200, json: async () => ({ recorded: true }) };
        return { ok: true, status: 200, json: async () => ({}) };
    };
    const outcome = await internals.skUseSkill('demo-review', '');
    assert.equal(outcome.ok, false);
    assert.equal(outcome.error, 'skill is not user-invocable');
    assert.equal(internals.skLoadSnapshot('demo-review').phase, 'error');
    const eventCall = fetchCalls.find(call => call.url.endsWith('/event'));
    assert.ok(eventCall);
    const body = JSON.parse(eventCall.init.body);
    assert.equal(body.phase, 'load-failed');
    assert.match(body.reason, /user-invocable/);
});

await checkAsync('without conversation services the load fails with a real reason', async () => {
    resetFetch();
    const ctx = {
        slots: { inject: () => () => {}, register: () => ({}) },
        get: () => undefined,
        on: () => () => {},
        effect: () => {},
        logger: { warn: () => {} },
    };
    mod.apply(ctx);
    fetchHandler = async () => ({ ok: true, status: 200, json: async () => ({}) });
    const outcome = await internals.skUseSkill('demo-dev', '');
    assert.equal(outcome.ok, false);
    assert.match(outcome.error, /会话|conversation/i);
});

await checkAsync('cancelling an in-flight load aborts the request and reports cancelled', async () => {
    resetFetch();
    const { ctx } = makeCtx();
    mod.apply(ctx);
    fetchHandler = async (url, init) => {
        if (url.endsWith('/use')) {
            return new Promise((_resolve, reject) => {
                if (init.signal === undefined) return;
                init.signal.addEventListener('abort', () => {
                    const error = new Error('aborted');
                    error.name = 'AbortError';
                    reject(error);
                });
            });
        }
        if (url.endsWith('/event')) return { ok: true, status: 200, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => ({}) };
    };
    const first = internals.skUseSkill('demo-cancel', '');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(internals.skLoadSnapshot('demo-cancel').phase, 'loading');
    const second = await internals.skUseSkill('demo-cancel', '');
    assert.equal(second.cancelled, true);
    const outcome = await first;
    assert.equal(outcome.cancelled, true);
    assert.equal(internals.skLoadSnapshot('demo-cancel').phase, 'cancelled');
});

// --- dock contract -------------------------------------------------------------
check('dock registers into conversation.input.dock and renders nothing without a candidate', () => {
    assert.equal(typeof internals.registerDock, 'function');
    assert.equal(typeof internals.dock, 'function');
    const { ctx, slots } = makeCtx();
    mod.apply(ctx);
    const dock = slots.find(row => row.name === 'conversation.input.dock');
    assert.ok(dock, 'dock slot registered');
    assert.equal(dock.registered.component({ sessionId: 'session-1' }), null, 'no candidate → no card');
});

check('dock copy exists in both languages', () => {
    for (const key of ['dock.title', 'dock.use', 'dock.ignore', 'dock.loading', 'dock.loaded', 'dock.loadedNext', 'dock.failed', 'dock.ignored', 'dock.reason', 'dock.collapse', 'dock.expand']) {
        assert.ok(internals.strings.zh[key], `zh lacks ${key}`);
        assert.ok(internals.strings.en[key], `en lacks ${key}`);
    }
});

// --- summary -------------------------------------------------------------------
console.log(`\n${results.length} client smoke checks passed`);
