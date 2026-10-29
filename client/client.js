window.__ModuleLoader__.load({
  id: "dsh-charlotte",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react2 = require("react");
var import_react_dom = require("react-dom");

// src/client/App.tsx
var import_react = require("react");

// src/client/api.ts
async function call(path, options) {
  const resp = await fetch(`/charlotte/api${path}`, {
    method: options?.method ?? "GET",
    ...options?.body !== void 0 ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) } : {}
  });
  return { ok: resp.ok, status: resp.status, body: await resp.json().catch(() => ({})) };
}
var fetchRoots = () => call("/roots");
var fetchSkills = (workspace) => call(`/skills${workspace !== "" ? `?workspace=${encodeURIComponent(workspace)}` : ""}`);
var uploadFiles = (body) => call("/upload", { method: "POST", body });
var uploadZip = (body) => call("/upload-zip", { method: "POST", body });
var toggleSkill = (body) => call("/toggle", { method: "POST", body });
var deleteSkill = (body) => call("/delete", { method: "POST", body });
var fetchTrash = () => call("/trash");
var restoreTrash = (id) => call("/trash-restore", { method: "POST", body: { id } });
var emptyTrash = () => call("/trash-empty", { method: "POST", body: {} });

// src/client/App.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var GLOBAL_ROOTS = [
  { id: "user-dsh", label: "\u5168\u5C40 ~/.dsh/skills" },
  { id: "user-agents", label: "\u5171\u4EAB ~/.agents/skills" }
];
function fmtSize(bytes) {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
// #region dsh-charlotte launcher v0.7 — smart home, navigation, index, load chain
//
// Replaces the baseline StationApp / LibraryTab / TargetSelector with the
// v0.7 launcher:
//   - a smart-picks home driven by `/charlotte/api/home` (real conversation
//     recommendations, then real usage history), with search/category entry
//     when nothing trustworthy matches;
//   - a left navigation for smart picks, favourites, computed categories and
//     the management menu; the full list is a secondary page;
//   - one compact list driven by `/charlotte/api/index` (real skills only);
//   - favourites / pins / usage-frequency ordering from the host state;
//   - category navigation computed from each skill's own text, never from a
//     hand-written table;
//   - a right-side detail drawer that shows provenance and real usage records;
//   - a load chain that authorizes on the host, stages the official `/name`
//     token in the composer, reports the confirmed outcome, and never calls
//     send/submit.
//
// All counts, categories and rows come from the index response. The client
// holds no skill names, no category counts and no sample data.
//
// The recommendation dock lives in revamp/recommend-dock.js and uses the
// helpers defined here (skCall, skUseSkill, the load store, glyphs).

var skH = import_jsx_runtime.jsx;
var skF = import_jsx_runtime.Fragment;

/**
 * Element helper: children always travel as `props.children`, which keeps the
 * automatic JSX runtime's third argument free for keys.
 * @param {*} type - element type.
 * @param {object} props - props, or null.
 * @param {Array|object|string|number} children - optional children.
 * @returns {object} React element.
 */
function sk(type, props, children, key) {
  var next = props === undefined || props === null ? {} : props;
  var resolvedKey = key === undefined ? next.key : key;
  if (next.key !== undefined) delete next.key;
  if (children !== undefined) next.children = children;
  if (Array.isArray(next.children)) next.children = skKeyed(next.children);
  return resolvedKey === undefined || resolvedKey === null ? skH(type, next) : skH(type, next, resolvedKey);
}

/**
 * Give every element in a children list a stable key.
 * @param {Array} children - raw children list.
 * @returns {Array} children with keys where missing.
 */
function skKeyed(children) {
  var out = [];
  for (var index = 0; index < children.length; index += 1) {
    var child = children[index];
    if (Array.isArray(child)) {
      out.push(skKeyed(child));
      continue;
    }
    if (child !== null && typeof child === "object" && (child.key === undefined || child.key === null)) {
      out.push(Object.assign({}, child, { key: "sk" + index }));
      continue;
    }
    out.push(child);
  }
  return out;
}

// #region language store -------------------------------------------------------
var SK_LANG_KEY = "dsh-charlotte:lang";

/**
 * Guess the initial language from the host or browser locale.
 * @returns {'zh'|'en'} language code.
 */
function skDetectLang() {
  var candidates = [];
  try {
    if (typeof navigator !== "undefined" && typeof navigator.language === "string") candidates.push(navigator.language);
  } catch (error) {
    // Locale sniffing is best effort.
  }
  try {
    if (typeof document !== "undefined" && typeof document.documentElement.lang === "string") candidates.push(document.documentElement.lang);
  } catch (error) {
    // Ignore.
  }
  for (var index = 0; index < candidates.length; index += 1) {
    if (/^zh/i.test(candidates[index])) return "zh";
  }
  return "en";
}

/**
 * Read the stored language.
 * @returns {'zh'|'en'} language code.
 */
function skGetLang() {
  try {
    var stored = window.localStorage.getItem(SK_LANG_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch (error) {
    // Storage may be unavailable; fall back to detection.
  }
  return skDetectLang();
}

var skLangListeners = [];

/**
 * Persist the language choice and notify subscribers.
 * @param {'zh'|'en'} next - language code.
 */
function skSetLang(next) {
  try {
    window.localStorage.setItem(SK_LANG_KEY, next);
  } catch (error) {
    // Non-fatal: the in-memory listeners still update.
  }
  for (var index = 0; index < skLangListeners.length; index += 1) skLangListeners[index](next);
}

/**
 * Subscribe to language changes.
 * @returns {'zh'|'en'} active language.
 */
function useSkLang() {
  var state = (0, import_react.useState)(skGetLang());
  var lang = state[0];
  var setLang = state[1];
  (0, import_react.useEffect)(function () {
    var onChange = function (next) {
      setLang(next);
    };
    skLangListeners.push(onChange);
    return function () {
      var index = skLangListeners.indexOf(onChange);
      if (index >= 0) skLangListeners.splice(index, 1);
    };
  }, []);
  return lang;
}

// #endregion

// #region dictionaries ---------------------------------------------------------
var SK_STRINGS = {
  zh: {
    "panel.title": "技能",
    "hero.sub": "{all} 个技能 · {mine} 个属于你",
    "search.placeholder": "搜索名称、描述、触发条件",
    "search.kbd": "⌘K",
    "more.label": "管理",
    "panel.close": "关闭",
    "fav.title": "常用与收藏",
    "fav.hint": "置顶优先，其次按调用频率",
    "fav.count": "{count} 次",
    "cat.all": "全部技能",
    "cat.rail": "分类",
    "rail.disabled": "已停用",
    "sort.freq": "调用频率",
    "sort.name": "名称",
    "sort.recent": "最近使用",
    "sort.label": "排序",
    "filter.source": "来源：{name}",
    "filter.state": "状态：{name}",
    "filter.all": "全部",
    "source.all": "全部来源",
    "source.project": "项目级",
    "source.user": "用户专属",
    "source.plugin": "插件提供",
    "source.system": "系统内置",
    "state.all": "全部状态",
    "state.both": "用户与模型",
    "state.user": "仅用户",
    "state.model": "仅模型",
    "state.off": "不可用",
    "state.disabled": "已停用",
    "action.use": "使用",
    "action.useAgain": "已加载",
    "action.cancel": "取消",
    "action.detail": "详情",
    "action.favorite": "收藏",
    "action.unfavorite": "取消收藏",
    "action.pin": "置顶",
    "action.unpin": "取消置顶",
    "action.close": "关闭",
    "action.copy": "复制正文",
    "action.copied": "已复制",
    "action.migrate": "迁入共享池",
    "action.retry": "重试",
    "detail.purpose": "用途",
    "detail.intro": "技能简介",
    "detail.introUnavailable": "无法读取技能描述",
    "detail.official": "官方描述",
    "detail.professional": "专业版简介",
    "detail.why": "推荐理由",
    "detail.category": "分类依据",
    "detail.useCases": "适用场景",
    "detail.triggers": "触发条件",
    "detail.avoid": "排除场景",
    "detail.perms": "权限与依赖",
    "detail.userInvocable": "用户可用",
    "detail.modelInvocable": "模型可用",
    "detail.deps": "依赖",
    "detail.noDeps": "无声明依赖",
    "detail.risk": "高风险操作",
    "detail.riskNote": "由宿主工具权限与审批独立校验",
    "detail.version": "版本",
    "detail.source": "来源",
    "detail.path": "位置",
    "detail.updated": "更新时间",
    "detail.usage": "使用记录",
    "detail.cost": "注入开销",
    "detail.costValue": "≈{tokens} tokens · {chars} 字符（估算，不是分词器）",
    "detail.audit": "正文审计",
    "detail.auditClean": "没有发现隐藏字符。",
    "detail.auditHigh": "高",
    "detail.auditMedium": "中",
    "detail.auditLow": "低",
    "detail.audit.escape": "裸 ESC 控制符",
    "detail.audit.tag-chars": "Unicode 标签字符（不可见）",
    "detail.audit.bidi": "双向控制符",
    "detail.audit.control": "其他控制字符",
    "detail.audit.zero-width": "零宽字符",
    "detail.tags": "标签",
    "detail.tagsEmpty": "还没有标签。",
    "detail.tagsPlaceholder": "输入标签后回车",
    "detail.noUsage": "暂无使用记录。",
    "detail.keywords": "关键词",
    "detail.enable": "启用",
    "detail.enableModel": "模型可用",
    "detail.enableUser": "用户可用",
    "detail.readonly": "插件提供，只读",
    "detail.provenance": "字段来源",
    "prov.declared": "声明",
    "prov.derived": "推导",
    "prov.absent": "未声明",
    "detail.openError": "无法打开详情：{reason}",
    "detail.loading": "正在读取…",
    "usage.loaded": "已加载",
    "usage.invoked": "已执行",
    "usage.completed": "已完成",
    "usage.failed": "失败",
    "usage.cancelled": "已取消",
    "usage.load-failed": "加载失败",
    "usage.recommended": "已推荐",
    "usage.accepted": "已采纳推荐",
    "usage.dismissed": "已忽略推荐",
    "notice.loaded": "已放入输入框：发送后技能才会生效。",
    "notice.loadedNext": "已填入完整下一步，检查后发送。",
    "notice.loadedSession": "已放入该会话的输入框。",
    "notice.failed": "加载失败：{reason}",
    "notice.cancelled": "已取消加载。",
    "notice.prefFailed": "收藏状态保存失败：{reason}",
    "notice.toggleFailed": "开关保存失败：{reason}",
    "notice.indexFailed": "无法读取技能列表（HTTP {status}）：{reason}",
    "notice.offline": "无法连接插件服务。",
    "empty.title": "没有匹配的技能",
    "empty.hint": "换个关键词，或清除分类与来源筛选。",
    "empty.clear": "清除筛选",
    "loading": "正在读取技能…",
    "more.workspace": "作用域",
    "more.install": "安装技能",
    "more.trash": "回收站",
    "more.refresh": "刷新",
    "more.language": "语言",
    "more.sources": "来源",
    "more.ledger": "调用台账",
    "more.diagnostics": "诊断",
    "notice.tagsSaved": "标签已保存。",
    "notice.tagsFailed": "标签保存失败：{reason}",
    "notice.migrated": "已迁入共享池并留下软链接：{path}",
    "notice.migrateRefused": "没有迁移：{reason}",
    "notice.copyFailed": "复制失败：{reason}",
    "ledger.title": "调用台账",
    "ledger.intro": "只统计真实的加载、执行与失败；分母为零时不给比率。",
    "ledger.loads": "加载",
    "ledger.invokes": "执行",
    "ledger.success": "成功率",
    "ledger.adoption": "推荐采纳率",
    "ledger.noRate": "—",
    "ledger.trend": "近 14 天加载",
    "ledger.empty": "还没有调用记录。",
    "ledger.skill": "技能",
    "ledger.lastUsed": "最近使用",
    "diag.title": "诊断",
    "diag.intro": "被跳过的文件、无效 frontmatter 与挂载扫描失败都在这里。",
    "diag.empty": "没有发现问题。",
    "diag.writable": "可写根",
    "diag.mounted": "挂载源",
    "diag.audit": "正文审计汇总",
    "more.note": "内置与插件技能只读；启停与安装只影响可写目录。",
    "panel.install": "安装技能",
    "panel.trash": "回收站",
    "dialog.close": "关闭",
    "error.noSession": "没有可用会话，无法准备输入框。",
    "error.noWorkspace": "找不到可用的工作区。",
    "error.invokeApi": "当前界面缺少会话服务，无法准备输入框。",
    "error.loadBlocked": "输入框正在提交，稍后再试。",
    "error.network": "请求失败，请检查插件服务是否在线。",
    "time.justNow": "刚刚",
    "dock.title": "技能推荐",
    "dock.count": "仅 {count} 个",
    "dock.use": "使用",
    "dock.ignore": "忽略",
    "dock.loading": "正在校验权限…",
    "dock.loaded": "已放入输入框，发送后生效。",
    "dock.loadedNext": "已填入完整下一步，检查后发送。",
    "dock.failed": "无法加载：{reason}",
    "dock.ignored": "已忽略，本次任务不再推荐。",
    "dock.reason": "推荐原因",
    "dock.collapse": "收起推荐",
    "dock.expand": "展开推荐",
    "more.registry": "来源筛选",
    "detail.dependenciesSatisfied": "已就绪",
    "detail.dependenciesMissing": "缺失",
    "detail.triggersDerived": "由描述推导，未在 SKILL.md 中声明 whenToUse。",
    "detail.noDescription": "该技能没有填写描述。",
    "detail.categoryEvidence": "命中 {terms}",
    "detail.categoryWeak": "没有明显关键词，按通用任务协作归类。",
    "detail.sourceDetail": "{label} · {detail}",
    "detail.original": "原文",
    "detail.noZh": "该技能暂无中文简介，原文见详情。",
    "detail.introSource": "简介来源",
    "intro.declared": "技能声明",
    "intro.catalog": "翻译目录",
    "intro.absent": "缺失",
    "state.none": "没有可显示的状态",
    "nav.recommend": "智能推荐",
    "nav.favorites": "常用与收藏",
    "nav.categories": "功能分类",
    "nav.all": "全部技能",
    "nav.manage": "管理",
    "home.title": "智能推荐",
    "home.sub.conversation": "根据当前对话与可用权限挑选",
    "home.sub.history": "根据你的使用记录挑选",
    "home.sub.none": "暂无可推荐技能",
    "home.level.conversation": "当前对话",
    "home.level.history": "使用记录",
    "home.refresh": "刷新推荐",
    "home.loading": "正在匹配当前任务…",
    "home.error": "无法读取推荐：{reason}",
    "home.empty.title": "暂时没有合适的推荐",
    "home.empty.hint": "直接搜索，或从功能分类进入。",
    "home.empty.search": "搜索技能名称、用途或触发条件",
    "home.best": "最相关",
    "home.reason": "推荐原因",
    "home.use": "立即使用",
    "home.details": "查看详情",
    "home.note": "只推荐当前可用、依赖已就绪的技能。",
    "home.noDeps": "无额外依赖",
    "home.intent": "当前任务：{intent}",
    "home.secondary": "也可以试试",
    "home.uses": "调用 {count} 次",
    "home.reason.pinned": "你置顶了这个技能",
    "home.reason.favorite": "你收藏了这个技能",
    "home.reason.used": "你已使用 {count} 次",
    "home.reason.recent": "最近使用：{age}",
    "home.reason.history": "来自你的使用记录",
    "fav.pageHint": "置顶优先，其次收藏与调用频率",
    "fav.group.pinned": "置顶",
    "fav.group.favorite": "收藏",
    "fav.group.frequent": "常用",
    "fav.empty.title": "还没有常用或收藏的技能",
    "fav.empty.hint": "在全部技能里收藏或置顶，也可以直接使用；之后会出现在这里。",
    "fav.empty.browse": "浏览全部技能",
    "skills.sub": "{count} 个技能 · {available} 个可用",
    "state.available": "可用"
  },
  en: {
    "panel.title": "Skills",
    "hero.sub": "{all} skills · {mine} yours",
    "search.placeholder": "Search name, description, trigger",
    "search.kbd": "⌘K",
    "more.label": "Manage",
    "panel.close": "Close",
    "fav.title": "Pinned & frequent",
    "fav.hint": "Pinned first, then by usage",
    "fav.count": "{count} uses",
    "cat.all": "All skills",
    "cat.rail": "Categories",
    "rail.disabled": "Disabled",
    "sort.freq": "Usage",
    "sort.name": "Name",
    "sort.recent": "Recent",
    "sort.label": "Sort",
    "filter.source": "Source: {name}",
    "filter.state": "State: {name}",
    "filter.all": "All",
    "source.all": "All sources",
    "source.project": "Project",
    "source.user": "Yours",
    "source.plugin": "Plugin",
    "source.system": "Built-in",
    "state.all": "All states",
    "state.both": "User & model",
    "state.user": "User only",
    "state.model": "Model only",
    "state.off": "Unavailable",
    "state.disabled": "Disabled",
    "action.use": "Use",
    "action.useAgain": "Loaded",
    "action.cancel": "Cancel",
    "action.detail": "Details",
    "action.favorite": "Favourite",
    "action.unfavorite": "Unfavourite",
    "action.pin": "Pin",
    "action.unpin": "Unpin",
    "action.close": "Close",
    "action.copy": "Copy body",
    "action.copied": "Copied",
    "action.migrate": "Move to shared pool",
    "action.retry": "Retry",
    "detail.purpose": "Purpose",
    "detail.intro": "Skill summary",
    "detail.introUnavailable": "Skill description unavailable",
    "detail.official": "Official description",
    "detail.professional": "Professional summary",
    "detail.why": "Why recommended",
    "detail.category": "Category evidence",
    "detail.useCases": "Use when",
    "detail.triggers": "Triggers",
    "detail.avoid": "Not for",
    "detail.perms": "Permissions & dependencies",
    "detail.userInvocable": "User invocable",
    "detail.modelInvocable": "Model invocable",
    "detail.deps": "Dependencies",
    "detail.noDeps": "No declared dependencies",
    "detail.risk": "High-risk actions",
    "detail.riskNote": "checked independently by host tool permissions and approval",
    "detail.version": "Version",
    "detail.source": "Source",
    "detail.path": "Location",
    "detail.updated": "Updated",
    "detail.usage": "Usage",
    "detail.cost": "Injection cost",
    "detail.costValue": "≈{tokens} tokens · {chars} chars (estimate, not a tokenizer)",
    "detail.audit": "Body audit",
    "detail.auditClean": "No hidden characters found.",
    "detail.auditHigh": "high",
    "detail.auditMedium": "medium",
    "detail.auditLow": "low",
    "detail.audit.escape": "bare ESC control",
    "detail.audit.tag-chars": "Unicode tag characters (invisible)",
    "detail.audit.bidi": "bidirectional controls",
    "detail.audit.control": "other control characters",
    "detail.audit.zero-width": "zero-width characters",
    "detail.tags": "Tags",
    "detail.tagsEmpty": "No tags yet.",
    "detail.tagsPlaceholder": "Type a tag and press Enter",
    "detail.noUsage": "No usage recorded yet.",
    "detail.keywords": "Keywords",
    "detail.enable": "Enabled",
    "detail.enableModel": "Model can use",
    "detail.enableUser": "You can use",
    "detail.readonly": "Provided by a plugin · read-only",
    "detail.provenance": "Field provenance",
    "prov.declared": "declared",
    "prov.derived": "derived",
    "prov.absent": "absent",
    "detail.openError": "Cannot open details: {reason}",
    "detail.loading": "Reading…",
    "usage.loaded": "Loaded",
    "usage.invoked": "Executed",
    "usage.completed": "Completed",
    "usage.failed": "Failed",
    "usage.cancelled": "Cancelled",
    "usage.load-failed": "Load failed",
    "usage.recommended": "Recommended",
    "usage.accepted": "Recommendation accepted",
    "usage.dismissed": "Recommendation dismissed",
    "notice.loaded": "Added to the composer: the skill takes effect when you send.",
    "notice.loadedNext": "The next step is filled in; review it and send.",
    "notice.loadedSession": "Added to that conversation's composer.",
    "notice.failed": "Could not load: {reason}",
    "notice.cancelled": "Load cancelled.",
    "notice.prefFailed": "Could not save favourite: {reason}",
    "notice.toggleFailed": "Could not save the switch: {reason}",
    "notice.indexFailed": "Cannot read skills (HTTP {status}): {reason}",
    "notice.offline": "Cannot reach the plugin service.",
    "empty.title": "No matching skills",
    "empty.hint": "Try another keyword, or clear the category and source filters.",
    "empty.clear": "Clear filters",
    "loading": "Reading skills…",
    "more.workspace": "Scope",
    "more.install": "Install skill",
    "more.trash": "Recycle bin",
    "more.refresh": "Refresh",
    "more.language": "Language",
    "more.sources": "Sources",
    "more.ledger": "Usage ledger",
    "more.diagnostics": "Diagnostics",
    "notice.tagsSaved": "Tags saved.",
    "notice.tagsFailed": "Tags not saved: {reason}",
    "notice.migrated": "Moved to the shared pool with a symlink: {path}",
    "notice.migrateRefused": "Not migrated: {reason}",
    "notice.copyFailed": "Copy failed: {reason}",
    "ledger.title": "Usage ledger",
    "ledger.intro": "Only real loads, runs and failures; no rate without a denominator.",
    "ledger.loads": "Loads",
    "ledger.invokes": "Runs",
    "ledger.success": "Success",
    "ledger.adoption": "Adoption",
    "ledger.noRate": "—",
    "ledger.trend": "Loads, last 14 days",
    "ledger.empty": "No usage recorded yet.",
    "ledger.skill": "Skill",
    "ledger.lastUsed": "Last used",
    "diag.title": "Diagnostics",
    "diag.intro": "Skipped files, invalid frontmatter and mount-scan failures land here.",
    "diag.empty": "Nothing to report.",
    "diag.writable": "Writable root",
    "diag.mounted": "Mount source",
    "diag.audit": "Body audit summary",
    "more.note": "Built-in and plugin skills are read-only; enable and install only touch writable roots.",
    "panel.install": "Install skill",
    "panel.trash": "Recycle bin",
    "dialog.close": "Close",
    "error.noSession": "No conversation available to stage the composer.",
    "error.noWorkspace": "No usable workspace found.",
    "error.invokeApi": "This shell lacks the conversation services needed to stage the composer.",
    "error.loadBlocked": "The composer is submitting; try again in a moment.",
    "error.network": "Request failed; check that the plugin service is running.",
    "time.justNow": "just now",
    "dock.title": "Skill suggestion",
    "dock.count": "{count} only",
    "dock.use": "Use",
    "dock.ignore": "Ignore",
    "dock.loading": "Checking permissions…",
    "dock.loaded": "Added to the composer; it applies when you send.",
    "dock.loadedNext": "The next step is filled in; review and send.",
    "dock.failed": "Cannot load: {reason}",
    "dock.ignored": "Ignored; this task will not be suggested again.",
    "dock.reason": "Why",
    "dock.collapse": "Collapse suggestions",
    "dock.expand": "Expand suggestions",
    "more.registry": "Source filter",
    "detail.dependenciesSatisfied": "ready",
    "detail.dependenciesMissing": "missing",
    "detail.triggersDerived": "Derived from the description; SKILL.md declares no whenToUse.",
    "detail.noDescription": "This skill has no description.",
    "detail.categoryEvidence": "Matched {terms}",
    "detail.categoryWeak": "No strong keyword; classified as general task work.",
    "detail.sourceDetail": "{label} · {detail}",
    "detail.original": "Original",
    "detail.noZh": "This skill has no Chinese summary yet; the original text is in Details.",
    "detail.introSource": "Summary source",
    "intro.declared": "declared",
    "intro.catalog": "translation catalogue",
    "intro.absent": "missing",
    "state.none": "No state to show",
    "nav.recommend": "Smart picks",
    "nav.favorites": "Favourites",
    "nav.categories": "Categories",
    "nav.all": "All skills",
    "nav.manage": "Manage",
    "home.title": "Smart picks",
    "home.sub.conversation": "Matched from this conversation and your permissions",
    "home.sub.history": "Matched from your usage history",
    "home.sub.none": "No picks right now",
    "home.level.conversation": "This conversation",
    "home.level.history": "Usage history",
    "home.refresh": "Refresh picks",
    "home.loading": "Matching your current task…",
    "home.error": "Could not load picks: {reason}",
    "home.empty.title": "No strong match right now",
    "home.empty.hint": "Search directly, or browse a category.",
    "home.empty.search": "Search skill name, purpose or trigger",
    "home.best": "Best match",
    "home.reason": "Why this one",
    "home.use": "Use now",
    "home.details": "Details",
    "home.note": "Only skills you can run now, with dependencies ready, are picked.",
    "home.noDeps": "no extra dependencies",
    "home.intent": "Current task: {intent}",
    "home.secondary": "Also worth a look",
    "home.uses": "{count} uses",
    "home.reason.pinned": "you pinned this skill",
    "home.reason.favorite": "you favourited this skill",
    "home.reason.used": "you used it {count} times",
    "home.reason.recent": "last used {age}",
    "home.reason.history": "from your usage history",
    "fav.pageHint": "Pinned first, then favourites and usage",
    "fav.group.pinned": "Pinned",
    "fav.group.favorite": "Favourites",
    "fav.group.frequent": "Frequently used",
    "fav.empty.title": "No favourites yet",
    "fav.empty.hint": "Star or pin a skill in All skills, or use one directly; it will show up here.",
    "fav.empty.browse": "Browse all skills",
    "skills.sub": "{count} skills · {available} available",
    "state.available": "Available"
  }
};

/**
 * Translate one UI key.
 * @param {'zh'|'en'} lang - active language.
 * @param {string} key - dictionary key.
 * @param {object} params - `{name}` replacements.
 * @returns {string} localized string.
 */
function skT(lang, key, params) {
  var table = SK_STRINGS[lang] ?? SK_STRINGS.zh;
  var text = table[key] ?? SK_STRINGS.zh[key] ?? key;
  if (params !== undefined && params !== null) {
    text = text.replace(/\{([a-zA-Z]+)\}/g, function (match, name) {
      return params[name] === undefined ? match : String(params[name]);
    });
  }
  return text;
}

// #endregion

// #region formatting helpers ---------------------------------------------------
/**
 * Collapse whitespace and cut to a display budget.
 * @param {unknown} value - raw text.
 * @param {number} max - maximum characters.
 * @returns {string} display text.
 */
function skClip(value, max) {
  var text = String(value === undefined || value === null ? "" : value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

/**
 * Local timestamp for a usage record.
 * @param {number} at - epoch milliseconds.
 * @returns {string} `MM-DD HH:mm`.
 */
function skTime(at) {
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return "";
  var date = new Date(at);
  var pad = function (value) {
    return value < 10 ? "0" + String(value) : String(value);
  };
  return pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

/**
 * Human age for a timestamp.
 * @param {number} at - epoch milliseconds.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string} short age.
 */
function skAge(at, lang) {
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return "";
  var seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return skT(lang, "time.justNow");
  var minutes = Math.round(seconds / 60);
  if (minutes < 60) return lang === "zh" ? minutes + " 分钟前" : minutes + " min ago";
  var hours = Math.round(minutes / 60);
  if (hours < 24) return lang === "zh" ? hours + " 小时前" : hours + " h ago";
  var days = Math.round(hours / 24);
  return lang === "zh" ? days + " 天前" : days + " d ago";
}

/**
 * Availability label and dot kind.
 * @param {object} skill - unified record.
 * @param {'zh'|'en'} lang - active language.
 * @returns {{label: string, dot: string, usable: boolean}} display state.
 */
function skStateOf(skill, lang) {
  var availability = skill.policy?.availability ?? "unavailable";
  var labelKey = availability === "both" ? "state.both" : availability === "user" ? "state.user" : availability === "model" ? "state.model" : availability === "disabled" ? "state.disabled" : "state.off";
  var dot = availability === "both" ? "both" : availability === "user" ? "user" : availability === "model" ? "model" : "off";
  return {
    label: skT(lang, labelKey),
    dot: dot,
    usable: skill.policy?.userInvocable === true && skill.policy?.disabled !== true
  };
}

// #endregion

// #region list helpers ---------------------------------------------------------
/**
 * Build the lower-case search blob for one skill. Search covers exactly the
 * fields the product promises: name, description, purpose, keywords, triggers,
 * use cases, category labels and source labels.
 * @param {object} skill - unified record.
 * @returns {string} lower-case search text.
 */
function skSearchBlob(skill) {
  return [
    skill.name,
    skill.description,
    skill.purpose,
    (skill.keywords ?? []).join(" "),
    (skill.triggers?.values ?? []).join(" "),
    (skill.useCases ?? []).join(" "),
    skill.category?.label ?? "",
    skill.category?.labelEn ?? "",
    skill.source?.label ?? "",
    skill.source?.detail ?? "",
    skill.i18n?.simple ?? "",
    skill.i18n?.professional ?? "",
    (skill.tags ?? []).join(" ")
  ].join(" ").toLowerCase();
}

/**
 * Filter one skill list by query, category, source and availability.
 * @param {Array} skills - unified records.
 * @param {{query?: string, category?: string, source?: string, state?: string}} filters - active filters.
 * @returns {Array} matching records.
 */
function skFilterSkills(skills, filters) {
  var needle = String(filters.query ?? "").trim().toLowerCase();
  return skills.filter(function (skill) {
    if (needle !== "" && skSearchBlob(skill).indexOf(needle) === -1) return false;
    var category = filters.category ?? "";
    if (category === "__disabled") {
      if (skill.policy?.disabled !== true) return false;
    } else if (category !== "" && skill.category?.id !== category) {
      return false;
    }
    var source = filters.source ?? "all";
    if (source !== "all" && skill.source?.type !== source) return false;
    var state = filters.state ?? "all";
    if (state !== "all") {
      var availability = skill.policy?.availability ?? "unavailable";
      if (state === "disabled" && availability !== "disabled") return false;
      if (state === "off" && availability !== "unavailable") return false;
      if (state === "both" && availability !== "both") return false;
      if (state === "user" && availability !== "user") return false;
      if (state === "model" && availability !== "model") return false;
    }
    return true;
  });
}

/**
 * Sort one skill list. `freq` is the only ranking the product offers beyond
 * name and recency: there is no real download time, so it is not offered.
 * @param {Array} skills - records to sort (not mutated).
 * @param {'freq'|'name'|'recent'} sort - sort key.
 * @returns {Array} sorted copy.
 */
function skSortSkills(skills, sort) {
  var usage = function (skill) {
    return (skill.stats?.loads ?? 0) + (skill.stats?.invokes ?? 0);
  };
  return skills.slice().sort(function (left, right) {
    if (sort === "name") return left.name.localeCompare(right.name);
    if (sort === "recent") return (right.stats?.lastUsedAt ?? 0) - (left.stats?.lastUsedAt ?? 0) || left.name.localeCompare(right.name);
    return usage(right) - usage(left) || (right.stats?.lastUsedAt ?? 0) - (left.stats?.lastUsedAt ?? 0) || left.name.localeCompare(right.name);
  });
}

/**
 * Compose the favourites strip: pinned first (most recently pinned first),
 * then favourites, then the most-used skills, de-duplicated, capped.
 * @param {Array} skills - unified records.
 * @param {number} limit - maximum rows.
 * @returns {Array} rows.
 */
function skPickFavourites(skills, limit) {
  var chosen = [];
  var seen = Object.create(null);
  var push = function (skill) {
    if (seen[skill.name] === true) return;
    seen[skill.name] = true;
    chosen.push(skill);
  };
  var usage = function (skill) {
    return (skill.stats?.loads ?? 0) + (skill.stats?.invokes ?? 0);
  };
  skills.filter(function (skill) { return skill.stats?.pinned === true; })
    .sort(function (left, right) { return (right.stats?.pinnedAt ?? 0) - (left.stats?.pinnedAt ?? 0); })
    .forEach(push);
  skills.filter(function (skill) { return skill.stats?.favorite === true; })
    .sort(function (left, right) { return usage(right) - usage(left); })
    .forEach(push);
  skills.filter(function (skill) { return usage(skill) > 0; })
    .sort(function (left, right) { return usage(right) - usage(left); })
    .forEach(push);
  return chosen.slice(0, limit === undefined ? 4 : limit);
}

/**
 * The summary shown for one skill in the active language.
 *
 * In Chinese the card must show Chinese: a declared or catalogue translation
 * is used, and when none exists the UI says so in Chinese instead of dropping
 * an English paragraph into the Chinese interface. The original text stays in
 * the detail panel.
 * @param {object} skill - unified record.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string} summary text.
 */
function skIntro(skill, lang) {
  if (lang === "en") return skill.description !== "" ? skill.description : skill.purpose;
  // `descriptionZh` is the 0.6.1 field; keep reading it so a page refresh
  // before the host restart still shows the old Chinese translation instead of
  // the "no summary" line.
  var simple = skill.i18n?.simple ?? skill.i18n?.descriptionZh;
  if (typeof simple === "string" && simple !== "") return simple;
  // A skill that already wrote its description in Chinese needs no extra
  // layer: its own text is already the plain-language summary.
  if (/[\u4e00-\u9fff]/.test(skill.description ?? "")) return skill.description;
  return skT(lang, "detail.noZh");
}

/**
 * The canonical Skill intro shared by the recommendation card, the skill list
 * and the detail drawer.
 *
 * It reads the skill's own description through the same resolver as the list;
 * recommendation reasons, matched keywords and generated text are never
 * accepted here. A missing description gets an explicit empty state.
 * @param {object|null} skill - unified record, or null when it could not be read.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string} intro text.
 */
function skSkillIntro(skill, lang) {
  if (skill === null || skill === undefined) return skT(lang, "detail.introUnavailable");
  if (typeof skill.description !== "string" || skill.description.trim() === "") {
    return skT(lang, "detail.noDescription");
  }
  return skIntro(skill, lang);
}

/**
 * The one-line purpose in the active language.
 * @param {object} skill - unified record.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string} purpose text.
 */
function skPurpose(skill, lang) {
  var simple = skill.i18n?.simple ?? skill.i18n?.descriptionZh;
  if (lang === "zh" && typeof simple === "string" && simple !== "") return simple;
  return skill.purpose;
}

// #region recommendation home helpers -----------------------------------------
/**
 * Whether one index record can be loaded right now.
 *
 * This is the same precondition the host enforces in `/use`; the client filters
 * only to avoid showing a skill that would certainly fail. The host remains the
 * authority and re-checks on every load.
 * @param {object} skill - unified record.
 * @returns {boolean} true when the user may load it.
 */
function skUsableRecord(skill) {
  if (skill === null || skill === undefined || skill.policy?.userInvocable !== true) return false;
  if (skill.policy?.disabled === true) return false;
  var requires = Array.isArray(skill.requires) ? skill.requires : [];
  for (var index = 0; index < requires.length; index += 1) {
    if (requires[index]?.satisfied !== true) return false;
  }
  return true;
}

/**
 * One home recommendation bound to its live index record.
 * @param {object} skill - unified record.
 * @param {string} reason - Chinese reason.
 * @param {string} reasonEn - English reason.
 * @param {number} score - host or client score.
 * @returns {object} recommendation entry.
 */
function skHomeEntry(skill, reason, reasonEn, score) {
  return {
    name: skill.name,
    category: skill.category,
    purpose: skill.purpose,
    i18n: skill.i18n,
    reason: typeof reason === "string" ? reason : "",
    reasonEn: typeof reasonEn === "string" ? reasonEn : "",
    score: typeof score === "number" && Number.isFinite(score) ? score : 0,
    source: skill.source,
    availability: skill.policy?.availability ?? "unavailable",
    requires: Array.isArray(skill.requires) ? skill.requires : [],
    stats: skill.stats ?? null,
    skill: skill
  };
}

/**
 * Localized reason of one home entry, falling back to its stored language.
 * @param {{reason?: string, reasonEn?: string}} item - recommendation entry.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string} reason.
 */
function skHomeReason(item, lang) {
  if (lang === "en" && typeof item.reasonEn === "string" && item.reasonEn !== "") return item.reasonEn;
  if (typeof item.reason === "string" && item.reason !== "") return item.reason;
  if (typeof item.reasonEn === "string" && item.reasonEn !== "") return item.reasonEn;
  return skT(lang, "home.reason.history");
}

/**
 * Compose the complete next step staged in the composer when a recommendation
 * is accepted.
 *
 * The user's own latest sentence is the payload when we have it; otherwise the
 * skill's declared use case or purpose. This is deterministic — no model call,
 * no invented task — and it never sends anything: the user reviews and presses
 * send themselves.
 * @param {object} source - skill record or recommendation item.
 * @param {string} intent - the user's latest sentence, when known.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string} continuation instruction.
 */
function skContinuationPrompt(source, intent, lang) {
  var text = String(intent ?? "").replace(/\s+/g, " ").trim();
  if (text.length > 160) text = text.slice(0, 159) + "…";
  if (text !== "") {
    return lang === "zh"
      ? "基于我上一条消息继续推进：“" + text + "”。信息不够就先问我。"
      : "Continue from my previous message: \"" + text + "\". Ask me first if anything is missing.";
  }
  var useCases = Array.isArray(source?.useCases) ? source.useCases : [];
  // Prefer a cue in the active UI language: the Chinese summary for zh, the
  // declared use case for en.
  var cue = lang === "zh"
    ? useCases[0] ?? source?.i18n?.simple ?? source?.simple ?? source?.purpose ?? source?.description ?? ""
    : useCases[0] ?? source?.purpose ?? source?.description ?? source?.i18n?.simple ?? source?.simple ?? "";
  if (lang === "zh" && typeof source?.i18n?.simple === "string" && source.i18n.simple !== "") cue = source.i18n.simple;
  cue = skClip(cue, 160);
  if (cue !== "") {
    return lang === "zh" ? "请用这个技能帮我：" + cue : "Use this skill to help me: " + cue;
  }
  return lang === "zh" ? "请用这个技能继续推进我手头的事。" : "Use this skill to move my current task forward.";
}

/**
 * Human age used inside a recommendation reason.
 * @param {number} at - epoch milliseconds.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string} short age phrase.
 */
function skUsageAge(at, lang) {
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return "";
  var days = Math.floor(Math.max(0, Date.now() - at) / (24 * 60 * 60 * 1000));
  if (days <= 0) return lang === "zh" ? "今天" : "today";
  if (days < 30) return lang === "zh" ? days + " 天前" : days + " day" + (days === 1 ? "" : "s") + " ago";
  if (days < 365) {
    var months = Math.max(1, Math.floor(days / 30));
    return lang === "zh" ? months + " 个月前" : months + " month" + (months === 1 ? "" : "s") + " ago";
  }
  return lang === "zh" ? "很久以前" : "a long time ago";
}

/**
 * Explain a history-based pick from the record's real counters, in both UI
 * languages. Kept client-side so the copy stays identical whether the items
 * came from the host home endpoint or the local fallback.
 * @param {object} skill - unified record.
 * @returns {{zh: string, en: string}} reasons.
 */
function skHistoryReasonOf(skill) {
  var loads = Number(skill.stats?.loads ?? 0);
  var invokes = Number(skill.stats?.invokes ?? 0);
  var uses = loads + invokes;
  var favorite = skill.stats?.favorite === true;
  var pinned = skill.stats?.pinned === true;
  var lastUsedAt = Number(skill.stats?.lastUsedAt ?? 0);
  var partsZh = [];
  var partsEn = [];
  if (pinned) {
    partsZh.push(skT("zh", "home.reason.pinned"));
    partsEn.push(skT("en", "home.reason.pinned"));
  }
  if (favorite) {
    partsZh.push(skT("zh", "home.reason.favorite"));
    partsEn.push(skT("en", "home.reason.favorite"));
  }
  if (uses > 0) {
    partsZh.push(skT("zh", "home.reason.used", { count: uses }));
    partsEn.push(skT("en", "home.reason.used", { count: uses }));
    if (lastUsedAt > 0) {
      partsZh.push(skT("zh", "home.reason.recent", { age: skUsageAge(lastUsedAt, "zh") }));
      partsEn.push(skT("en", "home.reason.recent", { age: skUsageAge(lastUsedAt, "en") }));
    }
  }
  if (partsZh.length === 0) {
    partsZh.push(skT("zh", "home.reason.history"));
    partsEn.push(skT("en", "home.reason.history"));
  }
  return { zh: partsZh.join("；") + "。", en: partsEn.join("; ") + "." };
}

/**
 * Rank the real usage history on the client.
 *
 * This is the fallback when the host's recommendation home is unavailable
 * (an older host). It uses only stored counters, favourites and pins from the
 * index; every candidate is re-checked for load permission and dependencies.
 * @param {Array} skills - unified records.
 * @param {number} limit - maximum rows.
 * @returns {Array} recommendation entries.
 */
function skHistoryEntries(skills, limit) {
  var rows = [];
  var now = Date.now();
  for (var index = 0; index < skills.length; index += 1) {
    var skill = skills[index];
    if (!skUsableRecord(skill)) continue;
    var loads = Number(skill.stats?.loads ?? 0);
    var invokes = Number(skill.stats?.invokes ?? 0);
    var uses = loads + invokes;
    var favorite = skill.stats?.favorite === true;
    var pinned = skill.stats?.pinned === true;
    if (uses === 0 && !favorite && !pinned) continue;
    var lastUsedAt = Number(skill.stats?.lastUsedAt ?? 0);
    var age = lastUsedAt > 0 ? Math.max(0, now - lastUsedAt) : Number.POSITIVE_INFINITY;
    var recency = Number.isFinite(age) ? 0.6 * Math.exp(-age / (14 * 24 * 60 * 60 * 1000)) : 0;
    var score = Math.log1p(uses) * 0.5 + (pinned ? 0.35 : 0) + (favorite ? 0.25 : 0) + recency;
    var reason = skHistoryReasonOf(skill);
    rows.push({
      skill: skill,
      score: score,
      reason: reason.zh,
      reasonEn: reason.en
    });
  }
  rows.sort(function (left, right) {
    return right.score - left.score || left.skill.name.localeCompare(right.skill.name);
  });
  var cap = typeof limit === "number" && limit > 0 ? limit : 3;
  return rows.slice(0, cap).map(function (row) {
    return skHomeEntry(row.skill, row.reason, row.reasonEn, row.score);
  });
}

/**
 * Resolve host recommendation items against the live index.
 * @param {Array} items - host items (name + reason at minimum).
 * @param {Array} skills - unified records.
 * @returns {Array} entries that still exist and are loadable.
 */
function skHomeEntriesFromHost(items, skills) {
  var byName = Object.create(null);
  for (var index = 0; index < skills.length; index += 1) byName[skills[index].name] = skills[index];
  var out = [];
  for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    var item = items[itemIndex];
    if (item === null || typeof item !== "object" || typeof item.name !== "string") continue;
    var record = byName[item.name];
    if (record === undefined || !skUsableRecord(record)) continue;
    // History items carry the counters they were ranked from; rebuild the
    // sentence from them so the copy does not depend on the host version.
    if (item.stats !== undefined && item.stats !== null) {
      var local = skHistoryReasonOf(record);
      out.push(skHomeEntry(record, local.zh, local.en, item.score ?? 0));
      continue;
    }
    out.push(skHomeEntry(record, item.reason ?? "", item.reasonEn ?? "", item.score ?? 0));
  }
  return out;
}

/**
 * Resolve the parked conversation recommendation against the live index.
 * @param {Array} skills - unified records.
 * @param {{items?: Array}} pending - `/session-state` pending entry.
 * @returns {Array} loadable entries.
 */
function skHomePendingEntries(skills, pending) {
  var items = pending !== null && pending !== undefined && Array.isArray(pending.items) ? pending.items : [];
  return skHomeEntriesFromHost(items, skills);
}

/**
 * Client fallback for hosts that predate `/home`: the parked conversation
 * recommendation first, then the real usage history.
 * @param {Array} skills - unified records.
 * @param {string} sessionId - current session id, or "".
 * @returns {Promise<{source: string, intent: string, at: number, items: Array}>} home data.
 */
function skFallbackHome(skills, sessionId) {
  var history = function () {
    var items = skHistoryEntries(skills, 3);
    return items.length === 0
      ? { source: "none", reason: "no-history", intent: "", at: Date.now(), items: [] }
      : { source: "history", intent: "", at: Date.now(), items: items };
  };
  if (sessionId === "") return Promise.resolve(history());
  return skApi.sessionState(sessionId).then(function (result) {
    if (!result.ok) return history();
    var pending = result.body.pending;
    var items = skHomePendingEntries(skills, pending);
    if (items.length > 0) {
      return {
        source: "conversation",
        intent: typeof pending.intent === "string" ? pending.intent : "",
        at: typeof pending.at === "number" ? pending.at : Date.now(),
        items: items
      };
    }
    return history();
  }).catch(function () {
    return history();
  });
}

/**
 * Group the favourites page content without duplicates.
 * @param {Array} skills - unified records.
 * @returns {Array<{id: string, labelKey: string, rows: Array}>} non-empty groups.
 */
function skFavGroups(skills) {
  var pinned = [];
  var favorite = [];
  var frequent = [];
  var usage = function (skill) {
    return (Number(skill.stats?.loads) || 0) + (Number(skill.stats?.invokes) || 0);
  };
  for (var index = 0; index < skills.length; index += 1) {
    var skill = skills[index];
    if (skill.stats?.pinned === true) pinned.push(skill);
    else if (skill.stats?.favorite === true) favorite.push(skill);
    else if (usage(skill) > 0) frequent.push(skill);
  }
  pinned.sort(function (left, right) {
    return (right.stats?.pinnedAt ?? 0) - (left.stats?.pinnedAt ?? 0) || usage(right) - usage(left);
  });
  var byUsage = function (left, right) {
    return usage(right) - usage(left) || (right.stats?.lastUsedAt ?? 0) - (left.stats?.lastUsedAt ?? 0) || left.name.localeCompare(right.name);
  };
  favorite.sort(byUsage);
  frequent.sort(byUsage);
  return [
    { id: "pinned", labelKey: "fav.group.pinned", rows: pinned },
    { id: "favorite", labelKey: "fav.group.favorite", rows: favorite },
    { id: "frequent", labelKey: "fav.group.frequent", rows: frequent }
  ].filter(function (group) {
    return group.rows.length > 0;
  });
}

// #endregion

// #region API -----------------------------------------------------------------
/**
 * Fetch one plugin endpoint with a timeout and optional external abort.
 * @param {string} path - path after `/charlotte/api`.
 * @param {{method?: string, body?: object, signal?: AbortSignal, timeoutMs?: number}} options - request options.
 * @returns {Promise<{ok: boolean, status: number, body: object}>} parsed response.
 */
function skCall(path, options) {
  var settings = options ?? {};
  var external = settings.signal;
  var controller = typeof AbortController === "function" ? new AbortController() : undefined;
  var signal = external ?? (controller === undefined ? undefined : controller.signal);
  var timer = controller === undefined || external !== undefined || typeof window === "undefined"
    ? 0
    : window.setTimeout(function () {
      controller.abort();
    }, settings.timeoutMs ?? 15000);
  var init = { method: settings.method ?? "GET", signal: signal };
  if (settings.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(settings.body);
  }
  return fetch("/charlotte/api" + path, init).then(function (response) {
    return response.json().catch(function () {
      return {};
    }).then(function (body) {
      return { ok: response.ok, status: response.status, body: body === null || typeof body !== "object" ? {} : body };
    });
  }).catch(function (error) {
    var aborted = error !== null && error !== undefined && (error.name === "AbortError" || String(error).indexOf("abort") !== -1);
    return { ok: false, status: 0, body: { error: aborted ? "aborted" : String(error), aborted: aborted } };
  }).finally(function () {
    if (timer !== 0) window.clearTimeout(timer);
  });
}

/**
 * Dictionary key for one audit severity.
 * @param {string} severity - high | medium | low.
 * @returns {string} i18n key.
 */
function skSeverityKey(severity) {
  return severity === "high" ? "detail.auditHigh" : severity === "medium" ? "detail.auditMedium" : "detail.auditLow";
}

/**
 * Dictionary key for one secondary panel title.
 * @param {'install'|'trash'|'ledger'|'diagnostics'} panel - panel id.
 * @returns {string} i18n key.
 */
function skPanelTitleKey(panel) {
  if (panel === "install") return "panel.install";
  if (panel === "ledger") return "ledger.title";
  if (panel === "diagnostics") return "diag.title";
  return "panel.trash";
}

/**
 * The error message of one failed API response, without inventing one.
 * @param {{status: number, body: object}} result - API result.
 * @returns {string} message.
 */
function skApiError(result) {
  var body = result === null || result === undefined ? {} : result.body ?? {};
  if (typeof body.error === "string" && body.error.length > 0) return body.error;
  if (result !== null && result !== undefined && result.status > 0) return "HTTP " + String(result.status);
  return skT(skGetLang(), "error.network");
}

var skApi = {
  index: function (workspace) {
    return skCall("/index" + (workspace !== "" ? "?workspace=" + encodeURIComponent(workspace) : ""));
  },
  config: function () {
    return skCall("/config");
  },
  prefs: function (body) {
    return skCall("/prefs", { method: "POST", body: body });
  },
  use: function (body, signal) {
    return skCall("/use", { method: "POST", body: body, signal: signal });
  },
  event: function (body) {
    return skCall("/event", { method: "POST", body: body });
  },
  sessionState: function (sessionId) {
    return skCall("/session-state?session=" + encodeURIComponent(sessionId));
  },
  home: function (sessionId, workspace) {
    var query = [];
    if (typeof sessionId === "string" && sessionId !== "") query.push("session=" + encodeURIComponent(sessionId));
    if (typeof workspace === "string" && workspace !== "") query.push("workspace=" + encodeURIComponent(workspace));
    return skCall("/home" + (query.length > 0 ? "?" + query.join("&") : ""));
  },
  recommend: function (body, signal) {
    return skCall("/recommend", { method: "POST", body: body, signal: signal });
  },
  ignore: function (body) {
    return skCall("/recommend/ignore", { method: "POST", body: body });
  },
  toggle: function (body) {
    return skCall("/toggle", { method: "POST", body: body });
  },
  override: function (body) {
    return skCall("/override", { method: "POST", body: body });
  },
  roots: function () {
    return skCall("/roots");
  },
  body: function (name, workspace) {
    var query = "name=" + encodeURIComponent(name);
    if (typeof workspace === "string" && workspace !== "") query += "&workspace=" + encodeURIComponent(workspace);
    return skCall("/body?" + query);
  },
  ledger: function (workspace) {
    return skCall("/ledger" + (typeof workspace === "string" && workspace !== "" ? "?workspace=" + encodeURIComponent(workspace) : ""));
  },
  tags: function (body) {
    return skCall("/tags", { method: "POST", body: body });
  },
  migrate: function (body) {
    return skCall("/migrate", { method: "POST", body: body, timeoutMs: 120000 });
  }
};

// The baseline's path-install handler referenced a retired helper; keep the
// name defined against the host's real local-path installer so the existing
// Install tab keeps working.
var importSkills = function (body) {
  return skCall("/import-path", { method: "POST", body: body, timeoutMs: 120000 });
};

// #endregion

// #region plugin context + conversation services -----------------------------
// Captured by apply(); the React tree uses it to reach the real conversation
// services. One plugin instance per page.
var skPluginCtx = null;

/**
 * Resolve one optional client service without throwing when the composition
 * does not mount it.
 * @param {string} name - service name.
 * @returns {object|undefined} service.
 */
function skService(name) {
  var ctx = skPluginCtx;
  if (ctx === null || ctx === undefined || typeof ctx.get !== "function") return undefined;
  try {
    return ctx.get(name);
  } catch (error) {
    return undefined;
  }
}

/**
 * The session id of the conversation currently shown in the main view.
 * @returns {string} session id, or "" when none.
 */
function skCurrentSessionId() {
  var uiSession = skService("uiSession");
  var current = uiSession === undefined ? undefined : uiSession.current;
  if (current !== undefined && current !== null && typeof current.getSnapshot === "function") {
    var snapshot = current.getSnapshot();
    if (snapshot !== null && typeof snapshot === "object" && typeof snapshot.key === "string" && snapshot.key !== "") return snapshot.key;
  }
  var sessions = skService("sessions");
  var list = sessions === undefined || sessions.list === undefined ? undefined : sessions.list.getSnapshot();
  if (list !== null && list !== undefined && list.byId !== undefined && list.byId !== null) {
    var ids = Object.keys(list.byId);
    for (var index = 0; index < ids.length; index += 1) {
      var row = list.byId[ids[index]];
      var retained = row === null || row === undefined ? undefined : row.retainedBy;
      if (retained !== undefined && typeof retained.mainView === "number" && retained.mainView > 0) return ids[index];
    }
  }
  return "";
}

/**
 * Reactive current-session id. The launcher re-evaluates its recommendation
 * home when the user switches conversations.
 * @returns {string} session id, or "" when no conversation is active.
 */
function useSkSessionId() {
  var state = (0, import_react.useState)(skCurrentSessionId());
  var setSessionId = state[1];
  (0, import_react.useEffect)(function () {
    var read = function () {
      setSessionId(skCurrentSessionId());
    };
    var service = skService("uiSession");
    var current = service === null || service === undefined ? undefined : service.current;
    if (current !== null && current !== undefined && typeof current.subscribe === "function") {
      var dispose = current.subscribe(read);
      read();
      return function () {
        if (typeof dispose === "function") dispose();
      };
    }
    if (typeof window === "undefined" || typeof window.setInterval !== "function") return undefined;
    // Some shells expose uiSession without a subscribable current store. A
    // slow poll keeps the home honest when the user switches sessions.
    var timer = window.setInterval(read, 2000);
    return function () {
      window.clearInterval(timer);
    };
  }, []);
  return state[0];
}

/**
 * Workspace id to open a new conversation in.
 * @param {string} workspacePath - browsing scope path, or "".
 * @param {string} currentSessionId - active session id, or "".
 * @returns {string} workspace id, or "".
 */
function skWorkspaceIdFor(workspacePath, currentSessionId) {
  var workspaces = skService("workspaces");
  var snapshot = workspaces === undefined || workspaces.list === undefined ? undefined : workspaces.list.getSnapshot();
  var items = snapshot === null || snapshot === undefined || !Array.isArray(snapshot.items) ? [] : snapshot.items;
  if (workspacePath !== "") {
    for (var pathIndex = 0; pathIndex < items.length; pathIndex += 1) {
      if (items[pathIndex].path === workspacePath && typeof items[pathIndex].workspaceId === "string") return items[pathIndex].workspaceId;
    }
  }
  if (currentSessionId !== "") {
    for (var sessionIndex = 0; sessionIndex < items.length; sessionIndex += 1) {
      var owned = Array.isArray(items[sessionIndex].sessionIds) ? items[sessionIndex].sessionIds : [];
      if (owned.indexOf(currentSessionId) !== -1 && typeof items[sessionIndex].workspaceId === "string") return items[sessionIndex].workspaceId;
    }
  }
  var sessions = skService("sessions");
  var list = sessions === undefined || sessions.list === undefined ? undefined : sessions.list.getSnapshot();
  var byId = list === null || list === undefined || list.byId === undefined || list.byId === null ? {} : list.byId;
  var best = "";
  var bestTime = Number.NEGATIVE_INFINITY;
  for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    var item = items[itemIndex];
    if (typeof item.workspaceId !== "string") continue;
    var latest = Number.NEGATIVE_INFINITY;
    var sessionIds = Array.isArray(item.sessionIds) ? item.sessionIds : [];
    for (var idIndex = 0; idIndex < sessionIds.length; idIndex += 1) {
      var row = byId[sessionIds[idIndex]];
      if (row !== undefined && row !== null && typeof row.updatedAt === "number") latest = Math.max(latest, row.updatedAt);
    }
    if (latest === Number.NEGATIVE_INFINITY) {
      var created = typeof item.createdAt === "string" ? Date.parse(item.createdAt) : NaN;
      latest = Number.isFinite(created) ? created : 0;
    }
    if (best === "" || latest > bestTime) {
      best = item.workspaceId;
      bestTime = latest;
    }
  }
  return best;
}

/**
 * The official composer token for one skill.
 * @param {string} name - skill name.
 * @returns {string} `/name ` with a trailing space.
 */
function skDraftPrompt(name, continuation) {
  var token = "/" + name + " ";
  var text = typeof continuation === "string" ? continuation.trim() : "";
  return text === "" ? token : token + text;
}

/**
 * Stage one skill in a conversation's composer without sending anything.
 *
 * DSH has no per-session skill attachment; the supported non-executing path is
 * the same one the `/` picker uses: the literal `/name` token in the composer.
 * The host converts it to instructions when the user sends their own message.
 * @param {string} sessionId - target session.
 * @param {string} name - skill name.
 * @returns {Promise<string>} session id after staging.
 */
function skPrepareDraft(sessionId, name, continuation) {
  var sessions = skService("sessions");
  if (sessions === undefined || sessions === null || typeof sessions.using !== "function") {
    return Promise.reject(new Error(skT(skGetLang(), "error.invokeApi")));
  }
  return Promise.resolve(sessions.using(sessionId, { source: "charlotte" }, function (reference) {
    var binding = reference === null || reference === undefined ? undefined : reference.binding;
    var ctx = binding === null || binding === undefined ? undefined : binding.ctx;
    if (ctx === null || ctx === undefined || typeof ctx.get !== "function") {
      throw new Error(skT(skGetLang(), "error.invokeApi"));
    }
    var conversation = ctx.get("conversation");
    var input = conversation === null || conversation === undefined ? undefined : conversation.input;
    if (input === null || input === undefined || typeof input.requestDraftInitialization !== "function") {
      throw new Error(skT(skGetLang(), "error.invokeApi"));
    }
    var outcome = input.requestDraftInitialization(binding, {
      prompt: skDraftPrompt(name, continuation),
      whenDraftExists: "append"
    });
    if (outcome === "blocked") throw new Error(skT(skGetLang(), "error.loadBlocked"));
    return sessionId;
  }));
}

/**
 * Return keyboard focus to one conversation's composer; failures are ignored.
 * @param {string} sessionId - conversation to focus.
 */
function skFocusSession(sessionId) {
  var sessions = skService("sessions");
  if (typeof window === "undefined" || sessions === undefined || sessions === null || typeof sessions.binding !== "function") return;
  var attempt = function () {
    try {
      var binding = sessions.binding(sessionId);
      if (binding === null || binding === undefined) return;
      var conversation = binding.ctx.get("conversation");
      var input = conversation === null || conversation === undefined ? undefined : conversation.input;
      if (input === undefined || input === null || typeof input.for !== "function") return;
      var shell = input.for(binding.ctx);
      if (shell !== null && shell !== undefined && typeof shell.focus === "function") shell.focus();
    } catch (error) {
      // Focus is a convenience, never a load failure.
    }
  };
  window.setTimeout(attempt, 0);
  window.setTimeout(attempt, 150);
}

/**
 * Absolute workspace path of the conversation currently shown, when the host
 * lists it. Used so a load started from the inline card resolves project-level
 * skills in the same scope the recommendation was computed for.
 * @returns {string} workspace path, or "".
 */
function skCurrentWorkspacePath() {
  var workspaces = skService("workspaces");
  var snapshot = workspaces === undefined || workspaces.list === undefined ? undefined : workspaces.list.getSnapshot();
  var items = snapshot === null || snapshot === undefined || !Array.isArray(snapshot.items) ? [] : snapshot.items;
  var sessionId = skCurrentSessionId();
  if (sessionId === "") return "";
  for (var index = 0; index < items.length; index += 1) {
    var owned = Array.isArray(items[index].sessionIds) ? items[index].sessionIds : [];
    if (owned.indexOf(sessionId) !== -1 && typeof items[index].path === "string") return items[index].path;
  }
  return "";
}

/**
 * Open (or reuse) a blank conversation through the host workspace flow.
 * @param {string} workspacePath - browsing scope path.
 * @returns {Promise<string>} session id.
 */
function skEnsureSession(workspacePath) {
  var current = skCurrentSessionId();
  if (current !== "") return Promise.resolve(current);
  var uiWorkspace = skService("uiWorkspace");
  if (uiWorkspace === undefined || uiWorkspace === null || typeof uiWorkspace.connectWorkspace !== "function" || typeof uiWorkspace.openSession !== "function") {
    return Promise.reject(new Error(skT(skGetLang(), "error.invokeApi")));
  }
  var workspaceId = skWorkspaceIdFor(workspacePath, "");
  if (workspaceId === "") return Promise.reject(new Error(skT(skGetLang(), "error.noWorkspace")));
  return Promise.resolve(uiWorkspace.connectWorkspace(workspaceId)).then(function (sessionId) {
    if (typeof sessionId !== "string" || sessionId === "") throw new Error(skT(skGetLang(), "error.invokeApi"));
    uiWorkspace.openSession(sessionId);
    return sessionId;
  });
}

// #endregion

// #region load store -----------------------------------------------------------
// One observable record per skill: idle → loading → loaded / error / cancelled.
// The store is module-scoped because the row, the detail drawer and the
// recommendation dock all show the same load.
var skLoads = { byName: Object.create(null), listeners: [] };

/**
 * Read the load phase of one skill.
 * @param {string} name - skill name.
 * @returns {{phase: string, error: string, startedAt: number}} snapshot.
 */
function skLoadSnapshot(name) {
  return skLoads.byName[name] ?? { phase: "idle", error: "", startedAt: 0 };
}

/**
 * Update the load phase of one skill and notify subscribers.
 * @param {string} name - skill name.
 * @param {object} patch - fields to merge.
 */
function skLoadSet(name, patch) {
  skLoads.byName[name] = Object.assign({}, skLoadSnapshot(name), patch);
  var snapshot = skLoads.byName[name];
  for (var index = 0; index < skLoads.listeners.length; index += 1) skLoads.listeners[index](name, snapshot);
}

/**
 * Subscribe to load changes.
 * @param {Function} listener - `(name, snapshot)`.
 * @returns {Function} unsubscribe.
 */
function skLoadSubscribe(listener) {
  skLoads.listeners.push(listener);
  return function () {
    var index = skLoads.listeners.indexOf(listener);
    if (index >= 0) skLoads.listeners.splice(index, 1);
  };
}

/**
 * React hook around one skill's load record.
 * @param {string} name - skill name.
 * @returns {{phase: string, error: string, startedAt: number}} snapshot.
 */
function useSkLoad(name) {
  var state = (0, import_react.useState)(skLoadSnapshot(name));
  var setState = state[1];
  (0, import_react.useEffect)(function () {
    var onChange = function (changed, snapshot) {
      if (changed === name) setState(snapshot);
    };
    var unsubscribe = skLoadSubscribe(onChange);
    setState(skLoadSnapshot(name));
    return unsubscribe;
  }, [name]);
  return state[0];
}

/**
 * Report a client-observed phase to the host (best effort, never throws).
 * @param {string} name - skill name.
 * @param {string} phase - loaded | load-failed | cancelled.
 * @param {string} reason - failure reason.
 * @param {string} workspace - workspace path.
 * @param {string} sessionId - session id.
 */
function skReportEvent(name, phase, reason, workspace, sessionId) {
  var sid = sessionId !== undefined && sessionId !== "" ? sessionId : skCurrentSessionId();
  void skApi.event({
    sessionId: sid,
    name: name,
    phase: phase,
    reason: reason,
    ...workspace !== "" ? { workspace: workspace } : {}
  }).catch(function () {
    // Usage accounting is best effort; the load itself already succeeded.
  });
}

/**
 * Run the full load chain for one skill, or cancel an in-flight load.
 *
 * 1. ensure a session exists (opening a blank one when needed);
 * 2. authorize on the host (`/use` re-checks visibility, enablement, deps);
 * 3. stage the official token in the composer;
 * 4. report the confirmed outcome to the host; never send or submit.
 * @param {string} name - skill name.
 * @param {string} workspacePath - browsing scope path.
 * @returns {Promise<{ok: boolean, sessionId?: string, error?: string, cancelled?: boolean}>} outcome.
 */
function skUseSkill(name, workspacePath, options) {
  var settings = options ?? {};
  var continuation = typeof settings.continuation === "string" ? settings.continuation.trim() : "";
  var scopePath = workspacePath !== "" ? workspacePath : skCurrentWorkspacePath();
  var current = skLoadSnapshot(name);
  if (current.phase === "loading") {
    if (current.controller !== undefined && current.controller !== null) current.controller.abort();
    skLoadSet(name, { phase: "cancelled", controller: null });
    skReportEvent(name, "cancelled", "", scopePath, "");
    return Promise.resolve({ ok: false, cancelled: true });
  }
  var controller = typeof AbortController === "function" ? new AbortController() : undefined;
  skLoadSet(name, { phase: "loading", error: "", controller: controller, startedAt: Date.now() });
  var sessionId = "";
  return skEnsureSession(scopePath).then(function (sid) {
    sessionId = sid;
    return skApi.use({ name: name, workspace: scopePath, sessionId: sid }, controller === undefined ? undefined : controller.signal);
  }).then(function (result) {
    if (!result.ok) throw new Error(skApiError(result));
    return skPrepareDraft(sessionId, name, continuation);
  }).then(function () {
    skFocusSession(sessionId);
    skLoadSet(name, { phase: "loaded", error: "", controller: null });
    skReportEvent(name, "loaded", "", scopePath, sessionId);
    if (typeof window !== "undefined") {
      window.setTimeout(function () {
        if (skLoadSnapshot(name).phase === "loaded") skLoadSet(name, { phase: "idle" });
      }, 4000);
    }
    return { ok: true, sessionId: sessionId, continuation: continuation !== "" };
  }).catch(function (error) {
    var aborted = error !== null && error !== undefined && (error.name === "AbortError" || String(error).indexOf("aborted") !== -1);
    if (aborted) {
      skLoadSet(name, { phase: "cancelled", controller: null });
      skReportEvent(name, "cancelled", "", scopePath, sessionId);
      return { ok: false, cancelled: true };
    }
    var reason = error instanceof Error ? error.message : String(error);
    skLoadSet(name, { phase: "error", error: reason, controller: null });
    skReportEvent(name, "load-failed", reason, scopePath, sessionId);
    return { ok: false, error: reason };
  });
}

// #endregion

// #region recent recommendations ---------------------------------------------
// The dock records what it actually showed. The detail drawer only displays a
// recommendation reason that really happened in this page lifetime; nothing is
// reconstructed or invented.
var skRecentRecs = Object.create(null);

/**
 * Remember one shown recommendation.
 * @param {string} name - skill name.
 * @param {{reason?: string, category?: object, at?: number, sessionId?: string}} info - shown facts.
 */
function skRememberRecommendation(name, info) {
  skRecentRecs[name] = {
    reason: typeof info.reason === "string" ? info.reason : "",
    reasonEn: typeof info.reasonEn === "string" ? info.reasonEn : "",
    category: info.category ?? null,
    at: info.at ?? Date.now(),
    sessionId: info.sessionId ?? ""
  };
}

// #endregion

// #region glyphs ---------------------------------------------------------------
/**
 * One stroke glyph per category.
 * @param {{id?: string, size?: number}} props - category id and pixel size.
 * @returns {object} SVG element.
 */
function SkCatGlyph(props) {
  var size = props.size === undefined ? 17 : props.size;
  var id = props.id ?? "collab";
  var paths = {
    dev: ["M4 5l-2 5 2 5", "M12 5l2 5-2 5", "M9 4l-2 12"],
    quality: ["M3 10l2.5 2.5L10 5", "M4 15h12"],
    understanding: ["M4 4h8l4 4v8H4z", "M8 4v4h4"],
    docs: ["M4 3.5h8l4 4V17H4z", "M7 9h6M7 12h6M7 15h3"],
    collab: ["M7 4h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M8 8h4M8 11h4"],
    design: ["M3 17l4-8 3 5 2-3 5 6z", "M13 4h3v3"],
    office: ["M3 4h14v12H3z", "M3 8h14M9 8v8"],
    mail: ["M3 5h14v10H3z", "M3.5 6l6.5 5 6.5-5"],
    learning: ["M3 8l7-4 7 4-7 4z", "M6 10v4c0 1 2 2 4 2s4-1 4-2v-4"]
  };
  var d = paths[id] ?? paths.collab;
  var children = d.map(function (path, index) {
    return skH("path", { d: path }, "p" + String(index));
  });
  return sk("svg", {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, children);
}

/**
 * Star glyph (favourite marks).
 * @param {{filled?: boolean, size?: number}} props - fill state.
 * @returns {object} SVG element.
 */
function SkStar(props) {
  var size = props.size === undefined ? 13 : props.size;
  return sk("svg", {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: props.filled === true ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: "1.4",
    "aria-hidden": "true"
  }, [skH("path", { d: "M8 1.8l1.8 3.8 4.1.6-3 2.9.7 4.1L8 11.3 4.4 13.2l.7-4.1-3-2.9 4.1-.6z" }, "s")]);
}

/**
 * Pin glyph.
 * @param {{filled?: boolean, size?: number}} props - fill state.
 * @returns {object} SVG element.
 */
function SkPinGlyph(props) {
  var size = props.size === undefined ? 13 : props.size;
  return sk("svg", {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: props.filled === true ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: "1.4",
    "aria-hidden": "true"
  }, [skH("path", { d: "M9.5 2.5l4 4-2.2.6-2.6 2.6.3 2.4-1.1 1.1-2-2-3 3-.7-.7 3-3-2-2 1.1-1.1 2.4.3 2.6-2.6z" }, "p")]);
}

/**
 * Four-point sparkle used by the recommendation entry points.
 * @param {{size?: number}} props - pixel size.
 * @returns {object} SVG element.
 */
function SkSparkGlyph(props) {
  var size = props.size === undefined ? 15 : props.size;
  return sk("svg", {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, [
    skH("path", { d: "M10 2.5l1.7 5.8L17.5 10l-5.8 1.7L10 17.5l-1.7-5.8L2.5 10l5.8-1.7z" }, "a"),
    skH("path", { d: "M15.5 2.5v3M17 4h-3" }, "b")
  ]);
}

/**
 * Grid glyph for the all-skills entry.
 * @param {{size?: number}} props - pixel size.
 * @returns {object} SVG element.
 */
function SkGridGlyph(props) {
  var size = props.size === undefined ? 15 : props.size;
  return sk("svg", {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.4",
    "aria-hidden": "true"
  }, [
    skH("rect", { x: "3.5", y: "3.5", width: "5", height: "5", rx: "1" }, "a"),
    skH("rect", { x: "11.5", y: "3.5", width: "5", height: "5", rx: "1" }, "b"),
    skH("rect", { x: "3.5", y: "11.5", width: "5", height: "5", rx: "1" }, "c"),
    skH("rect", { x: "11.5", y: "11.5", width: "5", height: "5", rx: "1" }, "d")
  ]);
}

/**
 * Sliders glyph for the management entry.
 * @param {{size?: number}} props - pixel size.
 * @returns {object} SVG element.
 */
function SkSlidersGlyph(props) {
  var size = props.size === undefined ? 15 : props.size;
  return sk("svg", {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.4",
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, [
    skH("path", { d: "M3 6h8M14 6h3" }, "a"),
    skH("circle", { cx: "13", cy: "6", r: "1.7" }, "b"),
    skH("path", { d: "M3 14h3M9 14h8" }, "c"),
    skH("circle", { cx: "7.5", cy: "14", r: "1.7" }, "d")
  ]);
}

// #endregion

// #region small pieces ---------------------------------------------------------
/**
 * Search field with ⌘K focus shortcut.
 * @param {{value: string, onChange: Function, lang: 'zh'|'en'}} props - props.
 * @returns {object} search box.
 */
function SkSearch(props) {
  var lang = props.lang;
  var ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(function () {
    var onKey = function (event) {
      var meta = event.metaKey || event.ctrlKey;
      if (!meta || event.key.toLowerCase() !== "k") return;
      if (typeof document === "undefined" || document.querySelector(".sk_station") === null) return;
      event.preventDefault();
      if (ref.current !== null) ref.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return sk("div", { className: "sk_search" }, [
    sk("svg", {
      className: "sk_searchIcon",
      width: 13,
      height: 13,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      "aria-hidden": "true"
    }, [skH("circle", { cx: "7", cy: "7", r: "4.5" }, "c"), skH("path", { d: "M10.5 10.5L14 14", strokeLinecap: "round" }, "l")]),
    sk("input", {
      ref: ref,
      className: "sk_searchInput",
      type: "search",
      value: props.value,
      placeholder: props.placeholder ?? skT(lang, "search.placeholder"),
      "aria-label": props.placeholder ?? skT(lang, "search.placeholder"),
      onChange: function (event) {
        props.onChange(event.target.value);
      }
    }),
    sk("kbd", { className: "sk_kbd" }, skT(lang, "search.kbd"))
  ]);
}

/**
 * The favourites page: pinned, then favourites, then frequently used. Rows
 * come only from host state; a skill appears in exactly one group.
 * @param {{skills: Array, lang: 'zh'|'en', onUse: Function, onDetail: Function, onPref: Function, onBrowseAll: Function}} props - props.
 * @returns {object} page content.
 */
function SkFavourites(props) {
  var lang = props.lang;
  var groups = skFavGroups(props.skills);
  if (groups.length === 0) {
    return sk("div", { className: "sk_emptyPanel" }, [
      sk("span", { className: "sk_emptyGlyph" }, [skH(SkStar, { size: 22, filled: false })]),
      sk("h3", { className: "sk_emptyTitle" }, skT(lang, "fav.empty.title")),
      sk("p", { className: "sk_emptyHint" }, skT(lang, "fav.empty.hint")),
      sk("button", {
        className: "sk_textBtn",
        type: "button",
        onClick: function () { props.onBrowseAll(); }
      }, skT(lang, "fav.empty.browse"))
    ]);
  }
  return sk("div", { className: "sk_favPage" }, [
    groups.map(function (group) {
      return sk("section", { key: "fav-group-" + group.id, className: "sk_favGroup" }, [
        sk("div", { className: "sk_groupHead" }, [
          sk("span", { className: "sk_groupLabel" }, skT(lang, group.labelKey)),
          sk("span", { className: "sk_groupCount" }, String(group.rows.length))
        ]),
        sk("div", { className: "sk_list sk_listFlat" }, group.rows.map(function (skill) {
          return skH(SkRow, {
            skill: skill,
            lang: lang,
            onUse: props.onUse,
            onDetail: props.onDetail,
            onPref: props.onPref
          }, "fav-row-" + skill.name);
        }))
      ]);
    })
  ]);
}

/**
 * Left navigation: smart picks, favourites, functional categories and the
 * management entry. Every count comes from the live index.
 * @param {object} props - props.
 * @returns {object} sidebar.
 */
function SkSide(props) {
  var lang = props.lang;
  var item = function (id, label, glyph, count, active, onClick) {
    return sk("button", {
      key: "nav-" + id,
      className: "sk_navItem",
      type: "button",
      "data-on": active ? "" : undefined,
      "aria-current": active ? "page" : undefined,
      onClick: onClick
    }, [
      sk("span", { className: "sk_navGlyph" }, glyph),
      sk("span", { className: "sk_navName" }, label),
      count === null || count === undefined ? null : sk("em", { className: "sk_navCount" }, String(count))
    ]);
  };
  return sk("aside", { className: "sk_side" }, [
    sk("div", { className: "sk_sideBrand" }, [
      sk("h1", { className: "sk_sideTitle" }, skT(lang, "panel.title")),
      sk("p", { className: "sk_sideSub" }, props.heroSub)
    ]),
    sk("nav", { className: "sk_nav", "aria-label": skT(lang, "nav.categories") }, [
      item("home", skT(lang, "nav.recommend"), skH(SkSparkGlyph, { size: 15 }), null, props.view === "home", function () { props.onView("home"); }),
      item("favorites", skT(lang, "nav.favorites"), skH(SkStar, { size: 14, filled: true }), props.favouritesCount, props.view === "favorites", function () { props.onView("favorites"); }),
      sk("div", { className: "sk_navLabel" }, skT(lang, "nav.categories")),
      item("all", skT(lang, "nav.all"), skH(SkGridGlyph, { size: 15 }), props.total, props.view === "all" && props.category === "", function () { props.onCategory(""); }),
      props.categories.map(function (category) {
        return item(
          "cat-" + category.id,
          lang === "zh" ? category.label : category.labelEn,
          skH(SkCatGlyph, { id: category.id, size: 15 }),
          category.count,
          props.view === "all" && props.category === category.id,
          function () { props.onCategory(category.id); }
        );
      })
    ]),
    sk("div", { className: "sk_sideFoot" }, [
      skH(SkMoreMenu, {
        lang: lang,
        workspace: props.workspace,
        workspaces: props.workspaces,
        onWorkspace: props.onWorkspace,
        onPanel: props.onPanel,
        onRefresh: props.onRefresh,
        variant: "nav",
        placement: "up"
      })
    ])
  ]);
}

/**
 * The single featured recommendation: name, complete purpose, reason and the
 * real use action.
 * @param {{item: object, lang: 'zh'|'en', intent: string, onUse: Function, onDetail: Function}} props - props.
 * @returns {object} card.
 */
function SkHomeHero(props) {
  var lang = props.lang;
  var item = props.item;
  var skill = item.skill;
  var state = skStateOf(skill, lang);
  var load = useSkLoad(skill.name);
  var busy = load.phase === "loading";
  var purpose = skSkillIntro(skill, lang);
  var official = lang === "zh" && skill.description !== "" && skill.description !== purpose ? skill.description : "";
  var label = busy ? skT(lang, "action.cancel") : load.phase === "loaded" ? skT(lang, "action.useAgain") : skT(lang, "home.use");
  var deps = Array.isArray(skill.requires) ? skill.requires : [];
  var uses = (Number(skill.stats?.loads) || 0) + (Number(skill.stats?.invokes) || 0);
  return sk("article", { className: "sk_recHero" }, [
    sk("header", { className: "sk_recHead" }, [
      sk("span", { className: "sk_recGlyph" }, [skH(SkCatGlyph, { id: skill.category?.id, size: 20 })]),
      sk("div", { className: "sk_recHeading" }, [
        sk("div", { className: "sk_recNameRow" }, [
          sk("h3", { className: "sk_recName" }, skill.name),
          sk("span", { className: "sk_recBadge" }, skT(lang, "home.best")),
          sk("span", { className: "sk_recCat" }, lang === "zh" ? skill.category?.label ?? "" : skill.category?.labelEn ?? "")
        ]),
        sk("div", { className: "sk_recMeta" }, [
          sk("span", { className: "sk_dot", "data-kind": state.dot }),
          sk("span", null, state.label),
          sk("span", { className: "sk_recSep" }, "·"),
          sk("span", null, skill.source?.label ?? ""),
          skill.version !== null && skill.version !== undefined ? sk("span", { className: "sk_recSep" }, "·") : null,
          skill.version !== null && skill.version !== undefined ? sk("span", null, "v" + String(skill.version)) : null,
          uses > 0 ? sk("span", { className: "sk_recSep" }, "·") : null,
          uses > 0 ? sk("span", null, skT(lang, "home.uses", { count: uses })) : null
        ])
      ])
    ]),
    sk("p", { className: "sk_recPurpose" }, purpose),
    official !== "" ? sk("p", { className: "sk_recOfficial" }, official) : null,
    sk("div", { className: "sk_recReasonBox" }, [
      sk("span", { className: "sk_recReasonLabel" }, skT(lang, "home.reason")),
      sk("p", { className: "sk_recReasonText" }, skHomeReason(item, lang))
    ]),
    sk("footer", { className: "sk_recFoot" }, [
      sk("button", {
        className: "sk_recUse",
        type: "button",
        disabled: !state.usable && !busy,
        onClick: function () {
          props.onUse(skill, skContinuationPrompt(skill, props.intent, lang), true);
        }
      }, label),
      sk("button", {
        className: "sk_textBtn",
        type: "button",
        onClick: function () { props.onDetail(skill); }
      }, skT(lang, "home.details")),
      sk("span", { className: "sk_recDeps" }, deps.length === 0
        ? skT(lang, "home.noDeps")
        : deps.map(function (row) { return row.name; }).join("、") + " · " + skT(lang, "detail.dependenciesSatisfied"))
    ])
  ]);
}

/**
 * A secondary recommendation row (at most two extra picks).
 * @param {{item: object, lang: 'zh'|'en', intent: string, onUse: Function, onDetail: Function}} props - props.
 * @returns {object} row.
 */
function SkHomeRow(props) {
  var lang = props.lang;
  var item = props.item;
  var skill = item.skill;
  var state = skStateOf(skill, lang);
  var load = useSkLoad(skill.name);
  var busy = load.phase === "loading";
  var label = busy ? skT(lang, "action.cancel") : load.phase === "loaded" ? skT(lang, "action.useAgain") : skT(lang, "action.use");
  return sk("div", { className: "sk_recRow", role: "button", tabIndex: 0, onClick: function () { props.onDetail(skill); } }, [
    sk("span", { className: "sk_recRowGlyph" }, [skH(SkCatGlyph, { id: skill.category?.id, size: 16 })]),
    sk("div", { className: "sk_recRowMain" }, [
      sk("div", { className: "sk_recRowName" }, [
        sk("span", { className: "sk_recRowNameText" }, skill.name),
        sk("span", { className: "sk_recCat" }, lang === "zh" ? skill.category?.label ?? "" : skill.category?.labelEn ?? "")
      ]),
      sk("p", { className: "sk_recRowPurpose" }, skSkillIntro(skill, lang)),
      sk("p", { className: "sk_recRowReason" }, skHomeReason(item, lang))
    ]),
    sk("div", { className: "sk_recRowActions" }, [
      sk("button", {
        className: "sk_use",
        type: "button",
        disabled: !state.usable && !busy,
        onClick: function (event) {
          event.stopPropagation();
          props.onUse(skill, skContinuationPrompt(skill, props.intent, lang), true);
        }
      }, label),
      sk("button", {
        className: "sk_detailBtn",
        type: "button",
        onClick: function (event) {
          event.stopPropagation();
          props.onDetail(skill);
        }
      }, skT(lang, "action.detail"))
    ])
  ]);
}

/**
 * The smart-picks home. It shows the host's live recommendation when one
 * exists, otherwise real usage history; when neither can produce a trustworthy
 * pick it shows only a search field and the functional categories.
 * @param {object} props - props.
 * @returns {object} home view.
 */
function SkHome(props) {
  var lang = props.lang;
  var data = props.data;
  var items = data !== null && data !== undefined && Array.isArray(data.items) ? data.items : [];
  var source = data?.source ?? "none";
  var intent = source === "conversation" && typeof data.intent === "string" && data.intent !== "" ? skClip(data.intent, 90) : "";
  var intentSource = source === "conversation" && typeof data.intent === "string" ? data.intent : "";
  var contextLabel = source === "conversation" ? skT(lang, "home.level.conversation") : skT(lang, "home.level.history");
  return sk("div", { className: "sk_home" }, [
    sk("div", { className: "sk_homeBar" }, [
      sk("div", { className: "sk_homeContext" }, [
        source === "none" ? null : sk("span", { className: "sk_homeContextBadge" }, contextLabel),
        intent !== "" ? sk("span", { className: "sk_homeIntent", title: data.intent }, skT(lang, "home.intent", { intent: intent })) : null
      ]),
      sk("button", {
        className: "sk_textBtn",
        type: "button",
        disabled: props.loading,
        onClick: function () { props.onRefresh(); }
      }, skT(lang, "home.refresh"))
    ]),
    props.loading
      ? sk("div", { className: "sk_homeLoading" }, skT(lang, "home.loading"))
      : props.error !== ""
        ? sk("div", { className: "sk_emptyPanel sk_homeError" }, [
          sk("h3", { className: "sk_emptyTitle" }, skT(lang, "home.empty.title")),
          sk("p", { className: "sk_emptyHint" }, props.error),
          sk("button", { className: "sk_textBtn", type: "button", onClick: function () { props.onRefresh(); } }, skT(lang, "action.retry"))
        ])
        : items.length === 0
          ? sk("section", { className: "sk_emptyPanel" }, [
            sk("span", { className: "sk_emptyGlyph" }, [skH(SkSparkGlyph, { size: 22 })]),
            sk("h3", { className: "sk_emptyTitle" }, skT(lang, "home.empty.title")),
            sk("p", { className: "sk_emptyHint" }, skT(lang, "home.empty.hint")),
            sk("div", { className: "sk_homeSearch" }, [
              skH(SkSearch, {
                value: props.query,
                lang: lang,
                placeholder: skT(lang, "home.empty.search"),
                onChange: function (value) { props.onSearch(value); }
              })
            ]),
            sk("div", { className: "sk_homeCats" }, props.categories.map(function (category) {
              return sk("button", {
                key: "home-cat-" + category.id,
                className: "sk_homeCat",
                type: "button",
                onClick: function () { props.onCategory(category.id); }
              }, (lang === "zh" ? category.label : category.labelEn) + " " + String(category.count));
            })),
            sk("button", {
              className: "sk_textBtn",
              type: "button",
              onClick: function () { props.onView("all"); }
            }, skT(lang, "nav.all"))
          ])
          : sk(skF, null, [
            skH(SkHomeHero, {
              item: items[0],
              lang: lang,
              intent: intentSource,
              onUse: props.onUse,
              onDetail: props.onDetail
            }),
            items.length > 1 ? sk("div", { className: "sk_recSecondary" }, [
              sk("div", { className: "sk_groupHead" }, [
                sk("span", { className: "sk_groupLabel" }, skT(lang, "home.secondary")),
                sk("span", { className: "sk_groupCount" }, String(items.length - 1))
              ]),
              items.slice(1, 3).map(function (item) {
                return skH(SkHomeRow, {
                  item: item,
                  lang: lang,
                  intent: intentSource,
                  onUse: props.onUse,
                  onDetail: props.onDetail
                }, "home-row-" + item.name);
              })
            ]) : null,
            sk("p", { className: "sk_homeNote" }, skT(lang, "home.note"))
          ])
  ]);
}

/**
 * One compact skill row.
 * @param {{skill: object, lang: 'zh'|'en', onUse: Function, onDetail: Function, onPref: Function}} props - props.
 * @returns {object} row.
 */
function SkRow(props) {
  var skill = props.skill;
  var lang = props.lang;
  var state = skStateOf(skill, lang);
  var load = useSkLoad(skill.name);
  var busy = load.phase === "loading";
  var label = load.phase === "loading" ? skT(lang, "action.cancel") : load.phase === "loaded" ? skT(lang, "action.useAgain") : skT(lang, "action.use");
  return sk("div", {
    className: "sk_row",
    role: "button",
    tabIndex: 0,
    onClick: function () { props.onDetail(skill); },
    onKeyDown: function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        props.onDetail(skill);
      }
    }
  }, [
    sk("div", { className: "sk_glyph" }, [skH(SkCatGlyph, { id: skill.category?.id })]),
    sk("div", { className: "sk_rowMain" }, [
      sk("div", { className: "sk_rowName" }, [
        sk("span", { className: "sk_rowNameText" }, skill.name),
        skill.version !== null && skill.version !== undefined ? sk("span", { className: "sk_ver" }, "v" + String(skill.version)) : null
      ]),
      sk("div", { className: "sk_rowDesc" }, skSkillIntro(skill, lang))
    ]),
    sk("div", { className: "sk_state" }, [sk("span", { className: "sk_dot", "data-kind": state.dot }), state.label]),
    sk("div", { className: "sk_src", title: skill.source?.detail ?? "" }, skill.source?.label ?? ""),
    sk("div", { className: "sk_actions" }, [
      sk("button", {
        className: "sk_iconBtn",
        type: "button",
        "data-on": skill.stats.favorite ? "" : undefined,
        title: skT(lang, skill.stats.favorite ? "action.unfavorite" : "action.favorite"),
        "aria-label": skT(lang, skill.stats.favorite ? "action.unfavorite" : "action.favorite"),
        onClick: function (event) {
          event.stopPropagation();
          props.onPref(skill, { favorite: !skill.stats.favorite });
        }
      }, [skH(SkStar, { filled: skill.stats.favorite === true })]),
      sk("button", {
        className: "sk_iconBtn",
        type: "button",
        "data-on": skill.stats.pinned ? "" : undefined,
        title: skT(lang, skill.stats.pinned ? "action.unpin" : "action.pin"),
        "aria-label": skT(lang, skill.stats.pinned ? "action.unpin" : "action.pin"),
        onClick: function (event) {
          event.stopPropagation();
          props.onPref(skill, { pinned: !skill.stats.pinned });
        }
      }, [skH(SkPinGlyph, { filled: skill.stats.pinned === true })]),
      sk("button", {
        className: "sk_use",
        type: "button",
        disabled: !state.usable && !busy,
        onClick: function (event) {
          event.stopPropagation();
          props.onUse(skill);
        }
      }, label),
      sk("button", {
        className: "sk_detailBtn",
        type: "button",
        onClick: function (event) {
          event.stopPropagation();
          props.onDetail(skill);
        }
      }, skT(lang, "action.detail"))
    ])
  ]);
}

// #endregion

// #region toolbar ---------------------------------------------------------------
/**
 * Sort control, source filter and availability filter.
 * @param {object} props - props.
 * @returns {object} toolbar.
 */
function SkToolbar(props) {
  var lang = props.lang;
  var sources = [{ id: "all", label: skT(lang, "source.all"), count: props.total }].concat(props.sourceRows.map(function (row) {
    return { id: row.type, label: row.label, count: row.count };
  }));
  var states = [
    { id: "all", label: skT(lang, "state.all") },
    { id: "both", label: skT(lang, "state.both") },
    { id: "user", label: skT(lang, "state.user") },
    { id: "model", label: skT(lang, "state.model") },
    { id: "off", label: skT(lang, "state.off") },
    { id: "disabled", label: skT(lang, "rail.disabled") }
  ];
  var sourceLabel = props.source === "all" ? skT(lang, "filter.all") : (sources.find(function (row) { return row.id === props.source; }) ?? { label: props.source }).label;
  var stateLabel = props.state === "all" ? skT(lang, "filter.all") : (states.find(function (row) { return row.id === props.state; }) ?? { label: props.state }).label;
  var menu = props.menu;
  return sk("div", { className: "sk_toolbar" }, [
    sk("div", { className: "sk_sorts", role: "group", "aria-label": skT(lang, "sort.label") }, [
      sk("button", { className: "sk_sort", type: "button", "data-on": props.sort === "freq" ? "" : undefined, onClick: function () { props.onSort("freq"); } }, skT(lang, "sort.freq")),
      sk("button", { className: "sk_sort", type: "button", "data-on": props.sort === "name" ? "" : undefined, onClick: function () { props.onSort("name"); } }, skT(lang, "sort.name")),
      sk("button", { className: "sk_sort", type: "button", "data-on": props.sort === "recent" ? "" : undefined, onClick: function () { props.onSort("recent"); } }, skT(lang, "sort.recent"))
    ]),
    sk("div", { className: "sk_filters" }, [
      sk("button", {
        className: "sk_filter",
        type: "button",
        "data-act": props.source !== "all" ? "" : undefined,
        "aria-expanded": menu === "source" ? "true" : "false",
        onClick: function () { props.onMenu(menu === "source" ? null : "source"); }
      }, skT(lang, "filter.source", { name: sourceLabel }) + " ▾"),
      sk("button", {
        className: "sk_filter",
        type: "button",
        "data-act": props.state !== "all" ? "" : undefined,
        "aria-expanded": menu === "state" ? "true" : "false",
        onClick: function () { props.onMenu(menu === "state" ? null : "state"); }
      }, skT(lang, "filter.state", { name: stateLabel }) + " ▾"),
      menu === "source" ? sk("div", { className: "sk_filterMenu", role: "menu" }, sources.map(function (row) {
        return sk("button", {
          key: "src-" + row.id,
          className: "sk_filterItem",
          type: "button",
          role: "menuitemradio",
          "aria-checked": props.source === row.id ? "true" : "false",
          "data-on": props.source === row.id ? "" : undefined,
          onClick: function () {
            props.onSource(row.id);
            props.onMenu(null);
          }
        }, [sk("span", null, row.label), sk("em", null, String(row.count))]);
      })) : null,
      menu === "state" ? sk("div", { className: "sk_filterMenu", role: "menu" }, states.map(function (row) {
        return sk("button", {
          key: "state-" + row.id,
          className: "sk_filterItem",
          type: "button",
          role: "menuitemradio",
          "aria-checked": props.state === row.id ? "true" : "false",
          "data-on": props.state === row.id ? "" : undefined,
          onClick: function () {
            props.onState(row.id);
            props.onMenu(null);
          }
        }, row.label);
      })) : null
    ])
  ]);
}

// #endregion

// #region detail drawer ----------------------------------------------------------
/**
 * Right-side detail drawer: full description, provenance, permissions,
 * dependencies, real usage history, and the controls for this skill.
 * @param {object} props - props.
 * @returns {object} drawer.
 */
function SkDetailDrawer(props) {
  var skill = props.skill;
  var lang = props.lang;
  var state = skStateOf(skill, lang);
  var load = useSkLoad(skill.name);
  var recent = skRecentRecs[skill.name];
  var introText = skSkillIntro(skill, lang);
  var writable = skill.management?.kind === "writable";
  var mounted = skill.management?.kind === "mounted";
  var evidence = Array.isArray(skill.category?.evidence) ? skill.category.evidence : [];
  var triggers = skill.triggers ?? { values: [], provenance: "absent" };
  var usageRows = Array.isArray(skill.stats?.recent) ? skill.stats.recent.slice(-6).reverse() : [];
  var tagState = (0, import_react.useState)(Array.isArray(skill.tags) ? skill.tags : []);
  var tags = tagState[0];
  var setTags = tagState[1];
  var tagDraftState = (0, import_react.useState)("");
  var tagDraft = tagDraftState[0];
  var setTagDraft = tagDraftState[1];
  var copiedState = (0, import_react.useState)(false);
  var copied = copiedState[0];
  var setCopied = copiedState[1];
  var busyState = (0, import_react.useState)("");
  var busy = busyState[0];
  var setBusy = busyState[1];
  (0, import_react.useEffect)(function () {
    setTags(Array.isArray(skill.tags) ? skill.tags : []);
    setTagDraft("");
  }, [skill.name]);
  var saveTags = function (next) {
    var value = Array.isArray(next) ? next : [];
    var previous = tags;
    setTags(value);
    void skApi.tags({ name: skill.name, tags: value, workspace: props.workspace }).then(function (result) {
      if (!result.ok) {
        // The list was updated optimistically; put it back so the screen
        // never claims a save that failed.
        setTags(previous);
        props.onNotice("err", skT(lang, "notice.tagsFailed", { reason: skApiError(result) }));
        return;
      }
      setTags(Array.isArray(result.body.tags) ? result.body.tags : value);
      props.onNotice("ok", skT(lang, "notice.tagsSaved"));
    });
  };
  var commitTag = function () {
    var value = tagDraft.trim();
    if (value === "") return;
    setTagDraft("");
    if (tags.indexOf(value) !== -1) return;
    saveTags(tags.concat([value]));
  };
  var copyBody = function () {
    setBusy("copy");
    void skApi.body(skill.name, props.workspace).then(function (result) {
      if (!result.ok) {
        props.onNotice("err", skT(lang, "notice.copyFailed", { reason: skApiError(result) }));
        return;
      }
      var text = typeof result.body.content === "string" ? result.body.content : "";
      if (navigator.clipboard === undefined || typeof navigator.clipboard.writeText !== "function") {
        props.onNotice("err", skT(lang, "notice.copyFailed", { reason: "clipboard unavailable" }));
        return;
      }
      return navigator.clipboard.writeText(text).then(function () {
        setCopied(true);
        window.setTimeout(function () { setCopied(false); }, 2000);
      });
    }).finally(function () { setBusy(""); });
  };
  var migrateSkill = function () {
    setBusy("migrate");
    void skApi.migrate({ name: skill.name, rootId: skill.management?.rootId, workspace: props.workspace }).then(function (result) {
      if (!result.ok) {
        props.onNotice("err", skT(lang, "notice.migrateRefused", { reason: skApiError(result) }));
        return;
      }
      props.onNotice("ok", skT(lang, "notice.migrated", { path: result.body.link ?? "" }));
      props.onClose();
    }).finally(function () { setBusy(""); });
  };
  (0, import_react.useEffect)(function () {
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      props.onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return function () {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [props.onClose]);
  var sourceDetail = skill.source?.detail !== undefined && skill.source.detail !== ""
    ? skT(lang, "detail.sourceDetail", { label: skill.source.label, detail: skill.source.detail })
    : skill.source?.label ?? "";
  return sk(skF, null, [
    sk("div", { className: "sk_drawerScrim", onClick: props.onClose }),
    sk("aside", { className: "sk_drawer", role: "dialog", "aria-modal": "true", "aria-label": skill.name }, [
      sk("header", { className: "sk_drawerHead" }, [
        sk("div", { className: "sk_drawerTop" }, [
          sk("div", { className: "sk_drawerTitle" }, [
            sk("h2", { className: "sk_dName" }, skill.name),
            sk("div", { className: "sk_dMeta" }, [
              sk("span", null, skill.source?.label ?? ""),
              skill.version !== null && skill.version !== undefined ? sk("span", null, "v" + String(skill.version)) : null,
              sk("span", { className: state.usable ? "sk_ok" : "sk_bad" }, state.label)
            ])
          ]),
          sk("button", { className: "sk_closeBtn", type: "button", "aria-label": skT(lang, "action.close"), onClick: props.onClose }, "✕")
        ])
      ]),
      sk("div", { className: "sk_drawerBody" }, [
        sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.intro")),
          sk("p", { className: "sk_secText" }, introText)
        ]),
        skill.description !== "" && skill.description !== introText ? sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.official")),
          sk("p", { className: "sk_secText", "data-dim": "" }, skill.description)
        ]) : null,
        lang === "zh" && (skill.i18n?.professional ?? skill.i18n?.descriptionZh) !== undefined
          && (skill.i18n?.professional ?? skill.i18n?.descriptionZh) !== null
          && (skill.i18n?.professional ?? skill.i18n?.descriptionZh) !== ""
          ? sk("div", { className: "sk_sec" }, [
            sk("div", { className: "sk_secLabel" }, skT(lang, "detail.professional")),
            sk("p", { className: "sk_secText" }, skill.i18n?.professional ?? skill.i18n?.descriptionZh)
          ])
          : null,
        recent !== undefined && recent.reason !== "" ? sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.why")),
          sk("div", { className: "sk_why" }, lang === "en" && typeof recent.reasonEn === "string" && recent.reasonEn !== "" ? recent.reasonEn : recent.reason),
          sk("p", { className: "sk_secText", "data-dim": "" }, skAge(recent.at, lang))
        ]) : null,
        evidence.length > 0 ? sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.category")),
          sk("div", { className: "sk_chipRow" }, [
            sk("span", { className: "sk_evidence" }, (lang === "zh" ? skill.category.label : skill.category.labelEn) + " · " + skill.category.confidence)
          ].concat(evidence.map(function (row) {
            return sk("span", { key: "ev-" + row.term, className: "sk_evidence" }, row.term);
          })))
        ]) : null,
        skill.useCases.length > 0 ? sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.useCases")),
          sk("ul", { className: "sk_bullets" }, skill.useCases.map(function (row, index) {
            return sk("li", { key: "use-" + String(index) }, row);
          }))
        ]) : null,
        triggers.values.length > 0 ? sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.triggers")),
          sk("ul", { className: "sk_bullets" }, triggers.values.map(function (row, index) {
            return sk("li", { key: "tr-" + String(index) }, row);
          })),
          triggers.provenance === "derived" ? sk("p", { className: "sk_secText", "data-dim": "", style: { marginTop: "4px" } }, skT(lang, "detail.triggersDerived")) : null
        ]) : null,
        skill.avoidCases.length > 0 ? sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.avoid")),
          sk("ul", { className: "sk_bullets" }, skill.avoidCases.map(function (row, index) {
            return sk("li", { key: "av-" + String(index) }, row);
          }))
        ]) : null,
        skill.keywords.length > 0 ? sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.keywords")),
          sk("div", { className: "sk_chipRow" }, skill.keywords.slice(0, 10).map(function (row) {
            return sk("span", { key: "kw-" + row, className: "sk_evidence" }, row);
          }))
        ]) : null,
        sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.perms")),
          sk("dl", { className: "sk_kv" }, [
            sk("dt", null, skT(lang, "detail.userInvocable")),
            sk("dd", { className: skill.policy?.userInvocable ? "sk_ok" : "sk_bad" }, skill.policy?.userInvocable ? "✓" : "✕"),
            sk("dt", null, skT(lang, "detail.modelInvocable")),
            sk("dd", { className: skill.policy?.modelInvocable ? "sk_ok" : "sk_bad" }, skill.policy?.modelInvocable ? "✓" : "✕"),
            sk("dt", null, skT(lang, "detail.deps")),
            sk("dd", null, skill.requires.length === 0
              ? skT(lang, "detail.noDeps")
              : skill.requires.map(function (row) {
                return row.name + " (" + (row.satisfied ? skT(lang, "detail.dependenciesSatisfied") : skT(lang, "detail.dependenciesMissing")) + ")";
              }).join("，")),
            sk("dt", null, skT(lang, "detail.risk")),
            sk("dd", null, skT(lang, "detail.riskNote")),
            sk("dt", null, skT(lang, "detail.introSource")),
            sk("dd", null, skT(lang, "intro." + (skill.i18n?.source ?? "absent")))
          ])
        ]),
        sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.source")),
          sk("dl", { className: "sk_kv" }, [
            sk("dt", null, skT(lang, "detail.source")),
            sk("dd", null, sourceDetail),
            skill.management?.path !== undefined ? sk("dt", null, skT(lang, "detail.path")) : null,
            skill.management?.path !== undefined ? sk("dd", null, skill.management.path) : null,
            skill.updatedAt !== null && skill.updatedAt !== undefined ? sk("dt", null, skT(lang, "detail.updated")) : null,
            skill.updatedAt !== null && skill.updatedAt !== undefined ? sk("dd", null, skTime(skill.updatedAt)) : null
          ])
        ]),
        skill.cost !== undefined && skill.cost !== null ? sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.cost")),
          sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "detail.costValue", { tokens: String(skill.cost.tokens), chars: String(skill.cost.chars) }))
        ]) : null,
        sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.audit")),
          skill.audit === undefined || skill.audit === null || skill.audit.clean === true
            ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "detail.auditClean"))
            : sk("ul", { className: "sk_bullets" }, skill.audit.findings.map(function (row) {
              return sk("li", { key: "au-" + row.id }, "[" + skT(lang, skSeverityKey(row.severity)) + "] " + skT(lang, "detail.audit." + row.id) + " × " + String(row.count));
            }))
        ]),
        sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.tags")),
          tags.length === 0
            ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "detail.tagsEmpty"))
            : sk("div", { className: "sk_tagRow" }, tags.map(function (tag) {
              return sk("button", {
                key: "tg-" + tag,
                className: "sk_tagChip",
                type: "button",
                title: skT(lang, "detail.tags"),
                onClick: function () { saveTags(tags.filter(function (row) { return row !== tag; })); }
              }, tag + " ✕");
            })),
          sk("div", { className: "sk_tagRow" }, [
            sk("input", {
              className: "sk_tagInput",
              type: "text",
              value: tagDraft,
              placeholder: skT(lang, "detail.tagsPlaceholder"),
              onChange: function (event) { setTagDraft(event.target.value); },
              onKeyDown: function (event) {
                // A confirming Enter during IME composition must not commit.
                if (event.isComposing || event.keyCode === 229) return;
                if (event.key !== "Enter") return;
                event.preventDefault();
                commitTag();
              }
            })
          ])
        ]),
        sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.usage")),
          usageRows.length === 0
            ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "detail.noUsage"))
            : sk("table", { className: "sk_hist" }, [sk("tbody", { key: "tb" }, usageRows.map(function (row, index) {
              return sk("tr", { key: "h-" + String(index) }, [
                sk("td", null, skTime(row.at)),
                sk("td", null, skT(lang, "usage." + (row.kind === "load-failed" ? "load-failed" : row.kind)))
              ]);
            }))])
        ]),
        sk("div", { className: "sk_sec" }, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.provenance")),
          sk("p", { className: "sk_secText", "data-dim": "" }, [
            skT(lang, "prov.declared") + "：" + Object.keys(skill.provenance ?? {}).filter(function (key) { return skill.provenance[key] === "declared"; }).join(", "),
            " · ",
            skT(lang, "prov.derived") + "：" + Object.keys(skill.provenance ?? {}).filter(function (key) { return skill.provenance[key] === "derived"; }).join(", ")
          ].join(""))
        ])
      ]),
      sk("footer", { className: "sk_drawerFoot" }, [
        sk("button", {
          className: "sk_primary",
          type: "button",
          disabled: !state.usable,
          onClick: function () { props.onUse(skill); }
        }, load.phase === "loading" ? skT(lang, "action.cancel") : skT(lang, "action.use")),
        sk("button", { className: "sk_detailBtn", type: "button", disabled: busy === "copy", onClick: copyBody }, copied ? skT(lang, "action.copied") : skT(lang, "action.copy")),
        writable && !/\.md$/.test(String(skill.management?.path ?? "")) ? sk("button", { className: "sk_detailBtn", type: "button", disabled: busy === "migrate", onClick: migrateSkill }, skT(lang, "action.migrate")) : null,
        writable ? sk("label", { className: "sk_toggle" }, [skT(lang, "detail.enableModel"), sk("button", {
          className: "sk_switch",
          type: "button",
          role: "switch",
          "aria-checked": skill.policy?.modelInvocable ? "true" : "false",
          "data-on": skill.policy?.modelInvocable ? "" : undefined,
          onClick: function () { props.onToggle(skill, "model"); }
        })]) : null,
        writable ? sk("label", { className: "sk_toggle" }, [skT(lang, "detail.enableUser"), sk("button", {
          className: "sk_switch",
          type: "button",
          role: "switch",
          "aria-checked": skill.policy?.userInvocable ? "true" : "false",
          "data-on": skill.policy?.userInvocable ? "" : undefined,
          onClick: function () { props.onToggle(skill, "user"); }
        })]) : null,
        mounted ? sk("label", { className: "sk_toggle" }, [skT(lang, "detail.enable"), sk("button", {
          className: "sk_switch",
          type: "button",
          role: "switch",
          "aria-checked": skill.policy?.disabled ? "false" : "true",
          "data-on": skill.policy?.disabled ? undefined : "",
          onClick: function () { props.onToggle(skill, "mounted"); }
        })]) : null
      ])
    ])
  ]);
}

