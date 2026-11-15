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
// #region dsh-charlotte revamp v0.4 — launcher UI + non-executing Skill loading
//
// This region replaces the baseline StationApp, TargetSelector and LibraryTab
// definitions and adds the dsh-charlotte launcher surface: one responsive card grid,
// one loading dialog, one "More" menu for administration, and the group
// filters that split the catalog by invocation policy.
//
// Data stays on the existing `/charlotte/api` endpoints. Loading stages the
// host's official `/skill-name` token in a conversation's composer without
// submitting it; the host's `dsh-tool-skill` consumer turns that token into the
// Skill instructions only when the user sends their own message.
//
// No fake flows: DSH has no per-Session Skill attachment, so when the composer
// services are unavailable the dialog reports the limitation instead of
// pretending the Skill was loaded.

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
 * Give every element in a children list a stable key. React treats a static
 * array as a keyed list; nested arrays are keyed recursively.
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
var skLangState = null;
var skLangListeners = new Set();

/**
 * Resolve the initial language: saved choice, then the shell locale, then English.
 * @returns {'zh'|'en'} language id.
 */
function skDetectLang() {
  try {
    var saved = window.localStorage.getItem(SK_LANG_KEY);
        if (saved === "zh" || saved === "en") return saved;
  } catch (error) {
    // Storage may be unavailable; fall through to the locale guess.
  }
  try {
    var language = window.navigator && window.navigator.language;
    if (typeof language === "string" && language.toLowerCase().indexOf("zh") === 0) return "zh";
  } catch (error) {
    // No navigator in a non-browser host; use English.
  }
  return "en";
}

/**
 * Current language id.
 * @returns {'zh'|'en'} language id.
 */
function skGetLang() {
  if (skLangState === null) skLangState = skDetectLang();
  return skLangState;
}

/**
 * Switch the language and persist it for the next session.
 * @param {'zh'|'en'} next - target language.
 * @returns {void}
 */
function skSetLang(next) {
  if (next !== "zh" && next !== "en") return;
  skLangState = next;
  try {
    window.localStorage.setItem(SK_LANG_KEY, next);
  } catch (error) {
    // Persistence is best-effort.
  }
  for (const listener of skLangListeners) {
    try {
      listener(next);
    } catch (error) {
      // A broken listener must not block the others.
    }
  }
}

/**
 * Subscribe a component to language changes.
 * @returns {'zh'|'en'} the active language for this render.
 */
function useSkLang() {
  var pair = (0, import_react.useState)(skGetLang());
  var lang = pair[0];
  var setLang = pair[1];
  (0, import_react.useEffect)(function () {
    var listener = function (next) {
      setLang(next);
    };
    skLangListeners.add(listener);
    return function () {
      skLangListeners.delete(listener);
    };
  }, []);
  return lang;
}
// #endregion

// #region dictionaries ---------------------------------------------------------
var SK_TEXT = {
  en: {
    "panel.title": "dsh-charlotte",
    "panel.close": "Close",
    "panel.install": "Drag & Drop Install",
    "panel.trash": "Recycle Bin",
    "hero.subtitle": "Find a Skill and choose where to use it.",
    "search.placeholder": "Search skills by name, description, or purpose",
    "search.count": "{n} skills",
    "filter.label": "Filter by skill group",
    "filter.all": "All",
    "filter.both": "Model + User",
    "filter.model": "Model only",
    "filter.user": "User only",
    "filter.none": "Unavailable",
    "cat.email": "Email Assistant",
    "cat.coach": "Decision Coach",
    "cat.learning": "Learning & Education",
    "cat.dev": "Developer Tools",
    "cat.general": "General Skill",
    "card.type": "Agent Skill · {category}",
    "card.use": "Use Skill",
    "card.details": "Details",
    "card.noDesc": "No description yet.",
    "card.userOnly": "User-only",
    "card.userDisabled": "Not user-invocable",
    "card.userOnlyHint": "Disabled for the model; users can still load it with /name.",
    "noMatchGroup": "No skills in this group.",
    "status.on": "Enabled",
    "status.off": "Disabled",
    "status.unavailable": "Unavailable",
    "toggle.disableAria": "Disable for the model: ",
    "toggle.enableAria": "Enable for the model: ",
    "toggle.disableTitle": "Disable for the model (users can still load it with /name)",
    "toggle.enableTitle": "Enable for the model",
    "more.label": "More",
    "more.scope": "Scope",
    "more.install": "Drag & Drop Install",
    "more.trash": "Recycle Bin",
    "more.refresh": "Refresh",
    "more.refreshing": "Refreshing…",
    "more.language": "Language",
    "ws.global": "Global (user skills)",
    "root.userDsh": "Global ~/.dsh/skills",
    "root.userAgents": "Shared ~/.agents/skills",
    "import.target": "Import target",
    "import.projectDsh": "Project .dsh/skills",
    "import.projectAgents": "Project .agents/skills",
    "conflict.title": "Conflict policy",
    "conflict.skip": "Skip on conflict",
    "conflict.rename": "Rename on conflict",
    "conflict.replace": "Replace on conflict",
    "dialog.title": "Load this Skill into a conversation?",
    "dialog.desc": "Choose where to stage it. Nothing runs until you type your message.",
    "dialog.current": "Load into Current Conversation",
    "dialog.currentDesc": "Keep this conversation and stage the Skill in its input. Nothing runs until you send.",
    "dialog.currentUnavailable": "No active conversation right now. Load into a new conversation instead.",
    "dialog.new": "Load into New Conversation",
    "dialog.newDesc": "Open a new conversation with the Skill staged in its input.",
    "dialog.newUnavailable": "Starting a new conversation is not available in this build.",
    "dialog.hint": "The Skill is staged as /skill-name in the input; it activates when you send your first message.",
    "dialog.cancel": "Cancel",
    "dialog.close": "Close",
    "dialog.currentWorking": "Loading into the current conversation…",
    "dialog.newWorking": "Preparing a new conversation…",
    "dialog.error": "Could not load this Skill: {message}",
    "notice.loaded": "Loaded into the conversation. Type your message when ready.",
    "error.load": "Loading failed (HTTP {status})",
    "error.toggle": "Toggle failed (HTTP {status})",
    "error.delete": "Delete failed (HTTP {status})",
    "error.detail": "Could not read details (HTTP {status})",
    "error.override": "Switch failed (HTTP {status})",
    "error.invokeApi": "This DSH build does not expose the composer API needed to load a Skill.",
    "error.invokeNoSession": "No active conversation. Choose “Load into New Conversation” instead.",
    "error.loadBlocked": "The composer is busy; send or clear the current message first.",
    "error.invokeNoWorkspace": "No workspace is available to start a conversation.",
    "error.invokeNotUser": "This Skill is not available for user invocation.",
    "detail.modelOn": "Model enabled",
    "detail.modelOff": "Model disabled",
    "detail.userOn": "User invocable",
    "detail.userOff": "Not user invocable",
    "detail.dir": "Directory skill",
    "detail.single": "Single-file skill",
    "detail.official": "Official description",
    "detail.whenToUse": "When to use",
    "detail.installedAt": "Installed at",
    "detail.reading": "Reading SKILL.md…",
    "detail.files": "{n} files",
    "detail.delete": "Move to Recycle Bin",
    "detail.disable": "Disable",
    "detail.enable": "Enable",
    "detail.close": "Close",
    "scope.global": "Global",
    "scope.shared": "Shared",
    "scope.project": "Project",
    "chip.readonly": "Read-only",
    "chip.plugin": "Plugin",
    "chip.userOnly": "User-only",
    "detail.source": "Source",
    "detail.provider": "Provider",
    "detail.registryHint": "This Skill is supplied by a plugin and is read-only here; enable/disable and delete are managed by that plugin.",
    "detail.mountedAt": "Mounted from",
    "detail.switchHint": "The switch is stored in ~/.dsh/charlotte/overrides.json; external SKILL.md files are never modified.",
    "confirm.delete": "Move skill “{name}” to the Recycle Bin? You can restore it from there.",
    "audience.student": "For High School Students",
    "audience.pro": "For Professionals",
    "audience.tag": "Official description",
    "fallback.student": "Official summary: {text}",
    "fallback.studentEmpty": "No beginner summary is available for this skill yet — open Details to read its source file.",
    "fallback.pro": "{text}",
    "fallback.proEmpty": "No description provided; Details shows the SKILL.md source and its file list.",
    "empty": "No skills here yet. Use More → Drag & Drop Install to add one.",
    "noMatch": "No skills match “{q}”.",
    "clearSearch": "Clear search",
    "mounted.hint": "Read-only mount: edits in the source directory apply instantly; the switch is kept by the station and never writes the source file."
  },
  zh: {
    "panel.title": "dsh-charlotte",
    "panel.close": "关闭",
    "panel.install": "拖拽安装",
    "panel.trash": "回收站",
    "hero.subtitle": "找到技能，再选择在哪里使用。",
    "search.placeholder": "搜索技能名称、描述或用途",
    "search.count": "{n} 个技能",
    "filter.label": "按技能组筛选",
    "filter.all": "全部",
    "filter.both": "模型+用户",
    "filter.model": "仅模型",
    "filter.user": "仅用户",
    "filter.none": "不可调用",
    "cat.email": "邮件助手",
    "cat.coach": "决策教练",
    "cat.learning": "学习与教育",
    "cat.dev": "开发者工具",
    "cat.general": "通用技能",
    "card.type": "Agent Skill · {category}",
    "card.use": "使用技能",
    "card.details": "详情",
    "card.noDesc": "暂无描述。",
    "card.userOnly": "仅用户可用",
    "card.userDisabled": "用户不可调用",
    "card.userOnlyHint": "对模型停用；用户仍可用 /name 加载。",
    "noMatchGroup": "这个分组里没有技能。",
    "status.on": "已启用",
    "status.off": "已停用",
    "status.unavailable": "不可调用",
    "toggle.disableAria": "停用（模型）：",
    "toggle.enableAria": "启用（模型）：",
    "toggle.disableTitle": "对模型停用（用户仍可用 /name 加载）",
    "toggle.enableTitle": "对模型启用",
    "more.label": "更多",
    "more.scope": "作用域",
    "more.install": "拖拽安装",
    "more.trash": "回收站",
    "more.refresh": "刷新",
    "more.refreshing": "刷新中…",
    "more.language": "语言",
    "ws.global": "全局（用户技能）",
    "root.userDsh": "全局 ~/.dsh/skills",
    "root.userAgents": "共享 ~/.agents/skills",
    "import.target": "导入目标",
    "import.projectDsh": "项目 .dsh/skills",
    "import.projectAgents": "项目 .agents/skills",
    "conflict.title": "同名冲突策略",
    "conflict.skip": "冲突跳过",
    "conflict.rename": "冲突改名",
    "conflict.replace": "冲突替换",
    "dialog.title": "把这个技能加载到哪个对话？",
    "dialog.desc": "选择加载位置。在你输入并发送消息之前，不会执行任何任务。",
    "dialog.current": "加载到当前对话",
    "dialog.currentDesc": "保留当前对话，把技能放进输入框；发送前不会执行。",
    "dialog.currentUnavailable": "当前没有可用对话，请选择「加载到新对话」。",
    "dialog.new": "加载到新对话",
    "dialog.newDesc": "打开一个新对话，技能已放进输入框。",
    "dialog.newUnavailable": "当前版本无法新建对话。",
    "dialog.hint": "技能会以 /技能名 的形式放进输入框，发送第一条消息时生效。",
    "dialog.cancel": "取消",
    "dialog.close": "关闭",
    "dialog.currentWorking": "正在加载到当前对话…",
    "dialog.newWorking": "正在准备新对话…",
    "dialog.error": "加载技能失败：{message}",
    "notice.loaded": "已加载到对话；准备好后直接输入消息即可。",
    "error.load": "加载失败（HTTP {status}）",
    "error.toggle": "切换失败（HTTP {status}）",
    "error.delete": "删除失败（HTTP {status}）",
    "error.detail": "读取详情失败（HTTP {status}）",
    "error.override": "切换失败（HTTP {status}）",
    "error.invokeApi": "当前 DSH 版本没有暴露加载技能所需的输入框接口。",
    "error.invokeNoSession": "当前没有活动对话。请选择「加载到新对话」。",
    "error.loadBlocked": "输入框正在提交，请先发送或清空当前内容。",
    "error.invokeNoWorkspace": "没有可用来新建对话的工作区。",
    "error.invokeNotUser": "这个技能不允许用户调用。",
    "detail.modelOn": "模型已启用",
    "detail.modelOff": "模型已停用",
    "detail.userOn": "用户可调用",
    "detail.userOff": "用户不可调用",
    "detail.dir": "目录技能",
    "detail.single": "单文件技能",
    "detail.official": "官方描述",
    "detail.whenToUse": "使用时机",
    "detail.installedAt": "安装位置",
    "detail.reading": "正在读取 SKILL.md…",
    "detail.files": "{n} 个文件",
    "detail.delete": "移入回收站",
    "detail.disable": "停用",
    "detail.enable": "启用",
    "detail.close": "关闭",
    "scope.global": "全局",
    "scope.shared": "共享",
    "scope.project": "项目",
    "chip.readonly": "只读",
    "chip.plugin": "插件",
    "chip.userOnly": "仅用户",
    "detail.source": "来源",
    "detail.provider": "提供者",
    "detail.registryHint": "这个技能由插件提供，在此只读；启停与删除由该插件管理。",
    "detail.mountedAt": "挂载位置",
    "detail.switchHint": "开关状态存在 ~/.dsh/charlotte/overrides.json，外部 SKILL.md 一个字节不改。",
    "confirm.delete": "把技能「{name}」移入回收站？可在回收站恢复。",
    "audience.student": "给高中生看",
    "audience.pro": "给专业人士看",
    "audience.tag": "官方描述",
    "fallback.student": "官方说明：{text}",
    "fallback.studentEmpty": "这个技能还没有通俗说明，打开「详情」可以直接读它的源文件。",
    "fallback.pro": "{text}",
    "fallback.proEmpty": "未提供描述；详情可阅读 SKILL.md 原文与文件清单。",
    "empty": "这里还没有技能。用「更多 → 拖拽安装」添加一个吧。",
    "noMatch": "没有匹配「{q}」的技能。",
    "clearSearch": "清除搜索",
    "mounted.hint": "只读挂载：源目录里的改动即时生效；开关状态存在 dsh-charlotte 里，不会写回源文件。"
  }
};

