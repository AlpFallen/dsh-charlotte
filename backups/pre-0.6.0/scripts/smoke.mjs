/**
 * Hermetic smoke test for the launcher revamp (v0.4).
 *
 * The bundle is a browser script: `window.__ModuleLoader__.load({ id, factory })`
 * where the factory requires react / react-dom / react/jsx-runtime. This test
 * runs it in a `node:vm` sandbox with minimal stubs, exercises `apply()`, the
 * language layer, the launcher components, the non-executing loading helpers
 * (against fake conversation services) and the CSS contract. No browser, no network.
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
/**
 * The automatic JSX runtime never receives a null config: React's development
 * build calls `hasOwnProperty` on it and throws. Guard the stub the same way so
 * a mis-called `jsx(type, null, childrenAsKey)` fails here, not in the app.
 */
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
const reactDom = { createPortal: (node) => node };
const requests = [];
const requestCalls = [];
const storage = new Map();
const sandbox = {
  console,
  window: {
    __ModuleLoader__: { load: (entry) => { sandbox.__entry = entry; } },
    navigator: { language: 'zh-CN' },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => { storage.set(key, String(value)); },
      removeItem: (key) => { storage.delete(key); },
    },
  },
  document: {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
    head: { appendChild() {} },
  },
  fetch: async (url, options) => {
    requests.push(url);
    requestCalls.push({ url, options: options === undefined ? {} : options });
    return { ok: true, status: 200, json: async () => ({}) };
  },
};
sandbox.globalThis = sandbox;
sandbox.require = (name) => {
  if (name === 'react') return react;
  if (name === 'react-dom') return reactDom;
  if (name === 'react/jsx-runtime') return jsxRuntime;
  throw new Error(`unexpected require: ${name}`);
};

vm.createContext(sandbox);
vm.runInContext(bundle, sandbox, { filename: 'client.js' });

// Expose the display-layer helpers to this test without touching the shipped
// bundle: inject a capture line right before the factory returns.
const injected = [
  'skCopyOf: skCopyOf',
  'skScopeOf: skScopeOf',
  'skModelInvocable: skModelInvocable',
  'skUserInvocable: skUserInvocable',
  'skInvocationGroup: skInvocationGroup',
  'skEntriesOf: skEntriesOf',
  'skCountGroups: skCountGroups',
  'skFilterEntries: skFilterEntries',
  'skCurrentSessionId: skCurrentSessionId',
  'skWorkspaceIdFor: skWorkspaceIdFor',
  'skPrepareDraft: skPrepareDraft',
  'skLoadIntoCurrent: skLoadIntoCurrent',
  'skLoadIntoNew: skLoadIntoNew',
  'skFocusSession: skFocusSession',
  'skDraftPrompt: skDraftPrompt',
  'skCanLoad: skCanLoad',
  'skService: skService',
  'fetchSkillDetail: fetchSkillDetail',
  'fetchRegistrySkill: fetchRegistrySkill',
  'RegistryDetailDialog: RegistryDetailDialog',
  'skProviderLabel: skProviderLabel',
  'skProviderCategory: skProviderCategory',
  'skT: skT',
  'skGetLang: skGetLang',
  'skSetLang: skSetLang',
  'StationApp: StationApp',
  'TargetSelector: TargetSelector',
  'SkillBrowse: SkillBrowse',
  'SkillCard: SkillCard',
  'SkillDetailDialog: SkillDetailDialog',
  'MountedDetailDialog: MountedDetailDialog',
  'InvokeDialog: InvokeDialog',
  'MoreMenu: MoreMenu',
  'SkLangSwitch: SkLangSwitch',
  'SkStatus: SkStatus',
  'fetchCatalog: fetchCatalog',
  'fetchMountedSkill: fetchMountedSkill',
  'setMountedSwitch: setMountedSwitch',
  'skMountedSkill: skMountedSkill',
  'skSourceLabel: skSourceLabel',
].join(', ');
const testable = bundle.replace(
  '    return module.exports;',
  `    globalThis.__skTest = { ${injected} };\n    return module.exports;`,
);
assert.notEqual(testable, bundle, 'smoke: factory return anchor not found');
vm.runInContext(testable, sandbox, { filename: 'client.testable.js' });

// --- bundle and slot ---------------------------------------------------------
check('bundle registers under the station module id', () => {
  assert.equal(sandbox.__entry.id, 'dsh-charlotte');
  assert.equal(typeof sandbox.__entry.factory, 'function');
});

const module = sandbox.__entry.factory(sandbox.require);
check('factory exports inject/apply', () => {
  assert.deepEqual(Array.from(module.inject), ['slots']);
  assert.equal(typeof module.apply, 'function');
});

// Fake client services the launcher reaches through its captured context.
// The composer facade records draft staging; send/submit spies prove that
// loading never executes anything.
const draftCalls = [];
let focusCount = 0;
const sent = [];
const submitted = [];
let draftOutcome = 'applied';
const conversation = {
  input: {
    requestDraftInitialization: (binding, options) => {
      draftCalls.push({ binding, options });
      return draftOutcome;
    },
    for: () => ({ focus: () => { focusCount += 1; } }),
    submit: () => { submitted.push(true); },
  },
  send: (text) => {
    sent.push(text);
    return Promise.resolve();
  },
};
const usingCalls = [];
const connectedWorkspaces = [];
const openedSessions = [];
let connectSessionId = 's2';
const services = {
  conversation: conversation,
  uiSession: { current: { getSnapshot: () => ({ key: 's1' }) } },
  sessions: {
    list: { getSnapshot: () => ({ byId: { s1: { updatedAt: 10, retainedBy: { mainView: 1 } } } }) },
    binding: (sessionId) => ({ ctx: { get: (name) => (name === 'conversation' ? conversation : undefined) } }),
    using: async (sessionId, options, operation) => {
      usingCalls.push({ sessionId, options });
      return operation({
        binding: {
          ctx: {
            get: (name) => (name === 'conversation' ? conversation : undefined),
          },
        },
      });
    },
  },
  workspaces: {
    list: {
      getSnapshot: () => ({
        items: [
          { workspaceId: 'ws1', path: '/Users/me/proj', sessionIds: ['s1'], createdAt: '2026-01-01T00:00:00Z' },
          { workspaceId: 'ws2', path: '/Users/me/other', sessionIds: ['s9'], createdAt: '2025-01-01T00:00:00Z' },
        ],
      }),
    },
  },
  uiWorkspace: {
    connectWorkspace: (workspaceId) => {
      connectedWorkspaces.push(workspaceId);
      return Promise.resolve(connectSessionId);
    },
    openSession: (sessionId) => {
      openedSessions.push(sessionId);
    },
  },
};
const registrations = [];
const ctx = {
  slots: {
    inject: (slot, callback) => callback(),
    register: (options, component) => {
      registrations.push({ options, component });
      return () => {};
    },
  },
  effect: (install) => install(),
  get: (name) => services[name],
};
module.apply(ctx);

