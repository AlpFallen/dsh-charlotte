/**
 * Build the dsh-charlotte client bundle.
 *
 * Input  : `client/client.baseline.js` — the checked-in compiled bundle for the
 *          skill panel, already renamed to this package's id and API prefix.
 *          This checkout has no TypeScript sources for that baseline.
 *
 * Slices : `revamp/station-ui.js` replaces StationApp + TargetSelector + LibraryTab
 *          and adds the launcher surface (card grid, invocation dialog, More
 *          menu, skill-group filters), `revamp/footer.js` replaces
 *          StationFooterButton (single sidebar entry, no drawer title bar),
 *          `revamp/market.css` is appended to the bundle's CSS string. The
 *          retired copy-import tab (ImportTab) and its `/scan` + `/import`
 *          helpers are cut out of the bundle.
 * Wiring : `apply(ctx)` stores the plugin context in `skPluginCtx` so the
 *          invocation dialog can reach the real conversation services
 *          (`sessions`, `uiSession`, `uiWorkspace`, `workspaces`) via `ctx.get`.
 * Output : `client/client.js`, served to the page as-is.
 *
 * Deterministic and idempotent: always rebuilds from the checked-in baseline.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (relative) => readFile(join(root, relative), 'utf8');

const baseline = await read('client/client.baseline.js');
const stationUi = await read('revamp/station-ui.js');
const footer = await read('revamp/footer.js');
const marketCss = await read('revamp/market.css');

/**
 * Replace one anchored region with a fragment.
 * @param {string} source - bundle text.
 * @param {string} startAnchor - first line of the region.
 * @param {string} endAnchor - first line after the region.
 * @param {string} fragment - replacement text.
 * @param {string} label - anchor label for errors.
 * @returns {string} patched bundle.
 */
function splice(source, startAnchor, endAnchor, fragment, label) {
  const start = source.indexOf(startAnchor);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`build-client: ${label} anchors not found; refusing to patch`);
  }
  return source.slice(0, start) + fragment + '\n' + source.slice(end);
}

let bundle = splice(
  baseline,
  'function StationApp(props) {',
  'function ImportTab(props) {',
  stationUi,
  'StationApp/TargetSelector/LibraryTab',
);
// Importing was replaced by read-only mounting, so the import tab and its two
// client helpers are removed instead of shipped as dead code.
bundle = splice(
  bundle,
  'function ImportTab(props) {',
  'function InstallTab(props) {',
  '',
  'ImportTab removal',
);
for (const helperLine of [
  'var scanSources = (workspace) => call("/scan", { method: "POST", body: { ...workspace !== "" ? { workspace } : {} } });\n',
  'var importSkills = (body) => call("/import", { method: "POST", body });\n',
]) {
  if (!bundle.includes(helperLine)) {
    throw new Error(`build-client: retired helper not found: ${helperLine.trim()}`);
  }
  bundle = bundle.replace(helperLine, '');
}

bundle = splice(
  bundle,
  'function StationFooterButton(props) {',
  'function StationSettingsSection(',
  footer,
  'StationFooterButton',
);

// The settings section is part of the launcher surface: label it with the
// product identity instead of the baseline's Chinese title.
const settingsLabel = 'label: "\\u6280\\u80FD\\u7AD9"';
if (!bundle.includes(settingsLabel)) {
  throw new Error('build-client: settings section label anchor not found; refusing to patch');
}
bundle = bundle.replace(settingsLabel, 'label: "dsh-charlotte"');

// The launcher dialog needs the client context to reach the real conversation
// services. One deterministic insertion at the single apply().
const applyAnchor = 'function apply(ctx) {';
if (bundle.indexOf(applyAnchor) !== bundle.lastIndexOf(applyAnchor)) {
  throw new Error('build-client: apply(ctx) anchor is not unique; refusing to patch');
}
bundle = bundle.replace(applyAnchor, 'function apply(ctx) {\n  skPluginCtx = ctx;');

const cssStart = bundle.indexOf('var css = `');
const cssEnd = cssStart < 0 ? -1 : bundle.indexOf('\n`;', cssStart);
if (cssStart < 0 || cssEnd < 0 || cssEnd <= cssStart) {
  throw new Error('build-client: bundle CSS string not found; refusing to patch');
}
bundle = bundle.slice(0, cssEnd) + '\n' + marketCss + bundle.slice(cssEnd);

// The version row is gone from the drawer; drop its now-unused rule from the
// bundle CSS string so no version chrome ships at all.
const versionRule = '.ss_version{font-size:11px;color:var(--dsw-alias-label-tertiary)}';
if (bundle.includes(versionRule)) bundle = bundle.replace('\n' + versionRule, '');

for (const anchor of [
  'function StationSettingsSection(',
  'function StationIcon(props) {',
  'function apply(ctx) {',
  'var skPluginCtx = null;',
  'function SkillBrowse(',
  'function InvokeDialog(',
  'function RegistryDetailDialog(',
  'function fetchRegistrySkill(',
  'function skPrepareDraft(',
  'function skLoadIntoCurrent(',
  'function skLoadIntoNew(',
  'function skFocusSession(',
  'function MoreMenu(',
  'function MountedDetailDialog(props) {',
  'var fetchCatalog =',
  'function InstallTab(props) {',
  'function TrashTab(',
]) {
  if (!bundle.includes(anchor)) throw new Error(`build-client: patched bundle lost anchor ${anchor}`);
}
if (!bundle.includes('function apply(ctx) {\n  skPluginCtx = ctx;')) {
  throw new Error('build-client: skPluginCtx wiring missing');
}
for (const retired of ['function ImportTab(props) {', 'call("/scan"', 'call("/import"']) {
  if (bundle.includes(retired)) throw new Error(`build-client: retired code still present: ${retired}`);
}
// Loading must never submit: the launcher only stages the /name token in the
// composer. Keep auto-send code out of the shipped bundle.
for (const forbidden of ['conversation.send', 'skSendToSession', 'skInvokeInCurrent', 'skInvokeInNew', 'input.submit']) {
  if (bundle.includes(forbidden)) throw new Error(`build-client: execution path still present: ${forbidden}`);
}
if (!bundle.includes('requestDraftInitialization')) throw new Error('build-client: composer draft staging missing');
for (const identity of ['id: "dsh-charlotte"', '/charlotte/api']) {
  if (!bundle.includes(identity)) throw new Error(`build-client: product identity missing: ${identity}`);
}
await writeFile(join(root, 'client', 'client.js'), bundle, 'utf8');
console.log(`built client/client.js: ${Buffer.byteLength(bundle)} bytes (baseline ${Buffer.byteLength(baseline)})`);
