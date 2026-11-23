// #region dsh-charlotte security review modal
//
// A distinct modal from Skill Detail and Security Center. It is the operation
// decision surface: the host supplies the scan result and the allowed action,
// while this component only renders that decision and records explicit HIGH
// authorizations through the existing /security/finding endpoint.

var SK_REVIEW_STRINGS = {
  zh: {
    "more.securityReview": "安全审查",
    "srv.title": "安全审查",
    "srv.sub": "安装、导入、启用或使用前，对当前技能做一次真实规则扫描",
    "srv.source": "来源：{source}",
    "srv.hash": "内容哈希 {hash}",
    "srv.state.idle": "尚未审查",
    "srv.state.scanning": "扫描中",
    "srv.state.passed": "检查通过",
    "srv.state.warning": "存在警告",
    "srv.state.blocked": "存在阻断风险",
    "srv.state.failed": "扫描失败",
    "srv.state.cancelled": "已取消",
    "srv.state.partial": "部分完成",
    "srv.risk.critical": "严重",
    "srv.risk.high": "高",
    "srv.risk.medium": "中",
    "srv.risk.low": "低",
    "srv.risk.info": "提示",
    "srv.metric.checks": "检查项目",
    "srv.metric.findings": "发现问题",
    "srv.metric.blocked": "已阻止操作",
    "srv.metric.unresolved": "未解决",
    "srv.checks.title": "审查项目",
    "srv.checks.unchecked": "未检查",
    "srv.check.passed": "通过",
    "srv.check.warning": "有警告",
    "srv.check.failed": "未通过",
    "srv.check.partial": "部分检查",
    "srv.check.unchecked": "未覆盖",
    "srv.check.body": "技能正文安全检查",
    "srv.check.injection": "Prompt Injection 检查",
    "srv.check.suspicious": "可疑指令检查",
    "srv.check.path": "文件路径安全检查",
    "srv.check.symlink": "符号链接检查",
    "srv.check.dependencies": "外部依赖检查",
    "srv.check.permissions": "工具权限检查",
    "srv.check.dangerous": "危险操作检查",
    "srv.check.sensitive": "敏感信息访问检查",
    "srv.check.body.desc": "扫描技能正文和脚本中的注入、混淆、危险命令与凭据引用。",
    "srv.check.injection.desc": "识别要求忽略既有指令或冒充系统提示的文本。",
    "srv.check.suspicious.desc": "识别下载执行、动态求值、提权、777 权限等可疑指令。",
    "srv.check.path.desc": "检查路径穿越、绝对路径、敏感目录和越界符号链接。",
    "srv.check.symlink.desc": "检查技能包内符号链接是否指向包外或敏感位置。",
    "srv.check.dependencies.desc": "检查从 URL、VCS 或远程索引直接安装依赖的指令。",
    "srv.check.permissions.desc": "检查声明的工具权限是否明显超出技能用途。",
    "srv.check.dangerous.desc": "检查删除、格式化、重启和递归破坏类命令。",
    "srv.check.sensitive.desc": "检查 SSH、云凭据、钥匙串、浏览器 Cookie 等敏感访问。",
    "srv.findings.title": "风险详情（{count}）",
    "srv.findings.empty": "本次扫描没有发现风险。",
    "srv.findings.none": "尚未得到可信的扫描结果。",
    "srv.finding.evidence": "证据",
    "srv.finding.location": "位置",
    "srv.finding.impact": "可能影响",
    "srv.finding.attack": "攻击场景",
    "srv.finding.fix": "修复建议",
    "srv.finding.refs": "参考",
    "srv.finding.accepted": "已接受风险",
    "srv.scan.collecting": "收集检查对象",
    "srv.scan.scanning": "检查中",
    "srv.scan.finalizing": "汇总结果",
    "srv.scan.done": "已完成",
    "srv.scan.progress": "已完成 {done} / {total}",
    "srv.scan.current": "当前：{target}",
    "srv.scan.elapsed": "耗时 {seconds} 秒",
    "srv.scan.cancel": "取消扫描",
    "srv.scan.cancelled": "已请求取消",
    "srv.action.continue": "继续使用",
    "srv.action.acknowledge": "了解风险并继续",
    "srv.action.back": "返回修改",
    "srv.action.manager": "返回技能管理",
    "srv.action.details": "查看风险详情",
    "srv.action.report": "查看完整报告",
    "srv.action.quick": "快速扫描",
    "srv.action.full": "全面审计",
    "srv.action.rescan": "重新扫描",
    "srv.action.authorize": "接受风险",
    "srv.action.close": "关闭",
    "srv.action.review": "审查此技能",
    "srv.select": "选择要审查的技能",
    "srv.pending": "待安装技能",
    "srv.all.title": "全部技能审查",
    "srv.all.sub": "对当前工作区所有技能运行一次真实全面审计，并逐个报告通过 / 警告 / 阻断 / 未覆盖",
    "srv.all.button": "审查全部技能",
    "srv.all.passed": "全部技能审查通过",
    "srv.all.pass": "全部通过并标记已审查",
    "srv.all.passLow": "接受低风险并全部通过",
    "srv.all.failed": "{passed} / {total} 个技能通过；{failed} 个未通过",
    "srv.all.empty": "当前范围没有可审查的技能",
    "srv.all.last": "上次全面审计：{time}",
    "srv.all.never": "尚未全面审计",
    "srv.all.skill": "技能",
    "srv.all.state": "状态",
    "srv.all.findings": "风险",
    "srv.all.unchecked": "未覆盖",
    "srv.all.stale": "内容已变化",
    "srv.state.stale": "内容已变化",
    "srv.state.unchecked": "未审查",
    "srv.metric.skills": "技能",

    "srv.partial": "本次扫描不完整（partial），不能视为通过。",
    "srv.failed": "扫描失败或扫描器异常，不能视为通过。",
    "srv.cancelled": "扫描已取消，结果不完整。",
    "srv.unavailable": "无法审查这个技能：{reason}",
    "srv.error": "安全审查失败：{reason}",
    "srv.blockedHint": "当前操作已被宿主阻止；关闭弹窗不会放行。",
    "srv.idleHint": "还没有审查结果。选择快速扫描或全面审计。",
    "srv.cached": "已按当前内容哈希审查"
  },
  en: {
    "more.securityReview": "Security review",
    "srv.title": "Security Review",
    "srv.sub": "A real rule scan before install, import, enable or use",
    "srv.source": "Source: {source}",
    "srv.hash": "Content hash {hash}",
    "srv.state.idle": "Not reviewed",
    "srv.state.scanning": "Scanning",
    "srv.state.passed": "Passed",
    "srv.state.warning": "Warnings",
    "srv.state.blocked": "Blocked",
    "srv.state.failed": "Scan failed",
    "srv.state.cancelled": "Cancelled",
    "srv.state.partial": "Partial",
    "srv.risk.critical": "Critical",
    "srv.risk.high": "High",
    "srv.risk.medium": "Medium",
    "srv.risk.low": "Low",
    "srv.risk.info": "Info",
    "srv.metric.checks": "Checks",
    "srv.metric.findings": "Findings",
    "srv.metric.blocked": "Blocked ops",
    "srv.metric.unresolved": "Unresolved",
    "srv.checks.title": "Checks",
    "srv.checks.unchecked": "Unchecked",
    "srv.check.passed": "Passed",
    "srv.check.warning": "Warning",
    "srv.check.failed": "Failed",
    "srv.check.partial": "Partial",
    "srv.check.unchecked": "Not covered",
    "srv.check.body": "Skill body safety",
    "srv.check.injection": "Prompt injection",
    "srv.check.suspicious": "Suspicious instructions",
    "srv.check.path": "File path safety",
    "srv.check.symlink": "Symlink safety",
    "srv.check.dependencies": "External dependency sources",
    "srv.check.permissions": "Tool permissions",
    "srv.check.dangerous": "Dangerous operations",
    "srv.check.sensitive": "Sensitive data access",
    "srv.check.body.desc": "Scans skill text and scripts for injection, obfuscation, dangerous commands and credential references.",
    "srv.check.injection.desc": "Finds text that overrides instructions or impersonates a system prompt.",
    "srv.check.suspicious.desc": "Finds download-and-execute, dynamic eval, elevation and 777 permission patterns.",
    "srv.check.path.desc": "Checks traversal, absolute paths, sensitive directories and escaping symlinks.",
    "srv.check.symlink.desc": "Checks whether a bundle symlink points outside the bundle or at a sensitive path.",
    "srv.check.dependencies.desc": "Checks commands that install packages from URLs, VCS or untrusted indexes.",
    "srv.check.permissions.desc": "Checks whether declared tools are broader than the skill purpose.",
    "srv.check.dangerous.desc": "Checks deletion, formatting, reboot and recursive destructive commands.",
    "srv.check.sensitive.desc": "Checks access to SSH, cloud credentials, keychains and browser cookies.",
    "srv.findings.title": "Risk details ({count})",
    "srv.findings.empty": "No risk was found in this scan.",
    "srv.findings.none": "No trustworthy scan result exists yet.",
    "srv.finding.evidence": "Evidence",
    "srv.finding.location": "Location",
    "srv.finding.impact": "Impact",
    "srv.finding.attack": "Attack scenario",
    "srv.finding.fix": "Recommended fix",
    "srv.finding.refs": "References",
    "srv.finding.accepted": "Risk accepted",
    "srv.scan.collecting": "Collecting targets",
    "srv.scan.scanning": "Checking",
    "srv.scan.finalizing": "Summarising",
    "srv.scan.done": "Done",
    "srv.scan.progress": "{done} / {total} done",
    "srv.scan.current": "Current: {target}",
    "srv.scan.elapsed": "{seconds}s elapsed",
    "srv.scan.cancel": "Cancel scan",
    "srv.scan.cancelled": "Cancellation requested",
    "srv.action.continue": "Continue",
    "srv.action.acknowledge": "Understand and continue",
    "srv.action.back": "Go back and edit",
    "srv.action.manager": "Back to skill manager",
    "srv.action.details": "View risk details",
    "srv.action.report": "View full report",
    "srv.action.quick": "Quick scan",
    "srv.action.full": "Full audit",
    "srv.action.rescan": "Rescan",
    "srv.action.authorize": "Accept risk",
    "srv.action.close": "Close",
    "srv.action.review": "Review this skill",
    "srv.select": "Choose a skill to review",
    "srv.pending": "Pending skill",
    "srv.all.title": "All skills review",
    "srv.all.sub": "Run one real full audit over the current workspace and report each skill as passed / warning / blocked / uncovered",
    "srv.all.button": "Review all skills",
    "srv.all.passed": "All skills passed",
    "srv.all.pass": "Pass all and mark reviewed",
    "srv.all.passLow": "Accept low risks and pass all",
    "srv.all.failed": "{passed} / {total} skills passed; {failed} did not",
    "srv.all.empty": "No reviewable skills in this scope",
    "srv.all.last": "Last full audit: {time}",
    "srv.all.never": "No full audit yet",
    "srv.all.skill": "Skill",
    "srv.all.state": "State",
    "srv.all.findings": "Risks",
    "srv.all.unchecked": "Uncovered",
    "srv.all.stale": "Content changed",
    "srv.state.stale": "Content changed",
    "srv.state.unchecked": "Not reviewed",
    "srv.metric.skills": "Skills",

    "srv.partial": "This scan is partial and is not a pass.",
    "srv.failed": "The scan failed or the scanner errored; this is not a pass.",
    "srv.cancelled": "The scan was cancelled; the result is incomplete.",
    "srv.unavailable": "This skill cannot be reviewed: {reason}",
    "srv.error": "Security review failed: {reason}",
    "srv.blockedHint": "The host already blocked this operation; closing the dialog does not allow it.",
    "srv.idleHint": "No review result yet. Run a quick scan or a full audit.",
    "srv.cached": "Reviewed for the current content hash"
  }
};