// #endregion

// #region station panels ---------------------------------------------------------
/**
 * Secondary panel hosting the baseline install / trash views.
 * @param {{panel: 'install'|'trash', workspace: string, lang: 'zh'|'en', onClose: Function}} props - props.
 * @returns {object} panel dialog.
 */
function StationPanelDialog(props) {
  var lang = props.lang;
  var title = skT(lang, skPanelTitleKey(props.panel));
  (0, import_react.useEffect)(function () {
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [props.onClose]);
  return sk("div", { className: "sk_panelScrim", onClick: props.onClose }, [
    sk("div", {
      className: "sk_panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": title,
      onClick: function (event) { event.stopPropagation(); }
    }, [
      sk("header", { className: "sk_panelHead" }, [
        sk("h2", { className: "sk_panelTitle" }, title),
        sk("button", { className: "sk_closeBtn", type: "button", style: { marginLeft: "auto" }, onClick: props.onClose, "aria-label": skT(lang, "dialog.close") }, "✕")
      ]),
      sk("div", { className: "sk_panelBody" }, props.panel === "install"
        ? skH(InstallTab, { workspace: props.workspace })
        : props.panel === "ledger"
          ? skH(SkLedgerPanel, { lang: lang, workspace: props.workspace })
          : props.panel === "diagnostics"
            ? skH(SkDiagPanel, { lang: lang, workspace: props.workspace })
            : skH(TrashTab, {}))
    ])
  ]);
}

/**
 * The More menu: scope, secondary management, refresh, language.
 * @param {object} props - props.
 * @returns {object} menu.
 */
function SkMoreMenu(props) {
  var lang = props.lang;
  var openState = (0, import_react.useState)(false);
  var open = openState[0];
  var setOpen = openState[1];
  (0, import_react.useEffect)(function () {
    if (!open) return undefined;
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  var trigger = props.variant === "nav"
    ? sk("button", {
      className: "sk_navItem sk_manageTrigger",
      type: "button",
      "data-on": open ? "" : undefined,
      "aria-expanded": open ? "true" : "false",
      onClick: function () { setOpen(!open); }
    }, [
      sk("span", { className: "sk_navGlyph" }, [skH(SkSlidersGlyph, { size: 15 })]),
      sk("span", { className: "sk_navName" }, skT(lang, "nav.manage")),
      sk("em", { className: "sk_navChevron" }, "▾")
    ])
    : sk("button", {
      className: "sk_moreBtn",
      type: "button",
      "aria-expanded": open ? "true" : "false",
      onClick: function () { setOpen(!open); }
    }, skT(lang, "more.label") + " ▾");
  return sk("div", { className: "sk_moreWrap" + (props.placement === "up" ? " sk_moreWrapUp" : ""), onClick: function (event) { event.stopPropagation(); } }, [
    trigger,
    open ? sk("div", { className: "sk_more" + (props.placement === "up" ? " sk_moreUp" : ""), role: "menu" }, [
      sk("div", { className: "sk_moreLabel" }, skT(lang, "more.workspace")),
      sk("select", {
        className: "sk_moreSelect",
        value: props.workspace,
        "aria-label": skT(lang, "more.workspace"),
        onChange: function (event) {
          props.onWorkspace(event.target.value);
        }
      }, [sk("option", { key: "ws-all", value: "" }, skT(lang, "filter.all"))].concat(props.workspaces.map(function (row) {
        return sk("option", { key: "ws-" + row.path, value: row.path }, row.title + " · " + row.path);
      }))),
      sk("div", { className: "sk_moreSep" }),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onPanel("install"); setOpen(false); } }, skT(lang, "more.install")),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onPanel("trash"); setOpen(false); } }, skT(lang, "more.trash")),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onPanel("ledger"); setOpen(false); } }, skT(lang, "more.ledger")),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onPanel("diagnostics"); setOpen(false); } }, skT(lang, "more.diagnostics")),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onRefresh(); setOpen(false); } }, skT(lang, "more.refresh")),
      sk("div", { className: "sk_moreSep" }),
      sk("div", { className: "sk_moreLabel" }, skT(lang, "more.language")),
      sk("div", { style: { display: "flex", gap: "6px", padding: "2px 10px 4px" } }, [
        sk("button", {
          className: "sk_filter",
          type: "button",
          "data-act": lang === "zh" ? "" : undefined,
          onClick: function () { skSetLang("zh"); }
        }, "中文"),
        sk("button", {
          className: "sk_filter",
          type: "button",
          "data-act": lang === "en" ? "" : undefined,
          onClick: function () { skSetLang("en"); }
        }, "English")
      ]),
      sk("div", { className: "sk_moreSep" }),
      sk("div", { className: "sk_moreNote" }, skT(lang, "more.note"))
    ]) : null
  ]);
}

