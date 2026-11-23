// #region dsh-charlotte skill detail drawer (tabbed)
//
// Default view is the Skill Introduction: actual SKILL.md documentation first,
// metadata only when the user opens another tab. The header, tab bar and footer
// stay fixed; only the active panel scrolls.

var SK_DETAIL_STRINGS = {
  zh: {
    "detail.tabs.label": "技能详情视图",
    "detail.tab.intro": "技能介绍",
    "detail.tab.security": "安全检查",
    "detail.tab.info": "技能信息",
    "detail.tab.usage": "使用记录",
    "detail.closePendingTitle": "还有未完成的操作",
    "detail.closePendingBody": "当前输入或操作尚未完成，关闭弹窗会丢失这些状态。仍要关闭？",
    "detail.closeKeep": "继续编辑",
    "detail.closeAnyway": "仍然关闭",
    "detail.intro.capabilities": "主要能力",
    "detail.intro.docs": "技能文档",
    "detail.intro.docsLoading": "正在读取技能文档…",
    "detail.intro.docsUnavailable": "技能文档不可用",
    "detail.intro.docsUnavailableHint": "宿主没有返回可读的 SKILL.md，页面不会用元数据冒充原文。",
    "detail.intro.docsEmpty": "技能文档只有 frontmatter，没有正文内容。",
    "detail.intro.retry": "重试读取",
    "detail.intro.noCapability": "技能没有声明额外能力。",
    "detail.intro.noUseCases": "技能没有声明具体适用场景。",
    "detail.security.title": "安全审计",
    "detail.security.scanStatus": "扫描状态",
    "detail.security.lastScan": "最后扫描",
    "detail.security.overall": "总体风险",
    "detail.security.state.scanning": "扫描中",
    "detail.security.state.unscanned": "尚未扫描",
    "detail.security.state.clean": "未发现问题",
    "detail.security.state.accepted": "已接受风险",
    "detail.security.state.unavailable": "不可用",
    "detail.security.state.notInScope": "该技能不在上次扫描范围内",
    "detail.security.state.critical": "严重风险",
    "detail.security.state.high": "高风险",
    "detail.security.state.medium": "中风险",
    "detail.security.state.low": "低风险",
    "detail.security.state.partial": "扫描不完整",
    "detail.security.state.info": "仅供参考",
    "detail.security.summary.critical": "严重",
    "detail.security.summary.high": "高",
    "detail.security.summary.medium": "中",
    "detail.security.summary.low": "低",
    "detail.security.summary.unresolved": "未解决",
    "detail.security.quick": "快速扫描",
    "detail.security.full": "完整审计",
    "detail.security.rescan": "重新扫描",
    "detail.security.export": "导出报告",
    "detail.security.progress": "{done} / {total}",
    "detail.security.noFindings": "当前扫描没有发现与该技能相关的问题。",
    "detail.security.notScanned": "还没有扫描过这个技能。运行一次扫描后才能给出风险结论。",
    "detail.security.scanningHint": "正在扫描，完成后显示结果。",
    "detail.security.partialHint": "本次扫描不完整（partial），不能当作完整审计。",
    "detail.security.notInScope": "上次扫描没有覆盖这个技能。请重新扫描它，或运行完整审计。",
    "detail.security.unavailable": "安全扫描器不可用：{reason}",
    "detail.security.findings": "问题（{count}）",
    "detail.security.recommendations": "安全建议",
    "detail.security.noRecommendations": "没有需要处理的修复建议。",
    "detail.security.view": "查看问题",
    "detail.security.hide": "收起问题",
    "detail.security.evidence": "证据",
    "detail.security.impact": "影响",
    "detail.security.attack": "攻击场景",
    "detail.security.remediation": "修复建议",
    "detail.security.instantAudit": "正文即时审计",
    "detail.security.instantClean": "索引中的正文没有发现隐藏字符。",
    "detail.security.review": "使用前安全确认",
    "detail.info.basic": "基础信息",
    "detail.info.matching": "匹配信息",
    "detail.info.permissions": "权限",
    "detail.info.dependencies": "依赖",
    "detail.info.technical": "技术信息",
    "detail.info.id": "技能 ID",
    "detail.info.skillName": "技能名",
    "detail.info.professional": "专业版简介",
    "detail.info.avoid": "排除场景",
    "detail.info.categoryEvidence": "分类证据",
    "detail.info.provider": "提供方",
    "detail.info.category": "分类",
    "detail.info.files": "文件数",
    "detail.info.reason": "推荐理由",
    "detail.info.keywords": "匹配关键词",
    "detail.info.triggers": "触发条件",
    "detail.info.score": "推荐分数",
    "detail.info.tags": "标签",
    "detail.info.declaredPermissions": "声明权限",
    "detail.info.availableTools": "可用工具（声明）",
    "detail.info.highRisk": "高风险操作（声明）",
    "detail.info.noneDeclared": "未声明",
    "detail.info.declarationOnly": "仅根据 SKILL.md 声明，未做运行时验证",
    "detail.info.requires": "声明依赖",
    "detail.info.dependents": "被依赖",
    "detail.info.noDependencies": "没有声明依赖。",
    "detail.info.noDependents": "没有技能声明依赖它。",
    "detail.info.metadataSource": "元数据来源",
    "detail.info.quality": "文档质量",
    "detail.info.unavailable": "不可用",
    "detail.info.loading": "读取中…",
    "detail.info.bodyLength": "正文字符数",
    "detail.info.description": "描述",
    "detail.info.actions": "管理操作",
    "detail.info.enableModel": "模型可用",
    "detail.info.enableUser": "用户可用",
    "detail.info.mountedEnable": "启用挂载技能",
    "detail.info.copyPath": "复制路径",
    "detail.info.pathCopied": "路径已复制。",
    "detail.info.pathCopyFailed": "复制路径失败：{reason}",
    "detail.info.migrate": "迁入共享池",
    "detail.info.trash": "移入回收站",
    "detail.info.deleting": "正在移入…",
    "detail.info.trashHint": "删除只会进入回收站，不会永久删除。",
    "detail.info.trashConfirm": "把「{name}」移入回收站？之后可以在回收站恢复。",
    "detail.info.trashConfirmDeps": "有 {count} 个技能声明依赖「{name}」；删除后它们可能无法正常工作。仍要移入回收站？",
    "detail.info.tagsPlaceholder": "输入标签后回车",
    "detail.info.tagsEmpty": "还没有标签。",
    "detail.usage.title": "使用记录",
    "detail.usage.total": "使用事件总数",
    "detail.usage.event": "事件",
    "detail.usage.time": "时间",
    "detail.usage.recommendation": "推荐漏斗",
    "detail.usage.loads": "加载",
    "detail.usage.invokes": "执行",
    "detail.usage.completions": "完成",
    "detail.usage.failures": "失败",
    "detail.usage.lastUsed": "最后使用",
    "detail.usage.recent": "最近记录",
    "detail.usage.task": "任务 / 原因",
    "detail.usage.never": "从未使用",
    "detail.usage.empty": "暂无使用记录。",
    "detail.usage.recommended": "被推荐",
    "detail.usage.accepted": "采纳推荐",
    "detail.usage.dismissed": "忽略推荐"
  },
  en: {
    "detail.tabs.label": "Skill detail views",
    "detail.tab.intro": "Skill Introduction",
    "detail.tab.security": "Security Check",
    "detail.tab.info": "Skill Information",
    "detail.tab.usage": "Usage History",
    "detail.closePendingTitle": "Unfinished action",
    "detail.closePendingBody": "The current input or action is not finished. Closing the dialog will discard it. Close anyway?",
    "detail.closeKeep": "Keep editing",
    "detail.closeAnyway": "Close anyway",
    "detail.intro.capabilities": "Main capabilities",
    "detail.intro.docs": "Skill documentation",
    "detail.intro.docsLoading": "Loading skill documentation…",
    "detail.intro.docsUnavailable": "Skill documentation unavailable",
    "detail.intro.docsUnavailableHint": "The host returned no readable SKILL.md; metadata is not substituted for the original.",
    "detail.intro.docsEmpty": "The skill file only contains frontmatter and no body.",
    "detail.intro.retry": "Retry",
    "detail.intro.noCapability": "The skill declares no additional capabilities.",
    "detail.intro.noUseCases": "The skill declares no specific use cases.",
    "detail.security.title": "Security Audit",
    "detail.security.scanStatus": "Scan status",
    "detail.security.lastScan": "Last scan",
    "detail.security.overall": "Overall risk",
    "detail.security.state.scanning": "Scanning",
    "detail.security.state.unscanned": "Not scanned",
    "detail.security.state.clean": "No findings",
    "detail.security.state.accepted": "Risk accepted",
    "detail.security.state.unavailable": "Unavailable",
    "detail.security.state.notInScope": "Not covered by the last scan",
    "detail.security.state.critical": "Critical risk",
    "detail.security.state.high": "High risk",
    "detail.security.state.medium": "Medium risk",
    "detail.security.state.low": "Low risk",
    "detail.security.state.partial": "Partial scan",
    "detail.security.state.info": "Informational",
    "detail.security.summary.critical": "Critical",
    "detail.security.summary.high": "High",
    "detail.security.summary.medium": "Medium",
    "detail.security.summary.low": "Low",
    "detail.security.summary.unresolved": "Unresolved",
    "detail.security.quick": "Quick Scan",
    "detail.security.full": "Full Audit",
    "detail.security.rescan": "Rescan",
    "detail.security.export": "Export Report",
    "detail.security.progress": "{done} / {total}",
    "detail.security.noFindings": "The current scan found nothing related to this skill.",
    "detail.security.notScanned": "This skill has not been scanned yet. Run a scan before drawing a risk conclusion.",
    "detail.security.scanningHint": "Scanning; results will appear when it finishes.",
    "detail.security.partialHint": "This scan is partial and is not a complete audit.",
    "detail.security.notInScope": "The last scan did not cover this skill. Rescan it, or run a full audit.",
    "detail.security.unavailable": "Security scanner unavailable: {reason}",
    "detail.security.findings": "Findings ({count})",
    "detail.security.recommendations": "Security recommendations",
    "detail.security.noRecommendations": "No remediation is required.",
    "detail.security.view": "View finding",
    "detail.security.hide": "Hide finding",
    "detail.security.evidence": "Evidence",
    "detail.security.impact": "Impact",
    "detail.security.attack": "Attack scenario",
    "detail.security.remediation": "Recommended fix",
    "detail.security.instantAudit": "Instant body audit",
    "detail.security.instantClean": "The indexed body contains no hidden characters.",
    "detail.security.review": "Pre-use safety review",
    "detail.info.basic": "Basic information",
    "detail.info.matching": "Matching information",
    "detail.info.permissions": "Permissions",
    "detail.info.dependencies": "Dependencies",
    "detail.info.technical": "Technical information",
    "detail.info.id": "Skill ID",
    "detail.info.skillName": "Skill name",
    "detail.info.professional": "Professional summary",
    "detail.info.avoid": "Avoid when",
    "detail.info.categoryEvidence": "Category evidence",
    "detail.info.provider": "Provider",
    "detail.info.category": "Category",
    "detail.info.files": "File count",
    "detail.info.reason": "Recommendation reason",
    "detail.info.keywords": "Matching keywords",
    "detail.info.triggers": "Triggers",
    "detail.info.score": "Recommendation score",
    "detail.info.tags": "Tags",
    "detail.info.declaredPermissions": "Declared permissions",
    "detail.info.availableTools": "Available tools (declared)",
    "detail.info.highRisk": "High-risk operations (declared)",
    "detail.info.noneDeclared": "None declared",
    "detail.info.declarationOnly": "Declaration only; not verified at runtime",
    "detail.info.requires": "Declared dependencies",
    "detail.info.dependents": "Dependents",
    "detail.info.noDependencies": "No dependencies declared.",
    "detail.info.noDependents": "No skill declares a dependency on it.",
    "detail.info.metadataSource": "Metadata source",
    "detail.info.quality": "Documentation quality",
    "detail.info.unavailable": "Unavailable",
    "detail.info.loading": "Loading…",
    "detail.info.bodyLength": "Body characters",
    "detail.info.description": "Description",
    "detail.info.actions": "Management",
    "detail.info.enableModel": "Model can use",
    "detail.info.enableUser": "User can use",
    "detail.info.mountedEnable": "Enable mounted skill",
    "detail.info.copyPath": "Copy path",
    "detail.info.pathCopied": "Path copied.",
    "detail.info.pathCopyFailed": "Could not copy path: {reason}",
    "detail.info.migrate": "Move to shared pool",
    "detail.info.trash": "Move to trash",
    "detail.info.deleting": "Moving…",
    "detail.info.trashHint": "Deleting only moves the skill to the restorable trash.",
    "detail.info.trashConfirm": "Move {name} to the trash? It can be restored from the trash later.",
    "detail.info.trashConfirmDeps": "{count} skills declare a dependency on {name}; they may stop working. Move it to the trash anyway?",
    "detail.info.tagsPlaceholder": "Type a tag and press Enter",
    "detail.info.tagsEmpty": "No tags yet.",
    "detail.usage.title": "Usage History",
    "detail.usage.total": "Total usage events",
    "detail.usage.event": "Event",
    "detail.usage.time": "Time",
    "detail.usage.recommendation": "Recommendation funnel",
    "detail.usage.loads": "Loads",
    "detail.usage.invokes": "Executions",
    "detail.usage.completions": "Completions",
    "detail.usage.failures": "Failures",
    "detail.usage.lastUsed": "Last used",
    "detail.usage.recent": "Recent records",
    "detail.usage.task": "Task / reason",
    "detail.usage.never": "Never",
    "detail.usage.empty": "No usage history yet.",
    "detail.usage.recommended": "Recommended",
    "detail.usage.accepted": "Recommendation accepted",
    "detail.usage.dismissed": "Recommendation dismissed"
  }
};