/**
 * Look up one localized string and fill `{name}` placeholders.
 * @param {'zh'|'en'} lang - active language.
 * @param {string} key - dictionary key.
 * @param {object} params - optional placeholder values.
 * @returns {string} localized text.
 */
function skT(lang, key, params) {
  var table = SK_TEXT[lang] === undefined ? SK_TEXT.en : SK_TEXT[lang];
  var text = table[key];
  if (typeof text !== "string") text = SK_TEXT.en[key];
  if (typeof text !== "string") return key;
  if (params !== undefined) {
    for (const name of Object.keys(params)) {
      text = text.split("{" + name + "}").join(String(params[name]));
    }
  }
  return text;
}
// #endregion

// #region copy and categories --------------------------------------------------
var SK_CATEGORIES = {
  email: { tint: "blue", key: "cat.email" },
  coach: { tint: "green", key: "cat.coach" },
  learning: { tint: "purple", key: "cat.learning" },
  dev: { tint: "indigo", key: "cat.dev" },
  general: { tint: "slate", key: "cat.general" }
};

// Presentation labels for plugin/bundled providers whose skills come from the
// dsh registry rather than a filesystem root or an external mount directory.
var SK_PROVIDERS = {
  "mattpocock-skills-zh": { label: "Matt Pocock ZH", category: "dev" },
  "dsh-blender": { label: "Blender", category: "dev" },
  "dsh-office": { label: "Office", category: "general" },
  "charlotte": { label: "Charlotte", category: "general" }
};

/**
 * Display label for one registry provider.
 * @param {string} provider - provider name from the registry summary.
 * @returns {string} label.
 */
function skProviderLabel(provider) {
  var known = SK_PROVIDERS[provider];
  if (known !== undefined) return known.label;
  return typeof provider === "string" && provider !== "" ? provider : "Plugin";
}

/**
 * Presentation category for one registry provider.
 * @param {string} provider - provider name.
 * @returns {string} category id.
 */
function skProviderCategory(provider) {
  var known = SK_PROVIDERS[provider];
  return known === undefined ? "general" : known.category;
}

// Audience copy is grounded in each skill's own SKILL.md: commands, workflow
// and output shape only. Anything the source does not state is left out.
// `short` is the one-line card summary; cards stay scannable and the full
// audience copy lives in the Details dialog.
var SK_SKILL_COPY = {
  "agently-mail": {
    category: "email",
    en: {
      short: "Read, search, send, and tidy mail without leaving the chat.",
      student: "Think of it as a helper that runs your inbox for you. It can write and send replies, forward messages, search for that one email you cannot find, read threads, download attachments and tidy up the inbox — all from the chat, without clicking through a mail app.",
      professional: "A command-line mail bridge for agent workflows: OAuth login, then send, reply, forward, search, read, download attachments and manage the inbox through agently-cli. All work stays inside the mail domain, so an agent can handle mail inside the same conversation instead of handing you off to a separate browser UI."
    },
    zh: {
      short: "在对话里读信、搜信、发信、整理邮箱。",
      student: "把它当成替你管邮箱的助手：写回信、转发、搜那封找不到的邮件、读正文、下载附件、整理收件箱，都在对话里完成，不用切回邮件 App 一页页点。",
      professional: "通过 agently-cli 命令行桥接真实邮箱：OAuth 登录后，发送、回复、转发、检索、读取、下载附件与整理收件箱都在同一会话内完成；操作留在邮件域内，白名单内的发送免二次确认。"
    }
  },
  grilling: {
    category: "coach",
    en: {
      short: "Relentless questions that turn a fuzzy plan into clear decisions.",
      student: "Ever faced a decision you could not quite think through? This skill turns the assistant into a coach that keeps asking questions until the fuzzy parts of your plan become clear choices. It asks one round at a time, suggests an answer for every question, and waits for you before moving on.",
      professional: "Runs a relentless interview shaped as a design tree: every decision branches into the decisions that depend on it. Each round asks only the frontier — questions whose prerequisites are already settled — numbered, with a recommended answer attached, then waits for the user. Settled answers push the frontier out, and the session ends when no branch is left unvisited and the user confirms."
    },
    zh: {
      short: "用连环追问把含糊的方案问成清晰的决策。",
      student: "遇到想不明白的决定，它像教练一样连环追问，把方案里含糊的地方一个个问清楚。每轮只问当下能问的问题，每题附一个推荐答案，等你答完再往下推。",
      professional: "以设计树组织的盘问：每个决策分叉出依赖它的子决策，每轮只问前提已定的「前沿」问题，编号并附推荐答案，等回答后再展开下一环。适合方案评审、技术选型这类还没想透的场合。"
    }
  },
  "grill-me": {
    category: "coach",
    en: {
      short: "A one-line trigger for the grilling interview.",
      student: "A one-line shortcut for the days you want to be challenged. If you already suspect the plan is half-baked, this starts the same relentless interview without re-explaining the process — say the trigger and the questions begin immediately, one round at a time.",
      professional: "A thin entry point: it calls the Skill tool with grilling. Its frontmatter sets disable-model-invocation, so the model never loads it on its own — it only runs when the user triggers it, by slash command or explicit request. Keep it as the manual switch for arming the interview deliberately rather than letting the model suggest it."
    },
    zh: {
      short: "一句话启动那套连环盘问。",
      student: "一句话的快捷入口：你已经知道方案没想透、想被追问时，用它直接启动那套连环盘问，不用再解释一遍流程，问题会一轮一轮地来。",
      professional: "薄封装入口：调用 Skill 工具加载 grilling。frontmatter 里设了 disable-model-invocation，模型不会自行调用，只能由用户斜杠命令或明确要求触发，适合把盘问留成手动开关。"
    }
  },
  "ha7ch-school": {
    category: "learning",
    en: {
      short: "A tutor that teaches AI Native and FDE inside the chat.",
      student: "Turns the assistant into a school you can actually attend. A tutor teaches courses on AI Native and FDE, plus GitHub basics and talking to decision makers, all inside the chat: it sets practice, checks how you are doing and remembers where you stopped so you can continue next time.",
      professional: "HA7CH AI Native School: a tutor agent that teaches inside the main conversation thread, orders lessons by the learner's demonstrated level and persists progress across sessions. Courses cover AI Native, Forward Deployed Engineer, a shared GitHub track and a stakeholder-communication track; students can interrupt or make the tutor call tools mid-lesson while the lesson line stays intact."
    },
    zh: {
      short: "在对话里上课的 AI Native / FDE 导师。",
      student: "把助手变成一所可以插班上课的学校：导师在对话里讲课、出练习、检查进度，还记住你上次学到哪，下次接着上。课程有 AI Native、FDE，还有 GitHub 基础和跟一号位沟通。",
      professional: "HA7CH AI Native School：在主对话线程内授课的导师型 agent，按学习者已展现的水平动态排课，并把进度跨会话持久化。课程含 AI Native、FDE、GitHub 基础与一号位沟通专项；可随时打断提问，也可中途调工具查资料。"
    }
  },
  ponytail: {
    category: "dev",
    en: {
      short: "The smallest solution that works, before it grows.",
      student: "A senior developer on your shoulder asking whether the code even needs to exist. It pushes for the smallest solution that works: reuse what is already there, try built-in features before adding a library, and write one line instead of fifty — so projects stay small.",
      professional: "Forces the laziest solution that actually works. Enforces a ladder — does this need to exist (YAGNI), reuse what the repository already has, standard library, native platform features, already-installed dependencies — and never adds a dependency for a few lines. Three intensities: lite, full (default), ultra. Applies to writing, refactoring, reviewing and dependency choices."
    },
    zh: {
      short: "先找最小可行解，别让项目越做越大。",
      student: "像一位见过世面的老开发坐在旁边，先问「这段代码真的需要存在吗」。它推动最小可行解法：先复用现有代码、先试语言自带能力、能用一行就别写五十行，让项目别越做越大。",
      professional: "强制最省的可行解，按阶梯决策：要不要做（YAGNI）→ 仓库里是否已有实现 → 标准库 → 平台原生能力 → 已装依赖，绝不为一小段逻辑新增依赖。强度分 lite/full/ultra 三档，适用于编码、重构与依赖选型。"
    }
  },
  "ponytail-review": {
    category: "dev",
    en: {
      short: "Code review that only hunts unnecessary complexity.",
      student: "A code review that only hunts for unnecessary complexity. It points out code you can delete, libraries you do not really need and abstractions with a single user, then shows the shorter version. It deliberately ignores bugs and security, so it complements a normal review rather than replacing it.",
      professional: "Diff-scoped over-engineering review. Each finding is one line tagged delete, stdlib, native, yagni or shrink, naming what to cut, what replaces it and where it lives. Correctness, security and performance are explicitly out of scope and belong to a normal review pass; the best possible outcome is a shorter diff."
    },
    zh: {
      short: "只挑不必要复杂度的代码评审。",
      student: "只盯着「是不是写复杂了」的代码评审：指出可以删的代码、其实用不上的库、只有一个实现的抽象，并给出更短的写法；它明确不管正确性和安全，是普通评审的补充。",
      professional: "面向 diff 的过度工程评审：每条发现一行，打上 delete、stdlib、native、yagni、shrink 标签，写清要剪什么、用什么替代、在哪一行。正确性、安全、性能明确不在范围内，最好的结果是 diff 变短。"
    }
  },
  "ponytail-audit": {
    category: "dev",
    en: {
      short: "Rank what to delete across the whole repository.",
      student: "The same complexity hunt, but for the whole repository instead of a single change. It scans the tree and returns a ranked list of what to delete — biggest cut first — ending with how many lines and dependencies could disappear. One shot: it reports, it does not edit.",
      professional: "Repo-wide version of ponytail-review: scans the whole tree rather than a diff and ranks findings by cut size. Reuses the delete, stdlib, native, yagni and shrink tags with concrete replacements, then closes with a net line count and the dependencies that could be removed. Lists findings only; applies nothing and never edits a file."
    },
    zh: {
      short: "全仓扫描，按可删体量排清单。",
      student: "同样的复杂度筛查，但对象是整个仓库而不是一次改动：扫全树、按可剪掉的体量排序输出清单，结尾给出能减少多少行和多少依赖。只出报告，不动代码。",
      professional: "ponytail-review 的全仓版：扫描整棵树而非 diff，按裁剪体量排序，沿用 delete/stdlib/native/yagni/shrink 标签并给出具体替代，结尾汇总净减行数与可减依赖。只列发现，不应用修改。"
    }
  },
  "ponytail-debt": {
    category: "dev",
    en: {
      short: "Collect every deferred shortcut into one debt ledger.",
      student: "Every deliberate shortcut is supposed to leave a note in the code. This collects all those notes into one ledger, grouped by file, so “we will fix it later” cannot quietly become “we forgot”. It also flags the notes that never say when they should be revisited.",
      professional: "Harvests every ponytail: comment into a debt ledger. Greps the repository, skipping node_modules, .git and build output, and emits one row per marker with file and line, what was simplified, the ceiling it declares and the trigger to revisit. Markers with no trigger are flagged as rot risks; the report closes with counts."
    },
    zh: {
      short: "把所有偷懒注释收成一份技术债台账。",
      student: "每一处刻意偷懒都该在代码里留张便签。它把这些 ponytail: 注释收集成一份台账，按文件列出，避免「以后再改」悄悄变成「忘了改」，并标出没写升级触发条件的便签。",
      professional: "把仓库里所有 ponytail: 注释收成技术债台账：跳过 node_modules、.git 与构建输出，逐条给出文件行号、简化了什么、声明的上限和升级触发条件，可附 git blame 归属；缺触发条件的标记为腐化风险。"
    }
  },
  "ponytail-gain": {
    category: "dev",
    en: {
      short: "The measured scoreboard for the lazy style.",
      student: "A scoreboard for the lazy style. It shows measured benchmark medians from five everyday tasks — how much less code, how much less cost and how much faster the ponytail approach was — so you can see what this trade-off actually buys instead of taking it on faith.",
      professional: "Displays ponytail's benchmark medians: five everyday tasks (email validator, debounce, CSV sum, countdown timer, rate limiter) across three models, reported as ranges for lines of code, cost and speed. One-shot display only — it does not change mode, write flag files or persist anything, and the figures are published benchmarks, not a measurement of the current repository."
    },
    zh: {
      short: "给「偷懒」风格做的实测记分板。",
      student: "给「偷懒」风格做的记分板：展示五个日常任务的基准中位数——少了多少代码、省了多少成本、快了多少倍，让你看到这套取舍到底换来了什么，而不是凭感觉相信。",
      professional: "展示 ponytail 的基准中位数：五个日常任务（邮箱校验、防抖、CSV 求和、倒计时、限流器）× 三个模型，按行数、成本、速度给出区间。纯展示：不改模式、不写标记文件；数字是公开基准。"
    }
  },
  "ponytail-help": {
    category: "dev",
    en: {
      short: "A cheat sheet for the whole ponytail family.",
      student: "A cheat sheet for the whole family: what the three intensity levels change, what each related skill is for, and how to switch the behaviour off. Open it when you forget a command instead of guessing — it changes nothing about your current setup.",
      professional: "Quick-reference card for the ponytail family: the lite, full and ultra levels with their triggers, a table mapping each sibling skill to its job — review, audit, debt, gain, help — the host-specific invocation forms and deactivation instructions. One-shot display: no mode changes and nothing is written. Use it when you forget which level or command applies."
    },
    zh: {
      short: "ponytail 全家的速查卡。",
      student: "一张速查卡：三档强度各改什么、六个同系技能各管什么、怎么关掉这套行为。忘了命令就打开看一眼，它不会改动你当前的设置。",
      professional: "ponytail 家族的速查卡：lite/full/ultra 三档的触发方式、各兄弟技能的职责对照表、不同宿主的调用形式与停用方法。一次性展示：不切模式、不写盘、不留状态。"
    }
  }
};