// #endregion

// #region ledger + diagnostics ---------------------------------------------------
/**
 * Usage ledger panel: totals, a real 14-day trend and per-skill rows.
 * Every ratio is null-safe: no denominator means an em dash, never 0% or 100%.
 * @param {{lang: 'zh'|'en', workspace: string}} props - props.
 * @returns {object} panel body.
 */
function SkLedgerPanel(props) {
  var lang = props.lang;
  var dataState = (0, import_react.useState)(null);
  var data = dataState[0];
  var setData = dataState[1];
  var errorState = (0, import_react.useState)("");
  var error = errorState[0];
  var setError = errorState[1];
  (0, import_react.useEffect)(function () {
    var live = true;
    void skApi.ledger(props.workspace ?? "").then(function (result) {
      if (!live) return;
      if (!result.ok) {
        setError(skApiError(result));
        return;
      }
      setData(result.body);
    }).catch(function (thrown) {
      if (live) setError(String(thrown));
    });
    return function () { live = false; };
  }, [props.workspace]);
  if (data === null) return sk("div", { className: "sk_loading" }, error !== "" ? error : skT(lang, "loading"));
  var totals = data.totals ?? {};
  var trend = Array.isArray(data.trend) ? data.trend : [];
  var peak = 1;
  trend.forEach(function (row) { if (row.value > peak) peak = row.value; });
  var rate = function (value) {
    return value === null || value === undefined ? skT(lang, "ledger.noRate") : String(Math.round(value * 100)) + "%";
  };
  var rows = Array.isArray(data.skills) ? data.skills.slice(0, 50) : [];
  return sk("div", { className: "sk_ledger" }, [
    sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "ledger.intro")),
    sk("div", { className: "sk_ledgerTotals" }, [
      sk("div", { key: "t-loads", className: "sk_ledgerStat" }, [sk("span", null, skT(lang, "ledger.loads")), sk("strong", null, String(totals.loads ?? 0))]),
      sk("div", { key: "t-invokes", className: "sk_ledgerStat" }, [sk("span", null, skT(lang, "ledger.invokes")), sk("strong", null, String(totals.invokes ?? 0))]),
      sk("div", { key: "t-success", className: "sk_ledgerStat" }, [sk("span", null, skT(lang, "ledger.success")), sk("strong", null, rate(totals.successRate))]),
      sk("div", { key: "t-adoption", className: "sk_ledgerStat" }, [sk("span", null, skT(lang, "ledger.adoption")), sk("strong", null, rate(totals.adoptionRate))])
    ]),
    sk("div", { className: "sk_secLabel" }, skT(lang, "ledger.trend")),
    sk("div", { className: "sk_trend" }, trend.map(function (row) {
      return sk("div", {
        key: "td-" + row.date,
        className: "sk_trendBar",
        title: row.date + " · " + String(row.value),
        style: { height: String(Math.max(2, Math.round(row.value / peak * 100))) + "%" }
      });
    })),
    rows.length === 0
      ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "ledger.empty"))
      : sk("table", { className: "sk_hist sk_ledgerTable" }, [
        sk("thead", { key: "th" }, [sk("tr", null, [
          sk("th", null, skT(lang, "ledger.skill")),
          sk("th", null, skT(lang, "ledger.loads")),
          sk("th", null, skT(lang, "ledger.invokes")),
          sk("th", null, skT(lang, "ledger.success")),
          sk("th", null, skT(lang, "ledger.adoption")),
          sk("th", null, skT(lang, "ledger.lastUsed"))
        ])]),
        sk("tbody", { key: "tb" }, rows.map(function (row) {
          return sk("tr", { key: "lg-" + row.name }, [
            sk("td", null, row.name),
            sk("td", null, String(row.loads)),
            sk("td", null, String(row.invokes)),
            sk("td", null, rate(row.successRate)),
            sk("td", null, rate(row.adoptionRate)),
            sk("td", null, row.lastUsedAt > 0 ? skTime(row.lastUsedAt) : skT(lang, "ledger.noRate"))
          ]);
        }))
      ])
  ]);
}