(function mergeDetailStrings() {
  for (var lang in SK_DETAIL_STRINGS) {
    if (!Object.prototype.hasOwnProperty.call(SK_DETAIL_STRINGS, lang)) continue;
    Object.assign(SK_STRINGS[lang], SK_DETAIL_STRINGS[lang]);
  }
})();

/**
 * Render a definition list, dropping fields that do not exist.
 * @param {Array<Array<*>>} rows - label/value pairs.
 * @returns {object|null} definition list.
 */
function skDetailRows(rows) {
  var children = [];
  rows.forEach(function (row, index) {
    var value = row[1];
    if (value === null || value === undefined || value === "") return;
    children.push(sk("dt", { key: "dt-" + String(index) }, row[0]));
    children.push(sk("dd", { key: "dd-" + String(index) }, value));
  });
  return children.length === 0 ? null : sk("dl", { className: "sk_kv" }, children);
}

/**
 * One titled section.
 * @param {string} title - section label.
 * @param {Array|object} children - content.
 * @returns {object} section.
 */
function skDetailSection(title, children) {
  return sk("section", { className: "sk_sec" }, [
    sk("div", { className: "sk_secLabel" }, title),
    children
  ]);
}

/**
 * Localized text for one finding field.
 * @param {object} finding - finding.
 * @param {string} field - base field.
 * @param {string} lang - language.
 * @returns {string} text.
 */
function skDetailFindingField(finding, field, lang) {
  var localized = finding[field + "Zh"];
  if (lang === "zh" && typeof localized === "string" && localized !== "") return localized;
  return typeof finding[field] === "string" ? finding[field] : "";
}

/**
 * Count security findings for one skill.
 * @param {Array<object>} findings - findings.
 * @returns {object} counts.
 */
function skDetailSecurityCounts(findings) {
  var counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0, unresolved: 0 };
  (findings ?? []).forEach(function (finding) {
    if (finding.severity === "CRITICAL") counts.critical += 1;
    if (finding.severity === "HIGH") counts.high += 1;
    if (finding.severity === "MEDIUM") counts.medium += 1;
    if (finding.severity === "LOW") counts.low += 1;
    if (finding.severity === "INFO") counts.info += 1;
    if (finding.status === "detected" || finding.status === "blocked" || finding.status === "unresolved") counts.unresolved += 1;
  });
  return counts;
}

/**
 * Whether closing would discard an in-flight action or unsaved input.
 * @param {object} input - current UI state.
 * @returns {boolean} true when close needs confirmation.
 */