(function mergeReviewStrings() {
  for (var lang in SK_REVIEW_STRINGS) {
    if (!Object.prototype.hasOwnProperty.call(SK_REVIEW_STRINGS, lang)) continue;
    Object.assign(SK_STRINGS[lang], SK_REVIEW_STRINGS[lang]);
  }
})();

var SK_REVIEW_CHECK_IDS = ["body", "injection", "suspicious", "path", "symlink", "dependencies", "permissions", "dangerous", "sensitive"];
var skSecurityReviewListeners = [];

/**
 * Subscribe to automatic/manual Security Review requests.
 * @param {Function} listener - receives the review request.
 * @returns {Function} unsubscribe.
 */
function skSecurityReviewSubscribe(listener) {
  if (typeof listener !== "function") return function () {};
  skSecurityReviewListeners.push(listener);
  return function () {
    var index = skSecurityReviewListeners.indexOf(listener);
    if (index >= 0) skSecurityReviewListeners.splice(index, 1);
  };
}

/**
 * Ask the shell to open the Security Review modal. The shell keeps one modal
 * instance, so repeated requests replace rather than stack.
 * @param {object} detail - review request.
 */
function skOpenSecurityReview(detail) {
  for (var index = 0; index < skSecurityReviewListeners.length; index += 1) {
    try {
      skSecurityReviewListeners[index](detail ?? null);
    } catch (error) {
      // Opening a modal must never break the operation that asked for it.
    }
  }
}

