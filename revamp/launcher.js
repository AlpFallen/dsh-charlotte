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
    setTags(value);
    void skApi.tags({ name: skill.name, tags: value, workspace: props.workspace }).then(function (result) {
      if (!result.ok) {
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
        writable ? sk("button", { className: "sk_detailBtn", type: "button", disabled: busy === "migrate", onClick: migrateSkill }, skT(lang, "action.migrate")) : null,
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