function skDetailHasPending(input) {
  return String(input.busy ?? "") !== ""
    || String(input.securityBusy ?? "") !== ""
    || input.confirmDelete === true
    || String(input.tagDraft ?? "").trim() !== "";
}

/**
 * Filter security findings to one skill.
 * @param {Array<object>} findings - all findings.
 * @param {object} skill - index record.
 * @returns {Array<object>} matching findings.
 */
function skDetailSkillFindings(findings, skill) {
  var target = "skill:" + skill.name;
  var path = typeof skill.management?.path === "string" ? skill.management.path : "";
  return (findings ?? []).filter(function (finding) {
    if (finding.target === target) return true;
    var absolute = typeof finding.evidence?.absolutePath === "string" ? finding.evidence.absolutePath : "";
    if (path !== "" && absolute !== "" && (absolute === path || absolute.indexOf(path + "/") === 0)) return true;
    return false;
  });
}

/**
 * Download the security report as JSON.
 * @param {Function} onError - error reporter.
 */
function skDetailDownloadReport(onError) {
  void skCall("/security/report").then(function (result) {
    if (!result.ok || result.body.report === undefined) {
      onError(skApiError(result));
      return;
    }
    var text = JSON.stringify(result.body.report, null, 2);
    try {
      var blob = new Blob([text], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "dsh-security-report-" + String(result.body.report.reportId ?? "report") + ".json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError(String(error));
    }
  }).catch(function (error) {
    onError(String(error));
  });
}

/**
 * Skill Introduction tab: description, capabilities, use cases, real docs.
 * @param {object} props - props.
 * @returns {object} content.
 */
function SkDetailIntroTab(props) {
  var skill = props.skill;
  var lang = props.lang;
  var doc = props.doc;
  var useCases = Array.isArray(skill.useCases) ? skill.useCases : [];
  if (useCases.length === 0 && typeof skill.whenToUse === "string" && skill.whenToUse.trim() !== "") useCases = [skill.whenToUse];
  var capability = typeof skill.purpose === "string" && skill.purpose.trim() !== "" ? skill.purpose : "";
  var shortDescription = typeof props.introText === "string" && props.introText !== "" ? props.introText : skill.description;
  var docs = null;
  if (doc.status === "loading") {
    docs = sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.intro.docsLoading"));
  } else if (doc.status === "unavailable") {
    docs = sk("div", { className: "sk_detailUnavailable" }, [
      sk("strong", null, skT(lang, "detail.intro.docsUnavailable")),
      sk("p", null, skT(lang, "detail.intro.docsUnavailableHint")),
      doc.error !== "" ? sk("p", { className: "sk_detailMuted" }, doc.error) : null,
      sk("button", { className: "sk_textBtn", type: "button", onClick: props.onRetry }, skT(lang, "detail.intro.retry"))
    ]);
  } else if (doc.status === "empty") {
    docs = sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.intro.docsEmpty"));
  } else {
    docs = skH(SkMarkdown, { text: doc.text });
  }
  return sk("div", { className: "sk_detailTabBody" }, [
    sk("div", { className: "sk_detailHero" }, [
      sk("div", { className: "sk_eyebrow" }, skT(lang, "detail.tab.intro")),
      sk("h3", { className: "sk_detailHeroName" }, skill.name),
      shortDescription !== "" ? sk("p", { className: "sk_detailLead" }, shortDescription) : sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.noDescription"))
    ]),
    skDetailSection(skT(lang, "detail.intro.capabilities"), capability === ""
      ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.intro.noCapability"))
      : sk("p", { className: "sk_detailText" }, capability)),
    skDetailSection(skT(lang, "detail.useCases"), useCases.length === 0
      ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.intro.noUseCases"))
      : sk("ul", { className: "sk_bullets" }, useCases.map(function (row, index) {
        return sk("li", { key: "use-" + String(index) }, row);
      }))),
    skDetailSection(skT(lang, "detail.intro.docs"), sk("div", { className: "sk_detailDoc" }, docs))
  ]);
}

/**
 * Security Audit tab.
 * @param {object} props - props.
 * @returns {object} content.
 */
function SkDetailSecurityTab(props) {
  var lang = props.lang;
  var skill = props.skill;
  var state = props.security;
  var data = state.data;
  var lastScan = data === null || data === undefined ? null : data.lastScan;
  var running = data !== null && data !== undefined && data.running === true;
  var findings = data === null || data === undefined ? [] : skDetailSkillFindings(data.findings, skill);
  var counts = skDetailSecurityCounts(findings);
  var path = typeof skill.management?.path === "string" ? skill.management.path : "";
  var inScope = lastScan !== null && lastScan !== undefined && Array.isArray(lastScan.scope) && lastScan.scope.some(function (row) {
    return row.name === skill.name || (path !== "" && row.path === path);
  });
  var openCounts = skDetailSecurityCounts(findings.filter(function (finding) {
    return finding.status !== "accepted" && finding.status !== "fixed";
  }));
  var overall = "UNSCANNED";
  if (state.status === "error" && data === null) overall = "UNAVAILABLE";
  else if (running) overall = "SCANNING";
  else if (lastScan === null || lastScan === undefined) overall = "UNSCANNED";
  else if (!inScope) overall = "NOT-IN-SCOPE";
  else if (openCounts.critical > 0) overall = "CRITICAL";
  else if (openCounts.high > 0) overall = "HIGH";
  else if (openCounts.medium > 0) overall = "MEDIUM";
  else if (openCounts.low > 0) overall = "LOW";
  else if (openCounts.info > 0) overall = "INFO";
  else if (findings.length > 0 && findings.every(function (finding) { return finding.status === "accepted" || finding.status === "fixed"; })) overall = "ACCEPTED";
  else if (lastScan.complete !== true) overall = "PARTIAL";
  else overall = "CLEAN";
  var stateLabel = "detail.security.state." + (overall === "NOT-IN-SCOPE" ? "notInScope" : overall.toLowerCase());
  var lastTime = lastScan !== null && lastScan !== undefined && Number(lastScan.at) > 0 ? skTime(lastScan.at) : skT(lang, "detail.info.unavailable");
  var summary = [
    ["critical", "detail.security.summary.critical", counts.critical],
    ["high", "detail.security.summary.high", counts.high],
    ["medium", "detail.security.summary.medium", counts.medium],
    ["low", "detail.security.summary.low", counts.low],
    ["unresolved", "detail.security.summary.unresolved", counts.unresolved]
  ].map(function (row) {
    return sk("div", { className: "sk_detailRiskStat", "data-sev": row[0], key: row[0] }, [
      sk("strong", null, String(row[2])),
      sk("span", null, skT(lang, row[1]))
    ]);
  });
  var findingsList = findings.length === 0 ? null : sk("div", { className: "sk_detailFindings" }, findings.map(function (finding) {
    var open = props.expandedFinding === finding.id;
    var title = skDetailFindingField(finding, "title", lang) || finding.ruleId;
    var evidence = "";
    try {
      evidence = JSON.stringify(finding.evidence ?? {}, null, 2);
    } catch (error) {
      evidence = String(finding.evidence ?? "");
    }
    return sk("div", { className: "sk_detailFinding", "data-sev": finding.severity, key: finding.id }, [
      sk("button", {
        className: "sk_detailFindingHead",
        type: "button",
        "aria-expanded": open ? "true" : "false",
        "aria-label": skT(lang, open ? "detail.security.hide" : "detail.security.view"),
        title: skT(lang, open ? "detail.security.hide" : "detail.security.view"),
        onClick: function () { props.onToggleFinding(finding.id); }
      }, [
        sk("span", { className: "sk_detailSev" }, finding.severity),
        sk("span", { className: "sk_detailRule" }, finding.ruleId),
        sk("span", { className: "sk_detailFindingTitle" }, title),
        sk("span", { className: "sk_detailFindingState" }, skT(lang, "sec.status." + (finding.status ?? "detected"))),
        sk("span", { className: "sk_detailChevron" }, open ? "▾" : "▸")
      ]),
      open ? sk("div", { className: "sk_detailFindingBody" }, [
        skDetailFindingField(finding, "description", lang) !== "" ? sk("p", { className: "sk_detailText" }, skDetailFindingField(finding, "description", lang)) : null,
        sk("div", { className: "sk_secLabel" }, skT(lang, "detail.security.evidence")),
        sk("pre", { className: "sk_mdPre" }, evidence),
        skDetailFindingField(finding, "impact", lang) !== "" ? sk("div", null, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.security.impact")),
          sk("p", { className: "sk_detailText" }, skDetailFindingField(finding, "impact", lang))
        ]) : null,
        skDetailFindingField(finding, "attackScenario", lang) !== "" ? sk("div", null, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.security.attack")),
          sk("p", { className: "sk_detailText" }, skDetailFindingField(finding, "attackScenario", lang))
        ]) : null,
        skDetailFindingField(finding, "remediation", lang) !== "" ? sk("div", null, [
          sk("div", { className: "sk_secLabel" }, skT(lang, "detail.security.remediation")),
          sk("p", { className: "sk_detailText" }, skDetailFindingField(finding, "remediation", lang))
        ]) : null,
        Array.isArray(finding.references) && finding.references.length > 0 ? sk("div", { className: "sk_detailRefs" }, finding.references.map(function (url) {
          return sk("a", { key: url, href: url, target: "_blank", rel: "noreferrer noopener", className: "sk_mdLink" }, url);
        })) : null
      ]) : null
    ]);
  }));
  var recommendations = [];
  findings.forEach(function (finding) {
    if (finding.status === "accepted" || finding.status === "fixed") return;
    var text = skDetailFindingField(finding, "remediation", lang);
    if (text !== "" && recommendations.indexOf(text) === -1) recommendations.push(text);
  });
  var content = null;
  if ((state.status === "idle" || state.status === "loading") && data === null) {
    content = sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.info.loading"));
  } else if (state.status === "error" && data === null) {
    content = sk("p", { className: "sk_detailUnavailable" }, skT(lang, "detail.security.unavailable", { reason: state.error }));
  } else if (running && (lastScan === null || lastScan === undefined)) {
    content = sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.security.scanningHint"));
  } else if (lastScan === null || lastScan === undefined) {
    content = sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.security.notScanned"));
  } else if (!inScope) {
    content = sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.security.notInScope"));
  } else {
    content = sk("div", null, [
      sk("div", { className: "sk_detailRiskStats" }, summary),
      findingsList === null ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.security.noFindings")) : sk("div", null, [
        sk("div", { className: "sk_secLabel" }, skT(lang, "detail.security.findings", { count: String(findings.length) })),
        findingsList
      ]),
      skDetailSection(skT(lang, "detail.security.recommendations"), recommendations.length === 0
        ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.security.noRecommendations"))
        : sk("ul", { className: "sk_bullets" }, recommendations.map(function (row, index) {
          return sk("li", { key: "rec-" + String(index) }, row);
        })))
    ]);
  }
  var progress = running && data.run !== null && data.run !== undefined
    ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.security.progress", { done: String(data.run.done), total: String(data.run.total) }))
    : null;
  return sk("div", { className: "sk_detailTabBody" }, [
    sk("div", { className: "sk_detailSecurityHead" }, [
      sk("span", { className: "sk_detailMuted" }, skT(lang, "detail.security.overall") + "："),
      sk("span", { className: "sk_detailBadge", "data-sev": overall }, skT(lang, stateLabel)),
      sk("span", { className: "sk_detailMuted" }, skT(lang, "detail.security.lastScan") + "：" + lastTime),
      progress
    ]),
    lastScan !== null && lastScan !== undefined && lastScan.complete !== true
      ? sk("p", { className: "sk_detailUnavailable" }, skT(lang, "detail.security.partialHint"))
      : null,
    sk("div", { className: "sk_detailSecurityActions" }, [
      sk("button", { className: "sk_primary", type: "button", disabled: running || props.busy !== "", onClick: function () { props.onScan("quick", null); } }, skT(lang, "detail.security.quick")),
      sk("button", { className: "sk_textBtn", type: "button", disabled: running || props.busy !== "", onClick: function () { props.onScan("full", null); } }, skT(lang, "detail.security.full")),
      sk("button", { className: "sk_textBtn", type: "button", disabled: running || props.busy !== "", onClick: function () { props.onScan("quick", { name: skill.name }); } }, skT(lang, "detail.security.rescan")),
      sk("button", { className: "sk_textBtn", type: "button", disabled: props.busy !== "", onClick: function () { if (typeof skOpenSecurityReview === "function") skOpenSecurityReview({ name: skill.name, source: skill.source, manual: true }); } }, skT(lang, "srv.action.review")),
      sk("button", { className: "sk_textBtn", type: "button", disabled: props.busy !== "", onClick: props.onExport }, skT(lang, "detail.security.export"))
    ]),
    content,
    skDetailSection(skT(lang, "detail.security.instantAudit"), skill.audit === undefined || skill.audit === null || skill.audit.clean === true
      ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.security.instantClean"))
      : sk("ul", { className: "sk_bullets" }, skill.audit.findings.map(function (row) {
        return sk("li", { key: "audit-" + row.id }, "[" + String(row.severity) + "] " + row.id + " × " + String(row.count));
      }))),
    skDetailSection(skT(lang, "detail.security.review"), props.review.reviewed === true
      ? sk("p", { className: "sk_detailMuted" }, skT(lang, "review.accepted") + (props.review.at > 0 ? " · " + skTime(props.review.at) : ""))
      : sk("div", null, [
        sk("p", { className: "sk_detailText" }, skT(lang, "review.pending")),
        props.review.risk !== null && props.review.risk !== undefined ? sk("p", { className: "sk_detailMuted" }, skT(lang, "review.riskLabel") + "：" + skT(lang, "review.risk." + props.review.risk)) : null,
        sk("button", { className: "sk_primary", type: "button", disabled: props.reviewBusy === "review" || props.inspectLoading === true, onClick: props.onAcceptReview }, skT(lang, props.reviewBusy === "review" ? "review.saving" : "review.accept"))
      ]))
  ]);
}