/** @param {object} finding - finding @returns {number} severity rank. */
function skReviewSeverityRank(finding) {
  var rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
  return rank[finding !== null && finding !== undefined ? finding.severity : "INFO"] ?? 0;
}

/** @param {Array<object>} findings - findings @returns {string} worst severity. */
function skReviewWorst(findings) {
  var worst = "INFO";
  (findings ?? []).forEach(function (finding) {
    if (skReviewSeverityRank(finding) > skReviewSeverityRank({ severity: worst })) worst = finding.severity;
  });
  return worst;
}

/** @param {object} initial - request @returns {string} initial state. */
function skReviewInitialPhase(initial) {
  if (initial === null || initial === undefined) return "IDLE";
  if (initial.review !== null && initial.review !== undefined && typeof initial.review.state === "string") return initial.review.state;
  var findings = Array.isArray(initial.findings) ? initial.findings : [];
  if (initial.code === "security-blocked" || findings.some(function (finding) { return finding.severity === "CRITICAL" || finding.severity === "HIGH"; })) return "BLOCKED";
  if (findings.length > 0) return "WARNING";
  return "IDLE";
}

/** @param {string} phase - state @returns {string} badge severity. */
function skReviewBadge(phase) {
  if (phase === "PASSED") return "CLEAN";
  if (phase === "WARNING") return "MEDIUM";
  if (phase === "BLOCKED") return "CRITICAL";
  if (phase === "FAILED") return "HIGH";
  if (phase === "SCANNING") return "SCANNING";
  if (phase === "PARTIAL") return "MEDIUM";
  return "INFO";
}

/** @param {string} phase - state @returns {string} translation key. */
function skReviewStateKey(phase) {
  return "srv.state." + String(phase ?? "idle").toLowerCase();
}

/** @param {object} review - review payload @param {object} initial - request @returns {object} summary counts. */
function skReviewSummary(review, initial) {
  var summary = review !== null && review !== undefined && review.summary !== null && typeof review.summary === "object" ? review.summary : (initial.summary ?? {});
  var counts = {
    critical: Number(summary.critical) || 0,
    high: Number(summary.high) || 0,
    medium: Number(summary.medium) || 0,
    low: Number(summary.low) || 0,
    info: Number(summary.info) || 0,
    total: Number(summary.total) || 0,
    blocked: Math.max(Number(summary.blocked) || 0, initial.summary !== null && initial.summary !== undefined ? Number(initial.summary.blocked) || 0 : 0),
    unresolved: Number(summary.unresolved) || 0,
    accepted: Number(summary.accepted) || 0
  };
  var list = review !== null && review !== undefined && Array.isArray(review.findings)
    ? review.findings
    : (Array.isArray(initial.findings) ? initial.findings : []);
  if (counts.total === 0 && list.length > 0) {
    list.forEach(function (finding) {
      var sev = String(finding.severity ?? "INFO").toLowerCase();
      if (counts[sev] !== undefined) counts[sev] += 1;
      counts.total += 1;
      if (finding.status === "blocked") counts.blocked += 1;
      if (finding.status === "detected" || finding.status === "unresolved" || finding.status === "blocked") counts.unresolved += 1;
      if (finding.status === "accepted") counts.accepted += 1;
    });
  }
  return counts;
}

/** @param {object} review - review payload @param {string} id - check id @returns {object} check row. */
function skReviewCheck(review, id) {
  var checks = review !== null && review !== undefined && Array.isArray(review.checks) ? review.checks : [];
  var found = checks.find(function (row) { return row.id === id; });
  return found ?? { id: id, status: "unchecked", findings: [], count: 0 };
}

/** @param {object} data - review-all payload @returns {object} summed risk counts. */
function skReviewAllSummary(data) {
  var counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0, blocked: 0, unresolved: 0, accepted: 0 };
  var items = data !== null && data !== undefined && Array.isArray(data.items) ? data.items : [];
  items.forEach(function (item) {
    var summary = item.summary ?? {};
    for (var key in counts) {
      if (key === "total" || key === "blocked" || key === "unresolved" || key === "accepted") counts[key] += Number(summary[key]) || 0;
      else counts[key] += Number(summary[key]) || 0;
    }
  });
  return counts;
}

/** @param {object} data - review-all payload @returns {string} aggregate phase. */
function skReviewAllPhase(data) {
  var scan = data !== null && data !== undefined ? data.lastScan : null;
  if (scan === null || scan === undefined) return "IDLE";
  if (scan.status === "failed") return "FAILED";
  if (scan.status === "cancelled") return "CANCELLED";
  if (scan.complete !== true) return "PARTIAL";
  var items = Array.isArray(data.items) ? data.items : [];
  if (items.some(function (item) { return item.state === "BLOCKED"; })) return "BLOCKED";
  if (items.some(function (item) { return item.state === "WARNING"; })) return "WARNING";
  if (items.some(function (item) { return item.state === "UNCHECKED" || item.state === "STALE" || item.state === "PARTIAL" || item.state === "FAILED" || item.state === "CANCELLED"; })) return "PARTIAL";
  return items.length > 0 ? "PASSED" : "IDLE";
}

/** @param {string} source - source id @param {string} lang - language @returns {string} display label. */
function skReviewSourceText(source, lang) {
  var labels = {
    install: { zh: "安装 / 导入", en: "Install / import" },
    use: { zh: "使用前", en: "Before use" },
    enable: { zh: "启用", en: "Enable" },
    restore: { zh: "恢复", en: "Restore" },
    change: { zh: "文件变化", en: "File change" },
    manual: { zh: "手动审查", en: "Manual review" }
  };
  return labels[source] !== undefined ? labels[source][lang] : String(source ?? "");
}

/** @param {object} finding - finding @param {string} field - field @param {string} lang - language @returns {string} localized text. */
function skReviewField(finding, field, lang) {
  var localized = finding[field + "Zh"];
  if (lang === "zh" && typeof localized === "string" && localized !== "") return localized;
  return typeof finding[field] === "string" ? finding[field] : "";
}

/**
 * Security Review modal.
 * @param {{initial: object, lang: 'zh'|'en', workspace: string, onClose: Function}} props - props.
 * @returns {object} modal.
 */