const footerComponent = registrations.find((entry) => entry.options.name === 'sidebar.footer.action');
const settingsComponent = registrations.find((entry) => entry.options.name === 'settings.section');
check('apply registers the single sidebar action and keeps the settings section', () => {
  assert.ok(footerComponent !== undefined, 'footer action registered');
  assert.ok(settingsComponent !== undefined, 'settings section registered');
  assert.equal(footerComponent.options.id, 'dsh-charlotte');
  assert.equal(footerComponent.options.order, 10);
  assert.equal(registrations.filter((entry) => entry.options.name === 'sidebar.footer.action').length, 1);
});
check('apply captured the client context for the invocation dialog', () => {
  const helperSource = testable.slice(testable.indexOf('function apply(ctx) {'));
  assert.ok(helperSource.includes('skPluginCtx = ctx;'), 'apply wires skPluginCtx');
});

const helpers = sandbox.__skTest;
const helperNames = ['skCopyOf', 'skScopeOf', 'skModelInvocable', 'skUserInvocable', 'skInvocationGroup', 'skEntriesOf', 'skCountGroups', 'skFilterEntries', 'skCurrentSessionId', 'skWorkspaceIdFor', 'skPrepareDraft', 'skLoadIntoCurrent', 'skLoadIntoNew', 'skFocusSession', 'skDraftPrompt', 'skCanLoad', 'skService', 'fetchSkillDetail', 'fetchRegistrySkill', 'RegistryDetailDialog', 'skProviderLabel', 'skProviderCategory', 'skT', 'skGetLang', 'skSetLang', 'StationApp', 'TargetSelector', 'SkillBrowse', 'SkillCard', 'SkillDetailDialog', 'MountedDetailDialog', 'InvokeDialog', 'MoreMenu', 'SkLangSwitch', 'SkStatus', 'fetchCatalog', 'fetchMountedSkill', 'setMountedSwitch', 'skMountedSkill', 'skSourceLabel'];
check('helpers captured for assertions', () => {
  for (const key of helperNames) assert.equal(typeof helpers[key], 'function', `${key} helper`);
});

// --- language switch ---------------------------------------------------------
check('initial language follows the shell locale', () => {
  assert.equal(helpers.skGetLang(), 'zh');
});

check('language switch changes the store and persists it', () => {
  helpers.skSetLang('en');
  assert.equal(helpers.skGetLang(), 'en');
  assert.equal(storage.get('dsh-charlotte:lang'), 'en');
  helpers.skSetLang('zh');
  assert.equal(helpers.skGetLang(), 'zh');
  assert.equal(storage.get('dsh-charlotte:lang'), 'zh');
});

check('dictionary carries both languages for every launcher key', () => {
  const keys = [
    'panel.title', 'panel.close', 'panel.install', 'panel.trash',
    'hero.subtitle', 'search.placeholder', 'search.count',
    'filter.label', 'filter.all', 'filter.both', 'filter.model', 'filter.user', 'filter.none',
    'cat.email', 'cat.coach', 'cat.learning', 'cat.dev', 'cat.general',
    'card.type', 'card.use', 'card.details', 'card.noDesc', 'card.userOnly', 'card.userDisabled', 'card.userOnlyHint',
    'noMatchGroup',
    'status.on', 'status.off', 'status.unavailable',
    'more.label', 'more.scope', 'more.install', 'more.trash', 'more.refresh', 'more.language',
    'ws.global', 'root.userDsh', 'root.userAgents', 'import.target', 'conflict.title',
    'dialog.title', 'dialog.desc', 'dialog.current', 'dialog.currentDesc', 'dialog.currentUnavailable',
    'dialog.new', 'dialog.newDesc', 'dialog.newUnavailable', 'dialog.hint', 'dialog.cancel', 'dialog.close', 'dialog.currentWorking', 'dialog.newWorking', 'dialog.error',
    'notice.loaded',
    'error.load', 'error.toggle', 'error.delete', 'error.detail', 'error.override',
    'error.invokeApi', 'error.invokeNoSession', 'error.invokeNoWorkspace', 'error.invokeNotUser', 'error.loadBlocked',
    'detail.modelOn', 'detail.modelOff', 'detail.userOn', 'detail.userOff', 'detail.dir', 'detail.single',
    'detail.official', 'detail.whenToUse', 'detail.installedAt', 'detail.reading', 'detail.files', 'detail.delete',
    'detail.provider', 'detail.registryHint',
    'chip.plugin',
    'detail.disable', 'detail.enable', 'detail.close', 'detail.source', 'detail.mountedAt', 'detail.switchHint',
    'scope.global', 'scope.shared', 'scope.project', 'chip.readonly',
    'confirm.delete', 'audience.student', 'audience.pro', 'audience.tag',
    'empty', 'noMatch', 'clearSearch',
  ];
  for (const key of keys) {
    const en = helpers.skT('en', key);
    const zh = helpers.skT('zh', key);
    assert.notEqual(en, key, `${key} missing in en`);
    assert.notEqual(zh, key, `${key} missing in zh`);
  }
  assert.equal(helpers.skT('zh', 'search.count', { n: 7 }), '7 个技能');
  assert.equal(helpers.skT('en', 'search.count', { n: 7 }), '7 skills');
  assert.equal(helpers.skT('zh', 'more.refresh'), '刷新');
  assert.equal(helpers.skT('en', 'more.refresh'), 'Refresh');
});

