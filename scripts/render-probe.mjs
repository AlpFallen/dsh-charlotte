/**
 * Real-React render probe (optional, needs React installed locally).
 *
 * The hermetic smoke test uses a fake JSX runtime, which cannot catch React's
 * development-only argument checks (e.g. `jsx(type, null, children)` throws
 * because React calls `hasOwnProperty` on the config object). This probe loads
 * the built bundle with the real react / react-dom / react/jsx-runtime and
 * server-renders every v0.6 surface, failing on the same errors the browser
 * would throw.
 *
 *   node scripts/render-probe.mjs
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToString } = require('react-dom/server');

const bundle = await readFile(new URL('../client/client.js', import.meta.url), 'utf8');

const sandbox = {
    console,
    window: {
        __ModuleLoader__: { load: (entry) => { sandbox.__entry = entry; } },
        navigator: { language: 'zh-CN' },
        setTimeout: (fn) => { void fn; return 1; },
        clearTimeout: () => {},
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        addEventListener: () => {},
        removeEventListener: () => {},
    },
    document: {
        querySelector: () => null,
        createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
        head: { appendChild() {} },
        documentElement: { lang: 'zh-CN' },
    },
    navigator: { language: 'zh-CN' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
    setTimeout: () => 1,
    clearTimeout: () => {},
    AbortController,
};
sandbox.globalThis = sandbox;
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;
const realJsx = require('react/jsx-runtime');
const traced = {
    jsx: (type, config, key) => {
        if (config === undefined || config === null) {
            console.log('NULL CONFIG for type:', typeof type === 'string' ? type : (type && (type.name || type.displayName)), 'key:', key);
        }
        return realJsx.jsx(type, config, key);
    },
    jsxs: (type, config, key) => {
        if (config === undefined || config === null) {
            console.log('NULL CONFIG (jsxs) for type:', typeof type === 'string' ? type : (type && (type.name || type.displayName)), 'key:', key);
        }
        return realJsx.jsxs(type, config, key);
    },
    Fragment: realJsx.Fragment,
};
sandbox.require = (name) => {
    if (name === 'react') return React;
    if (name === 'react-dom') return require('react-dom');
    if (name === 'react/jsx-runtime') return traced;
    throw new Error(`unexpected require: ${name}`);
};
vm.createContext(sandbox);
const exported = [
    'StationApp', 'SkillBrowse', 'SkRow', 'SkDetailDrawer', 'SkFavourites', 'SkSide',
    'SkHome', 'SkHomeHero', 'SkHomeRow', 'SkToolbar', 'SkSearch',
    'SkMoreMenu', 'StationPanelDialog', 'SkRecommendDock', 'skRegisterRecommendDock',
    'SkSecurityCenter', 'SkSecurityReview', 'SkMarkdown', 'skStateOf',
].join(', ');
const injectable = bundle.replace(
    '    return module.exports;',
    `    globalThis.__t = { ${exported} };\n    return module.exports;`,
);
vm.runInContext(injectable, sandbox, { filename: 'client.js' });

const mod = sandbox.__entry.factory(sandbox.require);
mod.apply({
    slots: {
        inject: (slot, cb) => cb(),
        register: (options, component) => ({ options, component }),
    },
    effect: (install) => install(),
    get: () => undefined,
});
const t = sandbox.__t;

const skill = {
    name: 'demo-review',
    description: '审查 diff 并生成代码审查报告，覆盖 Standards 与 Spec 两条轴线，适合在重构之后使用。',
    purpose: '审查 diff 并生成代码审查报告。',
    category: {
        id: 'quality',
        label: '代码质量',
        labelEn: 'Code Quality',
        confidence: 'high',
        evidence: [{ term: '审查', fields: ['description'] }, { term: 'review', fields: ['keywords'] }],
    },
    keywords: ['审查', 'review', 'diff'],
    triggers: { values: ['review since main'], provenance: 'declared' },
    useCases: ['从固定点审查一次变更'],
    avoidCases: ['不要把正确性评审混进来'],
    requires: [{ name: 'demo-mail', kind: 'mention', satisfied: true }],
    stats: {
        favorite: true,
        pinned: true,
        pinnedAt: 10,
        loads: 4,
        invokes: 2,
        completions: 1,
        failures: 0,
        cancelled: 0,
        lastUsedAt: Date.UTC(2026, 9, 28, 13, 12),
        lastLoadedAt: Date.UTC(2026, 9, 28, 13, 12),
        recent: [
            { at: Date.UTC(2026, 9, 28, 13, 12), kind: 'invoked' },
            { at: Date.UTC(2026, 9, 27, 8, 40), kind: 'loaded' },
            { at: Date.UTC(2026, 9, 26, 3, 3), kind: 'load-failed', reason: 'composer busy' },
        ],
    },
    policy: { modelInvocable: true, userInvocable: true, disabled: false, availability: 'both' },
    source: { type: 'user', label: '用户专属', detail: '全局 · 用户根' },
    management: { kind: 'writable', rootId: 'user-dsh', path: '/Users/me/.dsh/skills/demo-review', provider: 'filesystem' },
    version: '1.2.0',
    i18n: {
        simple: '这是给中文界面看的一句话简介。',
        professional: '这是给中文界面看的专业版简介。',
        source: 'catalog',
        matchedHash: '0123456789abcdef',
    },
    updatedAt: Date.UTC(2026, 9, 28, 2, 0),
    provenance: { purpose: 'derived', keywords: 'declared', triggers: 'declared', version: 'declared' },
    categoryLabel: '代码质量',
};
const mountedSkill = {
    ...skill,
    name: 'demo-mounted',
    version: null,
    management: { kind: 'mounted', path: '/Users/me/.claude/skills/demo-mounted/SKILL.md', provider: 'charlotte' },
    source: { type: 'user', label: '用户专属', detail: '外部挂载 · Claude Code' },
    policy: { modelInvocable: true, userInvocable: false, disabled: false, availability: 'model' },
};
const pluginSkill = {
    ...skill,
    name: 'office-skill',
    management: { kind: 'plugin', provider: 'dsh-office' },
    source: { type: 'plugin', label: '插件提供', detail: 'dsh-office' },
};
const disabledSkill = {
    ...skill,
    name: 'demo-disabled',
    policy: { modelInvocable: false, userInvocable: false, disabled: true, availability: 'disabled' },
};

const cases = [
    // Tab-content assertions live below; keep the elements in one list so the
    // SSR probe renders exactly what the browser would for each active tab.
    ['station app', React.createElement(t.StationApp, {})],
    ['station app with close', React.createElement(t.StationApp, { onRequestClose() {} })],
    ['skill browse', React.createElement(t.SkillBrowse, {
        workspace: '',
        workspaces: [{ path: '/tmp/ws', title: 'ws' }],
        onWorkspace() {},
        onPanel() {},
        onNotice() {},
        reloadToken: 0,
        onRequestClose() {},
    })],
    ['row', React.createElement(t.SkRow, { skill, lang: 'zh', onUse() {}, onDetail() {}, onPref() {} })],
    ['row en', React.createElement(t.SkRow, { skill: mountedSkill, lang: 'en', onUse() {}, onDetail() {}, onPref() {} })],
    ['favourites', React.createElement(t.SkFavourites, {
        skills: [skill, mountedSkill],
        lang: 'zh',
        onUse() {},
        onDetail() {},
        onPref() {},
        onBrowseAll() {},
    })],
    ['favourites empty', React.createElement(t.SkFavourites, {
        skills: [],
        lang: 'en',
        onUse() {},
        onDetail() {},
        onPref() {},
        onBrowseAll() {},
    })],
    ['sidebar', React.createElement(t.SkSide, {
        categories: [{ id: 'quality', label: '代码质量', labelEn: 'Code Quality', count: 3 }],
        category: '',
        view: 'home',
        total: 4,
        favouritesCount: 2,
        heroSub: '4 个技能 · 2 个属于你',
        workspace: '',
        workspaces: [{ path: '/tmp/ws', title: 'ws' }],
        lang: 'zh',
        onView() {},
        onCategory() {},
        onWorkspace() {},
        onPanel() {},
        onRefresh() {},
    })],
    ['home primary', React.createElement(t.SkHomeHero, {
        item: { name: skill.name, reason: '与当前任务的关键词「审查」相关。', reasonEn: 'matched the task keywords.', skill },
        lang: 'zh',
        onUse() {},
        onDetail() {},
    })],
    ['home secondary', React.createElement(t.SkHomeRow, {
        item: { name: mountedSkill.name, reason: '你已使用 3 次。', reasonEn: 'you used it 3 times.', skill: mountedSkill },
        lang: 'en',
        onUse() {},
        onDetail() {},
    })],
    ['home with picks', React.createElement(t.SkHome, {
        lang: 'zh',
        data: {
            source: 'history',
            intent: '',
            at: 0,
            items: [
                { name: skill.name, reason: '你收藏了这个技能。', reasonEn: 'you favourited this skill.', skill },
                { name: mountedSkill.name, reason: '你已使用 3 次。', reasonEn: 'you used it 3 times.', skill: mountedSkill },
            ],
        },
        loading: false,
        error: '',
        query: '',
        categories: [{ id: 'quality', label: '代码质量', labelEn: 'Code Quality', count: 3 }],
        onRefresh() {},
        onUse() {},
        onDetail() {},
        onSearch() {},
        onCategory() {},
        onView() {},
    })],
    ['home empty', React.createElement(t.SkHome, {
        lang: 'zh',
        data: { source: 'none', intent: '', at: 0, items: [] },
        loading: false,
        error: '',
        query: '',
        categories: [{ id: 'quality', label: '代码质量', labelEn: 'Code Quality', count: 3 }],
        onRefresh() {},
        onUse() {},
        onDetail() {},
        onSearch() {},
        onCategory() {},
        onView() {},
    })],
    ['toolbar', React.createElement(t.SkToolbar, {
        lang: 'zh',
        sort: 'freq',
        source: 'all',
        state: 'all',
        menu: null,
        total: 4,
        sourceRows: [{ type: 'user', label: '用户专属', count: 2 }],
        onSort() {},
        onSource() {},
        onState() {},
        onMenu() {},
    })],
    ['search', React.createElement(t.SkSearch, { value: '', lang: 'zh', onChange() {} })],
    ['more menu', React.createElement(t.SkMoreMenu, {
        lang: 'zh',
        workspace: '',
        workspaces: [{ path: '/tmp/ws', title: 'ws' }],
        onWorkspace() {},
        onPanel() {},
        onRefresh() {},
    })],
    ['more menu nav', React.createElement(t.SkMoreMenu, {
        lang: 'en',
        workspace: '',
        workspaces: [{ path: '/tmp/ws', title: 'ws' }],
        onWorkspace() {},
        onPanel() {},
        onRefresh() {},
        variant: 'nav',
        placement: 'up',
    })],
    ['detail writable', React.createElement(t.SkDetailDrawer, {
        skill,
        lang: 'zh',
        onClose() {},
        onUse() {},
        onToggle() {},
    })],
    ['detail mounted', React.createElement(t.SkDetailDrawer, {
        skill: mountedSkill,
        lang: 'en',
        onClose() {},
        onUse() {},
        onToggle() {},
    })],
    ['detail plugin', React.createElement(t.SkDetailDrawer, {
        skill: pluginSkill,
        lang: 'zh',
        onClose() {},
        onUse() {},
        onToggle() {},
    })],
    ['detail disabled', React.createElement(t.SkDetailDrawer, {
        skill: disabledSkill,
        lang: 'zh',
        onClose() {},
        onUse() {},
        onToggle() {},
    })],
    ['install panel', React.createElement(t.StationPanelDialog, {
        panel: 'install',
        lang: 'zh',
        workspace: '',
        onClose() {},
    })],
    ['trash panel', React.createElement(t.StationPanelDialog, {
        panel: 'trash',
        lang: 'zh',
        workspace: '',
        onClose() {},
    })],
    ['dock without candidate', React.createElement(t.SkRecommendDock, { sessionId: 'session-1' })],
    ['security center', React.createElement(t.SkSecurityCenter, {
        lang: 'zh',
        workspace: '',
        onClose() {},
    })],
    ['security review blocked', React.createElement(t.SkSecurityReview, {
        lang: 'zh',
        workspace: '',
        initial: {
            name: 'demo-review',
            source: { type: 'user', label: '用户专属', detail: '全局 · 用户根' },
            code: 'security-blocked',
            summary: { critical: 0, high: 1, medium: 0, low: 0, info: 0, total: 1, blocked: 1, unresolved: 1 },
            findings: [{
                id: 'sec_demo',
                ruleId: 'SEC-SKILL-001',
                target: 'skill:demo-review',
                title: 'Prompt injection',
                titleZh: '提示注入',
                severity: 'HIGH',
                category: 'content',
                status: 'blocked',
                filePath: 'SKILL.md',
                line: 3,
                description: 'The skill asks the model to override earlier instructions.',
                descriptionZh: '技能要求模型覆盖之前的指令。',
                impact: 'Instructions can be replaced.',
                impactZh: '模型指令可能被替换。',
                attackScenario: 'A malicious body tells the model to ignore policy.',
                attackScenarioZh: '恶意正文要求模型忽略策略。',
                remediation: 'Remove the override.',
                remediationZh: '删除覆盖指令。',
                evidence: { snippet: 'Ignore all previous instructions' },
            }],
        },
        onClose() {},
    })],
    ['security review passed', React.createElement(t.SkSecurityReview, {
        lang: 'en',
        workspace: '',
        initial: {
            name: 'demo-clean',
            source: { type: 'user', label: '用户专属', detail: '全局 · 用户根' },
            review: {
                state: 'PASSED',
                risk: 'INFO',
                complete: true,
                hash: 'abc',
                reviewHash: 'def',
                scanId: 'scan-1',
                checkedAt: Date.UTC(2026, 9, 28, 3, 0),
                summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0, blocked: 0, unresolved: 0, accepted: 0 },
                findings: [],
                checks: [{ id: 'body', status: 'passed', findings: [], count: 0 }],
                blocking: [],
                acceptable: [],
                action: 'allow',
                critical: false,
            },
        },
        onClose() {},
    })],
    ['security review partial', React.createElement(t.SkSecurityReview, {
        lang: 'zh',
        workspace: '',
        initial: {
            name: 'demo-partial',
            source: { type: 'user', label: '用户专属', detail: '全局 · 用户根' },
            review: {
                state: 'PARTIAL',
                risk: 'INFO',
                complete: false,
                hash: 'abc',
                reviewHash: 'def',
                scanId: 'scan-2',
                checkedAt: Date.UTC(2026, 9, 28, 3, 0),
                summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0, blocked: 0, unresolved: 0, accepted: 0 },
                findings: [],
                checks: [{ id: 'body', status: 'partial', findings: [], count: 0 }],
                blocking: [],
                acceptable: [],
                action: 'block',
                critical: false,
            },
        },
        onClose() {},
    })],
    ['security review all', React.createElement(t.SkSecurityReview, {
        lang: 'zh',
        workspace: '',
        initial: { global: true, source: 'manual' },
        onClose() {},
    })],
    ['detail security tab', React.createElement(t.SkDetailDrawer, {
        skill,
        lang: 'zh',
        workspace: '',
        initialTab: 'security',
        onClose() {},
        onUse() {},
        onToggle() {},
        onDelete() {},
        onNotice() {},
        dependents: [],
    })],
    ['detail info tab', React.createElement(t.SkDetailDrawer, {
        skill,
        lang: 'zh',
        workspace: '',
        initialTab: 'info',
        onClose() {},
        onUse() {},
        onToggle() {},
        onDelete() {},
        onNotice() {},
        dependents: [],
    })],
    ['detail usage tab', React.createElement(t.SkDetailDrawer, {
        skill,
        lang: 'zh',
        workspace: '',
        initialTab: 'usage',
        onClose() {},
        onUse() {},
        onToggle() {},
        onDelete() {},
        onNotice() {},
        dependents: [],
    })],
    ['markdown document', React.createElement(t.SkMarkdown, {
        text: '# Heading\n\nA **bold** [link](https://example.com).\n\n- one\n- two\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n~~~js\nconst x = 1;\n~~~\n',
    })],
];

// The Chinese interface must render the Chinese summary, and the English
// interface must render the original.
const zhRow = renderToString(React.createElement(t.SkRow, { skill, lang: 'zh', onUse() {}, onDetail() {}, onPref() {} }));
const enRow = renderToString(React.createElement(t.SkRow, { skill, lang: 'en', onUse() {}, onDetail() {}, onPref() {} }));
if (!zhRow.includes('这是给中文界面看的一句话简介。')) {
    console.log('FAIL zh row does not render the Chinese summary');
    process.exitCode = 1;
}
else {
    console.log('OK   zh row renders the Chinese summary');
}
if (enRow.includes('这是给中文界面看的一句话简介。')) {
    console.log('FAIL en row must not render the Chinese summary');
    process.exitCode = 1;
}
else {
    console.log('OK   en row keeps the original summary');
}

// The recommendation card, the list and the detail drawer must show the same
// intro text; the match reason / official description stay separate.
const zhHome = renderToString(React.createElement(t.SkHomeHero, {
    item: { name: skill.name, reason: '这是一条推荐原因。', reasonEn: 'a recommendation reason.', skill },
    lang: 'zh',
    intent: '审查这次改动',
    onUse() {},
    onDetail() {},
}));
const zhDetail = renderToString(React.createElement(t.SkDetailDrawer, {
    skill,
    lang: 'zh',
    onClose() {},
    onUse() {},
    onToggle() {},
}));
const intro = '这是给中文界面看的一句话简介。';
if (!zhRow.includes(intro) || !zhHome.includes(intro) || !zhDetail.includes(intro)) {
    console.log('FAIL list/recommendation/detail intros are not identical');
    process.exitCode = 1;
}
else {
    console.log('OK   list, recommendation and detail share the same intro');
}
if (!zhHome.includes('这是一条推荐原因。') || !zhDetail.includes(intro)) {
    console.log('FAIL recommendation reason or detail intro missing');
    process.exitCode = 1;
}
else {
    console.log('OK   recommendation reason stays separate from the intro');
}
if (!zhDetail.includes('技能介绍') || !zhDetail.includes('技能文档')) {
    console.log('FAIL detail does not land on the Skill Introduction tab');
    process.exitCode = 1;
}
else {
    console.log('OK   detail defaults to Skill Introduction with the documentation section');
}
if (!zhDetail.includes('sk_detailModal') || !zhDetail.includes('role="dialog"') || !zhDetail.includes('aria-modal="true"')) {
    console.log('FAIL detail is not rendered as a modal dialog');
    process.exitCode = 1;
}
else {
    console.log('OK   detail renders as a centered modal dialog');
}

// Each tab must render its own content, not the default Introduction.
const tabCase = (label) => cases.find(row => row[0] === label)[1];
const securityTabHtml = renderToString(tabCase('detail security tab'));
const infoTabHtml = renderToString(tabCase('detail info tab'));
const usageTabHtml = renderToString(tabCase('detail usage tab'));
if (!securityTabHtml.includes('尚未扫描') || !securityTabHtml.includes('快速扫描')) {
    console.log('FAIL security tab does not render its real unscanned state');
    process.exitCode = 1;
}
else {
    console.log('OK   security tab renders the real unscanned state and scan actions');
}
if (!infoTabHtml.includes('技能 ID') || !infoTabHtml.includes('依赖') || !infoTabHtml.includes('技术信息')) {
    console.log('FAIL information tab is missing required sections');
    process.exitCode = 1;
}
else {
    console.log('OK   information tab renders basic, dependency and technical sections');
}
if (!usageTabHtml.includes('使用事件总数') || !usageTabHtml.includes('最近记录')) {
    console.log('FAIL usage tab is missing counters or recent records');
    process.exitCode = 1;
}
else {
    console.log('OK   usage tab renders counters and recent records');
}

let failures = 0;
for (const [label, element] of cases) {
    try {
        const html = renderToString(element);
        console.log(`OK   ${label}: ${html.length} chars`);
    }
    catch (error) {
        failures += 1;
        console.log(`FAIL ${label}: ${error && error.message}`);
        console.log(error && error.stack ? error.stack.split('\n').slice(0, 8).join('\n') : '');
    }
}
if (failures > 0) {
    console.log(`\n${failures} render probe(s) failed`);
    process.exitCode = 1;
}
else {
    console.log(`\n${cases.length} render probes passed`);
}