/**
 * Diagnostics panel: skipped files, invalid frontmatter and mount-scan
 * failures, plus the aggregate body-audit summary.
 * @param {{lang: 'zh'|'en', workspace: string}} props - props.
 * @returns {object} panel body.
 */
function SkDiagPanel(props) {
  var lang = props.lang;
  var dataState = (0, import_react.useState)(null);
  var data = dataState[0];
  var setData = dataState[1];
  var errorState = (0, import_react.useState)("");
  var error = errorState[0];
  var setError = errorState[1];
  (0, import_react.useEffect)(function () {
    var live = true;
    void skApi.index(props.workspace ?? "").then(function (result) {
      if (!live) return;
      if (!result.ok) {
        setError(skApiError(result));
        return;
      }
      setData(result.body);
    }).catch(function (thrown) {
      if (live) setError(String(thrown));
    });
    return function () { live = false; };
  }, [props.workspace]);
  if (data === null) return sk("div", { className: "sk_loading" }, error !== "" ? error : skT(lang, "loading"));
  var diagnostics = Array.isArray(data.diagnostics) ? data.diagnostics : [];
  var audit = data.audit ?? null;
  var level = function (severity) {
    return skSeverityKey(severity);
  };
  return sk("div", { className: "sk_diag" }, [
    sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "diag.intro")),
    sk("div", { className: "sk_sec" }, [
      sk("div", { className: "sk_secLabel" }, skT(lang, "diag.audit")),
      audit === null || audit.clean === true
        ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "detail.auditClean"))
        : sk("ul", { className: "sk_bullets" }, audit.findings.map(function (row) {
          return sk("li", { key: "da-" + row.id }, "[" + skT(lang, level(row.severity)) + "] " + skT(lang, "detail.audit." + row.id) + " × " + String(row.count) + " · " + String(row.skills) + " skills");
        }))
    ]),
    sk("div", { className: "sk_sec" }, [
      sk("div", { className: "sk_secLabel" }, skT(lang, "diag.title")),
      diagnostics.length === 0
        ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "diag.empty"))
        : sk("ul", { className: "sk_bullets" }, diagnostics.slice(0, 80).map(function (row, index) {
          var prefix = row.area === "mounted" ? skT(lang, "diag.mounted") : skT(lang, "diag.writable");
          return sk("li", { key: "dg-" + String(index) }, "[" + prefix + "] " + row.message);
        }))
    ])
  ]);
}