check('the retired import tab key is gone from the dictionary', () => {
  assert.equal(helpers.skT('en', 'tab.import'), 'tab.import');
  assert.equal(helpers.skT('zh', 'tab.import'), 'tab.import');
});

// --- copy --------------------------------------------------------------------
const SKILLS = {
  'agently-mail': 'email',
  grilling: 'coach',
  'grill-me': 'coach',
  'ha7ch-school': 'learning',
  ponytail: 'dev',
  'ponytail-review': 'dev',
  'ponytail-audit': 'dev',
  'ponytail-debt': 'dev',
  'ponytail-gain': 'dev',
  'ponytail-help': 'dev',
};
const enWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;
const zhChars = (text) => text.replace(/\s/g, '').length;

check('curated copy covers every installed skill in both languages', () => {
  for (const [name, category] of Object.entries(SKILLS)) {
    const en = helpers.skCopyOf({ name, meta: { description: 'x' } }, 'en');
    const zh = helpers.skCopyOf({ name, meta: { description: 'x' } }, 'zh');
    assert.equal(en.curated, true, `${name} curated`);
    assert.equal(en.category, category, `${name} category`);
    assert.ok(en.short.length > 0 && en.short.length < 120, `${name} en short`);
    assert.ok(zh.short.length > 0 && zh.short.length < 60, `${name} zh short`);
    assert.ok(enWords(en.student) >= 40 && enWords(en.student) <= 80, `${name} en student words ${enWords(en.student)}`);
    assert.ok(enWords(en.professional) >= 50 && enWords(en.professional) <= 100, `${name} en professional words ${enWords(en.professional)}`);
    assert.ok(zhChars(zh.student) >= 50 && zhChars(zh.student) <= 140, `${name} zh student chars ${zhChars(zh.student)}`);
    assert.ok(zhChars(zh.professional) >= 80 && zhChars(zh.professional) <= 220, `${name} zh professional chars ${zhChars(zh.professional)}`);
    assert.notEqual(en.student, zh.student, `${name} student should be translated`);
    assert.notEqual(en.professional, zh.professional, `${name} professional should be translated`);
  }
});

check('unknown skill falls back to the official description in both languages', () => {
  const skill = { name: 'mystery-skill', meta: { description: 'Does one specific thing.' } };
  const en = helpers.skCopyOf(skill, 'en');
  const zh = helpers.skCopyOf(skill, 'zh');
  assert.equal(en.curated, false);
  assert.equal(zh.category, 'general');
  assert.ok(en.student.startsWith('Official summary:'));
  assert.ok(zh.student.startsWith('官方说明：'));
  assert.ok(en.professional.includes('Does one specific thing.'));
  assert.equal(en.short, 'Does one specific thing.');
});

check('frontmatter passthrough wins over the curated map (string and {zh,en})', () => {
  const plain = helpers.skCopyOf({ name: 'ponytail', meta: { studentDescription: '自定义通俗', professionalDescription: '自定义专业', category: 'coach' } }, 'zh');
  assert.equal(plain.student, '自定义通俗');
  assert.equal(plain.professional, '自定义专业');
  assert.equal(plain.category, 'coach');
  const localized = helpers.skCopyOf({ name: 'ponytail', meta: { studentDescription: { zh: '中文说明', en: 'English note' } } }, 'en');
  assert.equal(localized.student, 'English note');
});

check('scope words and invocation policy follow the real data', () => {
  assert.equal(helpers.skScopeOf({ rootId: 'user-dsh' }, 'en'), 'Global');
  assert.equal(helpers.skScopeOf({ rootId: 'user-dsh' }, 'zh'), '全局');
  assert.equal(helpers.skScopeOf({ rootId: 'user-agents' }, 'zh'), '共享');
  assert.equal(helpers.skScopeOf({ rootId: 'project-dsh:/w' }, 'en'), 'Project');
  assert.equal(helpers.skModelInvocable({ meta: {} }), true);
  assert.equal(helpers.skUserInvocable({ meta: {} }), true);
  assert.equal(helpers.skUserInvocable({ meta: { userInvocable: false } }), false);
  assert.equal(helpers.skModelInvocable({ meta: { modelInvocable: false } }), false);
  assert.equal(helpers.skInvocationGroup({ meta: { modelInvocable: true, userInvocable: true } }), 'both');
  assert.equal(helpers.skInvocationGroup({ meta: { modelInvocable: true, userInvocable: false } }), 'model');
  assert.equal(helpers.skInvocationGroup({ meta: { modelInvocable: false, userInvocable: true } }), 'user');
  assert.equal(helpers.skInvocationGroup({ meta: { modelInvocable: false, userInvocable: false } }), 'none');
  assert.equal(helpers.skCanLoad({ meta: { modelInvocable: false, userInvocable: true } }), true);
  assert.equal(helpers.skCanLoad({ meta: { userInvocable: false } }), false);
});