/**
 * Skill Information tab: secondary metadata, permissions, dependencies and management.
 * @param {object} props - props.
 * @returns {object} content.
 */
function SkDetailInfoTab(props) {
  var lang = props.lang;
  var skill = props.skill;
  var inspect = props.inspect;
  var recent = props.recent;
  var fileCount = inspect !== null && inspect.status === "ready" && inspect.report !== null && Array.isArray(inspect.report.files)
    ? inspect.report.files.length
    : null;
  var fileLabel = fileCount === null ? (inspect !== null && inspect.status === "loading" ? skT(lang, "detail.info.loading") : skT(lang, "detail.info.unavailable")) : String(fileCount);
  var category = skill.category !== null && skill.category !== undefined
    ? (lang === "zh" ? skill.category.label : skill.category.labelEn) + (skill.category.confidence ? " · " + skill.category.confidence : "")
    : skT(lang, "detail.info.unavailable");
  var declared = Array.isArray(skill.declaredPermissions) ? skill.declaredPermissions : [];
  var risky = declared.filter(function (name) { return /^(bash|shell|exec|write|edit|network|terminal|computer)$/i.test(String(name)); });
  var requires = Array.isArray(skill.requires) ? skill.requires : [];
  var dependents = Array.isArray(props.dependents) ? props.dependents : [];
  var metadata = [];
  Object.keys(skill.provenance ?? {}).forEach(function (key) {
    metadata.push(key + ":" + skill.provenance[key]);
  });
  var quality = inspect !== null && inspect.status === "ready" && inspect.report !== null ? inspect.report.quality.level : null;
  var rows = [
    [skT(lang, "detail.info.skillName"), skill.name],
    [skT(lang, "detail.info.id"), skill.id ?? skT(lang, "detail.info.unavailable")],
    [skT(lang, "detail.info.provider"), skill.management?.provider ?? skT(lang, "detail.info.unavailable")],
    [skT(lang, "detail.source"), props.sourceDetail],
    [skT(lang, "detail.info.category"), category],
    [skT(lang, "detail.info.files"), fileLabel],
    [skT(lang, "detail.info.description"), skill.description !== "" ? skill.description : skT(lang, "detail.info.unavailable")],
    [skT(lang, "detail.info.professional"), skill.i18n?.professional ?? null]
  ];
  var matchingRows = [];
  if (recent !== undefined && recent.reason !== "") {
    matchingRows.push([skT(lang, "detail.info.reason"), lang === "en" && typeof recent.reasonEn === "string" && recent.reasonEn !== "" ? recent.reasonEn : recent.reason]);
    if (typeof recent.score === "number") matchingRows.push([skT(lang, "detail.info.score"), String(recent.score)]);
  }
  var technicalRows = [
    [skT(lang, "detail.version"), skill.version ?? skT(lang, "detail.info.unavailable")],
    [skT(lang, "detail.info.bodyLength"), skill.bodyLength !== undefined ? String(skill.bodyLength) : skT(lang, "detail.info.unavailable")],
    [skT(lang, "detail.cost"), skill.cost !== undefined && skill.cost !== null ? skT(lang, "detail.costValue", { tokens: String(skill.cost.tokens), chars: String(skill.cost.chars) }) : skT(lang, "detail.info.unavailable")],
    [skT(lang, "detail.updated"), skill.updatedAt !== null && skill.updatedAt !== undefined && skill.updatedAt > 0 ? skTime(skill.updatedAt) : skT(lang, "detail.info.unavailable")],
    [skT(lang, "detail.info.quality"), quality === null ? skT(lang, "detail.info.unavailable") : skT(lang, "inspect.level." + quality)],
    [skT(lang, "detail.info.metadataSource"), metadata.length === 0 ? skT(lang, "detail.info.unavailable") : metadata.join(" · ")]
  ];
  return sk("div", { className: "sk_detailTabBody" }, [
    skDetailSection(skT(lang, "detail.info.basic"), skDetailRows(rows)),
    skDetailSection(skT(lang, "detail.info.matching"), sk("div", null, [
      matchingRows.length === 0 ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.info.unavailable")) : skDetailRows(matchingRows),
      Array.isArray(skill.keywords) && skill.keywords.length > 0 ? sk("div", null, [
        sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.keywords")),
        sk("div", { className: "sk_detailChips" }, skill.keywords.map(function (row) {
          return sk("span", { key: "kw-" + row, className: "sk_evidence" }, row);
        }))
      ]) : null,
      Array.isArray(skill.triggers?.values) && skill.triggers.values.length > 0 ? sk("div", null, [
        sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.triggers")),
        sk("div", { className: "sk_detailChips" }, skill.triggers.values.map(function (row) {
          return sk("span", { key: "tr-" + row, className: "sk_evidence" }, row);
        }))
      ]) : null,
      Array.isArray(skill.category?.evidence) && skill.category.evidence.length > 0 ? sk("div", null, [
        sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.categoryEvidence")),
        sk("div", { className: "sk_detailChips" }, skill.category.evidence.map(function (row) {
          return sk("span", { key: "ce-" + row.term, className: "sk_evidence" }, row.term);
        }))
      ]) : null,
      Array.isArray(skill.avoidCases) && skill.avoidCases.length > 0 ? sk("div", null, [
        sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.avoid")),
        sk("ul", { className: "sk_bullets" }, skill.avoidCases.map(function (row, index) {
          return sk("li", { key: "avoid-" + String(index) }, row);
        }))
      ]) : null,
      sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.tags")),
      props.tags.length === 0 ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.info.tagsEmpty")) : sk("div", { className: "sk_detailChips" }, props.tags.map(function (tag) {
        return sk("button", { key: "tag-" + tag, className: "sk_tagChip", type: "button", onClick: function () { props.onRemoveTag(tag); } }, tag + " ✕");
      })),
      sk("div", { className: "sk_detailTagEdit" }, [
        sk("input", {
          className: "sk_tagInput",
          type: "text",
          value: props.tagDraft,
          placeholder: skT(lang, "detail.info.tagsPlaceholder"),
          onChange: function (event) { props.onTagDraft(event.target.value); },
          onKeyDown: function (event) {
            if (event.isComposing || event.keyCode === 229) return;
            if (event.key !== "Enter") return;
            event.preventDefault();
            props.onCommitTag();
          }
        })
      ])
    ])),
    skDetailSection(skT(lang, "detail.info.permissions"), sk("div", null, [
      skDetailRows([
        [skT(lang, "detail.userInvocable"), skill.policy?.userInvocable ? "✓" : "✕"],
        [skT(lang, "detail.modelInvocable"), skill.policy?.modelInvocable ? "✓" : "✕"]
      ]),
      sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.declaredPermissions")),
      declared.length === 0 ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.info.noneDeclared")) : sk("div", { className: "sk_detailChips" }, declared.map(function (row) {
        return sk("span", { key: "perm-" + row, className: "sk_evidence" }, row);
      })),
      sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.availableTools")),
      sk("p", { className: "sk_detailMuted" }, declared.length === 0 ? skT(lang, "detail.info.noneDeclared") : declared.join(", ")),
      sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.info.declarationOnly")),
      sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.highRisk")),
      sk("p", { className: "sk_detailMuted" }, risky.length === 0 ? skT(lang, "detail.info.noneDeclared") : risky.join(", "))
    ])),
    skDetailSection(skT(lang, "detail.info.dependencies"), sk("div", null, [
      requires.length === 0 ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.info.noDependencies")) : sk("ul", { className: "sk_bullets" }, requires.map(function (row) {
        return sk("li", { key: "dep-" + row.name }, row.name + " · " + (row.satisfied ? skT(lang, "detail.dependenciesSatisfied") : skT(lang, "detail.dependenciesMissing")));
      })),
      sk("div", { className: "sk_secLabel" }, skT(lang, "detail.info.dependents")),
      dependents.length === 0 ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.info.noDependents")) : sk("ul", { className: "sk_bullets" }, dependents.map(function (row) {
        return sk("li", { key: "dependent-" + row.name }, row.name);
      }))
    ])),
    skDetailSection(skT(lang, "detail.info.technical"), sk("div", null, [
      skDetailRows(technicalRows),
      typeof skill.management?.path === "string" && skill.management.path !== "" ? sk("div", { className: "sk_pathRow" }, [
        sk("span", { className: "sk_secLabel", style: { margin: "0" } }, skT(lang, "detail.path")),
        sk("code", { className: "sk_pathText", title: skill.management.path }, skill.management.path)
      ]) : null,
      sk("div", { className: "sk_infoActions" }, [
        typeof skill.management?.path === "string" && skill.management.path !== "" ? sk("button", { className: "sk_textBtn", type: "button", onClick: props.onCopyPath }, skT(lang, props.pathCopied ? "detail.info.pathCopied" : "detail.info.copyPath")) : null
      ])
    ])),
    skDetailSection(skT(lang, "detail.info.actions"), sk("div", null, [
      props.writable ? sk("div", { className: "sk_detailToggles" }, [
        sk("label", { className: "sk_toggle" }, [skT(lang, "detail.info.enableModel"), sk("button", {
          className: "sk_switch", type: "button", role: "switch",
          "aria-checked": skill.policy?.modelInvocable ? "true" : "false",
          "data-on": skill.policy?.modelInvocable ? "" : undefined,
          onClick: function () { props.onToggle(skill, "model"); }
        })]),
        sk("label", { className: "sk_toggle" }, [skT(lang, "detail.info.enableUser"), sk("button", {
          className: "sk_switch", type: "button", role: "switch",
          "aria-checked": skill.policy?.userInvocable ? "true" : "false",
          "data-on": skill.policy?.userInvocable ? "" : undefined,
          onClick: function () { props.onToggle(skill, "user"); }
        })])
      ]) : null,
      props.mounted ? sk("label", { className: "sk_toggle" }, [skT(lang, "detail.info.mountedEnable"), sk("button", {
        className: "sk_switch", type: "button", role: "switch",
        "aria-checked": skill.policy?.disabled ? "false" : "true",
        "data-on": skill.policy?.disabled ? undefined : "",
        onClick: function () { props.onToggle(skill, "mounted"); }
      })]) : null,
      props.writable && !/\.md$/.test(String(skill.management?.path ?? "")) ? sk("button", { className: "sk_textBtn", type: "button", disabled: props.busy === "migrate", onClick: props.onMigrate }, skT(lang, "detail.info.migrate")) : null,
      props.writable ? (props.confirmDelete
        ? sk("div", { className: "sk_detailDeleteConfirm" }, [
          sk("p", { className: "sk_detailText" }, dependents.length > 0
            ? skT(lang, "detail.info.trashConfirmDeps", { name: skill.name, count: String(dependents.length) })
            : skT(lang, "detail.info.trashConfirm", { name: skill.name })),
          sk("button", { className: "sk_textBtn", type: "button", ref: props.cancelDeleteRef, onClick: props.onCancelDelete }, skT(lang, "action.cancel")),
          sk("button", { className: "sk_textBtn sk_danger", type: "button", disabled: props.deleting === skill.name, onClick: function () { props.onDelete(skill); } }, props.deleting === skill.name ? skT(lang, "detail.info.deleting") : skT(lang, "detail.info.trash"))
        ])
        : sk("button", { className: "sk_textBtn sk_danger", type: "button", ref: props.deleteButtonRef, title: skT(lang, "detail.info.trashHint"), disabled: props.deleting === skill.name, onClick: props.onAskDelete }, skT(lang, "detail.info.trash"))) : null
    ]))
  ]);
}