// #region browse -----------------------------------------------------------------
/**
 * The launcher body: index fetch, search/filter/sort, favourites strip, list,
 * detail drawer and the load chain.
 * @param {{workspace: string, workspaces: Array, onWorkspace: Function, onPanel: Function, onNotice: Function, reloadToken: number, onRequestClose: Function|null}} props - props.
 * @returns {object} browse surface.
 */
function SkillBrowse(props) {
  var lang = useSkLang();
  var sessionId = useSkSessionId();
  var indexState = (0, import_react.useState)(null);
  var index = indexState[0];
  var setIndex = indexState[1];
  var loadingState = (0, import_react.useState)(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];
  var errorState = (0, import_react.useState)("");
  var error = errorState[0];
  var setError = errorState[1];
  var viewState = (0, import_react.useState)("home");
  var view = viewState[0];
  var setView = viewState[1];
  var queryState = (0, import_react.useState)("");
  var query = queryState[0];
  var setQuery = queryState[1];
  var categoryState = (0, import_react.useState)("");
  var category = categoryState[0];
  var setCategory = categoryState[1];
  var sourceState = (0, import_react.useState)("all");
  var source = sourceState[0];
  var setSource = sourceState[1];
  var stateFilterState = (0, import_react.useState)("all");
  var stateFilter = stateFilterState[0];
  var setStateFilter = stateFilterState[1];
  var sortState = (0, import_react.useState)("freq");
  var sort = sortState[0];
  var setSort = sortState[1];
  var menuState = (0, import_react.useState)(null);
  var menu = menuState[0];
  var setMenu = menuState[1];
  var detailState = (0, import_react.useState)(null);
  var detail = detailState[0];
  var setDetail = detailState[1];
  var reloadState = (0, import_react.useState)(0);
  var reload = reloadState[0];
  var setReload = reloadState[1];
  var homeDataState = (0, import_react.useState)(null);
  var homeData = homeDataState[0];
  var setHomeData = homeDataState[1];
  var homeLoadingState = (0, import_react.useState)(true);
  var homeLoading = homeLoadingState[0];
  var setHomeLoading = homeLoadingState[1];
  var homeErrorState = (0, import_react.useState)("");
  var homeError = homeErrorState[0];
  var setHomeError = homeErrorState[1];
  var homeRefreshState = (0, import_react.useState)(0);
  var homeRefresh = homeRefreshState[0];
  var setHomeRefresh = homeRefreshState[1];

  var load = (0, import_react.useCallback)(function () {
    setLoading(true);
    void skApi.index(props.workspace).then(function (result) {
      if (!result.ok) {
        setError(skT(skGetLang(), "notice.indexFailed", { status: String(result.status), reason: skApiError(result) }));
        return;
      }
      setError("");
      setIndex(result.body);
    }).catch(function (thrown) {
      setError(String(thrown));
    }).finally(function () {
      setLoading(false);
    });
  }, [props.workspace]);

  (0, import_react.useEffect)(function () {
    load();
  }, [load, props.reloadToken, reload]);

  var skills = index === null || !Array.isArray(index.skills) ? [] : index.skills;

  // The recommendation home: ask the host for a conversation-derived pick and
  // fall back to its parked recommendation / this page's real usage history on
  // an older host. Every entry is re-resolved against the live index, so a
  // disabled or removed skill can never survive on screen.
  var loadHome = (0, import_react.useCallback)(function () {
    if (index === null) return;
    var records = Array.isArray(index.skills) ? index.skills : [];
    setHomeLoading(true);
    setHomeError("");
    void skApi.home(sessionId, props.workspace).then(function (result) {
      if (result.ok && result.body !== null && result.body !== undefined
        && (result.body.source === undefined || Array.isArray(result.body.items))) {
        var raw = Array.isArray(result.body.items) ? result.body.items : [];
        var entries = skHomeEntriesFromHost(raw, records);
        if (entries.length === 0) return skFallbackHome(records, sessionId);
        return {
          source: typeof result.body.source === "string" ? result.body.source : "history",
          intent: typeof result.body.intent === "string" ? result.body.intent : "",
          at: typeof result.body.at === "number" ? result.body.at : Date.now(),
          items: entries
        };
      }
      if (result.status === 404 || result.status === 503) return skFallbackHome(records, sessionId);
      return { source: "none", intent: "", at: Date.now(), items: [], error: skApiError(result) };
    }).then(function (data) {
      if (data.error !== undefined) {
        setHomeError(skT(skGetLang(), "home.error", { reason: data.error }));
        setHomeData({ source: "none", intent: "", at: Date.now(), items: [] });
        return;
      }
      setHomeData(data);
      for (var itemIndex = 0; itemIndex < data.items.length; itemIndex += 1) {
        var item = data.items[itemIndex];
        skRememberRecommendation(item.name, {
          reason: item.reason,
          reasonEn: item.reasonEn,
          category: item.category,
          at: typeof data.at === "number" && data.at > 0 ? data.at : Date.now(),
          sessionId: sessionId
        });
      }
    }).catch(function (thrown) {
      setHomeError(skT(skGetLang(), "home.error", { reason: String(thrown) }));
      setHomeData({ source: "none", intent: "", at: Date.now(), items: [] });
    }).finally(function () {
      setHomeLoading(false);
    });
  }, [index, sessionId, props.workspace]);

  (0, import_react.useEffect)(function () {
    loadHome();
  }, [loadHome, homeRefresh]);

  (0, import_react.useEffect)(function () {
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      if (menu !== null) {
        setMenu(null);
        return;
      }
      if (detail !== null) {
        setDetail(null);
        return;
      }
      if (typeof props.onRequestClose === "function") props.onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, detail, props.onRequestClose]);

  (0, import_react.useEffect)(function () {
    if (menu === null) return undefined;
    var onClick = function () { setMenu(null); };
    window.addEventListener("click", onClick);
    return function () {
      window.removeEventListener("click", onClick);
    };
  }, [menu]);

  // Re-read one record after a write, so the UI never shows state the host did
  // not persist.
  var refreshRecord = (0, import_react.useCallback)(function (name) {
    void skApi.index(props.workspace).then(function (result) {
      if (!result.ok) return;
      setIndex(result.body);
      if (detail !== null && detail.name === name) {
        var next = (result.body.skills ?? []).find(function (row) { return row.name === name; });
        if (next !== undefined) setDetail(next);
      }
    });
  }, [props.workspace, detail]);

  var updatePref = function (skill, patch) {
    var body = { name: skill.name, ...props.workspace !== "" ? { workspace: props.workspace } : {} };
    if (patch.favorite !== undefined) body.favorite = patch.favorite;
    if (patch.pinned !== undefined) body.pinned = patch.pinned;
    void skApi.prefs(body).then(function (result) {
      if (!result.ok) {
        props.onNotice("err", skT(skGetLang(), "notice.prefFailed", { reason: skApiError(result) }));
        return;
      }
      refreshRecord(skill.name);
    });
  };

  var toggleSkill = function (skill, kind) {
    var request;
    if (kind === "mounted") {
      request = skApi.override({ workspace: props.workspace, path: skill.management?.path ?? "", disabled: skill.policy?.disabled !== true });
    } else {
      request = skApi.toggle({
        workspace: props.workspace,
        rootId: skill.management?.rootId ?? "",
        name: skill.name,
        modelInvocable: kind === "user" ? skill.policy?.modelInvocable : skill.policy?.modelInvocable !== true,
        userInvocable: kind === "user" ? skill.policy?.userInvocable !== true : skill.policy?.userInvocable
      });
    }
    void Promise.resolve(request).then(function (result) {
      if (!result.ok) {
        props.onNotice("err", skT(skGetLang(), "notice.toggleFailed", { reason: skApiError(result) }));
        return;
      }
      refreshRecord(skill.name);
    });
  };

  var useSkill = function (skill, continuation, recommendation) {
    var stage = typeof continuation === "string" ? continuation : "";
    if (recommendation === true) {
      var acceptedSession = skCurrentSessionId();
      if (acceptedSession !== "") skReportEvent(skill.name, "accepted", "", props.workspace, acceptedSession);
    }
    void skUseSkill(skill.name, props.workspace, { continuation: stage }).then(function (outcome) {
      if (outcome.ok) {
        props.onNotice("ok", skT(skGetLang(), outcome.continuation === true ? "notice.loadedNext" : "notice.loaded"));
        return;
      }
      if (outcome.cancelled === true) {
        props.onNotice("ok", skT(skGetLang(), "notice.cancelled"));
        return;
      }
      props.onNotice("err", skT(skGetLang(), "notice.failed", { reason: outcome.error ?? "" }));
    });
  };

  var filtered = (0, import_react.useMemo)(function () {
    return skSortSkills(skFilterSkills(skills, {
      query: query,
      category: category,
      source: source,
      state: stateFilter
    }), sort);
  }, [skills, query, category, source, stateFilter, sort]);

  var favourites = (0, import_react.useMemo)(function () {
    return skPickFavourites(skills, 9999);
  }, [skills]);

  var categories = index === null || !Array.isArray(index.categories) ? [] : index.categories;
  var sourceRows = index === null || !Array.isArray(index.sources) ? [] : index.sources;
  var totals = index === null || index.totals === undefined ? { all: 0, userOwned: 0, available: 0 } : index.totals;
  var disabledCount = skills.filter(function (skill) { return skill.policy?.disabled === true; }).length;
  var heroSub = skT(lang, "hero.sub", { all: totals.all ?? 0, mine: totals.userOwned ?? 0 });
  var activeCategory = categories.find(function (row) { return row.id === category; });
  var activeCategoryLabel = activeCategory === undefined ? "" : (lang === "zh" ? activeCategory.label : activeCategory.labelEn);
  var title = view === "home"
    ? skT(lang, "home.title")
    : view === "favorites"
      ? skT(lang, "nav.favorites")
      : category === "" ? skT(lang, "cat.all") : activeCategoryLabel;
  var sub = view === "home"
    ? homeData === null
      ? skT(lang, "home.loading")
      : homeData.source === "conversation"
        ? skT(lang, "home.sub.conversation")
        : homeData.source === "history"
          ? skT(lang, "home.sub.history")
          : skT(lang, "home.sub.none")
    : view === "favorites"
      ? skT(lang, "fav.pageHint")
      : skT(lang, "skills.sub", { count: filtered.length, available: totals.available ?? 0 });

  var openView = function (next) {
    setView(next);
    if (next !== "all") setCategory("");
  };

  var pickCategory = function (id) {
    setCategory(id);
    setView("all");
  };

  var searchChange = function (value) {
    setQuery(value);
    if (view !== "all") {
      setCategory("");
      setView("all");
    }
  };

  return sk(skF, null, [
    sk("div", { className: "sk_shell" }, [
      skH(SkSide, {
        lang: lang,
        view: view,
        category: category,
        categories: categories,
        total: totals.all ?? 0,
        favouritesCount: favourites.length,
        heroSub: heroSub,
        workspace: props.workspace,
        workspaces: props.workspaces,
        onWorkspace: props.onWorkspace,
        onPanel: props.onPanel,
        onRefresh: function () {
          setReload(reload + 1);
          setHomeRefresh(homeRefresh + 1);
        },
        onView: openView,
        onCategory: pickCategory
      }),
      sk("div", { className: "sk_main" }, [
        sk("header", { className: "sk_topbar" }, [
          sk("div", { className: "sk_topText" }, [
            sk("h2", { className: "sk_topTitle" }, title),
            sk("p", { className: "sk_topSub" }, sub)
          ]),
          sk("div", { className: "sk_topActions" }, [
            skH(SkSearch, {
              value: query,
              lang: lang,
              onChange: searchChange
            }),
            typeof props.onRequestClose === "function" ? sk("button", {
              className: "sk_closeBtn",
              type: "button",
              "aria-label": skT(lang, "panel.close"),
              onClick: props.onRequestClose
            }, "✕") : null
          ])
        ]),
        error !== "" ? sk("div", { className: "sk_notice", "data-kind": "err", role: "alert", style: { margin: "8px 26px 0" } }, [
          sk("span", null, error),
          sk("button", { className: "sk_noticeAction", type: "button", onClick: load }, skT(lang, "action.retry"))
        ]) : null,
        sk("div", { className: "sk_view" }, view === "home"
          ? skH(SkHome, {
            lang: lang,
            data: homeData,
            loading: homeLoading,
            error: homeError,
            query: query,
            categories: categories,
            onRefresh: function () { setHomeRefresh(homeRefresh + 1); },
            onUse: useSkill,
            onDetail: setDetail,
            onSearch: searchChange,
            onCategory: pickCategory,
            onView: openView
          })
          : view === "favorites"
            ? skH(SkFavourites, {
              skills: favourites,
              lang: lang,
              onUse: useSkill,
              onDetail: setDetail,
              onPref: updatePref,
              onBrowseAll: function () { openView("all"); }
            })
            : sk("div", { className: "sk_all" }, [
              skH(SkToolbar, {
                lang: lang,
                sort: sort,
                source: source,
                state: stateFilter,
                menu: menu,
                total: totals.all ?? 0,
                sourceRows: sourceRows,
                onSort: setSort,
                onSource: setSource,
                onState: setStateFilter,
                onMenu: setMenu
              }),
              loading
                ? sk("div", { className: "sk_loading" }, skT(lang, "loading"))
                : filtered.length === 0
                  ? sk("div", { className: "sk_empty" }, [
                    sk("strong", null, skT(lang, "empty.title")),
                    sk("span", null, skT(lang, "empty.hint")),
                    sk("div", { style: { marginTop: "10px" } }, [
                      sk("button", {
                        className: "sk_textBtn",
                        type: "button",
                        onClick: function () {
                          setQuery("");
                          setCategory("");
                          setSource("all");
                          setStateFilter("all");
                        }
                      }, skT(lang, "empty.clear"))
                    ])
                  ])
                  : sk("div", { className: "sk_list" }, filtered.map(function (skill) {
                    return skH(SkRow, {
                      skill: skill,
                      lang: lang,
                      onUse: useSkill,
                      onDetail: setDetail,
                      onPref: updatePref
                    }, "row-" + skill.name);
                  }))
            ])
        )
      ])
    ]),
    detail !== null ? skH(SkDetailDrawer, {
      skill: detail,
      lang: lang,
      workspace: props.workspace,
      onNotice: props.onNotice,
      onClose: function () { setDetail(null); },
      onUse: useSkill,
      onToggle: toggleSkill
    }) : null
  ]);
}

