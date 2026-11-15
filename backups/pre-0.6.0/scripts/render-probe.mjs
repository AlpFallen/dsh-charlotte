/**
 * Real-React render probe (optional, needs React installed locally).
 *
 * The hermetic `smoke.mjs` uses a fake JSX runtime, which cannot catch React's
 * development-only argument checks (e.g. `jsx(type, null, children)` throws
 * because React calls `hasOwnProperty` on the config object). This probe loads
 * the built bundle with the real react / react-dom / react/jsx-runtime and
 * server-renders every launcher component, failing on the same errors the
 * browser would throw.
 *
 *   npm i --no-save react@18.3.1 react-dom@18.3.1
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
  },
  document: {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
    head: { appendChild() {} },
  },
  fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
};
sandbox.globalThis = sandbox;
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
const injectable = bundle.replace(
  '    return module.exports;',
  '    globalThis.__t = { StationApp: StationApp, SkillBrowse: SkillBrowse, SkillCard: SkillCard, SkillDetailDialog: SkillDetailDialog, MountedDetailDialog: MountedDetailDialog, RegistryDetailDialog: RegistryDetailDialog, InvokeDialog: InvokeDialog, MoreMenu: MoreMenu, SkLangSwitch: SkLangSwitch, SkStatus: SkStatus, TargetSelector: TargetSelector, StationPanelDialog: StationPanelDialog, skCopyOf: skCopyOf, skScopeOf: skScopeOf, skEntriesOf: skEntriesOf, skMountedSkill: skMountedSkill };\n    return module.exports;',
);
vm.runInContext(injectable, sandbox, { filename: 'client.js' });

const mod = sandbox.__entry.factory(sandbox.require);
const registrations = [];
mod.apply({
  slots: {
    inject: (slot, cb) => cb(),
    register: (options, component) => {
      registrations.push({ options, component });
      return () => {};
    },
  },
  effect: (install) => install(),
  get: () => undefined,
});

const footer = registrations.find((r) => r.options.name === 'sidebar.footer.action').component;
const settings = registrations.find((r) => r.options.name === 'settings.section').component;

const t = sandbox.__t;
const nativeSkill = { name: 'ponytail', rootId: 'user-dsh', kind: 'directory', path: '/Users/me/.dsh/skills/ponytail', meta: { description: 'lazy dev', modelInvocable: true, userInvocable: true } };
const entries = t.skEntriesOf([{ rootId: 'user-dsh', label: 'Global', skills: [nativeSkill, { name: 'grill-me', rootId: 'user-dsh', kind: 'directory', path: '/Users/me/.dsh/skills/grill-me', meta: { description: 'interview', modelInvocable: false, userInvocable: true } }] }], [], [], 'zh');
const entry = entries.find((row) => row.skill.name === 'ponytail');
const userOnlyEntry = entries.find((row) => row.skill.name === 'grill-me');
const mountedSkill = t.skMountedSkill({ name: 'mounted-only', description: 'mounted', invocation: { modelInvocable: true, userInvocable: true }, source: 'claude-code', provider: 'charlotte', path: '/Users/me/.claude/skills/mounted-only/SKILL.md', directory: '/Users/me/.claude/skills/mounted-only', metadata: {} });
const mountedEntry = t.skEntriesOf([], [{ name: 'mounted-only', description: 'mounted', invocation: { modelInvocable: true, userInvocable: true }, source: 'claude-code', provider: 'charlotte', path: '/Users/me/.claude/skills/mounted-only/SKILL.md', metadata: {} }], [{ id: 'claude', label: 'Claude Code' }], 'en')[0];
const registryEntry = t.skEntriesOf([], [], [], 'en', [{ name: 'plugin-only', description: 'A plugin skill.', whenToUse: 'When needed.', invocation: { modelInvocable: true, userInvocable: true }, source: 'bundled', provider: 'mattpocock-skills-zh', path: '/plugins/x/SKILL.md' }])[0];

const cardProps = { entry, lang: 'zh', onUse() {}, onDetails() {} };
const userOnlyCardProps = { entry: userOnlyEntry, lang: 'zh', onUse() {}, onDetails() {} };
const mountedCardProps = { entry: mountedEntry, lang: 'en', onUse() {}, onDetails() {} };
const dialogProps = { entry, lang: 'zh', workspace: '', onClose() {}, onInvoked() {} };

for (const [label, element] of [
  ['footer wide', React.createElement(footer, { wide: true })],
  ['footer rail', React.createElement(footer, { wide: false })],
  ['settings section', React.createElement(settings)],
  ['station app', React.createElement(t.StationApp, {})],
  ['station app with close', React.createElement(t.StationApp, { onRequestClose() {} })],
  ['skill browse', React.createElement(t.SkillBrowse, { workspace: '', reloadToken: 0, onNotice() {}, onRequestClose() {} })],
  ['skill card', React.createElement(t.SkillCard, cardProps)],
  ['user-only card', React.createElement(t.SkillCard, userOnlyCardProps)],
  ['mounted card', React.createElement(t.SkillCard, mountedCardProps)],
  ['detail dialog', React.createElement(t.SkillDetailDialog, Object.assign({}, cardProps, { workspace: '', busy: false, onClose() {}, onToggle() {}, onDelete() {} }))],
  ['mounted dialog', React.createElement(t.MountedDetailDialog, Object.assign({}, mountedCardProps, { sourceLabel: 'Claude Code', workspace: '', busy: false, onClose() {}, onToggle() {} }))],
  ['registry dialog', React.createElement(t.RegistryDetailDialog, { entry: registryEntry, lang: 'en', workspace: '', onClose() {} })],
  ['invoke dialog', React.createElement(t.InvokeDialog, dialogProps)],
  ['more menu', React.createElement(t.MoreMenu, { lang: 'zh', workspace: '', workspaces: [{ path: '/w', title: 'w' }], refreshing: false, onWorkspace() {}, onPanel() {}, onRefresh() {} })],
  ['install panel', React.createElement(t.StationPanelDialog, { panel: 'install', lang: 'zh', workspace: '', onClose() {} })],
  ['trash panel', React.createElement(t.StationPanelDialog, { panel: 'trash', lang: 'zh', workspace: '', onClose() {} })],
  ['target selector', React.createElement(t.TargetSelector, { workspace: '', targetRoot: 'user-dsh', conflict: 'skip', onTarget() {}, onConflict() {} })],
  ['lang switch', React.createElement(t.SkLangSwitch, { lang: 'en' })],
  ['status', React.createElement(t.SkStatus, { skill: nativeSkill, lang: 'zh' })],
]) {
  try {
    const html = renderToString(element);
    console.log(`OK   ${label}: ${html.length} chars`);
  } catch (error) {
    console.log(`FAIL ${label}: ${error && error.message}`);
    console.log(error && error.stack ? error.stack.split('\n').slice(0, 8).join('\n') : '');
  }
}