/**
 * Usage History tab.
 * @param {object} props - props.
 * @returns {object} content.
 */
function SkDetailUsageTab(props) {
  var lang = props.lang;
  var stats = props.skill.stats ?? {};
  var loads = Number(stats.loads) || 0;
  var invokes = Number(stats.invokes) || 0;
  var completions = Number(stats.completions) || 0;
  var failures = Number(stats.failures) || 0;
  var recent = Array.isArray(stats.recent) ? stats.recent.slice().reverse() : [];
  var total = loads + invokes;
  var cards = [
    ["detail.usage.total", total],
    ["detail.usage.loads", loads],
    ["detail.usage.invokes", invokes],
    ["detail.usage.completions", completions],
    ["detail.usage.failures", failures]
  ].map(function (row, index) {
    return sk("div", { className: "sk_detailUsageStat", key: "stat-" + String(index) }, [
      sk("strong", null, String(row[1])),
      sk("span", null, skT(lang, row[0]))
    ]);
  });
  var lastUsed = Number(stats.lastUsedAt) > 0 ? skAge(stats.lastUsedAt, lang) + " · " + skTime(stats.lastUsedAt) : skT(lang, "detail.usage.never");
  return sk("div", { className: "sk_detailTabBody" }, [
    sk("div", { className: "sk_detailUsageStats" }, cards),
    skDetailSection(skT(lang, "detail.usage.lastUsed"), sk("p", { className: "sk_detailText" }, lastUsed)),
    skDetailSection(skT(lang, "detail.usage.recent"), recent.length === 0
      ? sk("p", { className: "sk_detailMuted" }, skT(lang, "detail.usage.empty"))
      : sk("table", { className: "sk_hist" }, [
        sk("thead", { key: "head" }, sk("tr", { key: "hr" }, [
          sk("th", { key: "time" }, skT(lang, "detail.usage.time")),
          sk("th", { key: "kind" }, skT(lang, "detail.usage.event")),
          sk("th", { key: "task" }, skT(lang, "detail.usage.task"))
        ])),
        sk("tbody", { key: "body" }, recent.map(function (row, index) {
          return sk("tr", { key: "row-" + String(index) }, [
            sk("td", null, skTime(row.at)),
            sk("td", null, skT(lang, "usage." + (row.kind === "load-failed" ? "load-failed" : row.kind))),
            sk("td", null, typeof row.reason === "string" && row.reason !== "" ? row.reason : "—")
          ]);
        }))
      ])),
    skDetailSection(skT(lang, "detail.usage.recommendation"), skDetailRows([
      [skT(lang, "detail.usage.recommended"), Number(stats.recommended) > 0 ? String(stats.recommended) : null],
      [skT(lang, "detail.usage.accepted"), Number(stats.accepted) > 0 ? String(stats.accepted) : null],
      [skT(lang, "detail.usage.dismissed"), Number(stats.dismissed) > 0 ? String(stats.dismissed) : null]
    ]))
  ]);
}