// #endregion

// #region install target selector ------------------------------------------------
/**
 * Target-root / conflict selector used by the baseline install panel. The
 * baseline component read a module-level root table; this replacement keeps the
 * same contract so the reused InstallTab stays functional.
 * @param {{workspace: string, targetRoot: string, conflict: string, onTarget: Function, onConflict: Function}} props - props.
 * @returns {object} selector row.
 */
function TargetSelector(props) {
  var roots = typeof GLOBAL_ROOTS === "undefined" ? [] : GLOBAL_ROOTS;
  var options = roots.map(function (root) {
    return sk("option", { key: "root-" + root.id, value: root.id }, root.label);
  });
  if (props.workspace !== "") {
    options.push(sk("option", { key: "project-dsh", value: "project-dsh:" + props.workspace }, "项目 .dsh/skills"));
    options.push(sk("option", { key: "project-agents", value: "project-agents:" + props.workspace }, "项目 .agents/skills"));
  }
  return sk("div", { className: "ss_row", style: { justifyContent: "space-between" } }, [
    sk("select", {
      className: "ss_select",
      value: props.targetRoot,
      title: "安装目标",
      onChange: function (event) { props.onTarget(event.target.value); }
    }, options),
    sk("select", {
      className: "ss_select",
      style: { flex: "none", width: "120px" },
      value: props.conflict,
      title: "同名冲突策略",
      onChange: function (event) { props.onConflict(event.target.value); }
    }, [
      sk("option", { key: "skip", value: "skip" }, "冲突跳过"),
      sk("option", { key: "rename", value: "rename" }, "冲突改名"),
      sk("option", { key: "replace", value: "replace" }, "冲突替换")
    ])
  ]);
}

// #endregion

// #region station shell ----------------------------------------------------------
/**
 * The launcher shell: no title bar of its own; the browse surface owns the
 * brand row so the drawer stays minimal.
 * @param {{embedded?: boolean, onRequestClose?: Function}} props - props.
 * @returns {object} station.
 */
function StationApp(props) {
  var workspacesState = (0, import_react.useState)([]);
  var workspaces = workspacesState[0];
  var setWorkspaces = workspacesState[1];
  var workspaceState = (0, import_react.useState)("");
  var workspace = workspaceState[0];
  var setWorkspace = workspaceState[1];
  var panelState = (0, import_react.useState)(null);
  var panel = panelState[0];
  var setPanel = panelState[1];
  var noticeState = (0, import_react.useState)(null);
  var notice = noticeState[0];
  var setNotice = noticeState[1];
  var reloadState = (0, import_react.useState)(0);
  var reload = reloadState[0];
  var setReload = reloadState[1];
  (0, import_react.useEffect)(function () {
    void skApi.roots().then(function (result) {
      if (result.ok && Array.isArray(result.body.workspaces)) setWorkspaces(result.body.workspaces);
    });
  }, []);
  (0, import_react.useEffect)(function () {
    if (notice === null) return undefined;
    var timer = window.setTimeout(function () {
      setNotice(null);
    }, 6000);
    return function () {
      window.clearTimeout(timer);
    };
  }, [notice]);
  return sk("div", { className: "sk_station" + (props.embedded === true ? " sk_stationEmbedded" : "") }, [
    notice === null ? null : sk("div", { className: "sk_notice", "data-kind": notice.kind, role: "status", style: { marginTop: "12px" } }, [
      sk("span", null, notice.text),
      sk("button", {
        className: "sk_noticeAction",
        type: "button",
        onClick: function () { setNotice(null); }
      }, "✕")
    ]),
    skH(SkillBrowse, {
      workspace: workspace,
      workspaces: workspaces,
      onWorkspace: setWorkspace,
      onPanel: setPanel,
      reloadToken: reload,
      onNotice: function (kind, text) {
        setNotice({ kind: kind, text: text });
      },
      onRequestClose: typeof props.onRequestClose === "function" ? props.onRequestClose : null
    }),
    panel === null ? null : skH(StationPanelDialog, {
      panel: panel,
      lang: skGetLang(),
      workspace: workspace,
      onClose: function () {
        setPanel(null);
        setReload(reload + 1);
      }
    })
  ]);
}

// #endregion
// #endregion

// Test surface used by scripts/smoke.mjs. It is only installed when the page
// explicitly asks for it (the smoke test sets the flag before loading the
// bundle); production pages never define it, so no debug API ships to users.
if (typeof window !== "undefined" && window.__DSH_CHARLOTTE_TEST__ === true) {
  window.__skTest = {
    skT: skT,
    skStateOf: skStateOf,
    skFilterSkills: skFilterSkills,
    skSortSkills: skSortSkills,
    skPickFavourites: skPickFavourites,
    skSearchBlob: skSearchBlob,
    skTime: skTime,
    skUseSkill: skUseSkill,
    skIntro: skIntro,
    skPurpose: skPurpose,
    skLoadSnapshot: skLoadSnapshot,
    skLoadSet: skLoadSet,
    skUsableRecord: skUsableRecord,
    skHistoryEntries: skHistoryEntries,
    skHomeEntriesFromHost: skHomeEntriesFromHost,
    skHomePendingEntries: skHomePendingEntries,
    skHomeReason: skHomeReason,
    skSkillIntro: skSkillIntro,
    skContinuationPrompt: skContinuationPrompt,
    skFallbackHome: skFallbackHome,
    skFavGroups: skFavGroups,
    strings: SK_STRINGS,
    api: skApi,
    dock: typeof SkRecommendDock === "function" ? SkRecommendDock : null,
    registerDock: typeof skRegisterRecommendDock === "function" ? skRegisterRecommendDock : null
  };
}


// #region dsh-charlotte recommendation dock
//
// The launcher's inline recommendation surface. It is registered into the
// conversation's `conversation.input.dock` list slot — the one public,
// supported place to render a lightweight card directly above the composer at
// the end of the conversation. No DOM injection, no chat-flow patching.
//
// Behaviour:
//   - the host evaluates the latest user prompt at `agent/pre-step` and parks
//     at most three candidates for the session;
//   - this card asks for that parked result only after the turn settles
//     (running true → false), so it never interrupts an answer;
//   - showing it reports back once, so the host marks it as shown and applies
//     de-duplication / cooldown / frequency caps on its side;
//   - Use runs the same authorized load chain as the management page;
//   - Ignore is persisted on the host for the current task fingerprint.
//
// The dock renders nothing when the host has no candidate, when the feature is
// disabled, or when the user dismissed the current card.

var SK_DOCK_COLLAPSED_KEY = "dsh-charlotte:dock-collapsed";

/**
 * Read the persisted collapsed state of the recommendation card.
 * @returns {boolean} true when the card is collapsed.
 */
function skDockCollapsed() {
  try {
    return window.localStorage.getItem(SK_DOCK_COLLAPSED_KEY) === "1";
  } catch (error) {
    return false;
  }
}

/**
 * Persist the collapsed state of the recommendation card.
 * @param {boolean} collapsed - true to collapse.
 */