// --- card list helpers -------------------------------------------------------
const nativeGroup = {
  rootId: 'user-dsh',
  label: 'Global · /Users/me/.dsh/skills',
  skills: [
    { name: 'ponytail', rootId: 'user-dsh', kind: 'directory', path: '/Users/me/.dsh/skills/ponytail', meta: { description: 'lazy dev', modelInvocable: true, userInvocable: true } },
    { name: 'grill-me', rootId: 'user-dsh', kind: 'directory', path: '/Users/me/.dsh/skills/grill-me', meta: { description: 'interview', modelInvocable: false, userInvocable: true } },
    { name: 'ghost', rootId: 'user-dsh', kind: 'directory', path: '/Users/me/.dsh/skills/ghost', meta: { description: 'neither', modelInvocable: false, userInvocable: false } },
  ],
};
const mountedRows = [
  { name: 'ponytail', description: 'mounted duplicate', invocation: { modelInvocable: true, userInvocable: true }, source: 'claude-code', provider: 'charlotte', path: '/Users/me/.claude/skills/ponytail/SKILL.md', metadata: {} },
  { name: 'mounted-only', description: 'external only', invocation: { modelInvocable: true, userInvocable: true }, source: 'codex', provider: 'charlotte', path: '/Users/me/.codex/skills/mounted-only/SKILL.md', metadata: {} },
];
const entries = helpers.skEntriesOf([nativeGroup], mountedRows, [{ id: 'claude', label: 'Claude Code' }, { id: 'codex', label: 'Codex CLI' }], 'en');
check('the card list merges both sources, dedupes names and sorts', () => {
  assert.deepEqual([...entries.map((entry) => entry.skill.name)], ['ghost', 'grill-me', 'mounted-only', 'ponytail']);
  assert.equal(entries.find((entry) => entry.skill.name === 'ponytail').mounted, false, 'native wins the name collision');
  assert.equal(entries.find((entry) => entry.skill.name === 'mounted-only').scopeLabel, 'Codex CLI');
  assert.equal(entries.find((entry) => entry.skill.name === 'grill-me').group, 'user');
});
check('group counts and group/query filters are correct', () => {
  const counts = helpers.skCountGroups(entries);
  assert.equal(counts.all, 4);
  assert.equal(counts.both, 2);
  assert.equal(counts.model, 0);
  assert.equal(counts.user, 1);
  assert.equal(counts.none, 1);
  const userOnly = helpers.skFilterEntries(entries, 'user', '');
  assert.deepEqual([...userOnly.map((entry) => entry.skill.name)], ['grill-me']);
  const searched = helpers.skFilterEntries(entries, 'all', 'lazy');
  assert.deepEqual([...searched.map((entry) => entry.skill.name)], ['ponytail']);
  assert.equal(helpers.skFilterEntries(entries, 'none', 'neither').length, 1);
  assert.equal(helpers.skFilterEntries(entries, 'all', 'no-such-skill').length, 0);
});

check('registry skills from plugin providers are added read-only and deduped', () => {
  const registryRows = [
    { name: 'plugin-only', description: 'A plugin supplied skill.', invocation: { modelInvocable: true, userInvocable: true }, source: 'bundled', provider: 'mattpocock-skills-zh', path: '/plugins/mattpocock/skills/plugin-only/SKILL.md' },
    { name: 'plugin-user-only', description: 'User-only plugin skill.', invocation: { modelInvocable: false, userInvocable: true }, source: 'bundled', provider: 'dsh-office', path: '/plugins/office/skills/plugin-user-only/SKILL.md' },
    { name: 'ponytail', description: 'duplicate native name', invocation: { modelInvocable: true, userInvocable: true }, source: 'bundled', provider: 'dsh-blender', path: '/plugins/blender/skills/ponytail/SKILL.md' },
  ];
  const merged = helpers.skEntriesOf([nativeGroup], mountedRows, [{ id: 'codex', label: 'Codex CLI' }], 'en', registryRows);
  const names = [...merged.map((entry) => entry.skill.name)];
  assert.ok(names.includes('plugin-only'), 'plugin-only registry skill is added');
  assert.ok(names.includes('plugin-user-only'), 'user-only registry skill is added');
  assert.equal(names.filter((name) => name === 'ponytail').length, 1, 'registry duplicate of a native skill is deduped');
  const plugin = merged.find((entry) => entry.skill.name === 'plugin-only');
  assert.equal(plugin.registry, true);
  assert.equal(plugin.readOnly, true);
  assert.equal(plugin.scopeLabel, 'Matt Pocock ZH');
  assert.equal(plugin.category.key, 'cat.dev');
  assert.equal(plugin.group, 'both');
  const userOnly = merged.find((entry) => entry.skill.name === 'plugin-user-only');
  assert.equal(userOnly.scopeLabel, 'Office');
  assert.equal(userOnly.group, 'user');
  assert.equal(helpers.skProviderLabel('unknown-plugin'), 'unknown-plugin');
  assert.equal(helpers.skProviderCategory('unknown-plugin'), 'general');
});

check('registry cards show provider, read-only and plugin chips', () => {
  const entry = helpers.skEntriesOf([], [], [], 'en', [{ name: 'plugin-only', description: 'A plugin supplied skill.', invocation: { modelInvocable: true, userInvocable: true }, source: 'bundled', provider: 'mattpocock-skills-zh', path: '/plugins/x/SKILL.md' }])[0];
  const json = JSON.stringify(helpers.SkillCard({ entry, lang: 'en', onUse() {}, onDetails() {} }));
  assert.ok(json.includes('Matt Pocock ZH'));
  assert.ok(json.includes('Read-only'));
  assert.ok(json.includes('Plugin'));
  assert.ok(json.includes('Use Skill'));
  const zhJson = JSON.stringify(helpers.SkillCard({ entry, lang: 'zh', onUse() {}, onDetails() {} }));
  assert.ok(zhJson.includes('只读'));
  assert.ok(zhJson.includes('插件'));
});

check('registry detail dialog is read-only and keeps the provider identity', () => {
  const entry = helpers.skEntriesOf([], [], [], 'en', [{ name: 'plugin-only', description: 'A plugin supplied skill.', whenToUse: 'When a plugin skill is needed.', invocation: { modelInvocable: true, userInvocable: true }, source: 'bundled', provider: 'mattpocock-skills-zh', path: '/plugins/x/SKILL.md' }])[0];
  const json = JSON.stringify(helpers.RegistryDetailDialog({ entry, lang: 'en', workspace: '', onClose() {} }));
  assert.ok(json.includes('Matt Pocock ZH'));
  assert.ok(json.includes('Read-only'));
  assert.ok(json.includes('Plugin'));
  assert.ok(json.includes('This Skill is supplied by a plugin and is read-only here'));
  assert.ok(!json.includes('Move to Recycle Bin'), 'registry skills cannot be deleted from the station');
  assert.ok(!json.includes('Disable'), 'registry skills cannot be disabled from the station');
});