/**
 * Collapse whitespace and cut to a display budget.
 * @param {unknown} value - raw text.
 * @param {number} max - maximum characters.
 * @returns {string} display text.
 */
function skClip(value, max) {
  var text = String(value === undefined || value === null ? "" : value).replace(/\s+/g, " ").trim();
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

/**
 * Read a frontmatter passthrough value that may be a string or a {zh,en} map.
 * @param {unknown} value - metadata value.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string|undefined} text, or undefined when absent.
 */
function skMetaText(value, lang) {
  if (typeof value === "string" && value !== "") return value;
  if (value !== null && typeof value === "object" && typeof value[lang] === "string" && value[lang] !== "") return value[lang];
  return undefined;
}

/**
 * Resolve the short card description, the two audience descriptions and the
 * category for one skill.
 * @param {object} skill - skill row from `/skills` or a mounted catalog row.
 * @param {'zh'|'en'} lang - active language.
 * @returns {{student: string, professional: string, short: string, category: string, curated: boolean}} copy bundle.
 */
function skCopyOf(skill, lang) {
  var meta = skill.meta || {};
  var curated = SK_SKILL_COPY[skill.name];
  var description = typeof meta.description === "string" ? meta.description : "";
  var fallbackStudent = description === ""
    ? skT(lang, "fallback.studentEmpty")
    : skT(lang, "fallback.student", { text: skClip(description, lang === "zh" ? 90 : 150) });
  var fallbackProfessional = description === ""
    ? skT(lang, "fallback.proEmpty")
    : skT(lang, "fallback.pro", { text: skClip(description, lang === "zh" ? 200 : 320) });
  var customStudent = skMetaText(meta.studentDescription, lang);
  var customProfessional = skMetaText(meta.professionalDescription, lang);
  var student = customStudent !== undefined ? customStudent : (curated !== undefined ? curated[lang].student : fallbackStudent);
  var professional = customProfessional !== undefined ? customProfessional : (curated !== undefined ? curated[lang].professional : fallbackProfessional);
  var short = curated !== undefined && typeof curated[lang].short === "string"
    ? curated[lang].short
    : (description === "" ? skT(lang, "card.noDesc") : skClip(description, lang === "zh" ? 78 : 150));
  var category = "general";
  if (typeof meta.category === "string" && SK_CATEGORIES[meta.category] !== undefined) category = meta.category;
  else if (curated !== undefined) category = curated.category;
  return {
    student: student,
    professional: professional,
    short: short,
    category: category,
    curated: curated !== undefined || customStudent !== undefined
  };
}

/**
 * Short scope word for the card chip.
 * @param {object} group - root group from `/skills`.
 * @param {'zh'|'en'} lang - active language.
 * @returns {string} scope label.
 */
function skScopeOf(group, lang) {
  var id = typeof group.rootId === "string" ? group.rootId : "";
  if (id === "user-dsh") return skT(lang, "scope.global");
  if (id === "user-agents") return skT(lang, "scope.shared");
  if (id.indexOf("project-dsh") === 0 || id.indexOf("project-agents") === 0) return skT(lang, "scope.project");
  var label = typeof group.label === "string" ? group.label : "";
  return label === "" ? "Skill" : label.split(" · ")[0];
}

/**
 * Whether the model may invoke this skill (the switch's state).
 * @param {object} skill - skill row.
 * @returns {boolean} model-enabled state.
 */
function skModelInvocable(skill) {
  var meta = skill.meta || {};
  return meta.modelInvocable !== false;
}

/**
 * Whether a human may invoke this skill with `/name`.
 * @param {object} skill - skill row.
 * @returns {boolean} user-invocable state.
 */
function skUserInvocable(skill) {
  var meta = skill.meta || {};
  return meta.userInvocable !== false;
}

/**
 * Invocation-policy group used by the group filters.
 * @param {object} skill - skill row.
 * @returns {'both'|'model'|'user'|'none'} group id.
 */
function skInvocationGroup(skill) {
  var model = skModelInvocable(skill);
  var user = skUserInvocable(skill);
  if (model && user) return "both";
  if (model) return "model";
  if (user) return "user";
  return "none";
}

/**
 * Build the single card list from the two existing data sources. Native skills
 * win a name collision over a mounted copy, mirroring the host registry's rank
 * order, so the launcher never shows the same name twice.
 * @param {Array} groups - `/skills` groups.
 * @param {Array} mounted - `/catalog` rows.
 * @param {Array} sources - `/catalog` source list.
 * @param {'zh'|'en'} lang - active language.
 * @param {Array} registry - `/skills.registry` summaries for plugin/bundled providers.
 * @returns {Array} card entries.
 */
function skEntriesOf(groups, mounted, sources, lang, registry) {
  var pluginRows = Array.isArray(registry) ? registry : [];
  var out = [];
  var seen = new Set();
  for (var groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    var group = groups[groupIndex];
    var skills = Array.isArray(group.skills) ? group.skills : [];
    for (var skillIndex = 0; skillIndex < skills.length; skillIndex += 1) {
      var skill = skills[skillIndex];
      if (seen.has(skill.name)) continue;
      seen.add(skill.name);
      var copy = skCopyOf(skill, lang);
      var category = SK_CATEGORIES[copy.category] === undefined ? SK_CATEGORIES.general : SK_CATEGORIES[copy.category];
      var scopeLabel = skScopeOf(group, lang);
      out.push({
        key: skill.rootId + "/" + skill.name,
        skill: skill,
        copy: copy,
        category: category,
        scopeLabel: scopeLabel,
        mounted: false,
        group: skInvocationGroup(skill),
        haystack: [
          skill.name,
          skill.meta && skill.meta.description ? skill.meta.description : "",
          copy.short,
          copy.student,
          copy.professional,
          skT(lang, category.key),
          scopeLabel
        ].join("\n").toLowerCase()
      });
    }
  }
  for (var mountedIndex = 0; mountedIndex < mounted.length; mountedIndex += 1) {
    var row = mounted[mountedIndex];
    var mountedSkill = skMountedSkill(row);
    if (seen.has(mountedSkill.name)) continue;
    seen.add(mountedSkill.name);
    var mountedCopy = skCopyOf(mountedSkill, lang);
    var mountedCategory = SK_CATEGORIES[mountedCopy.category] === undefined ? SK_CATEGORIES.general : SK_CATEGORIES[mountedCopy.category];
    var sourceLabel = skSourceLabel(sources, row.source);
    out.push({
      key: "mounted/" + mountedSkill.path,
      skill: mountedSkill,
      copy: mountedCopy,
      category: mountedCategory,
      scopeLabel: sourceLabel,
      mounted: true,
      group: skInvocationGroup(mountedSkill),
      haystack: [
        mountedSkill.name,
        mountedSkill.meta.description,
        mountedCopy.short,
        mountedCopy.student,
        mountedCopy.professional,
        sourceLabel,
        skT(lang, mountedCategory.key)
      ].join("\n").toLowerCase()
    });
  }
  for (var registryIndex = 0; registryIndex < pluginRows.length; registryIndex += 1) {
    var registryRow = pluginRows[registryIndex];
    if (registryRow === null || registryRow === undefined || typeof registryRow.name !== "string" || registryRow.name === "") continue;
    if (seen.has(registryRow.name)) continue;
    seen.add(registryRow.name);
    var invocation = registryRow.invocation === undefined || registryRow.invocation === null ? {} : registryRow.invocation;
    var registrySkill = {
      name: registryRow.name,
      path: typeof registryRow.path === "string" ? registryRow.path : "",
      kind: "registry",
      rootId: "",
      provider: registryRow.provider,
      source: registryRow.source,
      meta: {
        description: typeof registryRow.description === "string" ? registryRow.description : "",
        modelInvocable: invocation.modelInvocable !== false,
        userInvocable: invocation.userInvocable !== false,
        category: skProviderCategory(registryRow.provider)
      }
    };
    var providerLabel = skProviderLabel(registryRow.provider);
    var registryCopy = skCopyOf(registrySkill, lang);
    var registryCategory = SK_CATEGORIES[registryCopy.category] === undefined ? SK_CATEGORIES.general : SK_CATEGORIES[registryCopy.category];
    out.push({
      key: "registry/" + registryRow.name,
      skill: registrySkill,
      copy: registryCopy,
      category: registryCategory,
      scopeLabel: providerLabel,
      mounted: false,
      registry: true,
      readOnly: true,
      group: skInvocationGroup(registrySkill),
      haystack: [
        registryRow.name,
        registrySkill.meta.description,
        typeof registryRow.whenToUse === "string" ? registryRow.whenToUse : "",
        providerLabel,
        typeof registryRow.source === "string" ? registryRow.source : "",
        registryCopy.short,
        registryCopy.student,
        registryCopy.professional,
        skT(lang, registryCategory.key)
      ].join("\n").toLowerCase()
    });
  }
  out.sort(function (left, right) {
    return left.skill.name.localeCompare(right.skill.name);
  });
  return out;
}

/**
 * Count the invocation groups over every entry (not just the visible slice).
 * @param {Array} entries - card entries.
 * @returns {{all: number, both: number, model: number, user: number, none: number}} counts.
 */
function skCountGroups(entries) {
  var counts = { all: entries.length, both: 0, model: 0, user: 0, none: 0 };
  for (var index = 0; index < entries.length; index += 1) counts[entries[index].group] += 1;
  return counts;
}

/**
 * Apply the group filter and the search needle.
 * @param {Array} entries - card entries.
 * @param {string} filter - group id or "all".
 * @param {string} needle - lowercased trimmed query, or "".
 * @returns {Array} visible entries.
 */
function skFilterEntries(entries, filter, needle) {
  var out = [];
  for (var index = 0; index < entries.length; index += 1) {
    var entry = entries[index];
    if (filter !== "all" && entry.group !== filter) continue;
    if (needle !== "" && entry.haystack.indexOf(needle) === -1) continue;
    out.push(entry);
  }
  return out;
}

/**
 * Read one skill's detail (body, file list, frontmatter) from the existing Host route.
 * @param {string} rootId - owning root id.
 * @param {string} name - skill name.
 * @param {string} workspace - selected workspace path, or "".
 * @returns {Promise<{ok: boolean, status: number, body: object}>} detail response.
 */
function fetchSkillDetail(rootId, name, workspace) {
  var query = "?root=" + encodeURIComponent(rootId) + "&name=" + encodeURIComponent(name);
  if (workspace !== "") query += "&workspace=" + encodeURIComponent(workspace);
  return call("/skill" + query);
}

/**
 * Read one plugin/bundled provider skill by name from the dsh registry.
 * @param {string} name - registry skill name.
 * @param {string} workspace - selected workspace path, or "".
 * @returns {Promise<{ok: boolean, status: number, body: object}>} detail response.
 */
function fetchRegistrySkill(name, workspace) {
  var query = "?name=" + encodeURIComponent(name);
  if (workspace !== "") query += "&workspace=" + encodeURIComponent(workspace);
  return call("/registry-skill" + query);
}

// #region mounted catalog -----------------------------------------------------
/**
 * Mounted-skill catalog and switch helpers.
 * The catalog comes from the merged provider through `/catalog`; the switch
 * writes only the dsh-side override file.
 */
var fetchCatalog = (workspace) => call("/catalog" + (workspace !== "" ? "?workspace=" + encodeURIComponent(workspace) : ""));
var fetchMountedSkill = (path, workspace) => call("/catalog-skill?path=" + encodeURIComponent(path) + (workspace !== "" ? "&workspace=" + encodeURIComponent(workspace) : ""));
var setMountedSwitch = (body) => call("/override", { method: "POST", body: body });

/**
 * Turn one mounted catalog row into the shape the shared card/dialog helpers expect.
 * @param {object} row - `/catalog` skill row.
 * @returns {object} station-style skill record.
 */
function skMountedSkill(row) {
  var invocation = row.invocation === undefined || row.invocation === null ? {} : row.invocation;
  var metadata = row.metadata === undefined || row.metadata === null ? {} : row.metadata;
  var meta = {
    description: typeof row.description === "string" ? row.description : "",
    modelInvocable: invocation.modelInvocable !== false,
    userInvocable: invocation.userInvocable !== false
  };
  if (typeof metadata.category === "string") meta.category = metadata.category;
  if (metadata.studentDescription !== undefined) meta.studentDescription = metadata.studentDescription;
  if (metadata.professionalDescription !== undefined) meta.professionalDescription = metadata.professionalDescription;
  return {
    name: row.name,
    path: row.path,
    kind: "mounted",
    rootId: "",
    source: row.source,
    provider: row.provider,
    meta: meta
  };
}

/**
 * Human label for a mount source id such as `claude-code`.
 * @param {Array} sources - `/catalog` source list.
 * @param {string} source - candidate source id.
 * @returns {string} display label.
 */
function skSourceLabel(sources, source) {
  for (var index = 0; index < sources.length; index += 1) {
    var entry = sources[index];
    if (typeof entry.id !== "string") continue;
    if (source === entry.id || source.indexOf(entry.id) === 0) return entry.label;
  }
  return source;
}
// #endregion

// #region loading ---------------------------------------------------------------
// The client plugin context captured by apply(); the React tree needs it for
// the real conversation services. One plugin instance per page, so a
// module-scoped slot is enough and avoids threading ctx through every slot
// registration.
var skPluginCtx = null;

/**
 * Resolve one optional client service without throwing when the composition
 * does not mount it (headless builds, older shells).
 * @param {string} name - service name.
 * @returns {object|undefined} the service, or undefined.
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
 * @returns {string} session id, or "" when no conversation is active.
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
 * Workspace id to open a new conversation in: the selected browsing scope when
 * it maps to a host workspace, else the current conversation's workspace, else
 * the most recently active workspace.
 * @param {string} workspacePath - station scope path, or "".
 * @param {string} currentSessionId - active session id, or "".
 * @returns {string} workspace id, or "" when the host lists none.
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
 * The official composer token for one Skill. The host turns a whitespace-bounded
 * `/name` token in direct user input into that Skill's instructions for the step,
 * so staging the token in the composer prepares the Skill without submitting.
 * @param {string} name - skill name.
 * @returns {string} the draft text, with a trailing space for the user's own message.
 */
function skDraftPrompt(name) {
  return "/" + name + " ";
}

/**
 * Stage one Skill in a conversation's composer without sending anything.
 *
 * DSH has no per-Session Skill attachment. The supported non-executing path is
 * the same one the `/` picker uses: place the literal `/name` token in the
 * composer. The host converts it to Skill instructions when the user sends
 * their own first message, so no Agent turn starts here.
 * @param {string} sessionId - target Agent-scope session id.
 * @param {string} name - skill name.
 * @returns {Promise<string>} resolves with the session id after the draft was staged.
 */
function skPrepareDraft(sessionId, name) {
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
      prompt: skDraftPrompt(name),
      whenDraftExists: "append"
    });
    if (outcome === "blocked") {
      throw new Error(skT(skGetLang(), "error.loadBlocked"));
    }
    return sessionId;
  }));
}