function skSetDockCollapsed(collapsed) {
  try {
    window.localStorage.setItem(SK_DOCK_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch (error) {
    // The in-memory state still toggles when storage is unavailable.
  }
}

/**
 * Subscribe to one session's running flag.
 * @param {string} sessionId - session id.
 * @param {Function} onChange - receives `running` boolean.
 * @returns {Function} unsubscribe.
 */
function skWatchRunning(sessionId, onChange) {
  var sessions = skService("sessions");
  if (sessions === undefined || sessions === null || sessions.list === undefined || typeof sessions.list.subscribe !== "function") {
    return function () {};
  }
  var read = function () {
    var snapshot = sessions.list.getSnapshot();
    var row = snapshot === null || snapshot === undefined || snapshot.byId === undefined ? undefined : snapshot.byId[sessionId];
    onChange(row !== undefined && row !== null && row.running === true);
  };
  read();
  var dispose = sessions.list.subscribe(read);
  return typeof dispose === "function" ? dispose : function () {};
}

/**
 * Inline recommendation card for the active conversation.
 * @param {{sessionId?: string, t?: Function}} props - slot props.
 * @returns {object|null} card element, or null when there is nothing to show.
 */
function SkRecommendDock(props) {
  var lang = useSkLang();
  var sessionId = typeof props.sessionId === "string" ? props.sessionId : "";
  var itemsState = (0, import_react.useState)([]);
  var items = itemsState[0];
  var setItems = itemsState[1];
  var fingerprintState = (0, import_react.useState)("");
  var fingerprint = fingerprintState[0];
  var setFingerprint = fingerprintState[1];
  var intentState = (0, import_react.useState)("");
  var intent = intentState[0];
  var setIntent = intentState[1];
  var statusState = (0, import_react.useState)(null);
  var status = statusState[0];
  var setStatus = statusState[1];
  var collapsedState = (0, import_react.useState)(skDockCollapsed());
  var collapsed = collapsedState[0];
  var setCollapsed = collapsedState[1];
  var busyState = (0, import_react.useState)("");
  var busy = busyState[0];
  var setBusy = busyState[1];
  var runningRef = (0, import_react.useRef)(null);
  var reportedRef = (0, import_react.useRef)("");
  var aliveRef = (0, import_react.useRef)(true);

  var fetchPending = (0, import_react.useCallback)(function () {
    if (sessionId === "") return;
    var workspace = skCurrentWorkspacePath();
    // Fetch the same index the management page reads. The recommendation item
    // carries a match reason, not the skill's own description, so the card must
    // resolve the real record before it renders an intro.
    void Promise.all([skApi.sessionState(sessionId), skApi.index(workspace)]).then(function (results) {
      if (!aliveRef.current) return;
      var result = results[0];
      var indexResult = results[1];
      if (!result.ok) return;
      var pending = result.body.pending;
      if (pending === null || pending === undefined || !Array.isArray(pending.items) || pending.items.length === 0) return;
      var skills = indexResult.ok && indexResult.body !== null && indexResult.body !== undefined && Array.isArray(indexResult.body.skills)
        ? indexResult.body.skills
        : [];
      if (skills.length === 0) {
        // Without the canonical records we cannot show a real intro or verify
        // permissions. Do not fall back to the match reason as a description.
        setItems([]);
        return;
      }
      var entries = skHomeEntriesFromHost(pending.items, skills);
      if (entries.length === 0) {
        setItems([]);
        return;
      }
      setItems(entries);
      setFingerprint(typeof pending.fingerprint === "string" ? pending.fingerprint : "");
      setIntent(typeof pending.intent === "string" ? pending.intent : "");
      setStatus(null);
      for (var index = 0; index < entries.length; index += 1) {
        skRememberRecommendation(entries[index].name, {
          reason: entries[index].reason,
          reasonEn: entries[index].reasonEn,
          category: entries[index].category,
          at: typeof pending.at === "number" ? pending.at : Date.now(),
          sessionId: sessionId
        });
      }
    });
  }, [sessionId]);

  (0, import_react.useEffect)(function () {
    aliveRef.current = true;
    if (sessionId === "") return function () { aliveRef.current = false; };
    fetchPending();
    return function () {
      aliveRef.current = false;
    };
  }, [sessionId, fetchPending]);

  (0, import_react.useEffect)(function () {
    if (sessionId === "") return undefined;
    var dispose = skWatchRunning(sessionId, function (running) {
      var previous = runningRef.current;
      runningRef.current = running;
      if (previous === true && running === false) {
        // One small delay lets the host finish its turn bookkeeping; the
        // candidate itself was computed before the answer started.
        if (typeof window !== "undefined") window.setTimeout(fetchPending, 500);
      }
      if (previous === null && running === false) fetchPending();
    });
    return function () {
      if (typeof dispose === "function") dispose();
    };
  }, [sessionId, fetchPending]);

  (0, import_react.useEffect)(function () {
    if (items.length === 0) return;
    var names = items.map(function (item) { return item.name; });
    var key = sessionId + "|" + names.join("|");
    if (reportedRef.current === key) return;
    reportedRef.current = key;
    void skApi.event({ sessionId: sessionId, name: names[0], phase: "recommended" }).catch(function () {
      // If the host does not accept the shown report, the card still works;
      // the next evaluation simply re-offers within the cooldown.
    });
  }, [items, sessionId]);

  if (sessionId === "" || items.length === 0) return null;

  var toggleCollapsed = function () {
    var next = !collapsed;
    setCollapsed(next);
    skSetDockCollapsed(next);
  };

  var ignore = function (item) {
    if (sessionId !== "") skReportEvent(item.name, "dismissed", "", "", sessionId);
    setItems(items.filter(function (row) { return row.name !== item.name; }));
    void skApi.ignore({ sessionId: sessionId, name: item.name, fingerprint: fingerprint }).catch(function () {
      // Ignoring stays locally honoured even if the write failed.
    });
    setStatus({ kind: "ok", text: skT(lang, "dock.ignored") });
  };

  var use = function (item) {
    if (busy !== "") return;
    setBusy(item.name);
    setStatus({ kind: null, text: skT(lang, "dock.loading") });
    if (sessionId !== "") skReportEvent(item.name, "accepted", "", "", sessionId);
    var continuation = skContinuationPrompt(item, intent, lang);
    void skUseSkill(item.name, "", { continuation: continuation }).then(function (outcome) {
      if (!aliveRef.current) return;
      setBusy("");
      if (outcome.ok) {
        setStatus({ kind: "ok", text: skT(lang, continuation !== "" ? "dock.loadedNext" : "dock.loaded") });
        setItems(items.filter(function (row) { return row.name !== item.name; }));
        return;
      }
      if (outcome.cancelled === true) {
        setStatus({ kind: null, text: skT(lang, "notice.cancelled") });
        return;
      }
      setStatus({ kind: "err", text: skT(lang, "dock.failed", { reason: outcome.error ?? "" }) });
    });
  };

  return sk("section", {
    className: "skd_card" + (collapsed ? " skd_collapsed" : ""),
    "data-collapsed": collapsed ? "" : undefined,
    "aria-label": skT(lang, "dock.title")
  }, [
    sk("div", { className: "skd_head" }, [
      sk("span", { className: "skd_headIcon" }, [skH(SkStar, { size: 11, filled: true })]),
      sk("span", null, skT(lang, "dock.title")),
      sk("span", { className: "skd_count" }, skT(lang, "dock.count", { count: items.length })),
      sk("button", {
        className: "skd_toggle",
        type: "button",
        "aria-expanded": collapsed ? "false" : "true",
        "aria-label": skT(lang, collapsed ? "dock.expand" : "dock.collapse"),
        title: skT(lang, collapsed ? "dock.expand" : "dock.collapse"),
        onClick: toggleCollapsed
      }, collapsed ? "▸" : "▾")
    ]),
    collapsed ? null : items.map(function (item) {
      var disabled = busy !== "";
      var category = item.skill?.category ?? item.category;
      return sk("div", { key: "rec-" + item.name, className: "skd_row" }, [
        sk("div", { className: "skd_glyph" }, [skH(SkCatGlyph, { id: category?.id, size: 13 })]),
        sk("div", { className: "skd_main" }, [
          sk("div", { className: "skd_name" }, [
            sk("span", { className: "skd_nameText" }, item.name),
            sk("span", { className: "skd_cat" }, lang === "zh" ? category?.label ?? "" : category?.labelEn ?? "")
          ]),
          sk("div", { className: "skd_intro" }, skSkillIntro(item.skill, lang)),
          item.reason !== undefined && item.reason !== null && item.reason !== ""
            ? sk("div", { className: "skd_why" }, [
              sk("span", { className: "skd_whyLabel" }, skT(lang, "dock.reason")),
              lang === "en" && typeof item.reasonEn === "string" && item.reasonEn !== "" ? item.reasonEn : item.reason
            ])
            : null
        ]),
        sk("div", { className: "skd_actions" }, [
          sk("button", {
            className: "skd_use",
            type: "button",
            disabled: disabled,
            onClick: function () { use(item); }
          }, busy === item.name ? skT(lang, "dock.loading") : skT(lang, "dock.use")),
          sk("button", {
            className: "skd_ignore",
            type: "button",
            disabled: disabled,
            onClick: function () { ignore(item); }
          }, skT(lang, "dock.ignore"))
        ])
      ]);
    }),
    collapsed || status === null ? null : sk("div", { className: "skd_status", "data-kind": status.kind ?? undefined }, status.text)
  ]);
}

/**
 * Register the dock into the conversation input dock slot.
 * @param {object} ctx - client plugin context.
 */
function skRegisterRecommendDock(ctx) {
  if (ctx === null || ctx === undefined || ctx.slots === undefined || typeof ctx.slots.inject !== "function") return;
  try {
    ctx.slots.inject("conversation.input.dock", function () {
      return ctx.slots.register({
        name: "conversation.input.dock",
        id: "charlotte-recommend",
        order: 30,
        inject: function (sessionId) {
          return { sessionId: sessionId };
        }
      }, SkRecommendDock);
    });
  } catch (error) {
    // A shell without the conversation slot simply has no inline card; the
    // launcher page remains fully usable.
  }
}
// #endregion


function InstallTab(props) {
  const [targetRoot, setTargetRoot] = (0, import_react.useState)("user-dsh");
  const [conflict, setConflict] = (0, import_react.useState)("skip");
  const [pending, setPending] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const [outcome, setOutcome] = (0, import_react.useState)(null);
  const [over, setOver] = (0, import_react.useState)(false);
  const inputRef = (0, import_react.useRef)(null);
  const zipInputRef = (0, import_react.useRef)(null);
  const [pathInput, setPathInput] = (0, import_react.useState)("");
  const onPathInstall = () => {
    const sourcePath = pathInput.trim();
    if (sourcePath === "") return;
    setBusy(true);
    setError("");
    setOutcome(null);
    void importSkills({
      items: [{ sourcePath }],
      targetRoot,
      conflict,
      ...props.workspace !== "" ? { workspace: props.workspace } : {}
    }).then((r) => {
      const first = r.body.outcomes?.[0];
      if (first !== void 0) setOutcome(first);
      if (!r.ok) {
        const serverError = r.body.error;
        setError(serverError !== void 0 ? `\u5B89\u88C5\u5931\u8D25\uFF1A${serverError}` : `\u5B89\u88C5\u5931\u8D25\uFF08HTTP ${String(r.status)}\uFF09`);
      } else if (first !== void 0 && first.status !== "skipped") {
        setPathInput("");
      }
    }).catch((e) => setError(String(e))).finally(() => setBusy(false));
  };
  const handleResult = (r) => {
    setOutcome(r.body.outcome ?? null);
    const serverError = r.body.error;
    if (!r.ok && r.body.outcome?.error === void 0) {
      setError(serverError !== void 0 ? `\u5B89\u88C5\u5931\u8D25\uFF1A${serverError}` : `\u5B89\u88C5\u5931\u8D25\uFF08HTTP ${String(r.status)}\uFF09`);
    }
  };
  const submit = (install) => {
    setBusy(true);
    setError("");
    const scope = props.workspace !== "" ? { workspace: props.workspace } : {};
    const request = install.kind === "zip" ? uploadZip({ zipBase64: install.zipBase64, targetRoot, conflict, ...scope }) : uploadFiles({ files: install.files, targetRoot, conflict, ...scope });
    void request.then(handleResult).catch((e) => setError(String(e))).finally(() => {
      setBusy(false);
      setPending(null);
    });
  };
  const onDrop = (event) => {
    event.preventDefault();
    setOver(false);
    setError("");
    setOutcome(null);
    const items = Array.from(event.dataTransfer?.items ?? []);
    const entries = items.map((item) => item.webkitGetAsEntry?.()).filter((entry) => entry !== null && entry !== void 0);
    if (entries.length === 0) {
      setError("\u6D4F\u89C8\u5668\u672A\u63D0\u4F9B\u6587\u4EF6\u5185\u5BB9\uFF1A\u8BF7\u6539\u7528\u4E0B\u65B9\u6309\u94AE\u9009\u62E9\u6587\u4EF6\u5939\u6216 ZIP \u5305\u3002");
      return;
    }
    const single = entries.length === 1 ? entries[0] : void 0;
    if (single?.isFile === true && single.name?.toLowerCase().endsWith(".zip") === true) {
      void zipEntryToPayload(single).then((zip) => setPending({ kind: "zip", source: "\u62D6\u62FD", ...zip })).catch((e) => setError(String(e)));
      return;
    }
    void collectEntries(entries).then(async (files) => {
      if (files.length === 0) {
        setError("\u62D6\u5165\u7684\u5185\u5BB9\u91CC\u6CA1\u6709\u6587\u4EF6\u3002");
        return;
      }
      setPending({ kind: "files", source: "\u62D6\u62FD", files: await dropFilesToPayloads(files) });
    }).catch((e) => setError(String(e)));
  };
  const onPick = (event) => {
    setError("");
    setOutcome(null);
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    void Promise.all(files.map(fileToPayload)).then((payloads) => {
      setPending({ kind: "files", source: "\u6587\u4EF6\u5939\u9009\u62E9", files: payloads });
    }).catch((e) => setError(String(e)));
    event.target.value = "";
  };
  const onPickZip = (event) => {
    setError("");
    setOutcome(null);
    const file = event.target.files?.[0];
    if (file === void 0) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("\u8BF7\u9009\u62E9 .zip \u683C\u5F0F\u7684\u538B\u7F29\u5305\u3002");
      event.target.value = "";
      return;
    }
    void zipFileToPayload(file).then((zip) => setPending({ kind: "zip", source: "ZIP \u9009\u62E9", ...zip })).catch((e) => setError(String(e)));
    event.target.value = "";
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "ss_drop",
        "data-over": over ? "true" : void 0,
        onDragOver: (e) => {
          e.preventDefault();
          setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 26 }, "aria-hidden": "true", children: "\u{1F5C2}\uFE0F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "\u628A skill \u6587\u4EF6\u5939\u6216 .zip \u538B\u7F29\u5305\u62D6\u5230\u8FD9\u91CC" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_meta", children: "\u9700\u5305\u542B SKILL.md\uFF1B\u5E26 vendored \u4F9D\u8D56\u7684\u5927\u578B\u6280\u80FD\u5EFA\u8BAE\u6253\u5305\u6210 zip\uFF08\u66F4\u7A33\u66F4\u5FEB\uFF09" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_actions", style: { justifyContent: "center" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn", onClick: () => inputRef.current?.click(), children: "\u9009\u62E9\u6587\u4EF6\u5939\u2026" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn", onClick: () => zipInputRef.current?.click(), children: "\u9009\u62E9 ZIP \u5305\u2026" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              ref: inputRef,
              type: "file",
              multiple: true,
              style: { display: "none" },
              ...{ webkitdirectory: "", directory: "" },
              onChange: onPick
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              ref: zipInputRef,
              type: "file",
              accept: ".zip,application/zip",
              style: { display: "none" },
              onChange: onPickZip
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          className: "ss_select",
          style: { flex: 1 },
          placeholder: "\u6216\u7C98\u8D34\u672C\u673A skill \u6587\u4EF6\u5939\u7684\u7EDD\u5BF9\u8DEF\u5F84\uFF08\u78C1\u76D8\u76F4\u62F7\uFF0C\u4E0D\u9650\u5927\u5C0F\uFF09",
          value: pathInput,
          onChange: (e) => setPathInput(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") onPathInstall();
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn", onClick: onPathInstall, disabled: busy || pathInput.trim() === "", children: "\u8DEF\u5F84\u5B89\u88C5" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TargetSelector, { workspace: props.workspace, targetRoot, conflict, onTarget: setTargetRoot, onConflict: setConflict }),
    error !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_err", children: error }) : null,
    outcome !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `ss_${outcome.status === "skipped" ? "err" : "ok"}`, children: outcome.status === "skipped" ? `\u672A\u5B89\u88C5\uFF1A${outcome.error ?? "\u5DF2\u8DF3\u8FC7"}` : `\u5DF2\u5B89\u88C5\u300C${outcome.name}\u300D\u2192 ${outcome.targetPath ?? ""}` }) : null,
    pending !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_dialog", onClick: () => setPending(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_dialogBox", onClick: (e) => e.stopPropagation(), children: [
      pending.kind === "zip" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_dialogTitle", children: [
          "\u786E\u8BA4\u5B89\u88C5\uFF08",
          pending.source,
          "\uFF0CZIP \u5305\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_pre", children: [
          pending.name,
          "\n",
          fmtSize(pending.sizeBytes)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_meta", children: "\u670D\u52A1\u7AEF\u5C06\u89E3\u538B\u5E76\u6821\u9A8C\u5176\u4E2D\u7684 SKILL.md\uFF1B\u5B89\u88C5\u524D\u8BF7\u786E\u8BA4\u6765\u6E90\u53EF\u4FE1\u3002" })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_dialogTitle", children: [
          "\u786E\u8BA4\u5B89\u88C5\uFF08",
          pending.source,
          "\uFF0C",
          String(pending.files.length),
          " \u4E2A\u6587\u4EF6\uFF09"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_pre", children: [
          pending.files.slice(0, 50).map((file) => file.path).join("\n"),
          pending.files.length > 50 ? `
\u2026 \u5176\u4F59 ${String(pending.files.length - 50)} \u4E2A\u6587\u4EF6` : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_meta", children: "\u6280\u80FD\u540D\u53D6\u81EA SKILL.md frontmatter \u7684 name \u5B57\u6BB5\uFF1B\u5B89\u88C5\u524D\u8BF7\u786E\u8BA4\u6765\u6E90\u53EF\u4FE1\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_actions", style: { justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn", onClick: () => setPending(null), disabled: busy, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn primary", onClick: () => submit(pending), disabled: busy, children: busy ? "\u5B89\u88C5\u4E2D\u2026" : "\u786E\u8BA4\u5B89\u88C5" })
      ] })
    ] }) }) : null
  ] });
}
function TrashTab() {
  const [entries, setEntries] = (0, import_react.useState)([]);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const load = (0, import_react.useCallback)(() => {
    void fetchTrash().then((r) => {
      if (r.ok) setEntries(r.body.entries ?? []);
    }).catch((e) => setError(String(e)));
  }, []);
  (0, import_react.useEffect)(() => {
    load();
  }, [load]);
  const onRestore = (id) => {
    setBusy(true);
    setError("");
    void restoreTrash(id).then((r) => {
      if (!r.ok) setError(String(r.body.error ?? `\u6062\u590D\u5931\u8D25\uFF08HTTP ${String(r.status)}\uFF09`));
    }).catch((e) => setError(String(e))).finally(() => {
      setBusy(false);
      load();
    });
  };
  const onEmpty = () => {
    if (!window.confirm("\u6C38\u4E45\u6E05\u7A7A\u56DE\u6536\u7AD9\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002")) return;
    setBusy(true);
    void emptyTrash().catch((e) => setError(String(e))).finally(() => {
      setBusy(false);
      load();
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_row", style: { justifyContent: "space-between" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_meta", children: "\u5220\u9664\u7684\u6280\u80FD\u4F1A\u4FDD\u7559\u5728\u8FD9\u91CC\uFF0C\u53EF\u6062\u590D\u5230\u539F\u4F4D\u7F6E\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn", onClick: load, children: "\u5237\u65B0" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn danger", onClick: onEmpty, disabled: busy || entries.length === 0, children: "\u6E05\u7A7A\u56DE\u6536\u7AD9" })
      ] })
    ] }),
    error !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_err", children: error }) : null,
    entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_empty", children: "\u56DE\u6536\u7AD9\u662F\u7A7A\u7684\u3002" }) : entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_cardHead", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_name", children: entry.manifest.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_meta", children: entry.manifest.deletedAt })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_meta", children: [
        "\u6765\u81EA\uFF1A",
        entry.manifest.from
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_actions", style: { justifyContent: "flex-end" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn", onClick: () => onRestore(entry.id), disabled: busy, children: "\u6062\u590D" }) })
    ] }, entry.id))
  ] });
}
async function zipEntryToPayload(entry) {
  const node = entry;
  const read = node.file;
  if (read === void 0) throw new Error("unsupported drop entry");
  const file = await new Promise((resolve, reject) => read.call(node, resolve, reject));
  return zipFileToPayload(file);
}
async function zipFileToPayload(file) {
  return { name: file.name, sizeBytes: file.size, zipBase64: bytesToBase64(new Uint8Array(await file.arrayBuffer())) };
}
async function collectEntries(entries) {
  const out = [];
  const walk = async (entry, prefix) => {
    if (out.length >= 1e4) throw new Error("\u6587\u4EF6\u5939\u91CC\u7684\u6587\u4EF6\u8D85\u8FC7 10000 \u4E2A\uFF0C\u6682\u4E0D\u652F\u6301\u6574\u4F53\u5B89\u88C5");
    const node = entry;
    if (node.isFile === true) {
      const file = await new Promise((resolve, reject) => {
        if (node.file === void 0) reject(new Error("unsupported drop entry"));
        else node.file(resolve, reject);
      });
      out.push({ path: `${prefix}${node.name}`, file });
    } else if (node.isDirectory === true && node.createReader !== void 0) {
      const reader = node.createReader();
      for (; ; ) {
        const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
        if (batch.length === 0) break;
        for (const child of batch) await walk(child, `${prefix}${node.name}/`);
      }
    }
  };
  for (const entry of entries) await walk(entry, "");
  return out;
}
async function fileToPayload(file) {
  const relative = file.webkitRelativePath;
  const path = relative !== void 0 && relative !== "" ? relative : file.name;
  const buffer = await file.arrayBuffer();
  return { path, contentBase64: bytesToBase64(new Uint8Array(buffer)) };
}
function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
async function dropFilesToPayloads(files) {
  return Promise.all(files.map(async ({ path, file }) => ({ path, contentBase64: bytesToBase64(new Uint8Array(await file.arrayBuffer())) })));
}