await checkAsync('registry detail fetch targets the registry route', async () => {
  await helpers.fetchRegistrySkill('plugin-only', '/Users/me/proj');
  const url = requests.at(-1);
  assert.ok(url.startsWith('/charlotte/api/registry-skill?'), url);
  assert.ok(url.includes('name=plugin-only'), url);
  assert.ok(url.includes('workspace=%2FUsers%2Fme%2Fproj'), url);
});

await checkAsync('detail fetch targets the existing /skill route', async () => {
  const response = await helpers.fetchSkillDetail('project-dsh:/Users/me/proj', 'my skill', '/Users/me/proj');
  assert.equal(response.ok, true);
  const url = requests.at(-1);
  assert.ok(url.startsWith('/charlotte/api/skill?'), url);
  assert.ok(url.includes('root=project-dsh%3A%2FUsers%2Fme%2Fproj'), url);
  assert.ok(url.includes('name=my%20skill'), url);
  assert.ok(url.includes('workspace=%2FUsers%2Fme%2Fproj'), url);
});

// --- card rendering ----------------------------------------------------------
const cardFor = (name, lang, extra) => {
  const skill = Object.assign({ name, rootId: 'user-dsh', kind: 'directory', path: `/Users/me/.dsh/skills/${name}`, meta: { description: 'x', modelInvocable: true, userInvocable: true } }, extra === undefined ? {} : extra);
  return { skill, copy: helpers.skCopyOf(skill, lang), scopeLabel: helpers.skScopeOf({ rootId: 'user-dsh' }, lang), lang, busy: false, onUse: () => {}, onDetails: () => {} };
};

check('card renders the launcher fields in both languages', () => {
  const en = cardFor('ponytail', 'en');
  en.entry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [en.skill] }], [], [], 'en')[0];
  const enJson = JSON.stringify(helpers.SkillCard({ entry: en.entry, lang: 'en', onUse() {}, onDetails() {} }));
  assert.ok(enJson.includes('Agent Skill · Developer Tools'));
  assert.ok(enJson.includes('Enabled'));
  assert.ok(enJson.includes('Use Skill'));
  assert.ok(enJson.includes('Details'));
  assert.ok(enJson.includes(en.entry.copy.short));
  assert.ok(!enJson.includes('For High School Students'), 'card must not carry the long audience block');
  assert.ok(!enJson.includes('sk_switch'), 'the enable switch lives in Details');
  const zh = cardFor('ponytail', 'zh');
  zh.entry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [zh.skill] }], [], [], 'zh')[0];
  const zhJson = JSON.stringify(helpers.SkillCard({ entry: zh.entry, lang: 'zh', onUse() {}, onDetails() {} }));
  assert.ok(zhJson.includes('Agent Skill · 开发者工具'));
  assert.ok(zhJson.includes('已启用'));
  assert.ok(zhJson.includes('使用技能'));
  assert.ok(zhJson.includes('详情'));
  assert.ok(zhJson.includes(zh.entry.copy.short));
});

check('user-only and unavailable skills stay honest on the card', () => {
  const userOnlyEntry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [cardFor('grill-me', 'en', { meta: { description: 'x', modelInvocable: false, userInvocable: true } }).skill] }], [], [], 'en')[0];
  const userOnly = JSON.stringify(helpers.SkillCard({ entry: userOnlyEntry, lang: 'en', onUse() {}, onDetails() {} }));
  assert.ok(userOnly.includes('Disabled'), 'model-disabled skill shows Disabled');
  assert.ok(userOnly.includes('User-only'), 'model-disabled skill is still user-invocable');
  assert.ok(userOnly.includes('"disabled":false'), 'Use Skill stays available');
  const unavailableEntry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [cardFor('ghost', 'en', { meta: { description: 'x', userInvocable: false } }).skill] }], [], [], 'en')[0];
  const unavailable = JSON.stringify(helpers.SkillCard({ entry: unavailableEntry, lang: 'en', onUse() {}, onDetails() {} }));
  assert.ok(unavailable.includes('Unavailable'));
  assert.ok(unavailable.includes('"disabled":true'), 'Use Skill is disabled for a non-user-invocable skill');
});

check('mounted cards carry the source and read-only chips', () => {
  const mounted = helpers.skEntriesOf([], [mountedRows[1]], [{ id: 'codex', label: 'Codex CLI' }], 'zh')[0];
  const json = JSON.stringify(helpers.SkillCard({ entry: mounted, lang: 'zh', onUse() {}, onDetails() {} }));
  assert.ok(json.includes('Codex CLI'));
  assert.ok(json.includes('只读'));
  assert.ok(json.includes('sk_chipSource'));
});

// --- loading dialog ----------------------------------------------------------
check('the loading dialog offers two destinations and explains that nothing runs', () => {
  services.conversation = conversation;
  services.uiSession = { current: { getSnapshot: () => ({ key: 's1' }) } };
  services.sessions = {
    list: { getSnapshot: () => ({ byId: { s1: { updatedAt: 10, retainedBy: { mainView: 1 } } } }) },
    using: async (sessionId, options, operation) => operation({ binding: { ctx: { get: (name) => (name === 'conversation' ? conversation : undefined) } } }),
  };
  services.uiWorkspace = { connectWorkspace: () => Promise.resolve('s2'), openSession() {} };
  services.workspaces = { list: { getSnapshot: () => ({ items: [{ workspaceId: 'ws1', path: '/Users/me/proj', sessionIds: ['s1'] }] }) } };
  const entry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [cardFor('ponytail', 'en').skill] }], [], [], 'en')[0];
  const json = JSON.stringify(helpers.InvokeDialog({ entry, lang: 'en', workspace: '', onClose() {}, onInvoked() {} }));
  assert.ok(json.includes('Load this Skill into a conversation?'));
  assert.ok(json.includes('Choose where to stage it. Nothing runs until you type your message.'));
  assert.ok(json.includes('Load into Current Conversation'));
  assert.ok(json.includes('Load into New Conversation'));
  assert.ok(json.includes('The Skill is staged as /skill-name in the input; it activates when you send your first message.'));
  assert.ok(json.includes('Cancel'));
  assert.ok(!json.includes('Use in Current Conversation'));
  assert.ok(!json.includes('Start a New Conversation'));
  assert.ok((json.match(/sk_invokeOption/g) || []).length >= 2);
});