/**
 * Return the keyboard to one conversation's composer after the launcher closes.
 * A freshly opened conversation can mount its composer after the current event,
 * so the attempt is scheduled twice; failures are ignored.
 * @param {string} sessionId - conversation to focus.
 * @returns {void}
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
      // Focus is a convenience, never a failure of the load.
    }
  };
  window.setTimeout(attempt, 0);
  window.setTimeout(attempt, 150);
}

/**
 * Stage a Skill in the active conversation without submitting a message.
 * @param {string} name - skill name.
 * @returns {Promise<string>} the conversation id.
 */
function skLoadIntoCurrent(name) {
  var sessionId = skCurrentSessionId();
  if (sessionId === "") return Promise.reject(new Error(skT(skGetLang(), "error.invokeNoSession")));
  return skPrepareDraft(sessionId, name);
}

/**
 * Create or open a blank conversation through the host's Workspace flow, reveal
 * it, and stage the Skill in its composer. No prompt is sent.
 * @param {string} name - skill name.
 * @param {string} workspacePath - station scope path, or "".
 * @returns {Promise<string>} the conversation id used.
 */
function skLoadIntoNew(name, workspacePath) {
  var uiWorkspace = skService("uiWorkspace");
  if (uiWorkspace === undefined || uiWorkspace === null || typeof uiWorkspace.connectWorkspace !== "function" || typeof uiWorkspace.openSession !== "function") {
    return Promise.reject(new Error(skT(skGetLang(), "error.invokeApi")));
  }
  var workspaceId = skWorkspaceIdFor(workspacePath, skCurrentSessionId());
  if (workspaceId === "") return Promise.reject(new Error(skT(skGetLang(), "error.invokeNoWorkspace")));
  return Promise.resolve(uiWorkspace.connectWorkspace(workspaceId)).then(function (sessionId) {
    if (typeof sessionId !== "string" || sessionId === "") throw new Error(skT(skGetLang(), "error.invokeApi"));
    uiWorkspace.openSession(sessionId);
    return skPrepareDraft(sessionId, name).then(function () {
      return sessionId;
    });
  });
}

/**
 * Whether the launcher may stage a skill at all.
 * @param {object} skill - skill row.
 * @returns {boolean} true when user invocation is advertised.
 */
function skCanLoad(skill) {
  return skUserInvocable(skill);
}
// #endregion

// #region glyphs ---------------------------------------------------------------
/**
 * One stroke glyph per category plus the two audience marks and the invocation
 * dialog marks.
 * @param {{id: string, size?: number}} props - glyph id and pixel size.
 * @returns {object} SVG element.
 */
