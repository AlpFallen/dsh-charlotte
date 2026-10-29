/**
 * Build the dsh-charlotte client bundle.
 *
 * Input  : `client/client.baseline.js` — the checked-in compiled bundle for the
 *          skill panel, already renamed to this package's id and API prefix.
 *          This checkout has no TypeScript sources for that baseline.
 *
 * Slices : `revamp/launcher.js` replaces StationApp + TargetSelector + LibraryTab
 *          with the v0.7 surface (smart-picks home, left navigation, favourites
 *          page, index-driven all-skills page, detail drawer, load chain);
 *          `revamp/recommend-dock.js`
 *          adds the inline recommendation card and its slot registration;
 *          `revamp/footer.js` replaces StationFooterButton (single sidebar
 *          entry, no drawer title bar); `revamp/market.css` is appended to the
 *          bundle's CSS string. The retired copy-import tab (ImportTab) and its
 *          `/scan` + `/import` helpers are cut out of the bundle.
 * Wiring : `apply(ctx)` stores the plugin context in `skPluginCtx` and registers
 *          the recommendation dock.
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
const launcher = await read('revamp/launcher.js');
const recommendDock = await read('revamp/recommend-dock.js');
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
    `${launcher}\n\n${recommendDock}`,
    'launcher + recommendation dock',
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

// The launcher and the dock need the client context: one deterministic
// insertion at the single apply().
const applyAnchor = 'function apply(ctx) {';
if (bundle.indexOf(applyAnchor) !== bundle.lastIndexOf(applyAnchor)) {
    throw new Error('build-client: apply(ctx) anchor is not unique; refusing to patch');
}
bundle = bundle.replace(
    applyAnchor,
    'function apply(ctx) {\n  skPluginCtx = ctx;\n  skRegisterRecommendDock(ctx);',
);

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
    'function SkRecommendDock(',
    'function skRegisterRecommendDock(',
    'function skUseSkill(',
    'function skPrepareDraft(',
    'function skEnsureSession(',
    'function skFocusSession(',
    'function skApi',
    'var skApi = {',
    'function SkDetailDrawer(',
    'function SkFavourites(',
    'function SkSide(',
    'function SkHome(',
    'function InstallTab(props) {',
    'function TrashTab(',
]) {
    if (!bundle.includes(anchor)) throw new Error(`build-client: patched bundle lost anchor ${anchor}`);
}
if (!bundle.includes('function apply(ctx) {\n  skPluginCtx = ctx;\n  skRegisterRecommendDock(ctx);')) {
    throw new Error('build-client: apply() wiring missing');
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
if (!bundle.includes('"/index"') && !bundle.includes("'/index'")) throw new Error('build-client: unified index endpoint missing');
if (!bundle.includes('"/home"') && !bundle.includes("'/home'")) throw new Error('build-client: recommendation home endpoint missing');
// No hardcoded catalogue may survive in the shipped client.
for (const hardcoded of ['SK_SKILL_COPY', 'SK_PROVIDERS', 'SK_CATEGORIES', 'function SkillCard(', 'skCountGroups(']) {
    if (bundle.includes(hardcoded)) throw new Error(`build-client: hardcoded catalogue still present: ${hardcoded}`);
}
for (const identity of ['id: "dsh-charlotte"', '/charlotte/api']) {
    if (!bundle.includes(identity)) throw new Error(`build-client: product identity missing: ${identity}`);
}
await writeFile(join(root, 'client', 'client.js'), bundle, 'utf8');
console.log(`built client/client.js: ${Buffer.byteLength(bundle)} bytes (baseline ${Buffer.byteLength(baseline)})`);