check('without an active conversation the current option is disabled and explained', () => {
  services.uiSession = { current: { getSnapshot: () => ({ key: '' }) } };
  services.sessions = { list: { getSnapshot: () => ({ byId: {} }) } };
  const entry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [cardFor('ponytail', 'en').skill] }], [], [], 'en')[0];
  const json = JSON.stringify(helpers.InvokeDialog({ entry, lang: 'en', workspace: '', onClose() {}, onInvoked() {} }));
  assert.ok(json.includes('No active conversation right now. Load into a new conversation instead.'));
  assert.ok(json.includes('"disabled":true'), 'current option disabled');
});

check('without Workspace services the new-conversation option is disabled and explained', () => {
  const savedUiWorkspace = services.uiWorkspace;
  services.uiSession = { current: { getSnapshot: () => ({ key: 's1' }) } };
  services.sessions = { using: () => Promise.resolve(), list: { getSnapshot: () => ({ byId: {} }) } };
  services.uiWorkspace = undefined;
  const entry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [cardFor('ponytail', 'en').skill] }], [], [], 'en')[0];
  const json = JSON.stringify(helpers.InvokeDialog({ entry, lang: 'en', workspace: '', onClose() {}, onInvoked() {} }));
  assert.ok(json.includes('Starting a new conversation is not available in this build.'));
  assert.ok(json.includes('"disabled":true'));
  services.uiWorkspace = savedUiWorkspace;
});

check('a non-user-invocable skill cannot be offered by the dialog', () => {
  services.uiSession = { current: { getSnapshot: () => ({ key: 's1' }) } };
  const entry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [cardFor('ghost', 'en', { meta: { description: 'x', userInvocable: false } }).skill] }], [], [], 'en')[0];
  const json = JSON.stringify(helpers.InvokeDialog({ entry, lang: 'en', workspace: '', onClose() {}, onInvoked() {} }));
  assert.ok(json.includes('This Skill is not available for user invocation.'));
});

// --- non-executing load helpers ----------------------------------------------
const resetServices = () => {
  draftCalls.length = 0;
  focusCount = 0;
  sent.length = 0;
  submitted.length = 0;
  draftOutcome = 'applied';
  usingCalls.length = 0;
  connectedWorkspaces.length = 0;
  openedSessions.length = 0;
  services.conversation = conversation;
  services.uiSession = { current: { getSnapshot: () => ({ key: 's1' }) } };
  services.sessions = {
    list: { getSnapshot: () => ({ byId: { s1: { updatedAt: 10, retainedBy: { mainView: 1 } } } }) },
    binding: (sessionId) => ({ ctx: { get: (name) => (name === 'conversation' ? conversation : undefined) } }),
    using: async (sessionId, options, operation) => {
      usingCalls.push({ sessionId, options });
      return operation({
        binding: {
          ctx: {
            get: (name) => (name === 'conversation' ? conversation : undefined),
          },
        },
      });
    },
  };
  services.workspaces = {
    list: {
      getSnapshot: () => ({
        items: [
          { workspaceId: 'ws1', path: '/Users/me/proj', sessionIds: ['s1'], createdAt: '2026-01-01T00:00:00Z' },
          { workspaceId: 'ws2', path: '/Users/me/other', sessionIds: ['s9'], createdAt: '2025-01-01T00:00:00Z' },
        ],
      }),
    },
  };
  services.uiWorkspace = {
    connectWorkspace: (workspaceId) => {
      connectedWorkspaces.push(workspaceId);
      return Promise.resolve(connectSessionId);
    },
    openSession: (sessionId) => {
      openedSessions.push(sessionId);
    },
  };
};
resetServices();

check('the staged prompt is the official /name token', () => {
  assert.equal(helpers.skDraftPrompt('ponytail'), '/ponytail ');
});

await checkAsync('loading into the current conversation stages the Skill and submits nothing', async () => {
  assert.equal(helpers.skCurrentSessionId(), 's1');
  const sessionId = await helpers.skLoadIntoCurrent('ponytail');
  assert.equal(sessionId, 's1');
  assert.equal(draftCalls.length, 1);
  assert.deepEqual({ ...draftCalls[0].options }, { prompt: '/ponytail ', whenDraftExists: 'append' });
  assert.equal(draftCalls[0].binding !== undefined, true, 'the staged draft targets a retained binding');
  assert.equal(usingCalls.length, 1);
  assert.equal(usingCalls[0].sessionId, 's1');
  assert.equal(usingCalls[0].options.source, 'charlotte');
  assert.deepEqual([...sent], [], 'no message is sent');
  assert.deepEqual([...submitted], [], 'the composer is never submitted');
  assert.deepEqual([...connectedWorkspaces], [], 'the current conversation is preserved');
  assert.deepEqual([...openedSessions], [], 'no navigation happens for the current conversation');
});

await checkAsync('loading into a new conversation opens a blank and stages the Skill without sending', async () => {
  resetServices();
  const sessionId = await helpers.skLoadIntoNew('agently-mail', '');
  assert.equal(sessionId, 's2');
  assert.deepEqual([...connectedWorkspaces], ['ws1']);
  assert.deepEqual([...openedSessions], ['s2']);
  assert.equal(draftCalls.length, 1);
  assert.deepEqual({ ...draftCalls[0].options }, { prompt: '/agently-mail ', whenDraftExists: 'append' });
  assert.equal(usingCalls[0].sessionId, 's2');
  assert.deepEqual([...sent], [], 'no message is sent');
  assert.deepEqual([...submitted], [], 'the composer is never submitted');
});