/**
 * Centered, tabbed skill detail modal.
 * @param {object} props - skill, language, workspace and actions.
 * @returns {object} modal.
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
  var sourceDetail = skill.source?.detail !== undefined && skill.source.detail !== ""
    ? skT(lang, "detail.sourceDetail", { label: skill.source.label, detail: skill.source.detail })
    : skill.source?.label ?? "";
  var tabState = (0, import_react.useState)(props.initialTab === "security" || props.initialTab === "info" || props.initialTab === "usage" ? props.initialTab : "intro");
  var activeTab = tabState[0];
  var setActiveTab = tabState[1];
  var docState = (0, import_react.useState)({ status: "loading", text: "", error: "" });
  var doc = docState[0];
  var setDoc = docState[1];
  var securityState = (0, import_react.useState)({ status: "idle", data: null, error: "" });
  var security = securityState[0];
  var setSecurity = securityState[1];
  var inspectState = (0, import_react.useState)(null);
  var inspect = inspectState[0];
  var setInspect = inspectState[1];
  var reviewState = (0, import_react.useState)(skill.review ?? { reviewed: false, risk: null, at: 0 });
  var review = reviewState[0];
  var setReview = reviewState[1];
  var tagState = (0, import_react.useState)(Array.isArray(skill.tags) ? skill.tags : []);
  var tags = tagState[0];
  var setTags = tagState[1];
  var tagDraftState = (0, import_react.useState)("");
  var tagDraft = tagDraftState[0];
  var setTagDraft = tagDraftState[1];
  var copiedState = (0, import_react.useState)(false);
  var copied = copiedState[0];
  var setCopied = copiedState[1];
  var pathCopiedState = (0, import_react.useState)(false);
  var pathCopied = pathCopiedState[0];
  var setPathCopied = pathCopiedState[1];
  var busyState = (0, import_react.useState)("");
  var busy = busyState[0];
  var setBusy = busyState[1];
  var securityBusyState = (0, import_react.useState)("");
  var securityBusy = securityBusyState[0];
  var setSecurityBusy = securityBusyState[1];
  var expandedState = (0, import_react.useState)(null);
  var expandedFinding = expandedState[0];
  var setExpandedFinding = expandedState[1];
  var confirmDeleteState = (0, import_react.useState)(false);
  var confirmDelete = confirmDeleteState[0];
  var setConfirmDelete = confirmDeleteState[1];
  var closingState = (0, import_react.useState)(false);
  var closing = closingState[0];
  var setClosing = closingState[1];
  var closeConfirmState = (0, import_react.useState)(false);
  var closeConfirm = closeConfirmState[0];
  var setCloseConfirm = closeConfirmState[1];
  var drawerRef = (0, import_react.useRef)(null);
  var cancelDeleteRef = (0, import_react.useRef)(null);
  var deleteButtonRef = (0, import_react.useRef)(null);
  var closeCancelRef = (0, import_react.useRef)(null);
  var closeTimerRef = (0, import_react.useRef)(null);
  var tagSaveSeq = (0, import_react.useRef)(0);

  var hasPendingWork = skDetailHasPending({
    busy: busy,
    securityBusy: securityBusy,
    confirmDelete: confirmDelete,
    tagDraft: tagDraft
  });

  var finishClose = function () {
    if (closing === true || closeTimerRef.current !== null) return;
    setCloseConfirm(false);
    setClosing(true);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(function () {
      closeTimerRef.current = null;
      props.onClose();
    }, 180);
  };

  var requestClose = function () {
    if (closing === true || closeConfirm === true || closeTimerRef.current !== null) return;
    if (hasPendingWork === true) {
      setCloseConfirm(true);
      return;
    }
    finishClose();
  };

  var loadDocumentation = (0, import_react.useCallback)(function () {
    var live = true;
    setDoc({ status: "loading", text: "", error: "" });
    var accept = function (text) {
      if (!live) return true;
      var body = skStripFrontmatter(text);
      if (body.trim() === "") {
        setDoc({ status: "empty", text: text, error: "" });
      } else {
        setDoc({ status: "ready", text: text, error: "" });
      }
      return true;
    };
    void skApi.body(skill.name, props.workspace).then(function (result) {
      if (result.ok && typeof result.body.content === "string" && result.body.content !== "") {
        accept(result.body.content);
        return null;
      }
      var query = "name=" + encodeURIComponent(skill.name) + (props.workspace !== "" ? "&workspace=" + encodeURIComponent(props.workspace) : "");
      return skCall("/registry-skill?" + query).then(function (fallback) {
        if (fallback.ok && typeof fallback.body.content === "string" && fallback.body.content !== "") {
          accept(fallback.body.content);
          return;
        }
        if (live) setDoc({ status: "unavailable", text: "", error: skErrorText(result) });
      });
    }).catch(function (thrown) {
      if (live) setDoc({ status: "unavailable", text: "", error: String(thrown) });
    });
    return function () { live = false; };
  }, [skill.name, props.workspace]);

  (0, import_react.useEffect)(function () {
    return loadDocumentation();
  }, [loadDocumentation]);

  (0, import_react.useEffect)(function () {
    setReview(skill.review ?? { reviewed: false, risk: null, at: 0 });
  }, [skill.name, skill.review?.reviewed, skill.review?.at]);

  (0, import_react.useEffect)(function () {
    setActiveTab(props.initialTab === "security" || props.initialTab === "info" || props.initialTab === "usage" ? props.initialTab : "intro");
    setDoc({ status: "loading", text: "", error: "" });
    setSecurity({ status: "idle", data: null, error: "" });
    setExpandedFinding(null);
    setConfirmDelete(false);
    setCloseConfirm(false);
    // A tag request for the previous skill must not write into this one.
    tagSaveSeq.current += 1;
    setTags(Array.isArray(skill.tags) ? skill.tags : []);
    setTagDraft("");
    setReview(skill.review ?? { reviewed: false, risk: null, at: 0 });
  }, [skill.name, props.workspace]);

  (0, import_react.useEffect)(function () {
    var live = true;
    setInspect({ status: "loading", report: null, error: "" });
    void skApi.inspect(skill.name, props.workspace).then(function (result) {
      if (!live) return;
      if (!result.ok) { setInspect({ status: "error", report: null, error: skErrorText(result) }); return; }
      if (result.body.available === false) { setInspect({ status: "unavailable", report: null, error: "" }); return; }
      setInspect({ status: "ready", report: result.body, error: "" });
    }).catch(function (thrown) {
      if (live) setInspect({ status: "error", report: null, error: String(thrown) });
    });
    return function () { live = false; };
  }, [skill.name, props.workspace]);

  var loadSecurity = (0, import_react.useCallback)(function () {
    setSecurity(function (previous) { return { status: "loading", data: previous.data, error: "" }; });
    return skCall("/security/status" + (props.workspace !== "" ? "?workspace=" + encodeURIComponent(props.workspace) : "")).then(function (result) {
      if (!result.ok) {
        setSecurity(function (previous) { return { status: "error", data: previous.data, error: skErrorText(result) }; });
        return;
      }
      setSecurity({ status: "ready", data: result.body, error: "" });
    }).catch(function (thrown) {
      setSecurity(function (previous) { return { status: "error", data: previous.data, error: String(thrown) }; });
    });
  }, [props.workspace]);

  (0, import_react.useEffect)(function () {
    if (activeTab === "security" && security.status === "idle") void loadSecurity();
  }, [activeTab, security.status, loadSecurity]);

  (0, import_react.useEffect)(function () {
    if (activeTab !== "security" || security.data === null || security.data.running !== true) return undefined;
    var timer = window.setTimeout(function () { void loadSecurity(); }, 900);
    return function () { window.clearTimeout(timer); };
  }, [activeTab, security.data, loadSecurity]);

  (0, import_react.useEffect)(function () {
    return skTrapFocus(drawerRef.current);
  }, []);

  // Lock the background page while the modal is open, then restore exactly the
  // inline values that were there before (the list may have its own scroll).
  (0, import_react.useEffect)(function () {
    if (typeof document === "undefined") return undefined;
    var body = document.body;
    var root = document.documentElement;
    var previousBody = body.style.overflow;
    var previousRoot = root.style.overflow;
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    return function () {
      body.style.overflow = previousBody;
      root.style.overflow = previousRoot;
    };
  }, []);

  (0, import_react.useEffect)(function () {
    return function () {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  (0, import_react.useEffect)(function () {
    if (confirmDelete === true && cancelDeleteRef.current !== null) cancelDeleteRef.current.focus();
  }, [confirmDelete]);

  (0, import_react.useEffect)(function () {
    if (closeConfirm === true && closeCancelRef.current !== null) closeCancelRef.current.focus();
  }, [closeConfirm]);

  (0, import_react.useEffect)(function () {
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (closeConfirm === true) { setCloseConfirm(false); return; }
      if (confirmDelete === true) { setConfirmDelete(false); return; }
      requestClose();
    };
    window.addEventListener("keydown", onKey, true);
    return function () { window.removeEventListener("keydown", onKey, true); };
  }, [closeConfirm, confirmDelete, closing, hasPendingWork, props.onClose]);

  var tabs = [
    { id: "intro", label: "detail.tab.intro" },
    { id: "security", label: "detail.tab.security" },
    { id: "info", label: "detail.tab.info" },
    { id: "usage", label: "detail.tab.usage" }
  ];
  var activeIndex = tabs.findIndex(function (tab) { return tab.id === activeTab; });
  if (activeIndex < 0) activeIndex = 0;
  var selectTab = function (id) {
    setActiveTab(id);
    if (typeof window === "undefined") return;
    window.setTimeout(function () {
      var nextIndex = tabs.findIndex(function (tab) { return tab.id === id; });
      var element = document.getElementById("sk-detail-tab-" + String(nextIndex));
      if (element !== null && typeof element.focus === "function") element.focus();
    }, 0);
  };
  var onTabKey = function (event) {
    var next = activeIndex;
    if (event.key === "ArrowRight") next = (activeIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (activeIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next].id);
  };

  var saveTags = function (next) {
    var value = Array.isArray(next) ? next : [];
    var previous = tags;
    // Tag saves can overlap (add then remove quickly). Only the newest request
    // may write its answer back, otherwise an older response can undo the
    // newer edits on screen even though the host stored the newer list.
    tagSaveSeq.current += 1;
    var seq = tagSaveSeq.current;
    setTags(value);
    void skApi.tags({ name: skill.name, tags: value, workspace: props.workspace }).then(function (result) {
      if (seq !== tagSaveSeq.current) return;
      if (!result.ok) {
        setTags(previous);
        props.onNotice("err", skT(lang, "notice.tagsFailed", { reason: skErrorText(result) }));
        return;
      }
      setTags(Array.isArray(result.body.tags) ? result.body.tags : value);
      props.onNotice("ok", skT(lang, "notice.tagsSaved"));
    }).catch(function (thrown) {
      if (seq !== tagSaveSeq.current) return;
      setTags(previous);
      props.onNotice("err", skT(lang, "notice.tagsFailed", { reason: String(thrown) }));
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
    var write = function (text) {
      if (navigator.clipboard === undefined || typeof navigator.clipboard.writeText !== "function") {
        props.onNotice("err", skT(lang, "notice.copyFailed", { reason: "clipboard unavailable" }));
        return;
      }
      void navigator.clipboard.writeText(text).then(function () {
        setCopied(true);
        window.setTimeout(function () { setCopied(false); }, 2000);
      }).catch(function (thrown) {
        props.onNotice("err", skT(lang, "notice.copyFailed", { reason: String(thrown) }));
      });
    };
    if (doc.status === "ready" || doc.status === "empty") {
      write(doc.text);
      setBusy("");
      return;
    }
    void skApi.body(skill.name, props.workspace).then(function (result) {
      if (!result.ok) { props.onNotice("err", skT(lang, "notice.copyFailed", { reason: skErrorText(result) })); return; }
      write(typeof result.body.content === "string" ? result.body.content : "");
    }).finally(function () { setBusy(""); });
  };
  var copySkillPath = function () {
    var target = typeof skill.management?.path === "string" ? skill.management.path : "";
    if (target === "") return;
    if (navigator.clipboard === undefined || typeof navigator.clipboard.writeText !== "function") {
      props.onNotice("err", skT(lang, "detail.info.pathCopyFailed", { reason: "clipboard unavailable" }));
      return;
    }
    void navigator.clipboard.writeText(target).then(function () {
      setPathCopied(true);
      props.onNotice("ok", skT(lang, "detail.info.pathCopied"));
      window.setTimeout(function () { setPathCopied(false); }, 2000);
    }).catch(function (thrown) {
      props.onNotice("err", skT(lang, "detail.info.pathCopyFailed", { reason: String(thrown) }));
    });
  };
  var migrateSkill = function () {
    setBusy("migrate");
    void skApi.migrate({ name: skill.name, rootId: skill.management?.rootId, workspace: props.workspace }).then(function (result) {
      if (!result.ok) { props.onNotice("err", skT(lang, "notice.migrateRefused", { reason: skErrorText(result) })); return; }
      props.onNotice("ok", skT(lang, "notice.migrated", { path: result.body.link ?? "" }));
      props.onClose();
    }).finally(function () { setBusy(""); });
  };
  var acceptReview = function () {
    setBusy("review");
    void skApi.review({ name: skill.name, workspace: props.workspace, decision: "accepted" }).then(function (result) {
      if (!result.ok) { props.onNotice("err", skErrorText(result)); return; }
      setReview({ reviewed: true, risk: review?.risk ?? null, at: Date.now() });
      props.onNotice("ok", skT(lang, "review.done"));
    }).catch(function (thrown) {
      props.onNotice("err", String(thrown));
    }).finally(function () { setBusy(""); });
  };
  var runScan = function (mode, target) {
    setSecurityBusy(mode);
    void skCall("/security/scan", { method: "POST", body: { mode: mode, workspace: props.workspace, target: target } }).then(function (result) {
      if (!result.ok) props.onNotice("err", skApiError(result));
      window.setTimeout(function () { void loadSecurity(); }, 200);
    }).catch(function (thrown) {
      props.onNotice("err", String(thrown));
    }).finally(function () { setSecurityBusy(""); });
  };
  var exportReport = function () {
    skDetailDownloadReport(function (reason) { props.onNotice("err", reason); });
  };

  var panel = null;
  if (activeTab === "security") {
    panel = skH(SkDetailSecurityTab, {
      lang: lang, skill: skill, security: security, busy: securityBusy,
      expandedFinding: expandedFinding,
      onToggleFinding: function (id) { setExpandedFinding(expandedFinding === id ? null : id); },
      onScan: runScan, onExport: exportReport,
      review: review, onAcceptReview: acceptReview, reviewBusy: busy,
      inspectLoading: inspect === null || inspect.status === "loading"
    });
  } else if (activeTab === "info") {
    panel = skH(SkDetailInfoTab, {
      lang: lang, skill: skill, inspect: inspect, recent: recent, sourceDetail: sourceDetail,
      tags: tags, tagDraft: tagDraft, onTagDraft: setTagDraft, onCommitTag: commitTag,
      onRemoveTag: function (tag) { saveTags(tags.filter(function (row) { return row !== tag; })); },
      pathCopied: pathCopied, onCopyPath: copySkillPath,
      writable: writable, mounted: mounted, busy: busy,
      onToggle: props.onToggle, onMigrate: migrateSkill,
      confirmDelete: confirmDelete, onAskDelete: function () { setConfirmDelete(true); },
      onCancelDelete: function () {
        setConfirmDelete(false);
        window.setTimeout(function () { if (deleteButtonRef.current !== null) deleteButtonRef.current.focus(); }, 0);
      },
      onDelete: props.onDelete, deleting: props.deleting,
      dependents: props.dependents, cancelDeleteRef: cancelDeleteRef, deleteButtonRef: deleteButtonRef
    });
  } else if (activeTab === "usage") {
    panel = skH(SkDetailUsageTab, { lang: lang, skill: skill });
  } else {
    panel = skH(SkDetailIntroTab, {
      lang: lang, skill: skill, doc: doc, introText: introText,
      onRetry: function () { void loadDocumentation(); }
    });
  }

  return sk("div", {
    className: "sk_detailScrim",
    "data-closing": closing ? "true" : undefined,
    onClick: function (event) {
      if (event.target !== event.currentTarget) return;
      requestClose();
    },
    onWheel: function (event) { event.stopPropagation(); }
  }, [
    sk("aside", {
      className: "sk_detailModal",
      "data-closing": closing ? "true" : undefined,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": skill.name,
      "aria-busy": closing ? "true" : undefined,
      ref: drawerRef
    }, [
      sk("header", { className: "sk_drawerHead" }, [
        sk("div", { className: "sk_drawerTop" }, [
          sk("div", { className: "sk_drawerTitle" }, [
            sk("div", { className: "sk_detailNameRow" }, [
              sk("h2", { className: "sk_dName" }, skill.name),
              skill.version !== null && skill.version !== undefined ? sk("span", { className: "sk_detailVersion" }, "v" + String(skill.version)) : null
            ]),
            sk("div", { className: "sk_dMeta" }, [
              sk("span", null, sourceDetail),
              sk("span", { className: "sk_detailState", "data-kind": state.usable ? "ok" : "off" }, [sk("span", { className: "sk_detailDot" }), state.label])
            ])
          ]),
          sk("button", { className: "sk_closeBtn", type: "button", "aria-label": skT(lang, "action.close"), onClick: requestClose }, "✕")
        ])
      ]),
      sk("div", { className: "sk_detailTabs", role: "tablist", "aria-label": skT(lang, "detail.tabs.label") }, tabs.map(function (tab, index) {
        return sk("button", {
          key: tab.id,
          id: "sk-detail-tab-" + String(index),
          className: "sk_detailTab",
          type: "button",
          role: "tab",
          "aria-selected": activeTab === tab.id ? "true" : "false",
          "aria-controls": "sk-detail-panel-" + String(index),
          tabIndex: activeTab === tab.id ? 0 : -1,
          "data-on": activeTab === tab.id ? "" : undefined,
          onClick: function () { setActiveTab(tab.id); },
          onKeyDown: onTabKey
        }, skT(lang, tab.label));
      })),
      sk("div", {
        className: "sk_tabsBody",
        role: "tabpanel",
        id: "sk-detail-panel-" + String(activeIndex),
        "aria-labelledby": "sk-detail-tab-" + String(activeIndex),
        tabIndex: 0
      }, panel),
      sk("footer", { className: "sk_drawerFoot" }, [
        sk("button", { className: "sk_primary", type: "button", disabled: !state.usable, onClick: function () { props.onUse(skill); } }, load.phase === "loading" ? skT(lang, "action.cancel") : skT(lang, "action.use")),
        sk("button", { className: "sk_detailBtn", type: "button", disabled: busy === "copy", onClick: copyBody }, copied ? skT(lang, "action.copied") : skT(lang, "action.copy")),
        sk("span", { className: "sk_detailFootHint" }, "")
      ]),
      closeConfirm ? sk("div", {
        className: "sk_detailConfirmOverlay",
        role: "alertdialog",
        "aria-modal": "true",
        "aria-label": skT(lang, "detail.closePendingTitle")
      }, [
        sk("div", { className: "sk_detailConfirmCard" }, [
          sk("strong", null, skT(lang, "detail.closePendingTitle")),
          sk("p", null, skT(lang, "detail.closePendingBody")),
          sk("div", { className: "sk_detailConfirmActions" }, [
            sk("button", { className: "sk_textBtn", type: "button", ref: closeCancelRef, onClick: function () { setCloseConfirm(false); } }, skT(lang, "detail.closeKeep")),
            sk("button", { className: "sk_textBtn sk_danger", type: "button", onClick: finishClose }, skT(lang, "detail.closeAnyway"))
          ])
        ])
      ]) : null
    ])
  ]);
}

if (typeof window !== "undefined" && window.__DSH_CHARLOTTE_TEST__ === true && window.__skTest !== undefined) {
  window.__skTest.skDetailSecurityCounts = skDetailSecurityCounts;
  window.__skTest.skDetailSkillFindings = skDetailSkillFindings;
  window.__skTest.skDetailHasPending = skDetailHasPending;
  // The markdown fragment executes before the launcher installs __skTest.
  window.__skTest.skParseMarkdown = skParseMarkdown;
  window.__skTest.skStripFrontmatter = skStripFrontmatter;
  window.__skTest.skSafeUrl = skSafeUrl;
  window.__skTest.skInline = skInline;
}

// #endregion