function SkSecurityReview(props) {
  var lang = props.lang;
  var initial = props.initial ?? {};
  var initialPhase = skReviewInitialPhase(initial);
  var globalMode = initial.global === true;
  var reviewable = initial.reviewable !== false;
  var nameState = (0, import_react.useState)(typeof initial.name === "string" ? initial.name : "");
  var name = nameState[0];
  var setName = nameState[1];
  var skillState = (0, import_react.useState)(initial.skill ?? { name: name, source: initial.source ?? null });
  var skill = skillState[0];
  var setSkill = skillState[1];
  var reviewState = (0, import_react.useState)(initial.review ?? (Array.isArray(initial.findings) && initial.findings.length > 0 ? {
    state: initialPhase,
    risk: skReviewWorst(initial.findings),
    complete: false,
    hash: "",
    reviewHash: "",
    scanId: initial.scanId ?? "",
    summary: initial.summary ?? {},
    findings: initial.findings,
    checks: [],
    blocking: initial.findings.filter(function (finding) { return finding.severity === "CRITICAL" || finding.severity === "HIGH"; }),
    acceptable: initial.findings.filter(function (finding) { return finding.severity === "HIGH"; }).map(function (finding) { return finding.id; }),
    action: initial.findings.some(function (finding) { return finding.severity === "CRITICAL"; }) ? "block" : "authorize",
    critical: initial.findings.some(function (finding) { return finding.severity === "CRITICAL"; })
  } : null));
  var review = reviewState[0];
  var setReview = reviewState[1];
  var allState = (0, import_react.useState)(null);
  var allData = allState[0];
  var setAllData = allState[1];
  var allLoadingState = (0, import_react.useState)(false);
  var allLoading = allLoadingState[0];
  var setAllLoading = allLoadingState[1];
  var phaseState = (0, import_react.useState)(initialPhase);
  var phase = phaseState[0];
  var setPhase = phaseState[1];
  var errorState = (0, import_react.useState)("");
  var error = errorState[0];
  var setError = errorState[1];
  var busyState = (0, import_react.useState)("");
  var busy = busyState[0];
  var setBusy = busyState[1];
  var scanState = (0, import_react.useState)(null);
  var scan = scanState[0];
  var setScan = scanState[1];
  var expandedState = (0, import_react.useState)({});
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];
  var skillsState = (0, import_react.useState)([]);
  var skills = skillsState[0];
  var setSkills = skillsState[1];
  var panelRef = (0, import_react.useRef)(null);
  var reviewAbort = (0, import_react.useRef)(null);
  var reviewSeq = (0, import_react.useRef)(0);
  var scanTimer = (0, import_react.useRef)(null);
  var scanSeq = (0, import_react.useRef)(0);


  var close = (0, import_react.useCallback)(function () {
    if (scanTimer.current !== null) {
      window.clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
    scanSeq.current += 1;
    reviewSeq.current += 1;
    if (reviewAbort.current !== null) reviewAbort.current.abort();
    if (phase === "SCANNING") {
      void skCall("/security/cancel", { method: "POST", body: {} }).catch(function () {});
    }
    props.onClose();
  }, [phase, props.onClose]);

  var loadAll = (0, import_react.useCallback)(function () {
    if (!globalMode) return Promise.resolve(null);
    setAllLoading(true);
    setError("");
    var query = props.workspace !== "" ? "?workspace=" + encodeURIComponent(props.workspace) : "";
    return skCall("/security/review-all" + query).then(function (result) {
      if (!result.ok) {
        setError(skT(lang, "srv.error", { reason: skApiError(result) }));
        setPhase("FAILED");
        return null;
      }
      if (result.body.available === false) {
        setError(skT(lang, "srv.error", { reason: "skill index unavailable" }));
        setPhase("FAILED");
        return null;
      }
      setAllData(result.body);
      setPhase(skReviewAllPhase(result.body));
      return result.body;
    }).catch(function (thrown) {
      setError(skT(lang, "srv.error", { reason: String(thrown) }));
      setPhase("FAILED");
      return null;
    }).finally(function () {
      setAllLoading(false);
    });
  }, [globalMode, props.workspace, lang]);

  var requestReview = (0, import_react.useCallback)(function () {
    if (globalMode || name === "" || reviewable === false) return Promise.resolve(null);
    reviewSeq.current += 1;
    var seq = reviewSeq.current;
    if (reviewAbort.current !== null) reviewAbort.current.abort();
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    reviewAbort.current = controller;
    setError("");
    var query = "name=" + encodeURIComponent(name) + (props.workspace !== "" ? "&workspace=" + encodeURIComponent(props.workspace) : "");
    return skCall("/security/review?" + query, controller === null ? undefined : { signal: controller.signal }).then(function (result) {
      if (seq !== reviewSeq.current) return null;
      if (!result.ok) {
        setError(skT(lang, "srv.error", { reason: skApiError(result) }));
        setPhase("FAILED");
        return null;
      }
      if (result.body.available === false) {
        setError(skT(lang, "srv.unavailable", { reason: String(result.body.reason ?? "no-readable-path") }));
        setPhase("FAILED");
        return null;
      }
      if (result.body.skill !== null && result.body.skill !== undefined) {
        setSkill(result.body.skill);
        setName(result.body.skill.name);
      }
      setReview(result.body.review);
      setPhase(result.body.review.state);
      return result.body;
    }).catch(function (thrown) {
      if (seq !== reviewSeq.current) return null;
      setError(skT(lang, "srv.error", { reason: String(thrown) }));
      setPhase("FAILED");
      return null;
    }).finally(function () {
      if (reviewAbort.current === controller) reviewAbort.current = null;
    });
  }, [globalMode, name, props.workspace, lang, reviewable]);

  var refreshAfterScan = function (status) {
    if (globalMode) {
      void loadAll();
      return;
    }
    var last = status !== null && status !== undefined ? status.lastScan : null;
    var forced = "";
    if (last === null || last === undefined) forced = "FAILED";
    else if (last.status === "cancelled") forced = "CANCELLED";
    else if (last.status === "failed") forced = "FAILED";
    else if (last.complete !== true) forced = "PARTIAL";
    void requestReview().then(function (body) {
      if (body !== null && forced !== "") setPhase(forced);
    });
  };

  var pollScan = function (seq) {
    if (seq !== scanSeq.current) return;
    void skCall("/security/status" + (props.workspace !== "" ? "?workspace=" + encodeURIComponent(props.workspace) : "")).then(function (result) {
      if (seq !== scanSeq.current) return;
      if (!result.ok) {
        setError(skT(lang, "srv.error", { reason: skApiError(result) }));
        setPhase("FAILED");
        return;
      }
      setScan(result.body.run);
      if (result.body.running === true) {
        scanTimer.current = window.setTimeout(function () { pollScan(seq); }, 700);
        return;
      }
      refreshAfterScan(result.body);
    }).catch(function (thrown) {
      if (seq !== scanSeq.current) return;
      setError(skT(lang, "srv.error", { reason: String(thrown) }));
      setPhase("FAILED");
    });
  };

  var startScan = function (mode) {
    if (busy !== "" || phase === "SCANNING") return;
    setBusy(mode);
    setError("");
    if (globalMode) setAllData(null);
    setPhase("SCANNING");
    setScan({ phase: "collecting", done: 0, total: 0, current: "", elapsedMs: 0 });
    scanSeq.current += 1;
    var seq = scanSeq.current;
    var body = { mode: mode, workspace: props.workspace };
    if (mode !== "full" && name !== "") body.target = { name: name };
    void skCall("/security/scan", { method: "POST", body: body }).then(function (result) {
      if (seq !== scanSeq.current) return;
      if (!result.ok && result.status !== 409) {
        setError(skT(lang, "srv.error", { reason: skApiError(result) }));
        setPhase("FAILED");
        return;
      }
      pollScan(seq);
    }).catch(function (thrown) {
      if (seq !== scanSeq.current) return;
      setError(skT(lang, "srv.error", { reason: String(thrown) }));
      setPhase("FAILED");
    }).finally(function () {
      setBusy("");
    });
  };

  var cancelScan = function () {
    scanSeq.current += 1;
    if (scanTimer.current !== null) {
      window.clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
    void skCall("/security/cancel", { method: "POST", body: {} }).catch(function () {});
    setPhase("CANCELLED");
  };

  (0, import_react.useEffect)(function () {
    if (globalMode) {
      void loadAll();
    }
    else if (name !== "" && reviewable !== false) void requestReview();
    else if (name === "") {
      void skCall("/index" + (props.workspace !== "" ? "?workspace=" + encodeURIComponent(props.workspace) : "")).then(function (result) {
        if (result.ok && Array.isArray(result.body.skills)) setSkills(result.body.skills.slice(0, 200));
      });
    }
    return function () {
      reviewSeq.current += 1;
      if (scanTimer.current !== null) window.clearTimeout(scanTimer.current);
      if (reviewAbort.current !== null) reviewAbort.current.abort();
    };
  }, [globalMode, loadAll, requestReview, name, props.workspace]);

  (0, import_react.useEffect)(function () {
    return skTrapFocus(panelRef.current);
  }, []);

  (0, import_react.useEffect)(function () {
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", onKey);
    return function () { window.removeEventListener("keydown", onKey); };
  }, [close]);

  var allItems = allData !== null && allData !== undefined && Array.isArray(allData.items) ? allData.items : [];
  var summary = globalMode ? skReviewAllSummary(allData) : skReviewSummary(review, initial);
  var findings = globalMode ? [] : (review !== null && review !== undefined && Array.isArray(review.findings) ? review.findings : (Array.isArray(initial.findings) ? initial.findings : []));
  var acceptable = review !== null && review !== undefined && Array.isArray(review.acceptable) ? review.acceptable : [];
  var critical = review !== null && review !== undefined && review.critical === true;
  var checks = SK_REVIEW_CHECK_IDS.map(function (id) { return skReviewCheck(review, id); });
  var sourceLabel = "";
  if (skill !== null && skill !== undefined && skill.source !== null && typeof skill.source === "object") {
    sourceLabel = typeof skill.source.detail === "string" && skill.source.detail !== "" ? skill.source.detail : (skill.source.label ?? "");
  }
  else if (typeof initial.source === "string") {
    sourceLabel = skReviewSourceText(initial.source, lang);
  }
  else if (skill !== null && skill !== undefined && typeof skill.source === "string") {
    sourceLabel = skReviewSourceText(skill.source, lang);
  }
  var hash = review !== null && review !== undefined && typeof review.hash === "string" && review.hash !== ""
    ? review.hash
    : (review !== null && review !== undefined && typeof review.reviewHash === "string" && review.reviewHash !== "" ? review.reviewHash : (typeof skill.reviewHash === "string" ? skill.reviewHash : ""));
  var stateLabel = skT(lang, skReviewStateKey(phase));
  var lastAt = globalMode
    ? (allData !== null && allData !== undefined && allData.lastScan !== null && allData.lastScan !== undefined && Number(allData.lastScan.at) > 0 ? skTime(allData.lastScan.at) : "")
    : (review !== null && review !== undefined && Number(review.checkedAt) > 0 ? skTime(review.checkedAt) : "");
  var stats = [
    ["critical", "srv.risk.critical", summary.critical],
    ["high", "srv.risk.high", summary.high],
    ["medium", "srv.risk.medium", summary.medium],
    ["low", "srv.risk.low", summary.low],
    ["info", "srv.risk.info", summary.info]
  ].map(function (row) {
    return sk("div", { className: "sk_secStat", "data-sev": row[0], key: row[0] }, [
      sk("span", { className: "sk_secStatValue" }, String(row[2])),
      sk("span", { className: "sk_secStatLabel" }, skT(lang, row[1]))
    ]);
  });
  var batchable = globalMode && allData !== null && allData !== undefined && allData.lastScan !== null && allData.lastScan !== undefined && allData.lastScan.complete === true && allItems.length > 0 && allItems.every(function (item) {
    if (item.state === "PASSED") return true;
    if (item.state !== "WARNING" || item.summary === undefined || item.summary === null) return false;
    return Number(item.summary.critical || 0) === 0 && Number(item.summary.high || 0) === 0 && Number(item.summary.medium || 0) === 0;
  });
  var metrics = [
    [globalMode ? "srv.metric.skills" : "srv.metric.checks", globalMode ? allItems.length : checks.length],
    ["srv.metric.findings", summary.total],
    ["srv.metric.blocked", summary.blocked],
    ["srv.metric.unresolved", summary.unresolved]
  ].map(function (row) {
    return sk("div", { className: "sk_srMetric", key: row[0] }, [
      sk("strong", null, String(row[1])),
      sk("span", null, skT(lang, row[0]))
    ]);
  });

  var openFinding = function (finding) {
    var next = Object.assign({}, expanded);
    next[finding.id] = !next[finding.id];
    setExpanded(next);
  };
  var showDetails = function () {
    var target = findings.find(function (finding) { return finding.severity === "CRITICAL" || finding.severity === "HIGH"; }) ?? findings[0];
    if (target !== undefined) {
      var next = Object.assign({}, expanded);
      next[target.id] = true;
      setExpanded(next);
    }
  };
  var accept = function () {
    setBusy("authorize");
    setError("");
    void skCall("/security/finding", {
      method: "POST",
      body: {
        action: "accept",
        keys: acceptable,
        reason: "",
        target: findings[0] !== undefined ? findings[0].target : "skill:" + name
      }
    }).then(function (result) {
      if (!result.ok) {
        setError(skApiError(result));
        return;
      }
      if (reviewable === false) {
        var acceptedIds = Array.isArray(acceptable) ? acceptable : [];
        var acceptedFindings = (review !== null && review !== undefined && Array.isArray(review.findings) ? review.findings : findings).map(function (finding) {
          return acceptedIds.indexOf(finding.id) >= 0 ? Object.assign({}, finding, { status: "accepted" }) : finding;
        });
        setReview(Object.assign({}, review, {
          state: "WARNING",
          blocking: [],
          acceptable: [],
          findings: acceptedFindings,
          summary: Object.assign({}, summary, { accepted: summary.accepted + acceptedIds.length })
        }));
        setPhase("WARNING");
        return;
      }
      return requestReview();
    }).finally(function () { setBusy(""); });
  };
  var continueAction = function () {
    if (phase !== "PASSED" && phase !== "WARNING") return;
    if (typeof props.onContinue === "function") {
      try { props.onContinue(); } catch (error) { /* closing still must not bypass the host guard */ }
    }
    close();
  };
  var passAll = function () {
    if (globalMode !== true || batchable !== true) return;
    setBusy("pass-all");
    setError("");
    var rows = allItems.filter(function (item) { return (item.state === "PASSED" || item.state === "WARNING") && item.name !== ""; });
    void Promise.all(rows.map(function (item) {
      return skApi.review({ name: item.name, workspace: props.workspace, decision: "accepted" });
    })).then(function (results) {
      var failed = results.find(function (result) { return result.ok !== true; });
      if (failed !== undefined) {
        setError(skT(lang, "srv.error", { reason: skApiError(failed) }));
        return;
      }
      close();
    }).catch(function (thrown) {
      setError(skT(lang, "srv.error", { reason: String(thrown) }));
    }).finally(function () {
      setBusy("");
    });
  };

  var downloadReport = function () {
    if (typeof skDetailDownloadReport === "function") {
      skDetailDownloadReport(function (reasonText) { setError(skT(lang, "srv.error", { reason: reasonText })); });
      return;
    }
    void skCall("/security/report").then(function (result) {
      if (!result.ok || result.body.report === undefined) {
        setError(skT(lang, "srv.error", { reason: skApiError(result) }));
        return;
      }
      var text = JSON.stringify(result.body.report, null, 2);
      var blob = new Blob([text], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "dsh-security-report.json";
      anchor.click();
      URL.revokeObjectURL(url);
    });
  };

  var checkRows = checks.map(function (row) {
    var statusKey = "srv.check." + row.status;
    var labelKey = "srv.check." + row.id;
    var descKey = "srv.check." + row.id + ".desc";
    return sk("div", { className: "sk_srCheck", "data-status": row.status, key: row.id }, [
      sk("span", { className: "sk_srCheckDot" }),
      sk("div", { className: "sk_srCheckText" }, [
        sk("strong", null, skT(lang, labelKey)),
        sk("span", null, skT(lang, descKey))
      ]),
      sk("span", { className: "sk_srCheckState" }, skT(lang, statusKey) + (row.count > 0 ? " · " + String(row.count) : ""))
    ]);
  });
  var allRows = allItems.map(function (item) {
    return sk("div", {
      className: "sk_srAllRow",
      "data-state": item.state,
      key: item.name,
      role: "button",
      tabIndex: 0,
      onClick: function () { if (typeof skOpenSecurityReview === "function") skOpenSecurityReview({ name: item.name, source: item.source }); },
      onKeyDown: function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (typeof skOpenSecurityReview === "function") skOpenSecurityReview({ name: item.name, source: item.source });
      }
    }, [
      sk("span", { className: "sk_srAllName" }, item.name),
      sk("span", { className: "sk_srAllSource" }, item.source !== null && item.source !== undefined ? (item.source.detail ?? item.source.label ?? "") : ""),
      sk("span", { className: "sk_srAllState" }, skT(lang, skReviewStateKey(item.state))),
      sk("span", { className: "sk_srAllCount" }, String(item.summary !== undefined && item.summary !== null ? item.summary.total : 0))
    ]);
  });

  var findingRows = findings.map(function (finding) {
    var open = expanded[finding.id] === true;
    var evidence = "";
    try { evidence = JSON.stringify(finding.evidence ?? {}, null, 2); } catch (error) { evidence = String(finding.evidence ?? ""); }
    return sk("div", { className: "sk_secFinding", "data-sev": finding.severity, key: finding.id }, [
      sk("div", {
        className: "sk_secFindingHead",
        role: "button",
        tabIndex: 0,
        "aria-expanded": open ? "true" : "false",
        onClick: function () { openFinding(finding); },
        onKeyDown: function (event) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openFinding(finding);
        }
      }, [
        sk("span", { className: "sk_secSev" }, finding.severity),
        sk("span", { className: "sk_secRule" }, finding.ruleId),
        sk("span", { className: "sk_secFindingTitle" }, skReviewField(finding, "title", lang) || finding.ruleId),
        sk("span", { className: "sk_secState" }, skT(lang, "sec.status." + (finding.status ?? "detected"))),
        sk("span", { className: "sk_secChevron" }, open ? "▾" : "▸")
      ]),
      sk("div", { className: "sk_secFindingMeta" }, [
        sk("span", { className: "sk_secFindingDesc" }, skClip(skReviewField(finding, "description", lang), 220)),
        sk("span", { className: "sk_secPath" }, (finding.filePath ?? "") + (finding.line ? ":" + String(finding.line) : ""))
      ]),
      open ? sk("div", { className: "sk_secDetail" }, [
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "srv.finding.location")),
          sk("p", { className: "sk_secFieldText" }, (finding.filePath ?? finding.target ?? "") + (finding.line ? ":" + String(finding.line) : ""))
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "srv.finding.evidence")),
          sk("pre", { className: "sk_secEvidence" }, evidence)
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "srv.finding.impact")),
          sk("p", { className: "sk_secFieldText" }, skReviewField(finding, "impact", lang))
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "srv.finding.attack")),
          sk("p", { className: "sk_secFieldText" }, skReviewField(finding, "attackScenario", lang))
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "srv.finding.fix")),
          sk("p", { className: "sk_secFieldText" }, skReviewField(finding, "remediation", lang))
        ]),
        Array.isArray(finding.references) && finding.references.length > 0 ? sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "srv.finding.refs")),
          sk("div", { className: "sk_secRefs" }, finding.references.map(function (url) {
            return sk("a", { className: "sk_secRef", href: url, target: "_blank", rel: "noreferrer noopener", key: url }, url);
          }))
        ]) : null
      ]) : null
    ]);
  });

  var progress = null;
  if (phase === "SCANNING") {
    var run = scan;
    var percent = run !== null && run !== undefined && Number(run.total) > 0 ? Math.min(100, Math.round((Number(run.done) / Number(run.total)) * 100)) : 0;
    progress = sk("div", { className: "sk_secProgress" }, [
      sk("div", { className: "sk_secProgressHead" }, [
        sk("span", { className: "sk_secProgressPhase" }, skT(lang, "srv.scan." + String(run !== null && run !== undefined ? run.phase : "collecting"))),
        sk("span", { className: "sk_secProgressCount" }, skT(lang, "srv.scan.progress", { done: String(run !== null && run !== undefined ? run.done : 0), total: String(run !== null && run !== undefined ? run.total : 0) })),
        sk("span", { className: "sk_secProgressElapsed" }, skT(lang, "srv.scan.elapsed", { seconds: String(run !== null && run !== undefined ? Math.max(0, Math.round((run.elapsedMs ?? 0) / 1000)) : 0) }))
      ]),
      sk("div", { className: "sk_secBar" }, [sk("div", { className: "sk_secBarFill", style: { width: String(run !== null && run !== undefined && run.total > 0 ? percent : 6) + "%" } })]),
      run !== null && run !== undefined && run.current !== "" ? sk("div", { className: "sk_secProgressCurrent" }, skT(lang, "srv.scan.current", { target: skClip(run.current, 120) })) : null
    ]);
  }

  var banner = null;
  if (globalMode) {
    var allScan = allData !== null && allData !== undefined ? allData.lastScan : null;
    if (allData === null || allData === undefined || allScan === null) {
      banner = allData === null || allData === undefined ? null : sk("div", { className: "sk_secBanner" }, skT(lang, "srv.all.never"));
    }
    else if (allScan.status === "failed") banner = sk("div", { className: "sk_secBanner", "data-kind": "failed" }, skT(lang, "srv.failed"));
    else if (allScan.status === "cancelled") banner = sk("div", { className: "sk_secBanner", "data-kind": "cancelled" }, skT(lang, "srv.cancelled"));
    else if (allScan.complete !== true) banner = sk("div", { className: "sk_secBanner", "data-kind": "partial" }, skT(lang, "srv.partial"));
    else if (allData.allPassed === true) banner = sk("div", { className: "sk_secBanner", "data-kind": "passed" }, skT(lang, "srv.all.passed"));
    else {
      banner = sk("div", { className: "sk_secBanner", "data-kind": "partial" }, skT(lang, "srv.all.failed", {
        passed: String(allData.counts !== undefined ? allData.counts.passed : 0),
        total: String(allData.counts !== undefined ? allData.counts.total : allItems.length),
        failed: String((allData.counts !== undefined ? allData.counts.total : allItems.length) - (allData.counts !== undefined ? allData.counts.passed : 0))
      }));
    }
  }
  else if (phase === "PARTIAL") banner = sk("div", { className: "sk_secBanner", "data-kind": "partial" }, skT(lang, "srv.partial"));
  else if (phase === "FAILED") banner = sk("div", { className: "sk_secBanner", "data-kind": "failed" }, skT(lang, "srv.failed"));
  else if (phase === "CANCELLED") banner = sk("div", { className: "sk_secBanner", "data-kind": "cancelled" }, skT(lang, "srv.cancelled"));
  else if (phase === "BLOCKED") banner = sk("div", { className: "sk_secBanner", "data-kind": "blocked" }, skT(lang, "srv.blockedHint"));

  var footer = [];
  footer.push(sk("span", { className: "sk_srFootState", "data-sev": skReviewBadge(phase) }, stateLabel));
  if (globalMode) {
    if (phase === "SCANNING") {
      footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: cancelScan }, skT(lang, "srv.scan.cancel")));
    }
    else {
      footer.push(sk("button", { className: "sk_secPrimary", type: "button", disabled: allLoading, onClick: function () { startScan("full"); } }, skT(lang, "srv.all.button")));
      if (allData !== null && allData !== undefined) footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: downloadReport }, skT(lang, "srv.action.report")));
      if (batchable === true) {
        footer.push(sk("button", { className: "sk_secPrimary", type: "button", disabled: busy !== "", onClick: passAll }, skT(lang, allData !== null && allData !== undefined && allData.allPassed === true ? "srv.all.pass" : "srv.all.passLow")));
      }
    }
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: close }, skT(lang, "srv.action.close")));
  }
  else if (name === "" && phase === "IDLE") {
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: close }, skT(lang, "srv.action.close")));
  } else if (phase === "IDLE" || phase === "SCANNING" || phase === "FAILED" || phase === "CANCELLED" || phase === "PARTIAL") {
    if (phase === "SCANNING") footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: cancelScan }, skT(lang, "srv.scan.cancel")));
    else footer.push(sk("button", { className: "sk_secPrimary", type: "button", disabled: busy !== "", onClick: function () { startScan("quick"); } }, skT(lang, "srv.action.rescan")));
    footer.push(sk("button", { className: "sk_secPrimary", type: "button", disabled: phase === "SCANNING" || busy !== "", onClick: function () { startScan("full"); } }, skT(lang, "srv.action.full")));
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: close }, skT(lang, "srv.action.back")));
  } else if (phase === "PASSED") {
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: downloadReport }, skT(lang, "srv.action.report")));
    footer.push(sk("button", { className: "sk_secPrimary", type: "button", onClick: continueAction }, skT(lang, "srv.action.continue")));
  } else if (phase === "WARNING") {
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: showDetails }, skT(lang, "srv.action.details")));
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: downloadReport }, skT(lang, "srv.action.report")));
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: close }, skT(lang, "srv.action.back")));
    footer.push(sk("button", { className: "sk_secPrimary", type: "button", onClick: continueAction }, skT(lang, "srv.action.acknowledge")));
  } else if (phase === "BLOCKED") {
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: showDetails }, skT(lang, "srv.action.details")));
    if (acceptable.length > 0 && !critical) {
      footer.push(sk("button", { className: "sk_textBtn", type: "button", disabled: busy !== "", onClick: accept }, skT(lang, "srv.action.authorize")));
    }
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: close }, skT(lang, critical ? "srv.action.manager" : "srv.action.back")));
  } else {
    footer.push(sk("button", { className: "sk_textBtn", type: "button", onClick: close }, skT(lang, "srv.action.back")));
  }

  return sk("div", { className: "sk_secScrim", onClick: close }, [
    sk("div", { className: "sk_secPanel sk_srPanel", role: "dialog", "aria-modal": "true", "aria-label": skT(lang, "srv.title"), ref: panelRef, onClick: function (event) { event.stopPropagation(); } }, [
      sk("header", { className: "sk_secHead" }, [
        sk("div", { className: "sk_secHeadText" }, [
          sk("div", { className: "sk_secTitleRow" }, [
            sk("h2", { className: "sk_secTitle" }, skT(lang, globalMode ? "srv.all.title" : "srv.title")),
            sk("span", { className: "sk_secBadge", "data-sev": skReviewBadge(phase) }, stateLabel)
          ]),
          sk("p", { className: "sk_secSub" }, skT(lang, globalMode ? "srv.all.sub" : "srv.sub")),
          sk("p", { className: "sk_secMeta" }, globalMode ? [
            sk("span", null, allData !== null && allData !== undefined && allData.lastScan !== null && allData.lastScan !== undefined ? skT(lang, "srv.all.last", { time: lastAt }) : skT(lang, "srv.all.never")),
            allItems.length > 0 ? " · " + skT(lang, "srv.metric.skills") + " " + String(allItems.length) : null
          ] : [
            sk("span", null, name !== "" ? name : (phase === "BLOCKED" ? skT(lang, "srv.pending") : skT(lang, "srv.select"))),
            sourceLabel !== "" ? " · " + skT(lang, "srv.source", { source: sourceLabel }) : null,
            hash !== "" ? " · " + skT(lang, "srv.hash", { hash: skClip(hash, 24) }) : null,
            lastAt !== "" ? " · " + lastAt : null
          ])
        ]),
        sk("button", { className: "sk_closeBtn", type: "button", onClick: close, "aria-label": skT(lang, "srv.action.close") }, "✕")
      ]),
      sk("div", { className: "sk_srBody" }, [
        !globalMode && name === "" && phase === "IDLE" ? sk("div", { className: "sk_srPicker" }, [
          sk("label", null, skT(lang, "srv.select")),
          sk("select", {
            className: "sk_select",
            value: "",
            onChange: function (event) {
              if (event.target.value === "") return;
              setName(event.target.value);
              setSkill({ name: event.target.value, source: null });
            }
          }, [sk("option", { value: "" }, skT(lang, "srv.select"))].concat(skills.map(function (row) {
            return sk("option", { value: row.name, key: row.name }, row.name);
          })))
        ]) : null,
        sk("div", { className: "sk_secControls" }, globalMode ? [
          sk("button", { className: "sk_secPrimary", type: "button", disabled: phase === "SCANNING" || allLoading, onClick: function () { startScan("full"); } }, skT(lang, "srv.all.button")),
          allData !== null && allData !== undefined ? sk("button", { className: "sk_textBtn", type: "button", disabled: phase === "SCANNING" || allLoading, onClick: function () { startScan("full"); } }, skT(lang, "srv.action.rescan")) : null,
          allData !== null && allData !== undefined ? sk("button", { className: "sk_textBtn", type: "button", onClick: downloadReport }, skT(lang, "srv.action.report")) : null
        ] : [
          sk("button", { className: "sk_secPrimary", type: "button", disabled: phase === "SCANNING" || busy !== "" || name === "" || reviewable === false, onClick: function () { startScan("quick"); } }, skT(lang, "srv.action.quick")),
          sk("button", { className: "sk_textBtn", type: "button", disabled: phase === "SCANNING" || busy !== "" || name === "" || reviewable === false, onClick: function () { startScan("full"); } }, skT(lang, "srv.action.full")),
          sk("button", { className: "sk_textBtn", type: "button", disabled: phase === "SCANNING" || busy !== "" || name === "" || reviewable === false, onClick: function () { startScan("quick"); } }, skT(lang, "srv.action.rescan")),
          review !== null && review !== undefined ? sk("button", { className: "sk_textBtn", type: "button", onClick: downloadReport }, skT(lang, "srv.action.report")) : null
        ]),
        phase === "IDLE" && name !== "" ? sk("p", { className: "sk_secLoading" }, skT(lang, "srv.idleHint")) : null,
        progress,
        banner,
        error !== "" ? sk("div", { className: "sk_secError", role: "alert" }, error) : null,
        sk("div", { className: "sk_srStats" }, stats),
        sk("div", { className: "sk_srMetrics" }, metrics),
        globalMode ? [
          sk("div", { className: "sk_secLabel" }, skT(lang, "srv.all.title")),
          allRows.length === 0
            ? sk("div", { className: "sk_secEmpty" }, [
              sk("strong", null, skT(lang, "srv.all.empty")),
              sk("span", null, skT(lang, "srv.all.never"))
            ])
            : sk("div", { className: "sk_srAllList" }, allRows)
        ] : [
          sk("div", { className: "sk_secLabel" }, skT(lang, "srv.checks.title")),
          sk("div", { className: "sk_srChecks" }, checkRows),
          sk("div", { className: "sk_secListHead" }, skT(lang, "srv.findings.title", { count: String(findings.length) })),
          findings.length === 0
            ? sk("div", { className: "sk_secEmpty" }, [
              sk("strong", null, phase === "PASSED" ? skT(lang, "srv.findings.empty") : skT(lang, "srv.findings.none")),
              sk("span", null, phase === "PASSED" ? skT(lang, "srv.cached") : skT(lang, "srv.idleHint"))
            ])
            : sk("div", { className: "sk_secList" }, findingRows)
        ],
        sk("p", { className: "sk_secNote" }, skT(lang, "sec.note"))
      ]),
      sk("footer", { className: "sk_srFoot" }, footer)
    ])
  ]);
}

if (typeof window !== "undefined" && window.__DSH_CHARLOTTE_TEST__ === true && window.__skTest !== undefined) {
  window.__skTest.skSecurityReview = SkSecurityReview;
  window.__skTest.skReviewInitialPhase = skReviewInitialPhase;
  window.__skTest.skReviewSummary = skReviewSummary;
  window.__skTest.skReviewCheck = skReviewCheck;
  window.__skTest.skReviewAllPhase = skReviewAllPhase;
  window.__skTest.skReviewAllSummary = skReviewAllSummary;
}

// #endregion