await checkAsync('a busy composer fails the load instead of submitting', async () => {
  helpers.skSetLang('en');
  resetServices();
  draftOutcome = 'blocked';
  await assert.rejects(() => helpers.skLoadIntoCurrent('ponytail'), /composer is busy/);
  assert.deepEqual([...sent], []);
  assert.deepEqual([...submitted], []);
});

await checkAsync('missing services fail clearly instead of pretending', async () => {
  helpers.skSetLang('en');
  resetServices();
  services.uiSession = { current: { getSnapshot: () => ({ key: '' }) } };
  services.sessions = { list: { getSnapshot: () => ({ byId: {} }) } };
  assert.equal(helpers.skCurrentSessionId(), '');
  await assert.rejects(() => helpers.skLoadIntoCurrent('ponytail'), /No active conversation/);
  resetServices();
  const savedInput = conversation.input;
  conversation.input = undefined;
  await assert.rejects(() => helpers.skLoadIntoCurrent('ponytail'), /does not expose the composer API/);
  conversation.input = savedInput;
  services.uiWorkspace = undefined;
  await assert.rejects(() => helpers.skLoadIntoNew('ponytail', ''), /does not expose the composer API/);
  assert.deepEqual([...sent], []);
  assert.deepEqual([...submitted], []);
  resetServices();
});

check('focus returns to the conversation composer after the launcher closes', () => {
  resetServices();
  helpers.skFocusSession('s1');
  assert.ok(focusCount > 0);
  helpers.skFocusSession('s2');
  assert.ok(focusCount > 1);
});

check('loading a non-user-invocable skill is refused before any staging', () => {
  assert.equal(helpers.skCanLoad({ name: 'ghost', meta: { userInvocable: false } }), false);
});

// --- details dialogs ---------------------------------------------------------
check('detail dialog keeps the management actions and localizes', () => {
  const entry = helpers.skEntriesOf([{ rootId: 'user-dsh', skills: [cardFor('agently-mail', 'zh').skill] }], [], [], 'zh')[0];
  for (const lang of ['en', 'zh']) {
    const json = JSON.stringify(helpers.SkillDetailDialog({ entry, lang, workspace: '', busy: false, onClose() {}, onToggle() {}, onDelete() {} }));
    assert.ok(json.includes('sk_modal'));
    assert.ok(json.includes(helpers.skT(lang, 'detail.delete')));
    assert.ok(json.includes(helpers.skT(lang, 'detail.reading')));
    assert.ok(json.includes(helpers.skT(lang, 'detail.close')));
    assert.ok(json.includes(helpers.skT(lang, 'audience.student')));
  }
});

check('mounted detail dialog is read-only and localized', () => {
  const entry = helpers.skEntriesOf([], mountedRows, [{ id: 'claude', label: 'Claude Code' }], 'zh')[0];
  for (const lang of ['en', 'zh']) {
    const json = JSON.stringify(helpers.MountedDetailDialog({ entry, sourceLabel: 'Claude Code', lang, workspace: '', busy: false, onClose() {}, onToggle() {} }));
    assert.ok(json.includes('sk_modal'));
    assert.ok(json.includes('Claude Code'));
    assert.ok(json.includes(helpers.skT(lang, 'detail.source')));
    assert.ok(json.includes(helpers.skT(lang, 'detail.reading')));
    assert.ok(json.includes(helpers.skT(lang, 'detail.switchHint')));
    assert.ok(!json.includes(helpers.skT(lang, 'detail.delete')), `${lang} mounted dialog must not offer delete`);
  }
});

// --- station shell and browse ------------------------------------------------
check('station hero is title + subtitle + More, with no version or tab bar', () => {
  helpers.skSetLang('zh');
  const zh = JSON.stringify(helpers.StationApp({}));
  assert.ok(zh.includes('"sk_hero"'));
  assert.ok(zh.includes('dsh-charlotte'));
  assert.ok(zh.includes('找到技能，再选择在哪里使用。'));
  assert.ok(zh.includes('"sk_heroActions"'));
  assert.ok(!zh.includes('0.5.0'), 'no version chrome');
  assert.ok(!zh.includes('"sk_tab"'));
  assert.ok(!zh.includes('回收站'), 'the recycle bin moved into More');
  helpers.skSetLang('en');
  const en = JSON.stringify(helpers.StationApp({}));
  assert.ok(en.includes('dsh-charlotte'));
  assert.ok(en.includes('Find a Skill and choose where to use it.'));
  assert.ok(en.includes('"sk_heroActions"'));
});

check('browse surface renders search, filters and skeleton before data arrives', () => {
  helpers.skSetLang('en');
  const json = JSON.stringify(helpers.SkillBrowse({ workspace: '', reloadToken: 0, onNotice() {}, onRequestClose() {} }));
  assert.ok(json.includes('"sk_toolbar"'));
  assert.ok(json.includes('Search skills by name, description, or purpose'));
  assert.ok(json.includes('"sk_filters"'));
  assert.ok(json.includes('"sk_filter"'));
  assert.ok(json.includes('All'));
  assert.ok(json.includes('"sk_skeleton"'));
});

check('footer button is the single entry and localizes', () => {
  for (const lang of ['en', 'zh']) {
    helpers.skSetLang(lang);
    const json = JSON.stringify(footerComponent.component({ wide: true }));
    assert.ok(json.includes(helpers.skT(lang, 'panel.title')), `${lang} footer title`);
    assert.ok(!json.includes('dsh-charlotte 0.'), `${lang} footer has no version`);
  }
});

check('settings section stays available and renders the same station', () => {
  const json = JSON.stringify(settingsComponent.component({}));
  assert.ok(json.includes('"minHeight":480'));
  assert.ok(json.includes('"children"'));
});