function SkGlyph(props) {
  var size = props.size === undefined ? 18 : props.size;
  var base = { width: size, height: size, viewBox: "0 0 20 20", fill: "none", "aria-hidden": "true" };
  var paths;
  switch (props.id) {
    case "email":
      paths = [
        sk("rect", { x: "2.5", y: "5", width: "15", height: "10", rx: "2", stroke: "currentColor", strokeWidth: "1.4" }),
        sk("path", { d: "M3.6 6.6 10 11l6.4-4.4", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" })
      ];
      break;
    case "coach":
      paths = [
        sk("path", { d: "M10 3.1a5.1 5.1 0 0 0-3 9.2v1.1h6v-1.1a5.1 5.1 0 0 0-3-9.2Z", stroke: "currentColor", strokeWidth: "1.4", strokeLinejoin: "round" }),
        sk("path", { d: "M8.1 15.4h3.8M9 17.2h2", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" })
      ];
      break;
    case "learning":
      paths = [
        sk("path", { d: "M10 3.8 2.9 7.1 10 10.4l7.1-3.3L10 3.8Z", stroke: "currentColor", strokeWidth: "1.4", strokeLinejoin: "round" }),
        sk("path", { d: "M5.3 8.9v3.4c0 .9 2.1 2.1 4.7 2.1s4.7-1.2 4.7-2.1V8.9", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" })
      ];
      break;
    case "dev":
      paths = [
        sk("path", { d: "M6.9 6.4 3.4 10l3.5 3.6M13.1 6.4 16.6 10l-3.5 3.6M11.3 4.9 8.7 15.1", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", strokeLinejoin: "round" })
      ];
      break;
    case "student":
      paths = [
        sk("path", { d: "M10 4.2 3.4 7.2 10 10.2l6.6-3L10 4.2Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" }),
        sk("path", { d: "M6.2 9v3.2c0 .8 1.7 1.9 3.8 1.9s3.8-1.1 3.8-1.9V9", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
      ];
      break;
    case "pro":
      paths = [
        sk("path", { d: "M7.2 6.6 3.8 10l3.4 3.4M12.8 6.6 16.2 10l-3.4 3.4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })
      ];
      break;
    case "chat":
      paths = [
        sk("path", { d: "M4 4.2h12v8.6H9.2L5.8 16v-3.2H4V4.2Z", stroke: "currentColor", strokeWidth: "1.4", strokeLinejoin: "round" }),
        sk("path", { d: "M7 7.6h6M7 10h4", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" })
      ];
      break;
    case "new":
      paths = [
        sk("rect", { x: "3", y: "4.2", width: "9.4", height: "11.6", rx: "1.8", stroke: "currentColor", strokeWidth: "1.4" }),
        sk("path", { d: "M15.2 7.4v6.4M12 10.6h6.4", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" })
      ];
      break;
    default:
      paths = [
        sk("path", { d: "M10 3.2l1.7 4.1 4.1 1.7-4.1 1.7L10 14.8l-1.7-4.1L4.2 9l4.1-1.7L10 3.2Z", stroke: "currentColor", strokeWidth: "1.4", strokeLinejoin: "round" })
      ];
  }
  return sk("svg", base, paths);
}

/**
 * The two audience blocks shared by the Details dialog.
 * @param {{copy: object, tag?: boolean, lang: 'zh'|'en'}} props - copy bundle, fallback tag and language.
 * @returns {Array} two section elements.
 */
function SkAudienceBlocks(props) {
  return [
    sk("section", { className: "sk_audience", "data-kind": "student" }, [
      sk("div", { className: "sk_audienceHead" }, [
        sk("span", { className: "sk_audienceIcon" }, skH(SkGlyph, { id: "student", size: 13 })),
        sk("span", null, skT(props.lang, "audience.student"))
      ]),
      sk("p", { className: "sk_audienceText" }, props.copy.student)
    ]),
    sk("section", { className: "sk_audience", "data-kind": "pro" }, [
      sk("div", { className: "sk_audienceHead" }, [
        sk("span", { className: "sk_audienceIcon" }, skH(SkGlyph, { id: "pro", size: 13 })),
        sk("span", null, skT(props.lang, "audience.pro")),
        props.tag === true ? sk("span", { className: "sk_audienceTag" }, skT(props.lang, "audience.tag")) : null
      ]),
      sk("p", { className: "sk_audienceText" }, props.copy.professional)
    ])
  ];
}
// #endregion

// #region launcher pieces ------------------------------------------------------
/**
 * Compact, non-interactive status indicator. Enable/disable lives in Details,
 * so the card surface stays focused on "use this skill".
 * @param {{skill: object, lang: 'zh'|'en'}} props - skill and language.
 * @returns {object} status pill.
 */
function SkStatus(props) {
  var user = skUserInvocable(props.skill);
  var model = skModelInvocable(props.skill);
  var text = !user ? skT(props.lang, "status.unavailable") : (model ? skT(props.lang, "status.on") : skT(props.lang, "status.off"));
  return sk("span", { className: "sk_status", "data-on": user && model ? "true" : "false", "data-user": user ? "true" : "false" }, [
    sk("i", { className: "sk_dot" }),
    sk("span", null, text)
  ]);
}

/**
 * One skill card: identity, one-line description, one primary action.
 * @param {{entry: object, lang: 'zh'|'en', busy: boolean, onUse: Function, onDetails: Function}} props - card props.
 * @returns {object} card element.
 */
function SkillCard(props) {
  var entry = props.entry;
  var skill = entry.skill;
  var copy = entry.copy;
  var lang = props.lang;
  var category = SK_CATEGORIES[copy.category] === undefined ? SK_CATEGORIES.general : SK_CATEGORIES[copy.category];
  var user = skUserInvocable(skill);
  var model = skModelInvocable(skill);
  var sourced = entry.mounted === true || entry.registry === true;
  var readOnly = entry.mounted === true || entry.readOnly === true;
  var chips = [
    sk("span", { className: "sk_chip" + (sourced ? " sk_chipSource" : "") }, entry.scopeLabel),
    readOnly ? sk("span", { className: "sk_chip" }, skT(lang, "chip.readonly")) : null,
    entry.registry === true ? sk("span", { className: "sk_chip" }, skT(lang, "chip.plugin")) : null,
    !user || !model ? sk("span", { className: "sk_chip" }, skT(lang, user ? "card.userOnly" : "card.userDisabled")) : null
  ];
  return sk("article", { className: "sk_card", "data-cat": category.tint }, [
    sk("div", { className: "sk_cardTop" }, [
      sk("span", { className: "sk_icon", "data-cat": category.tint }, skH(SkGlyph, { id: copy.category, size: 19 })),
      sk("div", { className: "sk_identity" }, [
        sk("h3", { className: "sk_name", title: skill.path }, skill.name),
        sk("p", { className: "sk_type" }, skT(lang, "card.type", { category: skT(lang, category.key) }))
      ]),
      SkStatus({ skill: skill, lang: lang })
    ]),
    sk("p", { className: "sk_desc" }, copy.short),
    sk("div", { className: "sk_chips" }, chips),
    sk("footer", { className: "sk_actions" }, [
      sk("button", {
        className: "sk_useBtn",
        type: "button",
        disabled: !user,
        title: !user ? skT(lang, "error.invokeNotUser") : (!model ? skT(lang, "card.userOnlyHint") : undefined),
        onClick: function () {
          if (user) props.onUse(entry);
        }
      }, skT(lang, "card.use")),
      sk("button", {
        className: "sk_detailsBtn",
        type: "button",
        onClick: function () {
          props.onDetails(entry);
        }
      }, skT(lang, "card.details"))
    ])
  ]);
}

/**
 * Detail dialog: identity, audience copy, official description, path and SKILL.md.
 * Keeps the existing management actions (enable/disable, delete) out of the cards.
 * @param {{entry: object, lang: 'zh'|'en', workspace: string, busy: boolean, onClose: Function, onToggle: Function, onDelete: Function}} props - dialog props.
 * @returns {object} dialog element.
 */
function SkillDetailDialog(props) {
  var entry = props.entry;
  var skill = entry.skill;
  var copy = entry.copy;
  var lang = props.lang;
  var category = SK_CATEGORIES[copy.category] === undefined ? SK_CATEGORIES.general : SK_CATEGORIES[copy.category];
  var enabled = skModelInvocable(skill);
  var meta = skill.meta || {};
  var state = (0, import_react.useState)({ loading: true, error: "", detail: null });
  var view = state[0];
  var setView = state[1];
  (0, import_react.useEffect)(function () {
    var alive = true;
    setView({ loading: true, error: "", detail: null });
    fetchSkillDetail(skill.rootId, skill.name, props.workspace).then(function (result) {
      if (!alive) return;
      if (!result.ok) {
        setView({ loading: false, error: skT(skGetLang(), "error.detail", { status: result.status }), detail: null });
        return;
      }
      setView({ loading: false, error: "", detail: result.body });
    }).catch(function (error) {
      if (alive) setView({ loading: false, error: String(error), detail: null });
    });
    return function () {
      alive = false;
    };
  }, [skill.rootId, skill.name, props.workspace]);
  var detail = view.detail;
  var files = detail === null || !Array.isArray(detail.files) ? [] : detail.files;
  var body = detail === null || typeof detail.content !== "string" ? "" : detail.content;
  return sk("div", { className: "sk_modal", onClick: props.onClose }, [
    sk("div", {
      className: "sk_modalBox",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": skill.name,
      onClick: function (event) {
        event.stopPropagation();
      }
    }, [
      sk("header", { className: "sk_modalHead" }, [
        sk("span", { className: "sk_icon", "data-cat": category.tint }, skH(SkGlyph, { id: copy.category, size: 19 })),
        sk("div", { className: "sk_identity" }, [
          sk("h3", { className: "sk_name" }, skill.name),
          sk("p", { className: "sk_type" }, skT(lang, "card.type", { category: skT(lang, category.key) }) + " · " + entry.scopeLabel)
        ]),
        sk("button", { className: "sk_modalClose", type: "button", onClick: props.onClose, "aria-label": skT(lang, "dialog.close") }, "✕")
      ]),
      sk("div", { className: "sk_modalBody" }, [
        sk("div", { className: "sk_detailBadges" }, [
          sk("span", { className: "sk_badge", "data-kind": enabled ? "on" : "off" }, skT(lang, enabled ? "detail.modelOn" : "detail.modelOff")),
          sk("span", { className: "sk_badge", "data-kind": meta.userInvocable === false ? "off" : "on" }, skT(lang, meta.userInvocable === false ? "detail.userOff" : "detail.userOn")),
          sk("span", { className: "sk_badge", "data-kind": "plain" }, skT(lang, skill.kind === "file" ? "detail.single" : "detail.dir"))
        ]),
        SkAudienceBlocks({ copy: copy, tag: !copy.curated, lang: lang }),
        meta.description === undefined || meta.description === "" ? null : sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.official")),
          sk("p", { className: "sk_detailText" }, meta.description)
        ]),
        sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.installedAt")),
          sk("code", { className: "sk_detailPath" }, String(skill.path === undefined ? "" : skill.path))
        ]),
        view.loading ? sk("div", { className: "sk_detailReading" }, skT(lang, "detail.reading")) : null,
        view.error !== "" ? sk("div", { className: "sk_detailErr" }, view.error) : null,
        view.loading || view.error !== "" ? null : sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, [
            sk("span", null, "SKILL.md"),
            files.length === 0 ? null : sk("span", { className: "sk_detailMeta" }, skT(lang, "detail.files", { n: files.length }))
          ]),
          sk("pre", { className: "sk_code" }, body)
        ])
      ]),
      sk("footer", { className: "sk_modalFoot" }, [
        sk("button", {
          className: "sk_btnDanger",
          type: "button",
          disabled: props.busy,
          onClick: props.onDelete
        }, skT(lang, "detail.delete")),
        sk("span", { className: "sk_footSpacer" }),
        sk("button", {
          className: "sk_btn",
          type: "button",
          disabled: props.busy,
          onClick: props.onToggle
        }, skT(lang, enabled ? "detail.disable" : "detail.enable")),
        sk("button", { className: "sk_btn sk_btnPrimary", type: "button", onClick: props.onClose }, skT(lang, "detail.close"))
      ])
    ])
  ]);
}

/**
 * Read-only detail dialog for a mounted external skill.
 * Same shell as the native dialog minus delete: the source file is never edited.
 * @param {{entry: object, sourceLabel: string, lang: 'zh'|'en', workspace: string, busy: boolean, onClose: Function, onToggle: Function}} props - dialog props.
 * @returns {object} dialog element.
 */
function MountedDetailDialog(props) {
  var entry = props.entry;
  var skill = entry.skill;
  var copy = entry.copy;
  var lang = props.lang;
  var category = SK_CATEGORIES[copy.category] === undefined ? SK_CATEGORIES.general : SK_CATEGORIES[copy.category];
  var enabled = skModelInvocable(skill);
  var meta = skill.meta || {};
  var state = (0, import_react.useState)({ loading: true, error: "", detail: null });
  var view = state[0];
  var setView = state[1];
  (0, import_react.useEffect)(function () {
    var alive = true;
    setView({ loading: true, error: "", detail: null });
    fetchMountedSkill(skill.path, props.workspace).then(function (result) {
      if (!alive) return;
      if (!result.ok) {
        setView({ loading: false, error: skT(skGetLang(), "error.detail", { status: result.status }), detail: null });
        return;
      }
      setView({ loading: false, error: "", detail: result.body });
    }).catch(function (error) {
      if (alive) setView({ loading: false, error: String(error), detail: null });
    });
    return function () {
      alive = false;
    };
  }, [skill.path, props.workspace]);
  var detail = view.detail;
  var files = detail === null || !Array.isArray(detail.files) ? [] : detail.files;
  var body = detail === null || typeof detail.content !== "string" ? "" : detail.content;
  var directory = detail === null || detail.directory === undefined ? null : detail.directory;
  return sk("div", { className: "sk_modal", onClick: props.onClose }, [
    sk("div", {
      className: "sk_modalBox",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": skill.name,
      onClick: function (event) {
        event.stopPropagation();
      }
    }, [
      sk("header", { className: "sk_modalHead" }, [
        sk("span", { className: "sk_icon", "data-cat": category.tint }, skH(SkGlyph, { id: copy.category, size: 19 })),
        sk("div", { className: "sk_identity" }, [
          sk("h3", { className: "sk_name" }, skill.name),
          sk("p", { className: "sk_type" }, skT(lang, "card.type", { category: skT(lang, category.key) }) + " · " + props.sourceLabel)
        ]),
        sk("button", { className: "sk_modalClose", type: "button", onClick: props.onClose, "aria-label": skT(lang, "dialog.close") }, "✕")
      ]),
      sk("div", { className: "sk_modalBody" }, [
        sk("div", { className: "sk_detailBadges" }, [
          sk("span", { className: "sk_badge", "data-kind": enabled ? "on" : "off" }, skT(lang, enabled ? "detail.modelOn" : "detail.modelOff")),
          sk("span", { className: "sk_badge", "data-kind": meta.userInvocable === false ? "off" : "on" }, skT(lang, meta.userInvocable === false ? "detail.userOff" : "detail.userOn")),
          sk("span", { className: "sk_badge", "data-kind": "plain" }, skT(lang, "chip.readonly"))
        ]),
        SkAudienceBlocks({ copy: copy, tag: !copy.curated, lang: lang }),
        meta.description === undefined || meta.description === "" ? null : sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.official")),
          sk("p", { className: "sk_detailText" }, meta.description)
        ]),
        sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.source")),
          sk("p", { className: "sk_detailText" }, props.sourceLabel)
        ]),
        sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.mountedAt")),
          sk("code", { className: "sk_detailPath" }, String(directory === null ? skill.path : directory))
        ]),
        sk("p", { className: "sk_detailHint" }, skT(lang, "detail.switchHint")),
        view.loading ? sk("div", { className: "sk_detailReading" }, skT(lang, "detail.reading")) : null,
        view.error !== "" ? sk("div", { className: "sk_detailErr" }, view.error) : null,
        view.loading || view.error !== "" ? null : sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, [
            sk("span", null, "SKILL.md"),
            files.length === 0 ? null : sk("span", { className: "sk_detailMeta" }, skT(lang, "detail.files", { n: files.length }))
          ]),
          sk("pre", { className: "sk_code" }, body)
        ])
      ]),
      sk("footer", { className: "sk_modalFoot" }, [
        sk("span", { className: "sk_footSpacer" }),
        sk("button", {
          className: "sk_btn",
          type: "button",
          disabled: props.busy,
          onClick: props.onToggle
        }, skT(lang, enabled ? "detail.disable" : "detail.enable")),
        sk("button", { className: "sk_btn sk_btnPrimary", type: "button", onClick: props.onClose }, skT(lang, "detail.close"))
      ])
    ])
  ]);
}

/**
 * Which loading paths this client composition can actually support. The dialog
 * disables a path instead of offering a button that can only fail.
 * @returns {{current: boolean, fresh: boolean}} availability of the two paths.
 */
function skLoadingSupport() {
  var sessions = skService("sessions");
  var uiWorkspace = skService("uiWorkspace");
  var workspaces = skService("workspaces");
  var conversation = skService("conversation");
  var inputReady = conversation !== undefined && conversation !== null
    && conversation.input !== undefined && conversation.input !== null
    && typeof conversation.input.requestDraftInitialization === "function";
  return {
    current: inputReady && sessions !== undefined && sessions !== null && typeof sessions.using === "function",
    fresh: inputReady
      && uiWorkspace !== undefined && uiWorkspace !== null
      && typeof uiWorkspace.connectWorkspace === "function"
      && typeof uiWorkspace.openSession === "function"
      && workspaces !== undefined && workspaces !== null
      && workspaces.list !== undefined && typeof workspaces.list.getSnapshot === "function"
  };
}

/**
 * Read-only Details dialog for a plugin/bundled provider skill. The provider
 * owns the skill; the station can display and load it, never edit it.
 * @param {{entry: object, lang: 'zh'|'en', workspace: string, onClose: Function}} props - dialog props.
 * @returns {object} dialog element.
 */
function RegistryDetailDialog(props) {
  var entry = props.entry;
  var skill = entry.skill;
  var copy = entry.copy;
  var lang = props.lang;
  var category = SK_CATEGORIES[copy.category] === undefined ? SK_CATEGORIES.general : SK_CATEGORIES[copy.category];
  var enabled = skModelInvocable(skill);
  var meta = skill.meta || {};
  var state = (0, import_react.useState)({ loading: true, error: "", detail: null });
  var view = state[0];
  var setView = state[1];
  (0, import_react.useEffect)(function () {
    var alive = true;
    setView({ loading: true, error: "", detail: null });
    fetchRegistrySkill(skill.name, props.workspace).then(function (result) {
      if (!alive) return;
      if (!result.ok) {
        setView({ loading: false, error: skT(skGetLang(), "error.detail", { status: result.status }), detail: null });
        return;
      }
      setView({ loading: false, error: "", detail: result.body });
    }).catch(function (error) {
      if (alive) setView({ loading: false, error: String(error), detail: null });
    });
    return function () {
      alive = false;
    };
  }, [skill.name, props.workspace]);
  var detail = view.detail;
  var body = detail === null || typeof detail.content !== "string" ? "" : detail.content;
  var path = detail !== null && typeof detail.path === "string" ? detail.path : (typeof skill.path === "string" ? skill.path : "");
  var provider = detail !== null && typeof detail.provider === "string" ? detail.provider : skill.provider;
  var source = detail !== null && typeof detail.source === "string" ? detail.source : skill.source;
  var whenToUse = detail !== null && typeof detail.whenToUse === "string" ? detail.whenToUse : "";
  return sk("div", { className: "sk_modal", onClick: props.onClose }, [
    sk("div", {
      className: "sk_modalBox",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": skill.name,
      onClick: function (event) {
        event.stopPropagation();
      }
    }, [
      sk("header", { className: "sk_modalHead" }, [
        sk("span", { className: "sk_icon", "data-cat": category.tint }, skH(SkGlyph, { id: copy.category, size: 19 })),
        sk("div", { className: "sk_identity" }, [
          sk("h3", { className: "sk_name" }, skill.name),
          sk("p", { className: "sk_type" }, skT(lang, "card.type", { category: skT(lang, category.key) }) + " · " + skProviderLabel(provider))
        ]),
        sk("button", { className: "sk_modalClose", type: "button", onClick: props.onClose, "aria-label": skT(lang, "dialog.close") }, "✕")
      ]),
      sk("div", { className: "sk_modalBody" }, [
        sk("div", { className: "sk_detailBadges" }, [
          sk("span", { className: "sk_badge", "data-kind": enabled ? "on" : "off" }, skT(lang, enabled ? "detail.modelOn" : "detail.modelOff")),
          sk("span", { className: "sk_badge", "data-kind": meta.userInvocable === false ? "off" : "on" }, skT(lang, meta.userInvocable === false ? "detail.userOff" : "detail.userOn")),
          sk("span", { className: "sk_badge", "data-kind": "plain" }, skT(lang, "chip.readonly")),
          sk("span", { className: "sk_badge", "data-kind": "plain" }, skT(lang, "chip.plugin"))
        ]),
        meta.description === undefined || meta.description === "" ? null : sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.official")),
          sk("p", { className: "sk_detailText" }, meta.description)
        ]),
        whenToUse === "" ? null : sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.whenToUse")),
          sk("p", { className: "sk_detailText" }, whenToUse)
        ]),
        sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.provider")),
          sk("p", { className: "sk_detailText" }, skProviderLabel(provider) + (typeof source === "string" && source !== "" ? " · " + source : ""))
        ]),
        path === "" ? null : sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, skT(lang, "detail.installedAt")),
          sk("code", { className: "sk_detailPath" }, path)
        ]),
        sk("p", { className: "sk_detailHint" }, skT(lang, "detail.registryHint")),
        view.loading ? sk("div", { className: "sk_detailReading" }, skT(lang, "detail.reading")) : null,
        view.error !== "" ? sk("div", { className: "sk_detailErr" }, view.error) : null,
        view.loading || view.error !== "" ? null : sk("section", { className: "sk_detailSection" }, [
          sk("h4", { className: "sk_detailTitle" }, "SKILL.md"),
          sk("pre", { className: "sk_code" }, body)
        ])
      ]),
      sk("footer", { className: "sk_modalFoot" }, [
        sk("span", { className: "sk_footSpacer" }),
        sk("button", { className: "sk_btn sk_btnPrimary", type: "button", onClick: props.onClose }, skT(lang, "detail.close"))
      ])
    ])
  ]);
}