// src/client/styles.ts
var css = `
.ss_overlay{position:fixed;inset:0;z-index:9990;background:var(--dsw-alias-bg-mask-2);display:flex;align-items:center;justify-content:center}
.ss_panel{width:760px;max-width:92vw;height:min(780px,88vh);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.22);overflow:hidden}
.ss_panelHead{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.ss_title{font-weight:600;font-size:14px;color:var(--dsw-alias-label-primary);flex:1}
.ss_iconBtn{cursor:pointer;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:4px;display:inline-flex;align-items:center;justify-content:center}
.ss_iconBtn:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.ss_tabs{display:flex;gap:2px;padding:8px 10px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.ss_tab{cursor:pointer;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;padding:6px 10px;border-bottom:2px solid transparent}
.ss_tab[data-on="true"]{color:var(--dsw-alias-state-business-primary);border-bottom-color:var(--dsw-alias-state-business-primary);font-weight:600}
.ss_wsBar{display:flex;align-items:center;gap:8px;padding:8px 14px}
.ss_select{flex:1;font-size:12px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:4px 8px}
.ss_body{flex:1;overflow:auto;padding:10px 14px;display:flex;flex-direction:column;gap:10px}
.ss_footBtn{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:calc(100% + 8px);height:34px;margin:4px -4px;padding:6px 2px 6px 10px;cursor:pointer;border:none;background:transparent;color:var(--dsw-alias-label-primary);border-radius:12px;font-family:inherit;font-size:14px;line-height:22px;overflow:hidden}
.ss_footBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ss_footBtnRail{width:36px;height:36px;gap:0;justify-content:center;border-radius:50%;padding:0;margin:4px 0}
.ss_groupTitle{font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary);margin-top:6px}
.ss_card{display:flex;flex-direction:column;gap:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:10px 12px}
.ss_cardHead{display:flex;align-items:center;gap:8px}
.ss_name{font-weight:600;font-size:13px;color:var(--dsw-alias-label-primary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ss_desc{font-size:12px;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ss_meta{font-size:11px;color:var(--dsw-alias-label-tertiary);word-break:break-all}
.ss_badge{min-height:18px;font-size:11px;line-height:14px;border-radius:5px;padding:1px 7px;display:inline-flex;align-items:center;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}
.ss_badge.on{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary)}
.ss_badge.off{color:var(--dsw-alias-label-tertiary)}
.ss_badge.warn{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}
.ss_badge.info{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);color:var(--dsw-alias-state-business-primary)}
.ss_actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ss_btn{cursor:pointer;font-size:12px;line-height:18px;padding:3px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary)}
.ss_btn:hover{background:var(--dsw-alias-bg-layer-1)}
.ss_btn.primary{background:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary);color:#fff}
.ss_btn.danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent)}
.ss_btn:disabled{opacity:.5;cursor:default}
.ss_switch{cursor:pointer;width:30px;height:18px;border-radius:999px;border:none;background:var(--dsw-alias-border-l2);position:relative;flex:none;padding:0}
.ss_switch[data-on="true"]{background:var(--dsw-alias-state-success-primary)}
.ss_switchThumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:999px;background:#fff;transition:transform .15s}
.ss_switch[data-on="true"] .ss_switchThumb{transform:translateX(12px)}
.ss_search{font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;width:100%}
.ss_empty{color:var(--dsw-alias-label-tertiary);font-size:12px;padding:16px 4px;text-align:center}
.ss_err{color:var(--dsw-alias-state-error-primary);font-size:12px;word-break:break-all}
.ss_ok{color:var(--dsw-alias-state-success-primary);font-size:12px}
.ss_drop{border:1.5px dashed var(--dsw-alias-border-l2);border-radius:12px;padding:28px 16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;display:flex;flex-direction:column;gap:8px;align-items:center}
.ss_drop[data-over="true"]{border-color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 6%,transparent);color:var(--dsw-alias-state-business-primary)}
.ss_pre{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-all;max-height:240px;overflow:auto}
.ss_detail{display:flex;flex-direction:column;gap:8px}
.ss_row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.ss_conflictRow{display:flex;align-items:center;gap:8px}
.ss_dialog{position:fixed;inset:0;z-index:9995;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)}
.ss_dialogBox{width:420px;max-width:90vw;max-height:80vh;overflow:auto;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px}
.ss_dialogTitle{font-weight:600;font-size:14px;color:var(--dsw-alias-label-primary)}
/* dsh-charlotte launcher (v0.7) — scoped to .sk_* / .skd_*.
   Visual language: theme surfaces, hairline dividers, a three-step type scale,
   one blue accent. Navigation lives on the left, the smart pick owns the page,
   and the full catalogue stays a secondary view. No card grid, no coloured
   category chips, no stat blocks. */

/* ---------------------------------- shell --------------------------------- */
.ss_panel{width:1180px;max-width:96vw;height:min(840px,94vh)}
.ss_overlay{backdrop-filter:blur(2px)}
.sk_station{box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary);position:relative;font-size:13px}
.sk_stationEmbedded{height:auto;min-height:600px}
.sk_shell{display:flex;flex:1;min-height:0}

/* -------------------------------- sidebar --------------------------------- */
.sk_side{box-sizing:border-box;flex:none;width:236px;min-height:0;display:flex;flex-direction:column;padding:24px 14px 16px 18px;border-right:1px solid var(--dsw-alias-border-l2);overflow:visible}
.sk_sideBrand{padding:0 8px 20px}
.sk_sideTitle{margin:0;font-size:21px;line-height:1.2;font-weight:650;letter-spacing:-.02em}
.sk_sideSub{margin:5px 0 0;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.sk_nav{display:flex;flex-direction:column;gap:2px;min-height:0;flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:8px;margin-right:-4px;padding-right:4px}
.sk_navItem{display:flex;align-items:center;gap:10px;width:100%;height:34px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.sk_navItem:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.sk_navItem[data-on]{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-weight:600}
.sk_navGlyph{flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}
.sk_navItem[data-on] .sk_navGlyph{color:var(--dsw-alias-link,#4c8dff)}
.sk_navName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_navCount{flex:none;font-style:normal;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.sk_navChevron{flex:none;font-style:normal;font-size:9px;color:var(--dsw-alias-label-tertiary)}
.sk_navLabel{margin:18px 0 6px;padding:0 10px;font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.sk_sideFoot{margin-top:auto;padding-top:18px}
.sk_manageTrigger{height:36px;color:var(--dsw-alias-label-secondary)}

/* --------------------------------- topbar --------------------------------- */
.sk_main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.sk_topbar{display:flex;align-items:flex-start;gap:18px;padding:22px 30px 16px;flex:none}
.sk_topText{min-width:0;flex:1}
.sk_topTitle{margin:0;font-size:20px;line-height:1.25;font-weight:650;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_topSub{margin:4px 0 0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.sk_topActions{display:flex;align-items:center;gap:8px;flex:none;padding-top:1px}

/* search */
.sk_search{display:flex;align-items:center;gap:6px;width:250px;height:33px;padding:0 10px;border:1px solid transparent;border-radius:9px;background:var(--dsw-alias-bg-layer-3,rgba(255,255,255,.05));color:var(--dsw-alias-label-tertiary)}
.sk_search:focus-within{border-color:var(--dsw-alias-border-l3,rgba(255,255,255,.18));background:var(--dsw-alias-bg-layer-1,#17181b)}
.sk_searchIcon{flex:none;display:block;color:var(--dsw-alias-label-tertiary)}
.sk_searchInput{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px}
.sk_searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}
.sk_kbd{flex:none;font:inherit;font-size:10.5px;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:5px;padding:1px 5px;background:var(--dsw-alias-bg-layer-1)}

/* generic text buttons */
.sk_textBtn{height:32px;display:inline-flex;align-items:center;gap:5px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}
.sk_textBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3)}
.sk_textBtn:disabled{opacity:.5;cursor:default}
.sk_closeBtn{width:33px;height:33px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:14px;cursor:pointer}
.sk_closeBtn:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}

/* ---------------------------------- view ---------------------------------- */
.sk_view{flex:1;min-height:0;overflow:auto;padding:4px 30px 30px}
.sk_home{max-width:820px}
.sk_homeBar{display:flex;align-items:center;gap:12px;min-height:32px;margin-bottom:16px}
.sk_homeContext{display:flex;align-items:baseline;gap:9px;min-width:0;flex:1}
.sk_homeContextBadge{flex:none;font-size:11px;line-height:18px;padding:1px 8px;border-radius:99px;background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 12%,transparent);color:var(--dsw-alias-link,#4c8dff)}
.sk_homeIntent{min-width:0;font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_homeLoading{padding:42px 4px;font-size:12.5px;color:var(--dsw-alias-label-tertiary)}
.sk_homeNote{margin:22px 0 0;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.sk_homeCats{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;max-width:560px;margin:0 auto}
.sk_homeCat{border:1px solid var(--dsw-alias-border-l2);border-radius:99px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:5px 11px;cursor:pointer}
.sk_homeCat:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.sk_homeSearch{width:min(420px,100%);margin:4px auto 0}
.sk_homeSearch .sk_search{width:100%;height:36px}

/* ----------------------------- smart pick card ---------------------------- */
.sk_recHero{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1,#17181b);padding:24px 26px 20px;box-shadow:0 18px 44px rgba(0,0,0,.16)}
.sk_recHead{display:flex;align-items:flex-start;gap:14px}
.sk_recGlyph{flex:none;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 12%,transparent);color:var(--dsw-alias-link,#4c8dff)}
.sk_recHeading{flex:1;min-width:0}
.sk_recNameRow{display:flex;align-items:center;gap:9px;min-width:0}
.sk_recName{margin:0;font-size:19px;line-height:1.3;font-weight:640;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_recBadge{flex:none;font-size:10.5px;line-height:18px;padding:0 8px;border-radius:99px;background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 14%,transparent);color:var(--dsw-alias-link,#4c8dff)}
.sk_recCat{flex:none;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.sk_recMeta{margin-top:6px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.sk_recSep{opacity:.5}
.sk_recPurpose{margin:18px 0 0;font-size:14.5px;line-height:23px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.sk_recOfficial{margin:7px 0 0;font-size:12.5px;line-height:20px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.sk_recReasonBox{margin:18px 0 0;padding:12px 14px;border-left:2px solid var(--dsw-alias-link,#4c8dff);border-radius:0 9px 9px 0;background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 7%,transparent)}
.sk_recReasonLabel{display:block;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);margin-bottom:4px}
.sk_recReasonText{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-primary)}
.sk_recFoot{display:flex;align-items:center;gap:10px;margin-top:20px;flex-wrap:wrap}
.sk_recUse{height:36px;padding:0 20px;border:0;border-radius:9px;background:#3d7ef0;color:#fff;font:inherit;font-size:13.5px;font-weight:560;cursor:pointer}
.sk_recUse:hover{background:#4f8bf5}
.sk_recUse:disabled{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);cursor:default}
.sk_recDeps{margin-left:auto;font-size:11px;line-height:17px;color:var(--dsw-alias-label-tertiary);text-align:right;overflow-wrap:anywhere}

/* secondary picks: borderless rows, not a card grid */
.sk_recSecondary{margin-top:26px}
.sk_recRow{display:flex;align-items:flex-start;gap:12px;padding:13px 6px;border-bottom:1px solid var(--dsw-alias-border-l2);cursor:pointer}
.sk_recRow:last-child{border-bottom:0}
.sk_recRow:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_recRowGlyph{flex:none;width:26px;height:26px;margin-top:1px;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}
.sk_recRowMain{flex:1;min-width:0}
.sk_recRowName{display:flex;align-items:baseline;gap:8px;min-width:0;font-size:13.5px;font-weight:600;letter-spacing:-.01em}
.sk_recRowNameText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_recRowPurpose{margin:3px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sk_recRowReason{margin:4px 0 0;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary);display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.sk_recRowActions{flex:none;display:flex;align-items:center;gap:4px;margin-top:1px}

/* ------------------------------- empty state ------------------------------ */
.sk_emptyPanel{display:flex;flex-direction:column;align-items:center;text-align:center;padding:64px 24px 56px;max-width:680px}
.sk_emptyGlyph{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);margin-bottom:16px}
.sk_emptyTitle{margin:0 0 7px;font-size:15.5px;font-weight:600;letter-spacing:-.01em;color:var(--dsw-alias-label-primary)}
.sk_emptyHint{margin:0 0 18px;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-tertiary)}
.sk_homeError{padding-top:36px}

/* ------------------------------ favourites page --------------------------- */
.sk_favPage{max-width:820px}
.sk_pageHint{margin:0 0 18px;font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.sk_favGroup{margin-bottom:26px}
.sk_groupHead{display:flex;align-items:center;gap:9px;min-height:22px;margin-bottom:4px}
.sk_groupLabel{font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.sk_groupCount{font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.sk_listFlat{padding:0;overflow:visible}

/* ---------------------------------- list ---------------------------------- */
.sk_all{max-width:880px}
.sk_list{flex:1;min-height:0;overflow:visible;padding:2px 0 18px}
.sk_row{display:grid;grid-template-columns:26px minmax(0,1fr) 92px 78px 168px;align-items:center;gap:14px;min-height:72px;padding:10px 6px;border-bottom:1px solid var(--dsw-alias-border-l2);cursor:pointer}
.sk_row:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_glyph{width:22px;height:22px;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}
.sk_row:hover .sk_glyph{color:var(--dsw-alias-label-secondary)}
.sk_rowMain{min-width:0}
.sk_rowName{display:flex;align-items:center;gap:7px;font-size:13.5px;line-height:19px;font-weight:560;letter-spacing:-.01em;min-width:0}
.sk_rowNameText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_ver{flex:none;font-size:10.5px;font-weight:400;color:var(--dsw-alias-label-tertiary);letter-spacing:0}
.sk_rowDesc{margin-top:2px;font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sk_state{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.sk_dot{width:5px;height:5px;border-radius:50%;background:#30b45c;flex:none}
.sk_dot[data-kind="user"]{background:#c98a1c}
.sk_dot[data-kind="model"]{background:#7c8db5}
.sk_dot[data-kind="off"]{background:var(--dsw-alias-label-tertiary)}
.sk_src{font-size:11.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk_actions{display:flex;align-items:center;justify-content:flex-end;gap:4px}
.sk_iconBtn{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:0}
.sk_iconBtn:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}
.sk_iconBtn[data-on]{color:#c98a1c}
.sk_use{height:26px;padding:0 11px;border:0;border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 13%,transparent);color:var(--dsw-alias-link,#4c8dff);font:inherit;font-size:12px;font-weight:520;cursor:pointer;white-space:nowrap}
.sk_use:hover{background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 20%,transparent)}
.sk_use:disabled{background:transparent;color:var(--dsw-alias-label-tertiary);cursor:default}
.sk_detailBtn{height:26px;padding:0 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer}
.sk_detailBtn:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}

.sk_empty{padding:48px 20px;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary)}
.sk_empty strong{display:block;font-size:15px;color:var(--dsw-alias-label-secondary);font-weight:560;margin-bottom:6px}
.sk_loading{padding:40px 20px;text-align:center;font-size:12.5px;color:var(--dsw-alias-label-tertiary)}

/* -------------------------------- toolbar --------------------------------- */
.sk_toolbar{display:flex;align-items:center;gap:14px;padding:10px 0 8px;flex:none;min-height:42px;margin-bottom:2px}
.sk_sorts{display:flex;align-items:center;gap:2px}
.sk_sort{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:5px 9px;border-radius:6px;cursor:pointer}
.sk_sort:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_sort[data-on]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);font-weight:560}
.sk_filters{display:flex;align-items:center;gap:2px;margin-left:auto;position:relative}
.sk_filter{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:5px 9px;border-radius:6px;cursor:pointer}
.sk_filter:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_filter[data-act]{color:var(--dsw-alias-link,#4c8dff);background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 10%,transparent)}
.sk_filterMenu{position:absolute;top:calc(100% + 6px);right:0;z-index:30;min-width:188px;padding:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#17181b);box-shadow:0 14px 36px rgba(0,0,0,.28)}
.sk_filterMenu[hidden]{display:none}
.sk_filterItem{display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;text-align:left;cursor:pointer}
.sk_filterItem:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_filterItem[data-on]{font-weight:560}
.sk_filterItem em{font-style:normal;margin-left:auto;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}

/* ------------------------------- detail drawer ---------------------------- */
.sk_drawerScrim{position:absolute;inset:0;background:rgba(0,0,0,.24);z-index:20}
.sk_drawer{position:absolute;top:0;right:0;bottom:0;width:min(760px,92vw);z-index:21;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#17181b);border-left:1px solid var(--dsw-alias-border-l2);box-shadow:-24px 0 60px rgba(0,0,0,.22)}
.sk_drawerHead{padding:18px 22px 13px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:none}
.sk_drawerTop{display:flex;align-items:flex-start;gap:12px}
.sk_drawerTitle{flex:1;min-width:0}
.sk_dName{margin:0;font-size:17px;font-weight:640;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_dMeta{margin-top:5px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.sk_ok{color:#30b45c}
.sk_bad{color:var(--dsw-alias-state-error-primary,#e05b5b)}
.sk_drawerBody{flex:1;min-height:0;overflow:auto;padding:16px 22px 4px}
.sk_sec{margin-bottom:16px}
.sk_secLabel{font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);margin-bottom:6px}
.sk_secText{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-primary)}
.sk_secText[data-dim]{color:var(--dsw-alias-label-secondary)}
.sk_bullets{margin:0;padding-left:14px}
.sk_bullets li{font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary);margin:1px 0}
.sk_why{border-left:2px solid var(--dsw-alias-link,#4c8dff);background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 8%,transparent);padding:9px 12px;border-radius:0 7px 7px 0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-primary)}
.sk_chipRow{display:flex;flex-wrap:wrap;gap:5px}
.sk_evidence{font-size:11px;line-height:16px;padding:2px 7px;border-radius:6px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2)}
.sk_kv{display:grid;grid-template-columns:76px 1fr;gap:6px 10px;font-size:12.5px;margin:0}
.sk_kv dt{margin:0;color:var(--dsw-alias-label-tertiary)}
.sk_kv dd{margin:0;color:var(--dsw-alias-label-primary);word-break:break-word}
.sk_hist{width:100%;border-collapse:collapse;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.sk_hist td{padding:5px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-variant-numeric:tabular-nums}
.sk_hist td:last-child{text-align:right;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.sk_drawerFoot{flex:none;padding:13px 22px 16px;border-top:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;gap:9px}
.sk_primary{height:32px;padding:0 16px;border:0;border-radius:8px;background:#3d7ef0;color:#fff;font:inherit;font-size:13px;font-weight:520;cursor:pointer}
.sk_primary:hover{background:#4f8bf5}
.sk_primary:disabled{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);cursor:default}
.sk_toggle{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.sk_switch{width:34px;height:20px;border:0;border-radius:99px;background:var(--dsw-alias-border-l3,#55585e);position:relative;cursor:pointer;padding:0}
.sk_switch:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .16s cubic-bezier(.4,0,.2,1)}
.sk_switch[data-on]{background:#30b45c}
.sk_switch[data-on]:after{left:16px}
.sk_switch:disabled{opacity:.5;cursor:default}

/* -------------------------------- more menu ------------------------------- */
.sk_moreWrap{position:relative}
.sk_moreBtn{height:32px;display:inline-flex;align-items:center;gap:5px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}
.sk_moreBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3)}
.sk_more{position:absolute;top:calc(100% + 8px);right:0;z-index:40;width:272px;max-height:min(440px,72vh);overflow:auto;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#17181b);box-shadow:0 16px 40px rgba(0,0,0,.3)}
.sk_moreUp{top:auto;bottom:calc(100% + 8px);left:0;right:auto}
.sk_moreItem{display:block;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.sk_moreItem:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_moreLabel{padding:6px 10px 2px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.sk_moreSelect{box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px}
.sk_moreSep{height:1px;margin:6px 4px;background:var(--dsw-alias-border-l2)}
.sk_moreNote{padding:6px 10px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}

/* --------------------------------- notice -------------------------------- */
.sk_notice{display:flex;align-items:center;gap:10px;margin:0 30px 10px;padding:8px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,#17181b);font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.sk_notice[data-kind="ok"]{border-color:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 32%,transparent);background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 8%,transparent);color:var(--dsw-alias-label-primary)}
.sk_notice[data-kind="err"]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05b5b) 36%,transparent);color:var(--dsw-alias-state-error-primary,#e05b5b)}
.sk_noticeAction{margin-left:auto;border:0;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer;padding:2px 4px;border-radius:6px}
.sk_noticeAction:hover{background:var(--dsw-alias-bg-layer-3)}

/* ------------------------ install / trash secondary panel ----------------- */
.sk_panelScrim{position:absolute;inset:0;background:rgba(0,0,0,.3);z-index:50;display:flex;align-items:center;justify-content:center;padding:20px}
.sk_panel{width:min(720px,94%);max-height:90%;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#17181b);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden}
.sk_panelHead{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:none}
.sk_panelTitle{margin:0;font-size:14px;font-weight:600}
.sk_panelBody{flex:1;min-height:0;overflow:auto;padding:0}

/* ---------------------------- recommendation dock ------------------------- */
.skd_card{box-sizing:border-box;margin:0 auto 8px;width:100%;max-width:var(--dsh-chat-content-width,760px);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#17181b);padding:11px 13px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.skd_head{display:flex;align-items:center;gap:7px;margin-bottom:7px;font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.skd_headIcon{display:inline-flex;color:var(--dsw-alias-link,#4c8dff)}
.skd_count{margin-left:auto;font-weight:400;letter-spacing:0;text-transform:none;font-size:11px}
.skd_row{display:flex;align-items:flex-start;gap:10px;padding:4px 0}
.skd_row + .skd_row{border-top:1px solid var(--dsw-alias-border-l2);margin-top:4px;padding-top:8px}
.skd_glyph{flex:none;width:26px;height:26px;margin-top:1px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 12%,transparent);color:var(--dsw-alias-link,#4c8dff)}
.skd_main{flex:1;min-width:0}
.skd_name{display:flex;align-items:baseline;gap:7px;font-size:13px;font-weight:600;letter-spacing:-.01em;min-width:0}
.skd_nameText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skd_cat{flex:none;font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary)}
.skd_intro{margin-top:2px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.skd_why{margin-top:3px;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.skd_whyLabel{font-weight:600;margin-right:5px}
.skd_toggle{flex:none;width:24px;height:24px;margin-left:2px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.skd_toggle:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.skd_collapsed{padding-bottom:9px}
.skd_collapsed .skd_head{margin-bottom:0}
.skd_actions{flex:none;display:flex;align-items:center;gap:6px;margin-top:1px}
.skd_use{height:26px;padding:0 10px;border:0;border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 13%,transparent);color:var(--dsw-alias-link,#4c8dff);font:inherit;font-size:12px;font-weight:520;cursor:pointer}
.skd_use:hover{background:color-mix(in srgb,var(--dsw-alias-link,#4c8dff) 20%,transparent)}
.skd_use:disabled{background:transparent;color:var(--dsw-alias-label-tertiary);cursor:default}
.skd_ignore{height:26px;padding:0 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer}
.skd_ignore:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.skd_status{margin-top:6px;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.skd_status[data-kind="err"]{color:var(--dsw-alias-state-error-primary,#e05b5b)}
.skd_status[data-kind="ok"]{color:var(--dsw-alias-link,#4c8dff)}

/* -------------------------------- responsive ------------------------------ */
@media (max-width:1100px){
  .sk_shell{flex-direction:column}
  .sk_side{width:auto;flex-direction:row;align-items:center;gap:4px;padding:10px 18px;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2)}
  .sk_sideBrand{display:none}
  .sk_nav{flex-direction:row;gap:4px;flex:1;min-width:0;overflow-x:auto;overflow-y:hidden;padding:0;margin:0}
  .sk_navLabel{display:none}
  .sk_navItem{width:auto;height:30px;padding:0 10px;flex:none;border:1px solid var(--dsw-alias-border-l2);border-radius:99px}
  .sk_navGlyph{display:none}
  .sk_navChevron{display:none}
  .sk_sideFoot{margin:0;padding:0;flex:none}
  .sk_manageTrigger{height:30px;padding:0 10px}
  .sk_manageTrigger .sk_navGlyph{display:inline-flex}
  .sk_moreWrapUp .sk_more{top:calc(100% + 8px);bottom:auto;left:auto;right:0;max-height:min(440px,60vh)}
  .sk_topbar{padding-top:16px}
}
@media (max-width:760px){
  .sk_topbar{padding:16px 18px 10px;gap:10px;flex-wrap:wrap}
  .sk_topTitle{font-size:19px}
  .sk_topActions{width:100%;order:2}
  .sk_search{width:100%}
  .sk_view{padding:2px 18px 20px}
  .sk_homeBar{flex-wrap:wrap}
  .sk_recHero{padding:20px 18px 18px;border-radius:13px}
  .sk_recFoot{gap:8px}
  .sk_recDeps{margin-left:0;text-align:left;width:100%}
  .sk_recRow{flex-wrap:wrap}
  .sk_recRowActions{width:100%;justify-content:flex-end;margin-top:-4px}
  .sk_toolbar{gap:8px;overflow:auto}
  .sk_row{grid-template-columns:22px minmax(0,1fr) auto;gap:10px;min-height:0;padding:12px 2px}
  .sk_state{display:none}
  .sk_src{display:none}
  .sk_actions{grid-column:2 / -1;justify-content:flex-end;margin-top:-6px}
  .sk_drawer{width:100%;max-width:100%}
  .sk_notice{margin:0 18px 8px}
  .skd_card{margin:0 10px 8px}
}

/* ------------------------------- accessibility ---------------------------- */
.sk_closeBtn:focus-visible,.sk_textBtn:focus-visible,.sk_search:focus-within,.sk_sort:focus-visible,
.sk_filter:focus-visible,.sk_filterItem:focus-visible,.sk_row:focus-visible,.sk_use:focus-visible,
.sk_detailBtn:focus-visible,.sk_iconBtn:focus-visible,.sk_primary:focus-visible,.sk_switch:focus-visible,
.sk_moreBtn:focus-visible,.sk_moreItem:focus-visible,.sk_favRow:focus-visible,.sk_navItem:focus-visible,
.sk_homeCat:focus-visible,.sk_recRow:focus-visible,.sk_recUse:focus-visible,
.skd_use:focus-visible,.skd_ignore:focus-visible,.skd_toggle:focus-visible{
  outline:2px solid var(--dsw-alias-link,#4c8dff);outline-offset:2px
}
@media (prefers-reduced-motion:reduce){
  .sk_switch:after{transition:none}
}

/* v0.8: tags, body audit, injection cost, ledger and diagnostics */
.sk_tagRow{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center}
.sk_tagChip{height:22px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.sk_tagChip:hover{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}
.sk_tagInput{width:100%;height:26px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.sk_tagInput:focus{outline:none;border-color:var(--dsw-alias-border-l3)}
.sk_ledgerTotals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0 16px}
.sk_ledgerStat{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2)}
.sk_ledgerStat span{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.sk_ledgerStat strong{font-size:18px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.sk_trend{display:flex;align-items:flex-end;gap:3px;height:56px;margin:6px 0 16px}
.sk_trendBar{flex:1;min-height:2px;background:var(--dsw-alias-link,#4f7cff);opacity:.7;border-radius:2px 2px 0 0}
.sk_ledgerTable th{text-align:left;font-weight:600;font-size:11px;color:var(--dsw-alias-label-tertiary);padding:0 8px 6px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_ledgerTable td{padding:5px 8px 5px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:11.5px}
.sk_ledgerTable td:first-child{color:var(--dsw-alias-label-primary)}
.sk_diag .sk_sec{margin-top:12px}

`;
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector('style[data-plugin-css="dsh-charlotte/main"]') !== null) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-charlotte";
  tag.dataset.pluginCss = "dsh-charlotte/main";
  tag.textContent = css;
  document.head.appendChild(tag);
}

// src/client/index.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var inject = ["slots"];
function StationIcon(props) {
  const size = props.size ?? 16;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "1.5", y: "2.5", width: "13", height: "11", rx: "2", stroke: "currentColor", strokeWidth: "1.4" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M5.5 2.5v11", stroke: "currentColor", strokeWidth: "1.4" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8 6h4M8 8.5h4M8 11h2.5", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" })
  ] });
}
// Localized replacement for the baseline StationFooterButton: the sidebar row
// opens the station drawer, and the drawer carries no title bar or version —
// the browsing surface (hero, More menu, cards) owns the page chrome. The
// close affordance lives inside the station header.
//
// Only one dsh-charlotte entry point is registered; the launcher owns all
// skill discovery, grouping and invocation.

/**
 * Sidebar foot button plus the portal drawer hosting the station.
 * @param {{wide?: boolean}} props - sidebar owner props.
 * @returns {object} React element.
 */
function StationFooterButton(props) {
  var lang = useSkLang();
  var openState = (0, import_react2.useState)(false);
  var open = openState[0];
  var setOpen = openState[1];
  (0, import_react2.useEffect)(function () {
    if (!open) return undefined;
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      // A dialog inside the station owns Escape while it is open.
      if (document.querySelector(".sk_modal") !== null) return;
      if (document.querySelector(".ss_dialog") !== null) return;
      if (document.querySelector(".sk_more") !== null) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  var drawer = open ? sk("div", {
    className: "ss_overlay",
    onClick: function () {
      setOpen(false);
    }
  }, [
    sk("div", {
      className: "ss_panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": skT(lang, "panel.title"),
      onClick: function (event) {
        event.stopPropagation();
      }
    }, [
      skH(StationApp, {
        onRequestClose: function () {
          setOpen(false);
        }
      })
    ])
  ]) : null;
  return sk(import_jsx_runtime2.Fragment, null, [
    sk("button", {
      className: props.wide === false ? "ss_footBtn ss_footBtnRail" : "ss_footBtn",
      type: "button",
      onClick: function () {
        setOpen(function (value) {
          return !value;
        });
      },
      title: "dsh-charlotte"
    }, [
      skH(StationIcon, {}),
      props.wide === false ? null : sk("span", null, "dsh-charlotte")
    ]),
    drawer !== null && typeof document !== "undefined" ? (0, import_react_dom.createPortal)(drawer, document.body) : null
  ]);
}

function StationSettingsSection() {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { display: "flex", flexDirection: "column", minHeight: 480 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StationApp, { embedded: true }) });
}
function apply(ctx) {
  skPluginCtx = ctx;
  skRegisterRecommendDock(ctx);
  injectStyles();
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "dsh-charlotte",
    order: 10
  }, StationFooterButton));
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-charlotte",
    order: 55,
    label: "dsh-charlotte"
  }, StationSettingsSection));
}

    return module.exports;
  }
});