check('the More menu lists the administrative actions and the scope picker', () => {
  // The closed menu only renders its trigger; labels and wiring are asserted on
  // the built source and dictionary so a regression cannot hide a control.
  const moreSource = testable.slice(testable.indexOf('function MoreMenu('), testable.indexOf('function StationPanelDialog('));
  assert.ok(moreSource.includes('more.scope'));
  assert.ok(moreSource.includes('more.install'));
  assert.ok(moreSource.includes('more.trash'));
  assert.ok(moreSource.includes('more.refresh'));
  assert.ok(moreSource.includes('more.language'));
  assert.ok(moreSource.includes('SkLangSwitch'));
  const trigger = JSON.stringify(helpers.MoreMenu({ lang: 'en', workspace: '', workspaces: [{ path: '/w', title: 'w' }], refreshing: false, onWorkspace() {}, onPanel() {}, onRefresh() {} }));
  assert.ok(trigger.includes('"sk_moreBtn"'));
  assert.ok(trigger.includes('"aria-expanded":"false"'));
});

await checkAsync('catalog helpers target the merged routes', async () => {
  await helpers.fetchCatalog('/Users/me/proj');
  assert.ok(requests.at(-1).startsWith('/charlotte/api/catalog?workspace=%2FUsers%2Fme%2Fproj'), requests.at(-1));
  await helpers.fetchMountedSkill('/Users/me/.claude/skills/ponytail/SKILL.md', '');
  assert.ok(requests.at(-1).includes('/charlotte/api/catalog-skill?path=%2FUsers%2Fme%2F.claude%2Fskills%2Fponytail%2FSKILL.md'), requests.at(-1));
  await helpers.setMountedSwitch({ path: '/Users/me/.claude/skills/ponytail/SKILL.md', disabled: true });
  const lastCall = requestCalls.at(-1);
  assert.ok(lastCall.url.startsWith('/charlotte/api/override'), lastCall.url);
  assert.equal(lastCall.options.method, 'POST');
  assert.equal(JSON.parse(lastCall.options.body).disabled, true);
});

check('source labels resolve from the catalog source list', () => {
  const sources = [{ id: 'claude', label: 'Claude Code' }, { id: 'codex', label: 'Codex CLI' }];
  assert.equal(helpers.skSourceLabel(sources, 'claude-code'), 'Claude Code');
  assert.equal(helpers.skSourceLabel(sources, 'codex'), 'Codex CLI');
  assert.equal(helpers.skSourceLabel(sources, 'custom'), 'custom');
});

// --- css and untouched code --------------------------------------------------
const cssStart = bundle.indexOf('var css = `');
const cssEnd = bundle.indexOf('\n`;', cssStart);
const css = bundle.slice(cssStart, cssEnd);

check('every sk_* class used by the UI has a CSS rule', () => {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, 'CSS braces are balanced');
  const used = new Set();
  for (const match of testable.matchAll(/"sk_[A-Za-z_]+"/g)) used.add(match[0].slice(1, -1));
  for (const match of testable.matchAll(/" sk_[A-Za-z_]+"/g)) used.add(match[0].slice(2, -1));
  for (const match of testable.matchAll(/sk_modalBox sk_[A-Za-z_]+/g)) {
    used.add(match[0].split(' ')[1]);
  }
  const styled = new Set([...css.matchAll(/\.(sk_[A-Za-z_]+)/g)].map((match) => match[1]));
  const missing = [...used].filter((name) => !styled.has(name));
  assert.deepEqual(missing, [], `classes without a rule: ${missing.join(', ')}`);
});

check('grid CSS defines three, two and one column layouts', () => {
  assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), 'three-column desktop grid');
  assert.ok(/@media \(max-width:1040px\)[\s\S]*repeat\(2,minmax\(0,1fr\)\)/.test(css), 'two-column tablet grid');
  assert.ok(/@media \(max-width:680px\)[\s\S]*grid-template-columns:minmax\(0,1fr\)/.test(css), 'one-column mobile grid');
});

check('focus-visible states are defined for interactive controls', () => {
  assert.ok(css.includes(':focus-visible'), 'visible focus styles');
  for (const selector of ['.sk_useBtn:focus-visible', '.sk_invokeOption:focus-visible', '.sk_filter:focus-visible']) {
    assert.ok(css.includes(selector), selector);
  }
});

check('bundle drops the old chrome and keeps the management views', () => {
  for (const anchor of ['function InstallTab(props) {', 'function TrashTab(', 'fetchTrash', 'restoreTrash', 'emptyTrash', 'function StationPanelDialog(', 'function MoreMenu(', 'function InvokeDialog(']) {
    assert.ok(bundle.includes(anchor), `missing ${anchor}`);
  }
  for (const retired of ['function ImportTab(props) {', 'call("/scan"', 'call("/import"', 'ss_version', 'dsh-charlotte 0.']) {
    assert.ok(!bundle.includes(retired), `retired code still present: ${retired}`);
  }
});

check('the loader stages a draft and never sends, submits, or starts a turn', () => {
  const prepareSource = testable.slice(testable.indexOf('function skPrepareDraft('), testable.indexOf('function skFocusSession('));
  assert.ok(prepareSource.includes('requestDraftInitialization'));
  assert.ok(prepareSource.includes('whenDraftExists: "append"'));
  assert.ok(!prepareSource.includes('conversation.send'));
  const dialogSource = testable.slice(testable.indexOf('function InvokeDialog('), testable.indexOf('function MoreMenu('));
  assert.ok(dialogSource.includes('skLoadIntoCurrent'));
  assert.ok(dialogSource.includes('skLoadIntoNew'));
  for (const forbidden of ['conversation.send', 'skSendToSession', 'skInvokeInCurrent', 'skInvokeInNew', 'input.submit']) {
    assert.ok(!bundle.includes(forbidden), `execution path still present: ${forbidden}`);
  }
  assert.ok(bundle.includes('requestDraftInitialization'), 'draft staging is shipped');
});

console.log(`\n${results.length} smoke checks passed`);