/**
 * The two-option loading dialog. Both options only stage the Skill's `/name`
 * token in a composer; no message is submitted and no Agent turn starts.
 * Current keeps the active conversation; new opens a blank one via uiWorkspace.
 * @param {{entry: object, lang: 'zh'|'en', workspace: string, onClose: Function, onInvoked: Function}} props - dialog props.
 * @returns {object} dialog element.
 */
function InvokeDialog(props) {
  var lang = props.lang;
  var entry = props.entry;
  var skill = entry.skill;
  var copy = entry.copy;
  var category = SK_CATEGORIES[copy.category] === undefined ? SK_CATEGORIES.general : SK_CATEGORIES[copy.category];
  var busyPair = (0, import_react.useState)("");
  var busy = busyPair[0];
  var setBusy = busyPair[1];
  var errorPair = (0, import_react.useState)("");
  var error = errorPair[0];
  var setError = errorPair[1];
  var busyRef = (0, import_react.useRef)(false);
  var aliveRef = (0, import_react.useRef)(true);
  var support = skLoadingSupport();
  var sessionId = support.current ? skCurrentSessionId() : "";
  var canCurrent = support.current && sessionId !== "";
  var canNew = support.fresh;
  var canLoad = skCanLoad(skill);
  (0, import_react.useEffect)(function () {
    return function () {
      aliveRef.current = false;
    };
  }, []);
  (0, import_react.useEffect)(function () {
    if (busyRef.current) return undefined;
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      if (busyRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [props.onClose]);
  var run = function (kind) {
    if (busyRef.current || !canLoad) return;
    if (kind === "current" && !canCurrent) {
      setError(skT(lang, "dialog.currentUnavailable"));
      return;
    }
    if (kind === "new" && !canNew) {
      setError(skT(lang, "dialog.newUnavailable"));
      return;
    }
    busyRef.current = true;
    setBusy(kind);
    setError("");
    var task = kind === "current" ? skLoadIntoCurrent(skill.name) : skLoadIntoNew(skill.name, props.workspace);
    task.then(function (createdSessionId) {
      if (!aliveRef.current) return;
      busyRef.current = false;
      setBusy("");
      props.onInvoked(kind, createdSessionId);
    }, function (thrown) {
      if (!aliveRef.current) return;
      busyRef.current = false;
      setBusy("");
      setError(skT(skGetLang(), "dialog.error", { message: thrown !== null && thrown !== undefined && typeof thrown.message === "string" ? thrown.message : String(thrown) }));
    });
  };
  var option = function (kind, title, description, glyph, disabled) {
    var working = busy === kind;
    return sk("button", {
      className: "sk_invokeOption",
      type: "button",
      "data-kind": kind,
      "data-busy": working ? "true" : undefined,
      disabled: busy !== "" || disabled || !canLoad,
      autoFocus: kind === "current" ? canCurrent : !canCurrent,
      onClick: function () {
        run(kind);
      }
    }, [
      sk("span", { className: "sk_invokeOptionIcon", "data-kind": kind }, skH(SkGlyph, { id: glyph, size: 20 })),
      sk("span", { className: "sk_invokeOptionText" }, [
        sk("span", { className: "sk_invokeOptionTitle" }, title),
        sk("span", { className: "sk_invokeOptionDesc" }, working ? skT(lang, kind === "current" ? "dialog.currentWorking" : "dialog.newWorking") : description)
      ]),
      working ? sk("span", { className: "sk_invokeBusy", "aria-hidden": "true" }, "…") : sk("span", { className: "sk_invokeArrow", "aria-hidden": "true" }, "→")
    ]);
  };
  return sk("div", { className: "sk_modal", onClick: busy === "" ? props.onClose : undefined }, [
    sk("div", {
      className: "sk_modalBox sk_invokeBox",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": skT(lang, "dialog.title"),
      onClick: function (event) {
        event.stopPropagation();
      }
    }, [
      sk("header", { className: "sk_modalHead" }, [
        sk("span", { className: "sk_icon", "data-cat": category.tint }, skH(SkGlyph, { id: copy.category, size: 19 })),
        sk("div", { className: "sk_identity" }, [
          sk("h3", { className: "sk_name" }, skill.name),
          sk("p", { className: "sk_type" }, skT(lang, "card.type", { category: skT(lang, category.key) }))
        ]),
        sk("button", {
          className: "sk_modalClose",
          type: "button",
          onClick: props.onClose,
          disabled: busy !== "",
          "aria-label": skT(lang, "dialog.close")
        }, "✕")
      ]),
      sk("div", { className: "sk_invokeBody" }, [
        sk("div", { className: "sk_invokeHead" }, [
          sk("h2", { className: "sk_invokeTitle" }, skT(lang, "dialog.title")),
          sk("p", { className: "sk_invokeSub" }, skT(lang, "dialog.desc"))
        ]),
        sk("div", { className: "sk_invokeOptions", role: "group", "aria-label": skT(lang, "dialog.desc") }, [
          option("current", skT(lang, "dialog.current"), canCurrent ? skT(lang, "dialog.currentDesc") : skT(lang, "dialog.currentUnavailable"), "chat", !canCurrent),
          option("new", skT(lang, "dialog.new"), canNew ? skT(lang, "dialog.newDesc") : skT(lang, "dialog.newUnavailable"), "new", !canNew)
        ]),
        sk("p", { className: "sk_invokeHint" }, skT(lang, "dialog.hint")),
        error === "" ? null : sk("div", { className: "sk_invokeErr", role: "alert" }, error),
        !canLoad
          ? sk("div", { className: "sk_invokeErr", role: "alert" }, skT(lang, "error.invokeNotUser"))
          : (!support.current && !support.fresh ? sk("div", { className: "sk_invokeErr", role: "alert" }, skT(lang, "error.invokeApi")) : null)
      ]),
      sk("footer", { className: "sk_invokeFoot" }, [
        sk("button", {
          className: "sk_btn",
          type: "button",
          disabled: busy !== "",
          onClick: props.onClose
        }, skT(lang, "dialog.cancel"))
      ])
    ])
  ]);
}

/**
 * The compact secondary menu: scope, install, recycle bin, refresh, language.
 * @param {{lang: 'zh'|'en', workspace: string, workspaces: Array, refreshing: boolean, onWorkspace: Function, onPanel: Function, onRefresh: Function}} props - menu props.
 * @returns {object} menu element.
 */
function MoreMenu(props) {
  var lang = props.lang;
  var state = (0, import_react.useState)(false);
  var open = state[0];
  var setOpen = state[1];
  var wrapRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(function () {
    if (!open) return undefined;
    var onPointer = function (event) {
      var wrap = wrapRef.current;
      var target = event === null || event === undefined ? null : event.target;
      if (wrap !== null && wrap !== undefined && typeof wrap.contains === "function" && target !== null && typeof target.nodeType === "number" && wrap.contains(target)) return;
      setOpen(false);
    };
    var onKey = function (event) {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return function () {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  var item = function (label, action) {
    return sk("button", {
      className: "sk_moreItem",
      type: "button",
      role: "menuitem",
      onClick: function () {
        setOpen(false);
        action();
      }
    }, label);
  };
  return sk("div", { className: "sk_moreWrap", ref: wrapRef }, [
    sk("button", {
      className: "sk_moreBtn",
      type: "button",
      "aria-haspopup": "menu",
      "aria-expanded": open ? "true" : "false",
      onClick: function () {
        setOpen(function (value) {
          return !value;
        });
      }
    }, [
      sk("span", null, skT(lang, "more.label")),
      sk("span", { className: "sk_moreCaret", "aria-hidden": "true" }, "▾")
    ]),
    open ? sk("div", { className: "sk_more", role: "menu", "aria-label": skT(lang, "more.label") }, [
      sk("div", { className: "sk_moreLabel" }, skT(lang, "more.scope")),
      sk("select", {
        className: "sk_moreSelect",
        value: props.workspace,
        onChange: function (event) {
          props.onWorkspace(event.target.value);
        }
      }, [
        sk("option", { value: "", key: "global" }, skT(lang, "ws.global")),
        props.workspaces.map(function (workspace) {
          return sk("option", { value: workspace.path }, workspace.title, workspace.path);
        })
      ]),
      sk("div", { className: "sk_moreSep" }),
      item(skT(lang, "more.install"), function () {
        props.onPanel("install");
      }),
      item(skT(lang, "more.trash"), function () {
        props.onPanel("trash");
      }),
      item(skT(lang, props.refreshing ? "more.refreshing" : "more.refresh"), function () {
        props.onRefresh();
      }),
      sk("div", { className: "sk_moreSep" }),
      sk("div", { className: "sk_moreLabel" }, skT(lang, "more.language")),
      skH(SkLangSwitch, { lang: lang })
    ]) : null
  ]);
}

/**
 * Reuse the existing install and trash views inside one secondary panel.
 * @param {{panel: string, lang: 'zh'|'en', workspace: string, onClose: Function}} props - panel props.
 * @returns {object} modal element.
 */
function StationPanelDialog(props) {
  var lang = props.lang;
  var title = skT(lang, props.panel === "install" ? "panel.install" : "panel.trash");
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
  return sk("div", { className: "sk_modal", onClick: props.onClose }, [
    sk("div", {
      className: "sk_modalBox sk_panelBox",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": title,
      onClick: function (event) {
        event.stopPropagation();
      }
    }, [
      sk("header", { className: "sk_modalHead" }, [
        sk("h2", { className: "sk_panelTitle" }, title),
        sk("button", { className: "sk_modalClose", type: "button", onClick: props.onClose, "aria-label": skT(lang, "dialog.close") }, "✕")
      ]),
      sk("div", { className: "sk_panelBody" }, props.panel === "install"
        ? skH(InstallTab, { workspace: props.workspace })
        : skH(TrashTab, {}))
    ])
  ]);
}

/**
 * The language switch shown inside the More menu.
 * @param {{lang: 'zh'|'en'}} props - active language.
 * @returns {object} segmented control.
 */
function SkLangSwitch(props) {
  return sk("div", { className: "sk_lang", role: "group", "aria-label": skT(props.lang, "more.language") }, [
    sk("button", {
      className: "sk_langBtn",
      type: "button",
      "data-on": props.lang === "zh" ? "true" : "false",
      "aria-pressed": props.lang === "zh" ? "true" : "false",
      onClick: function () {
        skSetLang("zh");
      }
    }, "中文"),
    sk("button", {
      className: "sk_langBtn",
      type: "button",
      "data-on": props.lang === "en" ? "true" : "false",
      "aria-pressed": props.lang === "en" ? "true" : "false",
      onClick: function () {
        skSetLang("en");
      }
    }, "EN")
  ]);
}
// #endregion

// #region browse ---------------------------------------------------------------
/**
 * One page: search, skill-group filters, card grid and the two dialogs.
 * Native cards keep their management in Details; mounted cards expose only a
 * detail view and a dsh-side switch.
 * @param {{workspace: string, lang: 'zh'|'en', reloadToken: number, onNotice: Function, onRequestClose: Function}} props - browse props.
 * @returns {object} browse content.
 */
function SkillBrowse(props) {
  var lang = useSkLang();
  var groupsState = (0, import_react.useState)([]);
  var groups = groupsState[0];
  var setGroups = groupsState[1];
  var mountedState = (0, import_react.useState)([]);
  var mounted = mountedState[0];
  var setMounted = mountedState[1];
  var registryState = (0, import_react.useState)([]);
  var registry = registryState[0];
  var setRegistry = registryState[1];
  var sourcesState = (0, import_react.useState)([]);
  var sources = sourcesState[0];
  var setSources = sourcesState[1];
  var queryState = (0, import_react.useState)("");
  var query = queryState[0];
  var setQuery = queryState[1];
  var filterState = (0, import_react.useState)("all");
  var filter = filterState[0];
  var setFilter = filterState[1];
  var busyState = (0, import_react.useState)("");
  var busy = busyState[0];
  var setBusy = busyState[1];
  var errorState = (0, import_react.useState)("");
  var error = errorState[0];
  var setError = errorState[1];
  var loadingState = (0, import_react.useState)(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];
  var detailState = (0, import_react.useState)(null);
  var detail = detailState[0];
  var setDetail = detailState[1];
  var invokeState = (0, import_react.useState)(null);
  var invoke = invokeState[0];
  var setInvoke = invokeState[1];

  var load = (0, import_react.useCallback)(function () {
    setLoading(true);
    void Promise.all([fetchSkills(props.workspace), fetchCatalog(props.workspace)]).then(function (results) {
      var nativeResult = results[0];
      var catalogResult = results[1];
      if (nativeResult.ok) {
        setGroups(nativeResult.body.groups === undefined ? [] : nativeResult.body.groups);
        setRegistry(Array.isArray(nativeResult.body.registry) ? nativeResult.body.registry : []);
      } else {
        setError(skT(skGetLang(), "error.load", { status: nativeResult.status }));
      }
      if (catalogResult.ok) {
        setMounted(Array.isArray(catalogResult.body.skills) ? catalogResult.body.skills : []);
        setSources(Array.isArray(catalogResult.body.sources) ? catalogResult.body.sources : []);
      } else if (nativeResult.ok) {
        setError(skT(skGetLang(), "error.load", { status: catalogResult.status }));
      }
      if (nativeResult.ok && catalogResult.ok) setError("");
    }).catch(function (thrown) {
      setError(String(thrown));
    }).finally(function () {
      setLoading(false);
    });
  }, [props.workspace]);
  (0, import_react.useEffect)(function () {
    load();
  }, [load, props.reloadToken]);
  (0, import_react.useEffect)(function () {
    if (detail === null && invoke === null) return undefined;
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (invoke !== null) setInvoke(null);
      else setDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [detail, invoke]);

  var onToggle = function (rootId, name, modelInvocable) {
    setBusy(rootId + "/" + name);
    void toggleSkill({
      rootId: rootId,
      name: name,
      ...props.workspace !== "" ? { workspace: props.workspace } : {},
      modelInvocable: modelInvocable
    }).then(function (result) {
      if (!result.ok) setError(skT(skGetLang(), "error.toggle", { status: result.status }));
      else setError("");
    }).catch(function (thrown) {
      setError(String(thrown));
    }).finally(function () {
      setBusy("");
      load();
    });
  };
  var onToggleMounted = function (path, modelInvocable) {
    setBusy("mounted/" + path);
    void setMountedSwitch({
      path: path,
      disabled: !modelInvocable,
      ...props.workspace !== "" ? { workspace: props.workspace } : {}
    }).then(function (result) {
      if (!result.ok) setError(skT(skGetLang(), "error.override", { status: result.status }));
      else setError("");
    }).catch(function (thrown) {
      setError(String(thrown));
    }).finally(function () {
      setBusy("");
      load();
    });
  };
  var onDelete = function (rootId, name) {
    if (!window.confirm(skT(skGetLang(), "confirm.delete", { name: name }))) return false;
    setBusy(rootId + "/" + name);
    void deleteSkill({
      rootId: rootId,
      name: name,
      ...props.workspace !== "" ? { workspace: props.workspace } : {}
    }).then(function (result) {
      if (!result.ok) setError(skT(skGetLang(), "error.delete", { status: result.status }));
      else setError("");
    }).catch(function (thrown) {
      setError(String(thrown));
    }).finally(function () {
      setBusy("");
      load();
    });
    return true;
  };

  var needle = query.trim().toLowerCase();
  var entries = (0, import_react.useMemo)(function () {
    return skEntriesOf(groups, mounted, sources, lang, registry);
  }, [groups, mounted, sources, lang, registry]);
  var counts = skCountGroups(entries);
  var visible = skFilterEntries(entries, filter, needle);

  var filterDefs = [
    ["all", "filter.all"],
    ["both", "filter.both"],
    ["model", "filter.model"],
    ["user", "filter.user"],
    ["none", "filter.none"]
  ];
  var filterButtons = filterDefs.map(function (definition) {
    var filterId = definition[0];
    if (filterId !== "all" && counts[filterId] === 0) return null;
    return sk("button", {
      className: "sk_filter",
      type: "button",
      key: filterId,
      "data-on": filter === filterId ? "true" : "false",
      "aria-pressed": filter === filterId ? "true" : "false",
      "data-filter": filterId,
      onClick: function () {
        setFilter(filterId);
      }
    }, [
      sk("span", null, skT(lang, definition[1])),
      sk("span", { className: "sk_filterCount" }, String(counts[filterId]))
    ]);
  }).filter(function (node) {
    return node !== null;
  });

  var openDetail = function (entry) {
    setDetail(entry);
  };
  var openInvoke = function (entry) {
    setInvoke(entry);
  };
  var cardOf = function (entry) {
    return sk(SkillCard, {
      entry: entry,
      lang: lang,
      key: entry.key,
      onUse: openInvoke,
      onDetails: openDetail
    }, undefined, entry.key);
  };

  var body;
  if (loading && groups.length === 0 && mounted.length === 0) {
    body = sk("div", { className: "sk_grid" }, [
      sk("div", { className: "sk_skeleton", key: "s1" }),
      sk("div", { className: "sk_skeleton", key: "s2" }),
      sk("div", { className: "sk_skeleton", key: "s3" })
    ]);
  } else if (entries.length === 0) {
    body = sk("div", { className: "sk_none" }, skT(lang, "empty"));
  } else if (visible.length === 0) {
    body = sk("div", { className: "sk_none" }, [
      sk("p", null, query.trim() === "" ? skT(lang, "noMatchGroup") : skT(lang, "noMatch", { q: query.trim() })),
      sk("button", { className: "sk_btn", type: "button", onClick: function () { setQuery(""); setFilter("all"); } }, skT(lang, "clearSearch"))
    ]);
  } else {
    body = sk("div", { className: "sk_grid" }, visible.map(cardOf));
  }

  var detailDialog = null;
  if (detail !== null) {
    detailDialog = detail.registry
      ? skH(RegistryDetailDialog, {
        entry: detail,
        lang: lang,
        workspace: props.workspace,
        onClose: function () {
          setDetail(null);
        }
      })
      : detail.mounted
      ? skH(MountedDetailDialog, {
        entry: detail,
        sourceLabel: detail.scopeLabel,
        lang: lang,
        workspace: props.workspace,
        busy: busy === "mounted/" + detail.skill.path,
        onClose: function () {
          setDetail(null);
        },
        onToggle: function () {
          onToggleMounted(detail.skill.path, !skModelInvocable(detail.skill));
        }
      })
      : skH(SkillDetailDialog, {
        entry: detail,
        lang: lang,
        workspace: props.workspace,
        busy: busy === detail.skill.rootId + "/" + detail.skill.name,
        onClose: function () {
          setDetail(null);
        },
        onToggle: function () {
          onToggle(detail.skill.rootId, detail.skill.name, !skModelInvocable(detail.skill));
        },
        onDelete: function () {
          if (onDelete(detail.skill.rootId, detail.skill.name)) setDetail(null);
        }
      });
  }

  var invokeDialog = invoke === null ? null : skH(InvokeDialog, {
    entry: invoke,
    lang: lang,
    workspace: props.workspace,
    onClose: function () {
      setInvoke(null);
    },
    onInvoked: function (kind, sessionId) {
      setInvoke(null);
      if (typeof props.onRequestClose === "function") props.onRequestClose();
      else props.onNotice("ok", skT(skGetLang(), "notice.loaded"));
      if (typeof sessionId === "string" && sessionId !== "") skFocusSession(sessionId);
    }
  });

  return sk(skF, null, [
    sk("div", { className: "sk_toolbar" }, [
      sk("input", {
        className: "sk_search",
        type: "search",
        placeholder: skT(lang, "search.placeholder"),
        "aria-label": skT(lang, "search.placeholder"),
        value: query,
        onChange: function (event) {
          setQuery(event.target.value);
        }
      }),
      sk("span", { className: "sk_count" }, skT(lang, "search.count", { n: entries.length }))
    ]),
    sk("div", { className: "sk_filters", role: "group", "aria-label": skT(lang, "filter.label") }, filterButtons),
    error !== "" ? sk("div", { className: "sk_error", role: "alert" }, error) : null,
    body,
    detailDialog,
    invokeDialog
  ]);
}

/**
 * Replace the baseline TargetSelector: same options and change handlers, labels
 * localized. Used inside the drag-and-drop install panel.
 * @param {{workspace: string, targetRoot: string, conflict: string, onTarget: Function, onConflict: Function}} props - selector props.
 * @returns {object} selector row.
 */
function TargetSelector(props) {
  var lang = useSkLang();
  var roots = [
    { id: "user-dsh", label: skT(lang, "root.userDsh") },
    { id: "user-agents", label: skT(lang, "root.userAgents") }
  ];
  return sk("div", { className: "ss_row", style: { justifyContent: "space-between" } }, [
    sk("select", {
      className: "ss_select",
      value: props.targetRoot,
      onChange: function (event) {
        props.onTarget(event.target.value);
      },
      title: skT(lang, "import.target")
    }, roots.map(function (root) {
      return sk("option", { value: root.id }, root.label, root.id);
    }).concat(props.workspace !== "" ? [
      sk("option", { value: "project-dsh:" + props.workspace, key: "project-dsh" }, skT(lang, "import.projectDsh")),
      sk("option", { value: "project-agents:" + props.workspace, key: "project-agents" }, skT(lang, "import.projectAgents"))
    ] : [])),
    sk("select", {
      className: "ss_select",
      style: { flex: "none", width: 120 },
      value: props.conflict,
      onChange: function (event) {
        props.onConflict(event.target.value);
      },
      title: skT(lang, "conflict.title")
    }, [
      sk("option", { value: "skip", key: "skip" }, skT(lang, "conflict.skip")),
      sk("option", { value: "rename", key: "rename" }, skT(lang, "conflict.rename")),
      sk("option", { value: "replace", key: "replace" }, skT(lang, "conflict.replace"))
    ])
  ]);
}
// #endregion

// #region station shell --------------------------------------------------------
/**
 * The station: a minimal title row (title, subtitle, More, close), a notice
 * strip and the browsing surface. Install and recycle-bin views open as
 * secondary panels instead of top-level tabs.
 * @param {{embedded?: boolean, onRequestClose?: Function}} props - station props.
 * @returns {object} station shell.
 */
function StationApp(props) {
  var lang = useSkLang();
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
  var refreshingState = (0, import_react.useState)(false);
  var refreshing = refreshingState[0];
  var setRefreshing = refreshingState[1];
  (0, import_react.useEffect)(function () {
    void fetchRoots().then(function (result) {
      if (result.ok) setWorkspaces(result.body.workspaces === undefined ? [] : result.body.workspaces);
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
  var requestRefresh = function () {
    setRefreshing(true);
    setReload(function (value) {
      return value + 1;
    });
    window.setTimeout(function () {
      setRefreshing(false);
    }, 600);
  };
  var closePanel = function () {
    setPanel(null);
    requestRefresh();
  };
  var closeStation = typeof props.onRequestClose === "function" ? props.onRequestClose : null;
  return sk("div", { className: "sk_station" + (props.embedded === true ? " sk_stationEmbedded" : "") }, [
    sk("header", { className: "sk_hero" }, [
      sk("div", { className: "sk_heroText" }, [
        sk("h1", { className: "sk_heroTitle" }, skT(lang, "panel.title")),
        sk("p", { className: "sk_heroSub" }, skT(lang, "hero.subtitle"))
      ]),
      sk("div", { className: "sk_heroActions" }, [
        skH(MoreMenu, {
          lang: lang,
          workspace: workspace,
          workspaces: workspaces,
          refreshing: refreshing,
          onWorkspace: setWorkspace,
          onPanel: setPanel,
          onRefresh: requestRefresh
        }),
        closeStation === null ? null : sk("button", {
          className: "sk_closeBtn",
          type: "button",
          onClick: closeStation,
          "aria-label": skT(lang, "panel.close")
        }, "✕")
      ])
    ]),
    notice === null ? null : sk("div", { className: "sk_notice", "data-kind": notice.kind, role: "status" }, [
      sk("span", null, notice.text),
      sk("button", {
        className: "sk_noticeClose",
        type: "button",
        onClick: function () {
          setNotice(null);
        },
        "aria-label": skT(lang, "panel.close")
      }, "✕")
    ]),
    sk("div", { className: "sk_stationBody" }, skH(SkillBrowse, {
      workspace: workspace,
      lang: lang,
      reloadToken: reload,
      onNotice: function (kind, text) {
        setNotice({ kind: kind, text: text });
      },
      onRequestClose: closeStation
    })),
    panel === null ? null : skH(StationPanelDialog, {
      panel: panel,
      lang: lang,
      workspace: workspace,
      onClose: closePanel
    })
  ]);
}
// #endregion
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
/* dsh-charlotte launcher revamp (v0.4) — scoped to .sk_* classes.
   Colors inherit the host theme through --dsw-alias-*; the accent is the
   restrained product blue #2563eb. Cards are white in the light theme, with
   subtle borders, rounded corners and a soft shadow. */

/* The drawer is the station window: no title bar, no version row. */
.ss_panel{width:1160px;max-width:94vw;height:min(820px,92vh)}
.ss_overlay{backdrop-filter:blur(2px)}

.sk_station{box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-layer-2,transparent)}
.sk_stationEmbedded{height:auto;min-height:560px}

/* --- hero: page title + subtitle, More menu, close ------------------------- */
.sk_hero{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 26px 12px}
.sk_heroText{min-width:0}
.sk_heroTitle{margin:0;font-size:22px;line-height:1.25;font-weight:650;letter-spacing:-.015em;color:var(--dsw-alias-label-primary)}
.sk_heroSub{margin:6px 0 0;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.sk_heroActions{display:flex;align-items:center;gap:6px;flex:none;position:relative}
.sk_closeBtn{box-sizing:border-box;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;cursor:pointer}
.sk_closeBtn:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}

/* --- More menu ------------------------------------------------------------- */
.sk_moreWrap{position:relative}
.sk_moreBtn{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;font-weight:500;cursor:pointer}
.sk_moreBtn:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.sk_moreCaret{font-size:9px;color:var(--dsw-alias-label-tertiary)}
.sk_more{position:absolute;top:calc(100% + 8px);right:0;z-index:30;box-sizing:border-box;width:268px;max-height:min(420px,70vh);overflow:auto;display:flex;flex-direction:column;gap:2px;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 16px 40px rgba(15,23,42,.16)}
.sk_moreItem{display:block;width:100%;box-sizing:border-box;padding:8px 10px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.sk_moreItem:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_moreLabel{padding:6px 10px 2px;font-size:11px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}
.sk_moreSelect{box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px}
.sk_moreSep{height:1px;margin:6px 4px;background:var(--dsw-alias-border-l2)}

/* --- notice strip ---------------------------------------------------------- */
.sk_notice{display:flex;align-items:center;gap:10px;margin:0 26px 10px;padding:8px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.sk_notice[data-kind="ok"]{border-color:color-mix(in srgb,#2563eb 26%,transparent);background:color-mix(in srgb,#2563eb 7%,transparent);color:#1d4ed8}
.sk_notice[data-kind="err"]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);color:var(--dsw-alias-state-error-primary)}
.sk_noticeClose{margin-left:auto;border:none;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer;padding:2px 4px;border-radius:6px}
.sk_noticeClose:hover{background:var(--dsw-alias-bg-layer-3)}

/* --- browsing surface ------------------------------------------------------ */
.sk_stationBody{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:4px 26px 26px}
.sk_stationEmbedded .sk_stationBody{min-height:440px}
.sk_toolbar{display:flex;align-items:center;gap:12px}
.sk_search{box-sizing:border-box;flex:1;min-width:0;height:38px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.sk_search::placeholder{color:var(--dsw-alias-label-tertiary)}
.sk_search:focus-visible{border-color:#2563eb;box-shadow:0 0 0 3px color-mix(in srgb,#2563eb 18%,transparent)}
.sk_count{flex:none;font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}

.sk_filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sk_filter{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}
.sk_filter:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.sk_filter[data-on="true"]{border-color:#2563eb;background:#2563eb;color:#fff}
.sk_filterCount{font-size:11px;line-height:16px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary)}
.sk_filter[data-on="true"] .sk_filterCount{background:color-mix(in srgb,#fff 20%,transparent);color:#fff}
.sk_error{padding:8px 12px;border-radius:10px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12.5px;word-break:break-word}

/* --- responsive grid: 3 / 2 / 1 ------------------------------------------- */
.sk_grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:stretch}
@media (max-width:1040px){
  .sk_grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:680px){
  .sk_grid{grid-template-columns:minmax(0,1fr)}
}

/* --- skill card ------------------------------------------------------------ */
.sk_card{box-sizing:border-box;display:flex;flex-direction:column;gap:10px;height:100%;padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 1px 2px rgba(16,24,40,.04);transition:box-shadow .16s ease,border-color .16s ease}
.sk_card:hover{border-color:color-mix(in srgb,#2563eb 24%,var(--dsw-alias-border-l2));box-shadow:0 8px 22px rgba(16,24,40,.08)}
.sk_cardTop{display:flex;align-items:flex-start;gap:11px}
.sk_icon{width:38px;height:38px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:11px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}
.sk_icon[data-cat="blue"]{background:color-mix(in srgb,#2563eb 12%,transparent);color:#2563eb}
.sk_icon[data-cat="purple"]{background:color-mix(in srgb,#7c3aed 12%,transparent);color:#7c3aed}
.sk_icon[data-cat="green"]{background:color-mix(in srgb,#059669 12%,transparent);color:#059669}
.sk_icon[data-cat="indigo"]{background:color-mix(in srgb,#4f46e5 12%,transparent);color:#4f46e5}
.sk_icon[data-cat="slate"]{background:color-mix(in srgb,#64748b 12%,transparent);color:#64748b}
.sk_identity{flex:1;min-width:0}
.sk_name{margin:0;font-size:15.5px;line-height:1.3;font-weight:700;letter-spacing:-.005em;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk_type{margin:3px 0 0;font-size:11.5px;line-height:1.4;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk_status{display:inline-flex;align-items:center;gap:5px;flex:none;font-size:11px;line-height:20px;padding:0 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary)}
.sk_status[data-on="true"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent)}
.sk_status[data-user="false"]{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-3)}
.sk_dot{width:6px;height:6px;border-radius:999px;background:currentColor;display:inline-block}
.sk_desc{margin:0;font-size:12.5px;line-height:1.55;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:calc(1.55em * 3)}
.sk_chips{display:flex;flex-wrap:wrap;gap:6px}
.sk_chip{font-size:10.5px;line-height:16px;padding:0 6px;border-radius:5px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.sk_chipSource{background:color-mix(in srgb,#2563eb 9%,transparent);color:#2563eb}
.sk_actions{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:2px}
.sk_useBtn{height:32px;padding:0 14px;border:1px solid #2563eb;border-radius:9px;background:#2563eb;color:#fff;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}
.sk_useBtn:hover{background:#1d4ed8;border-color:#1d4ed8}
.sk_useBtn:disabled{opacity:.45;cursor:not-allowed}
.sk_detailsBtn{height:32px;padding:0 8px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}
.sk_detailsBtn:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}

/* --- loading / empty ------------------------------------------------------- */
.sk_none{display:flex;flex-direction:column;align-items:center;gap:10px;padding:42px 8px;font-size:12.5px;color:var(--dsw-alias-label-tertiary);text-align:center}
.sk_none p{margin:0}
.sk_skeleton{height:190px;border-radius:14px;border:1px solid var(--dsw-alias-border-l2);background:linear-gradient(90deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-3),var(--dsw-alias-bg-layer-1));background-size:200% 100%;animation:skShimmer 1.4s ease-in-out infinite}
@keyframes skShimmer{0%{background-position:100% 0}100%{background-position:0 0}}

/* --- dialogs --------------------------------------------------------------- */
.sk_modal{position:fixed;inset:0;z-index:10020;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.4)}
.sk_modalBox{box-sizing:border-box;width:min(760px,94vw);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 24px 64px rgba(15,23,42,.26)}
.sk_modalHead{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_modalClose{margin-left:auto;flex:none;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;cursor:pointer}
.sk_modalClose:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.sk_modalClose:disabled{opacity:.4;cursor:default}
.sk_modalBody{flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:14px 16px}
.sk_modalFoot{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l2)}
.sk_footSpacer{flex:1}
.sk_panelBox{width:min(820px,94vw);max-height:88vh}
.sk_panelTitle{margin:0;font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary)}
.sk_panelBody{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:14px 16px}

/* --- detail dialog --------------------------------------------------------- */
.sk_detailBadges{display:flex;flex-wrap:wrap;gap:6px}
.sk_badge{font-size:11px;line-height:18px;padding:1px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}
.sk_badge[data-kind="on"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent)}
.sk_badge[data-kind="off"]{color:var(--dsw-alias-label-tertiary)}
.sk_detailSection{display:flex;flex-direction:column;gap:5px}
.sk_detailTitle{margin:0;display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-tertiary)}
.sk_detailMeta{font-weight:400}
.sk_detailText{margin:0;font-size:12.5px;line-height:1.65;color:var(--dsw-alias-label-secondary)}
.sk_detailPath{display:block;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:var(--dsw-alias-label-secondary);word-break:break-all}
.sk_detailReading{padding:16px 4px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px}
.sk_detailErr{padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px;word-break:break-word}
.sk_detailHint{margin:0;font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.sk_code{margin:0;max-height:300px;overflow:auto;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word}

/* --- audience blocks (Details only) --------------------------------------- */
.sk_audience{box-sizing:border-box;display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3)}
.sk_audience[data-kind="student"]{background:color-mix(in srgb,#2563eb 5%,transparent);border-color:color-mix(in srgb,#2563eb 13%,transparent)}
.sk_audienceHead{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.sk_audienceIcon{display:inline-flex;color:var(--dsw-alias-label-tertiary)}
.sk_audience[data-kind="student"] .sk_audienceIcon{color:#2563eb}
.sk_audienceTag{margin-left:auto;font-size:9.5px;font-weight:500;line-height:16px;padding:0 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;color:var(--dsw-alias-label-tertiary)}
.sk_audienceText{margin:0;font-size:12.5px;line-height:1.58;color:var(--dsw-alias-label-secondary)}

/* --- invocation dialog ----------------------------------------------------- */
.sk_invokeBox{width:min(560px,94vw)}
.sk_invokeBody{display:flex;flex-direction:column;gap:14px;padding:16px}
.sk_invokeHead{display:flex;flex-direction:column;gap:4px}
.sk_invokeTitle{margin:0;font-size:16px;line-height:1.35;font-weight:650;letter-spacing:-.01em;color:var(--dsw-alias-label-primary)}
.sk_invokeSub{margin:0;font-size:12.5px;color:var(--dsw-alias-label-tertiary)}
.sk_invokeOptions{display:flex;flex-direction:column;gap:10px}
.sk_invokeOption{box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;transition:border-color .15s ease,background .15s ease}
.sk_invokeOption:hover:not(:disabled){border-color:color-mix(in srgb,#2563eb 40%,var(--dsw-alias-border-l2));background:color-mix(in srgb,#2563eb 5%,var(--dsw-alias-bg-layer-1))}
.sk_invokeOption[data-kind="current"]{border-color:color-mix(in srgb,#2563eb 34%,var(--dsw-alias-border-l2))}
.sk_invokeOption:disabled{opacity:.5;cursor:not-allowed}
.sk_invokeOption[data-busy="true"]{opacity:1;border-color:#2563eb;background:color-mix(in srgb,#2563eb 8%,var(--dsw-alias-bg-layer-1))}
.sk_invokeOptionIcon{flex:none;width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:color-mix(in srgb,#2563eb 10%,transparent);color:#2563eb}
.sk_invokeOptionIcon[data-kind="new"]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);color:var(--dsw-alias-label-primary)}
.sk_invokeOptionText{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.sk_invokeOptionTitle{font-size:13.5px;font-weight:650;line-height:1.35;color:var(--dsw-alias-label-primary)}
.sk_invokeOptionDesc{font-size:12px;line-height:1.45;color:var(--dsw-alias-label-tertiary)}
.sk_invokeBusy{flex:none;font-size:13px;color:#2563eb}
.sk_invokeArrow{flex:none;font-size:13px;color:var(--dsw-alias-label-tertiary)}
.sk_invokeHint{margin:0;font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.sk_invokeErr{padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.5;word-break:break-word}
.sk_invokeFoot{display:flex;justify-content:flex-end;padding:0 16px 14px}

/* --- shared buttons and language switch ----------------------------------- */
.sk_btn{height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.sk_btn:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_btn:disabled{opacity:.5;cursor:default}
.sk_btnPrimary{border-color:#2563eb;background:#2563eb;color:#fff}
.sk_btnPrimary:hover{background:#1d4ed8;border-color:#1d4ed8}
.sk_btnDanger{height:30px;padding:0 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer}
.sk_btnDanger:hover{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 28%,transparent)}
.sk_lang{display:flex;align-self:flex-start;margin:2px 0 4px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;overflow:hidden}
.sk_langBtn{border:none;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;line-height:24px;padding:0 11px;cursor:pointer}
.sk_langBtn:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_langBtn[data-on="true"]{background:#2563eb;color:#fff}
.sk_langBtn[data-on="true"]:hover{background:#1d4ed8}

/* --- visible keyboard focus ------------------------------------------------ */
.sk_closeBtn:focus-visible,.sk_moreBtn:focus-visible,.sk_moreItem:focus-visible,.sk_moreSelect:focus-visible,.sk_noticeClose:focus-visible,.sk_search:focus-visible,.sk_filter:focus-visible,.sk_useBtn:focus-visible,.sk_detailsBtn:focus-visible,.sk_modalClose:focus-visible,.sk_btn:focus-visible,.sk_btnDanger:focus-visible,.sk_langBtn:focus-visible,.sk_invokeOption:focus-visible{outline:2px solid #2563eb;outline-offset:2px}

/* --- responsive chrome ----------------------------------------------------- */
@media (max-width:680px){
  .sk_hero{padding:16px 16px 10px;gap:10px}
  .sk_heroTitle{font-size:19px}
  .sk_stationBody{padding:4px 16px 18px}
  .sk_notice{margin:0 16px 10px}
  .sk_toolbar{flex-wrap:wrap}
  .sk_count{width:100%}
  .sk_modal{padding:8px}
  .sk_modalBox{width:96vw;max-height:92vh}
  .sk_invokeBody{padding:12px}
}

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
      title: skT(lang, "panel.title")
    }, [
      skH(StationIcon, {}),
      props.wide === false ? null : sk("span", null, skT(lang, "panel.title"))
    ]),
    drawer !== null && typeof document !== "undefined" ? (0, import_react_dom.createPortal)(drawer, document.body) : null
  ]);
}

function StationSettingsSection() {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { display: "flex", flexDirection: "column", minHeight: 480 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StationApp, { embedded: true }) });
}
function apply(ctx) {
  skPluginCtx = ctx;
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
