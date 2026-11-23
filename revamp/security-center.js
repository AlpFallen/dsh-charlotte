// #region dsh-charlotte security center — real scan status, findings and fixes
//
// The modal is a view over /charlotte/api/security/*. It never decides whether
// something is safe: counts, severities and statuses come from the scanner and
// from the persisted finding states. Actions that mutate a file are previewed
// and confirmed before the host is asked to apply them.

var SK_SECURITY_STRINGS = {
  zh: {
    "more.security": "安全中心",
    "sec.title": "DSH 安全中心",
    "sec.sub": "对技能、挂载目录、配置、API 与 ZIP 导入做只读规则审计",
    "sec.status.clean": "未发现风险",
    "sec.status.info": "仅供参考",
    "sec.status.low": "低风险",
    "sec.status.medium": "中风险",
    "sec.status.high": "高风险",
    "sec.status.critical": "严重风险",
    "sec.status.scanning": "扫描中",
    "sec.lastCheck": "最后检查：{time}",
    "sec.never": "尚未扫描",
    "sec.quick": "快速扫描",
    "sec.full": "完整审计",
    "sec.rescan": "重新扫描",
    "sec.cancel": "取消扫描",
    "sec.export": "导出报告",
    "sec.scan.running": "正在扫描",
    "sec.scan.phase.collecting": "收集检查对象",
    "sec.scan.phase.scanning": "检查中",
    "sec.scan.phase.finalizing": "汇总结果",
    "sec.scan.phase.done": "已完成",
    "sec.scan.current": "当前：{target}",
    "sec.scan.progress": "已完成 {done} / {total}",
    "sec.scan.elapsed": "耗时 {seconds} 秒",
    "sec.cancel.requested": "已请求取消，等待当前文件检查结束",
    "sec.partial": "本次结果不完整（partial）：部分对象未检查或读取失败，不能当作完整审计。",
    "sec.failed": "本次扫描失败（failed），请查看错误后重试。",
    "sec.cancelled": "扫描已取消，结果未完成。",
    "sec.error": "安全接口失败：{reason}",
    "sec.summary.critical": "严重",
    "sec.summary.high": "高",
    "sec.summary.medium": "中",
    "sec.summary.low": "低",
    "sec.summary.info": "提示",
    "sec.summary.blocked": "已阻止",
    "sec.summary.unresolved": "未解决",
    "sec.filter.severity": "风险级别",
    "sec.filter.category": "类别",
    "sec.filter.status": "状态",
    "sec.filter.all": "全部",
    "sec.filter.search": "搜索规则 ID、标题或路径",
    "sec.empty.title": "当前筛选下没有发现问题",
    "sec.empty.hint": "换一个筛选条件，或运行一次完整审计。",
    "sec.loading": "正在读取安全检查结果…",
    "sec.findings": "问题列表（{count}）",
    "sec.finding.detectedAt": "检测于 {time}",
    "sec.finding.explain": "技术说明",
    "sec.finding.evidence": "证据",
    "sec.finding.resource": "受影响对象",
    "sec.finding.impact": "安全影响",
    "sec.finding.attack": "攻击场景",
    "sec.finding.fix": "修复建议",
    "sec.finding.references": "参考",
    "sec.finding.status": "处理状态",
    "sec.finding.confidence": "置信度：{value}",
    "sec.status.detected": "待处理",
    "sec.status.blocked": "已阻止",
    "sec.status.fixed": "已修复",
    "sec.status.accepted": "已接受风险",
    "sec.status.reviewed": "已复核",
    "sec.status.unresolved": "未解决",
    "sec.action.source": "查看源码",
    "sec.action.copy": "复制问题",
    "sec.action.rescan": "重扫此对象",
    "sec.action.fix": "安全修复",
    "sec.action.review": "标记已复核",
    "sec.action.accept": "接受风险",
    "sec.action.reopen": "重新打开",
    "sec.action.close": "关闭",
    "sec.action.confirmFix": "确认修复",
    "sec.action.cancelFix": "取消",
    "sec.accept.onlyHigh": "只有 HIGH / MEDIUM 风险可以接受；CRITICAL 必须先修复。",
    "sec.accept.done": "已记录授权。接受不等于修复。",
    "sec.review.done": "已标记为已复核。",
    "sec.reopen.done": "已重新打开。",
    "sec.fix.preview": "安全修复预览",
    "sec.fix.removed": "将移除 {count} 个不可见字符",
    "sec.fix.before": "修改前",
    "sec.fix.after": "修改后",
    "sec.fix.applied": "修复已应用并已记录为 fixed。",
    "sec.fix.failed": "修复未应用：{reason}",
    "sec.source.loading": "正在读取源码…",
    "sec.source.failed": "无法读取源码：{reason}",
    "sec.source.redacted": "证据中的凭据已脱敏。",
    "sec.copy.done": "已复制到剪贴板。",
    "sec.copy.failed": "复制失败。",
    "sec.export.done": "报告已导出。",
    "sec.export.failed": "导出失败：{reason}",
    "sec.export.partial": "报告会明确标注扫描不完整。",
    "sec.scope": "扫描范围：{count} 个对象",
    "sec.neverRun": "还没有运行过扫描。首次打开会启动一次快速扫描。",
    "sec.unknown": "未知",
    "sec.facts.routes": "API 路由 {count} 个，其中变更路由 {mutating} 个",
    "sec.facts.catalog": "规则 {count} 条",
    "sec.accepted": "已接受风险 {count} 个",
    "sec.note": "规则命中只说明需要审查，不等于恶意；未命中也不证明安全。修复动作必须经过预览与确认。"
  },
  en: {
    "more.security": "Security center",
    "sec.title": "DSH Security Center",
    "sec.sub": "Read-only rule audit for skills, mounts, config, API and ZIP imports",
    "sec.status.clean": "No risk found",
    "sec.status.info": "Informational",
    "sec.status.low": "Low risk",
    "sec.status.medium": "Medium risk",
    "sec.status.high": "High risk",
    "sec.status.critical": "Critical risk",
    "sec.status.scanning": "Scanning",
    "sec.lastCheck": "Last check: {time}",
    "sec.never": "Never scanned",
    "sec.quick": "Quick scan",
    "sec.full": "Full audit",
    "sec.rescan": "Rescan",
    "sec.cancel": "Cancel scan",
    "sec.export": "Export report",
    "sec.scan.running": "Scanning",
    "sec.scan.phase.collecting": "Collecting targets",
    "sec.scan.phase.scanning": "Checking",
    "sec.scan.phase.finalizing": "Summarising",
    "sec.scan.phase.done": "Done",
    "sec.scan.current": "Current: {target}",
    "sec.scan.progress": "{done} / {total} done",
    "sec.scan.elapsed": "{seconds}s elapsed",
    "sec.cancel.requested": "Cancellation requested; waiting for the current file to finish",
    "sec.partial": "This result is partial: some objects were skipped or unreadable and it is not a complete audit.",
    "sec.failed": "The scan failed. Review the error and retry.",
    "sec.cancelled": "The scan was cancelled before it finished.",
    "sec.error": "Security endpoint failed: {reason}",
    "sec.summary.critical": "Critical",
    "sec.summary.high": "High",
    "sec.summary.medium": "Medium",
    "sec.summary.low": "Low",
    "sec.summary.info": "Info",
    "sec.summary.blocked": "Blocked",
    "sec.summary.unresolved": "Unresolved",
    "sec.filter.severity": "Severity",
    "sec.filter.category": "Category",
    "sec.filter.status": "Status",
    "sec.filter.all": "All",
    "sec.filter.search": "Search rule id, title or path",
    "sec.empty.title": "No findings under this filter",
    "sec.empty.hint": "Change the filters, or run a full audit.",
    "sec.loading": "Loading security results…",
    "sec.findings": "Findings ({count})",
    "sec.finding.detectedAt": "Detected {time}",
    "sec.finding.explain": "Technical explanation",
    "sec.finding.evidence": "Evidence",
    "sec.finding.resource": "Affected resource",
    "sec.finding.impact": "Security impact",
    "sec.finding.attack": "Attack scenario",
    "sec.finding.fix": "Recommended fix",
    "sec.finding.references": "References",
    "sec.finding.status": "Remediation status",
    "sec.finding.confidence": "Confidence: {value}",
    "sec.status.detected": "Open",
    "sec.status.blocked": "Blocked",
    "sec.status.fixed": "Fixed",
    "sec.status.accepted": "Risk accepted",
    "sec.status.reviewed": "Reviewed",
    "sec.status.unresolved": "Unresolved",
    "sec.action.source": "View source",
    "sec.action.copy": "Copy finding",
    "sec.action.rescan": "Rescan target",
    "sec.action.fix": "Apply safe fix",
    "sec.action.review": "Mark reviewed",
    "sec.action.accept": "Accept risk",
    "sec.action.reopen": "Reopen",
    "sec.action.close": "Close",
    "sec.action.confirmFix": "Confirm fix",
    "sec.action.cancelFix": "Cancel",
    "sec.accept.onlyHigh": "Only HIGH / MEDIUM findings can be accepted; CRITICAL must be fixed.",
    "sec.accept.done": "Authorization recorded. Accepting is not fixing.",
    "sec.review.done": "Marked as reviewed.",
    "sec.reopen.done": "Reopened.",
    "sec.fix.preview": "Safe fix preview",
    "sec.fix.removed": "{count} invisible characters will be removed",
    "sec.fix.before": "Before",
    "sec.fix.after": "After",
    "sec.fix.applied": "Fix applied and recorded as fixed.",
    "sec.fix.failed": "Fix not applied: {reason}",
    "sec.source.loading": "Loading source…",
    "sec.source.failed": "Cannot read source: {reason}",
    "sec.source.redacted": "Credentials in the evidence are redacted.",
    "sec.copy.done": "Copied to the clipboard.",
    "sec.copy.failed": "Copy failed.",
    "sec.export.done": "Report exported.",
    "sec.export.failed": "Export failed: {reason}",
    "sec.export.partial": "The report states explicitly when the scan is incomplete.",
    "sec.scope": "Scope: {count} objects",
    "sec.neverRun": "No scan has run yet. The first open starts a quick scan.",
    "sec.unknown": "unknown",
    "sec.facts.routes": "{count} API routes, {mutating} mutating",
    "sec.facts.catalog": "{count} rules",
    "sec.accepted": "{count} accepted risks",
    "sec.note": "A rule hit means review is needed, not that the skill is malicious; a miss is not proof of safety. Fixes always require a preview and confirmation."
  }
};

(function mergeSecurityStrings() {
  for (var lang in SK_SECURITY_STRINGS) {
    if (!Object.prototype.hasOwnProperty.call(SK_SECURITY_STRINGS, lang)) continue;
    Object.assign(SK_STRINGS[lang], SK_SECURITY_STRINGS[lang]);
  }
})();

var skSecurityPromptListeners = [];

/**
 * Subscribe to "a blocked operation should open the Security Center" events.
 * @param {Function} listener - called with the blocked result.
 * @returns {Function} unsubscribe.
 */
function skSecurityPromptSubscribe(listener) {
  if (typeof listener !== "function") return function () {};
  skSecurityPromptListeners.push(listener);
  return function () {
    var index = skSecurityPromptListeners.indexOf(listener);
    if (index >= 0) skSecurityPromptListeners.splice(index, 1);
  };
}

/**
 * Ask the shell to open the Security Center after a blocked operation.
 * @param {object} detail - optional blocked response.
 */
function skOpenSecurityCenter(detail) {
  for (var index = 0; index < skSecurityPromptListeners.length; index += 1) {
    try {
      skSecurityPromptListeners[index](detail ?? null);
    } catch (error) {
      // Opening a modal must never break the install flow.
    }
  }
}

/**
 * Normalize the counts from a status payload. Missing values become zero rather
 * than a demo number.
 * @param {object} status - /security/status payload.
 * @returns {object} counts plus worst severity.
 */
function skSecurityCounts(status) {
  var summary = status !== null && typeof status === "object" && status.summary !== null && typeof status.summary === "object" ? status.summary : {};
  var out = {
    critical: Number(summary.critical) || 0,
    high: Number(summary.high) || 0,
    medium: Number(summary.medium) || 0,
    low: Number(summary.low) || 0,
    info: Number(summary.info) || 0,
    blocked: Number(summary.blocked) || 0,
    unresolved: Number(summary.unresolved) || 0
  };
  out.worst = out.critical > 0 ? "CRITICAL" : out.high > 0 ? "HIGH" : out.medium > 0 ? "MEDIUM" : out.low > 0 ? "LOW" : out.info > 0 ? "INFO" : "CLEAN";
  return out;
}

/**
 * Filter findings for the modal. Pure so the client smoke test can exercise it.
 * @param {Array<object>} findings - findings.
 * @param {object} filters - severity/category/status/query.
 * @returns {Array<object>} filtered findings.
 */
function skSecurityFilter(findings, filters) {
  var settings = filters ?? {};
  var query = String(settings.query ?? "").trim().toLowerCase();
  return (findings ?? []).filter(function (finding) {
    if (settings.severity && settings.severity !== "all" && finding.severity !== settings.severity) return false;
    if (settings.category && settings.category !== "all" && finding.category !== settings.category) return false;
    if (settings.status && settings.status !== "all" && finding.status !== settings.status) return false;
    if (query === "") return true;
    var blob = [finding.ruleId, finding.title, finding.titleZh, finding.filePath, finding.target].join(" ").toLowerCase();
    return blob.indexOf(query) !== -1;
  });
}

/**
 * Human labels for confidence.
 * @param {string} confidence - confidence id.
 * @returns {string} en label.
 */
function skSecurityConfidence(confidence) {
  if (confidence === "certain") return "certain";
  if (confidence === "likely") return "likely";
  if (confidence === "possible") return "possible";
  return "heuristic";
}

/**
 * Localized finding field.
 * @param {object} finding - finding.
 * @param {string} field - base field name.
 * @param {string} lang - language.
 * @returns {string} text.
 */
function skSecField(finding, field, lang) {
  var localized = finding[field + "Zh"];
  if (lang === "zh" && typeof localized === "string" && localized !== "") return localized;
  var value = finding[field];
  return typeof value === "string" ? value : "";
}

/** Severity label key. */
function skSecSeverityKey(severity) {
  return "sec.status." + String(severity ?? "info").toLowerCase();
}

/** Status label key. */
function skSecStatusKey(status) {
  return "sec.status." + (status ?? "detected");
}

/**
 * Security Center modal.
 * @param {{workspace: string, lang: 'zh'|'en', onClose: Function}} props - props.
 * @returns {object} modal element.
 */
function SkSecurityCenter(props) {
  var lang = props.lang;
  var dataState = (0, import_react.useState)(null);
  var data = dataState[0];
  var setData = dataState[1];
  var errorState = (0, import_react.useState)("");
  var error = errorState[0];
  var setError = errorState[1];
  var loadingState = (0, import_react.useState)(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];
  var busyState = (0, import_react.useState)("");
  var busy = busyState[0];
  var setBusy = busyState[1];
  var filterState = (0, import_react.useState)({ severity: "all", category: "all", status: "all", query: "" });
  var filters = filterState[0];
  var setFilters = filterState[1];
  var expandedState = (0, import_react.useState)({});
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];
  var sourceState = (0, import_react.useState)(null);
  var source = sourceState[0];
  var setSource = sourceState[1];
  var previewState = (0, import_react.useState)(null);
  var preview = previewState[0];
  var setPreview = previewState[1];
  var panelRef = (0, import_react.useRef)(null);
  var loadSeq = (0, import_react.useRef)(0);
  var sourceSeq = (0, import_react.useRef)(0);

  var load = (0, import_react.useCallback)(function () {
    loadSeq.current += 1;
    var seq = loadSeq.current;
    var statusPath = "/security/status" + (props.workspace !== "" ? "?workspace=" + encodeURIComponent(props.workspace) : "");
    return skCall(statusPath).then(function (result) {
      if (seq !== loadSeq.current) return;
      if (result.ok) {
        setData(result.body);
        setError("");
      } else {
        setError(skT(lang, "sec.error", { reason: skApiError(result) }));
      }
    }).catch(function (reason) {
      if (seq !== loadSeq.current) return;
      setError(skT(lang, "sec.error", { reason: String(reason) }));
    }).finally(function () {
      if (seq !== loadSeq.current) return;
      setLoading(false);
    });
  }, [lang, props.workspace]);

  (0, import_react.useEffect)(function () {
    void load();
  }, [load]);

  var running = data !== null && data.running === true;
  (0, import_react.useEffect)(function () {
    if (running !== true) return undefined;
    var timer = window.setInterval(function () {
      void load();
    }, 800);
    return function () {
      window.clearInterval(timer);
    };
  }, [running, load]);

  (0, import_react.useEffect)(function () {
    return skTrapFocus(panelRef.current);
  }, []);

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

  var call = function (path, body, label) {
    setBusy(label);
    setError("");
    return skCall(path, { method: "POST", body: body }).then(function (result) {
      if (!result.ok) {
        setError(skApiError(result));
        return result;
      }
      return result;
    }).catch(function (reason) {
      setError(String(reason));
      return { ok: false, body: {} };
    }).finally(function () {
      setBusy("");
      void load();
    });
  };

  var startScan = function (mode) {
    if (running) return;
    void call("/security/scan", { mode: mode, workspace: props.workspace }, "scan");
  };

  var cancelScan = function () {
    if (!running) return;
    void call("/security/cancel", {}, "cancel");
  };

  var exportReport = function () {
    setBusy("export");
    void skCall("/security/report").then(function (result) {
      if (!result.ok || result.body.report === undefined) {
        setError(skT(lang, "sec.export.failed", { reason: skApiError(result) }));
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
      } catch (reason) {
        setError(skT(lang, "sec.export.failed", { reason: String(reason) }));
      }
    }).finally(function () {
      setBusy("");
    });
  };

  var acceptFinding = function (finding) {
    if (finding.severity === "CRITICAL") {
      setError(skT(lang, "sec.accept.onlyHigh"));
      return;
    }
    void call("/security/finding", { action: "accept", key: finding.id, keys: [finding.id], reason: "", target: finding.target }, "accept").then(function (result) {
      if (result !== null && result.ok) setError(skT(lang, "sec.accept.done"));
    });
  };

  var reviewFinding = function (finding) {
    void call("/security/finding", { action: "review", key: finding.id }, "review").then(function (result) {
      if (result !== null && result.ok) setError(skT(lang, "sec.review.done"));
    });
  };

  var reopenFinding = function (finding) {
    void call("/security/finding", { action: "reopen", key: finding.id }, "reopen").then(function (result) {
      if (result !== null && result.ok) setError(skT(lang, "sec.reopen.done"));
    });
  };

  var rescanFinding = function (finding) {
    if (running) return;
    var target;
    if (typeof finding.target === "string" && finding.target.indexOf("skill:") === 0) {
      target = { name: finding.target.slice("skill:".length) };
    }
    void call("/security/scan", { mode: "quick", workspace: props.workspace, target: target }, "rescan");
  };

  var copyFinding = function (finding) {
    var text = JSON.stringify(finding, null, 2);
    try {
      if (typeof navigator === "undefined" || navigator.clipboard === undefined || typeof navigator.clipboard.writeText !== "function") {
        setError(skT(lang, "sec.copy.failed"));
        return;
      }
      void navigator.clipboard.writeText(text).then(function () {
        setError(skT(lang, "sec.copy.done"));
      }).catch(function () {
        setError(skT(lang, "sec.copy.failed"));
      });
    } catch (reason) {
      setError(skT(lang, "sec.copy.failed"));
    }
  };

  var viewSource = function (finding) {
    if (typeof finding.filePath !== "string" || finding.filePath === "") {
      setError(skT(lang, "sec.source.failed", { reason: "no file path" }));
      return;
    }
    // Bundle-relative paths are ambiguous across skills; send the absolute
    // path captured at scan time when the finding carries one.
    var path = finding.filePath;
    var absolute = typeof finding.evidence?.absolutePath === "string" ? finding.evidence.absolutePath : "";
    var requestPath = absolute !== "" ? absolute : path;
    sourceSeq.current += 1;
    var seq = sourceSeq.current;
    setSource({ findingId: finding.id, path: path, requestPath: requestPath, resolvedPath: path, line: finding.line ?? 1, content: "", loading: true });
    var line = finding.line ?? 1;
    void skCall("/security/source?path=" + encodeURIComponent(requestPath) + "&line=" + encodeURIComponent(String(line))).then(function (result) {
      if (seq !== sourceSeq.current) return;
      if (!result.ok) {
        setSource({ findingId: finding.id, path: path, requestPath: requestPath, line: line, content: "", error: skApiError(result) });
        return;
      }
      setSource({ findingId: finding.id, path: path, requestPath: requestPath, resolvedPath: result.body.path ?? requestPath, line: result.body.line ?? line, content: result.body.content ?? "", redacted: result.body.redacted === true });
    }).catch(function (reason) {
      if (seq !== sourceSeq.current) return;
      setSource({ findingId: finding.id, path: path, requestPath: requestPath, line: line, content: "", error: String(reason) });
    });
  };

  var previewFix = function (finding) {
    setBusy("fix");
    setError("");
    void skCall("/security/fix/preview", { method: "POST", body: { key: finding.id } }).then(function (result) {
      if (!result.ok) {
        setError(skT(lang, "sec.fix.failed", { reason: skApiError(result) }));
        return;
      }
      setPreview(result.body);
    }).finally(function () {
      setBusy("");
    });
  };

  var applyFix = function () {
    if (preview === null) return;
    setBusy("fix-apply");
    void skCall("/security/fix/apply", {
      method: "POST",
      body: { key: preview.key, expectedHash: preview.hash, confirm: true }
    }).then(function (result) {
      if (!result.ok) {
        setError(skT(lang, "sec.fix.failed", { reason: skApiError(result) }));
        return;
      }
      setPreview(null);
      setError(skT(lang, "sec.fix.applied"));
    }).finally(function () {
      setBusy("");
      void load();
    });
  };

  var counts = skSecurityCounts(data);
  var findings = skSecurityFilter(data === null ? [] : data.findings, filters);
  var categories = [];
  (data === null ? [] : data.findings ?? []).forEach(function (finding) {
    if (categories.indexOf(finding.category) === -1) categories.push(finding.category);
  });
  categories.sort();
  var lastScan = data === null ? null : data.lastScan;
  var hasAnyFinding = data !== null && Array.isArray(data.findings) && data.findings.length > 0;
  var neverScanned = lastScan === null && hasAnyFinding === false;
  var overall = running ? "SCANNING" : neverScanned ? "INFO" : counts.worst;
  var overallLabel = running
    ? skT(lang, "sec.status.scanning")
    : neverScanned ? skT(lang, "sec.never") : skT(lang, counts.worst === "CLEAN" ? "sec.status.clean" : skSecSeverityKey(counts.worst));
  var lastTime = lastScan !== null && lastScan !== undefined && Number(lastScan.at) > 0 ? skTime(lastScan.at) : skT(lang, "sec.never");

  var summaryRow = [
    ["critical", "sec.summary.critical", counts.critical],
    ["high", "sec.summary.high", counts.high],
    ["medium", "sec.summary.medium", counts.medium],
    ["low", "sec.summary.low", counts.low],
    ["info", "sec.summary.info", counts.info],
    ["blocked", "sec.summary.blocked", counts.blocked],
    ["unresolved", "sec.summary.unresolved", counts.unresolved]
  ].map(function (row) {
    return sk("div", { className: "sk_secStat", "data-sev": row[0] }, [
      sk("span", { className: "sk_secStatValue" }, String(row[2])),
      sk("span", { className: "sk_secStatLabel" }, skT(lang, row[1]))
    ], row[0]);
  });

  var progress = null;
  if (running && data.run !== null && data.run !== undefined) {
    var runData = data.run;
    var percent = runData.total > 0 ? Math.min(100, Math.round((runData.done / runData.total) * 100)) : 0;
    progress = sk("div", { className: "sk_secProgress" }, [
      sk("div", { className: "sk_secProgressHead" }, [
        sk("span", { className: "sk_secProgressPhase" }, skT(lang, "sec.scan.phase." + String(runData.phase ?? "scanning"))),
        sk("span", { className: "sk_secProgressCount" }, skT(lang, "sec.scan.progress", { done: String(runData.done), total: String(runData.total) })),
        sk("span", { className: "sk_secProgressElapsed" }, skT(lang, "sec.scan.elapsed", { seconds: String(Math.max(0, Math.round((runData.elapsedMs ?? 0) / 1000))) }))
      ]),
      sk("div", { className: "sk_secBar" }, [
        sk("div", { className: "sk_secBarFill", style: { width: String(runData.total > 0 ? percent : 6) + "%" } })
      ]),
      runData.current !== "" ? sk("div", { className: "sk_secProgressCurrent" }, skT(lang, "sec.scan.current", { target: skClip(runData.current, 120) })) : null
    ]);
  }

  var banner = null;
  if (lastScan !== null && lastScan !== undefined && lastScan.status !== "complete") {
    var bannerKey = lastScan.status === "failed" ? "sec.failed" : lastScan.status === "cancelled" ? "sec.cancelled" : "sec.partial";
    banner = sk("div", { className: "sk_secBanner", "data-kind": lastScan.status }, skT(lang, bannerKey));
  }

  var findingRow = function (finding) {
    var isOpen = expanded[finding.id] === true;
    var title = skSecField(finding, "title", lang) || finding.ruleId;
    var description = skSecField(finding, "description", lang);
    var detail = null;
    if (isOpen) {
      var evidenceText = "";
      try {
        evidenceText = JSON.stringify(finding.evidence ?? {}, null, 2);
      } catch (reason) {
        evidenceText = String(finding.evidence ?? "");
      }
      detail = sk("div", { className: "sk_secDetail" }, [
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.finding.explain")),
          sk("p", { className: "sk_secFieldText" }, description)
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.finding.evidence")),
          sk("pre", { className: "sk_secEvidence" }, evidenceText)
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.finding.resource")),
          sk("p", { className: "sk_secFieldText" }, (finding.filePath ?? finding.target ?? "") + (finding.line ? ":" + String(finding.line) : ""))
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.finding.impact")),
          sk("p", { className: "sk_secFieldText" }, skSecField(finding, "impact", lang))
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.finding.attack")),
          sk("p", { className: "sk_secFieldText" }, skSecField(finding, "attackScenario", lang))
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.finding.fix")),
          sk("p", { className: "sk_secFieldText" }, skSecField(finding, "remediation", lang))
        ]),
        sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.finding.status")),
          sk("p", { className: "sk_secFieldText" }, skT(lang, skSecStatusKey(finding.status)) + " · " + skT(lang, "sec.finding.confidence", { value: skSecurityConfidence(finding.confidence) }))
        ]),
        Array.isArray(finding.references) && finding.references.length > 0 ? sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.finding.references")),
          sk("div", { className: "sk_secRefs" }, finding.references.map(function (url) {
            return sk("a", { className: "sk_secRef", href: url, target: "_blank", rel: "noreferrer noopener" }, url, url);
          }))
        ]) : null,
        source !== null && source.findingId === finding.id ? sk("div", { className: "sk_secField" }, [
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.action.source")),
          source.loading === true
            ? sk("p", { className: "sk_secFieldText" }, skT(lang, "sec.source.loading"))
            : sk("pre", { className: "sk_secEvidence" }, source.error ? skT(lang, "sec.source.failed", { reason: source.error }) : source.content),
          source !== null && source.redacted === true ? sk("p", { className: "sk_secNote" }, skT(lang, "sec.source.redacted")) : null
        ]) : null,
        preview !== null && preview.key === finding.id ? sk("div", { className: "sk_secFix" }, [
          sk("div", { className: "sk_secFixHead" }, skT(lang, "sec.fix.preview")),
          sk("p", { className: "sk_secNote" }, skT(lang, "sec.fix.removed", { count: String(preview.removed) })),
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.fix.before")),
          sk("pre", { className: "sk_secEvidence" }, preview.before),
          sk("span", { className: "sk_secFieldLabel" }, skT(lang, "sec.fix.after")),
          sk("pre", { className: "sk_secEvidence" }, preview.after),
          sk("div", { className: "sk_secDetailActions" }, [
            sk("button", { className: "sk_secPrimary", type: "button", disabled: busy !== "", onClick: applyFix }, skT(lang, "sec.action.confirmFix")),
            sk("button", { className: "sk_textBtn", type: "button", onClick: function () { setPreview(null); } }, skT(lang, "sec.action.cancelFix"))
          ])
        ]) : null,
        sk("div", { className: "sk_secDetailActions" }, [
          sk("button", { className: "sk_textBtn", type: "button", onClick: function () { viewSource(finding); } }, skT(lang, "sec.action.source")),
          sk("button", { className: "sk_textBtn", type: "button", onClick: function () { copyFinding(finding); } }, skT(lang, "sec.action.copy")),
          sk("button", { className: "sk_textBtn", type: "button", disabled: running || busy !== "", onClick: function () { rescanFinding(finding); } }, skT(lang, "sec.action.rescan")),
          finding.fixable === true ? sk("button", { className: "sk_textBtn", type: "button", disabled: busy !== "", onClick: function () { previewFix(finding); } }, skT(lang, "sec.action.fix")) : null,
          finding.status !== "reviewed" ? sk("button", { className: "sk_textBtn", type: "button", disabled: busy !== "", onClick: function () { reviewFinding(finding); } }, skT(lang, "sec.action.review")) : null,
          (finding.severity === "HIGH" || finding.severity === "MEDIUM") && finding.status !== "accepted" ? sk("button", { className: "sk_textBtn", type: "button", disabled: busy !== "", onClick: function () { acceptFinding(finding); } }, skT(lang, "sec.action.accept")) : null,
          finding.status === "reviewed" || finding.status === "accepted" ? sk("button", { className: "sk_textBtn", type: "button", disabled: busy !== "", onClick: function () { reopenFinding(finding); } }, skT(lang, "sec.action.reopen")) : null
        ])
      ]);
    }
    return sk("div", { className: "sk_secFinding", "data-sev": finding.severity, key: finding.id }, [
      sk("div", {
        className: "sk_secFindingHead",
        role: "button",
        tabIndex: 0,
        "aria-expanded": isOpen ? "true" : "false",
        onClick: function () {
          var next = Object.assign({}, expanded);
          next[finding.id] = !isOpen;
          setExpanded(next);
        },
        onKeyDown: function (event) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          var next = Object.assign({}, expanded);
          next[finding.id] = !isOpen;
          setExpanded(next);
        }
      }, [
        sk("span", { className: "sk_secSev" }, finding.severity),
        sk("span", { className: "sk_secRule" }, finding.ruleId),
        sk("span", { className: "sk_secFindingTitle" }, title),
        sk("span", { className: "sk_secState" }, skT(lang, skSecStatusKey(finding.status))),
        sk("span", { className: "sk_secChevron" }, isOpen ? "▾" : "▸")
      ]),
      sk("div", { className: "sk_secFindingMeta" }, [
        sk("span", { className: "sk_secFindingDesc" }, skClip(description, 220)),
        sk("span", { className: "sk_secPath" }, (finding.filePath ?? "") + (finding.line ? ":" + String(finding.line) : "")),
        sk("span", { className: "sk_secTime" }, skT(lang, "sec.finding.detectedAt", { time: skTime(finding.detectedAt) }))
      ]),
      detail
    ]);
  };

  return sk("div", { className: "sk_secScrim", onClick: props.onClose }, [
    sk("div", {
      className: "sk_secPanel",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": skT(lang, "sec.title"),
      ref: panelRef,
      onClick: function (event) { event.stopPropagation(); }
    }, [
      sk("header", { className: "sk_secHead" }, [
        sk("div", { className: "sk_secHeadText" }, [
          sk("div", { className: "sk_secTitleRow" }, [
            sk("h2", { className: "sk_secTitle" }, skT(lang, "sec.title")),
            sk("span", { className: "sk_secBadge", "data-sev": overall }, overallLabel)
          ]),
          sk("p", { className: "sk_secSub" }, skT(lang, "sec.sub")),
          sk("p", { className: "sk_secMeta" }, skT(lang, "sec.lastCheck", { time: lastTime })
            + (lastScan !== null && lastScan !== undefined && lastScan.scope ? " · " + skT(lang, "sec.scope", { count: String((lastScan.scope ?? []).length) }) : "")
            + (data !== null && Number(data.acceptedCount) > 0 ? " · " + skT(lang, "sec.accepted", { count: String(data.acceptedCount) }) : ""))
        ]),
        sk("button", { className: "sk_closeBtn", type: "button", onClick: props.onClose, "aria-label": skT(lang, "action.close") }, "✕")
      ]),
      sk("div", { className: "sk_secBody" }, [
        sk("div", { className: "sk_secStats" }, summaryRow),
        sk("div", { className: "sk_secControls" }, [
          sk("button", { className: "sk_secPrimary", type: "button", disabled: running || busy !== "", onClick: function () { startScan("quick"); } }, skT(lang, "sec.quick")),
          sk("button", { className: "sk_secPrimary", type: "button", disabled: running || busy !== "", onClick: function () { startScan("full"); } }, skT(lang, "sec.full")),
          sk("button", { className: "sk_textBtn", type: "button", disabled: running || busy !== "", onClick: function () { startScan("quick"); } }, skT(lang, "sec.rescan")),
          sk("button", { className: "sk_textBtn", type: "button", disabled: !running, onClick: cancelScan }, skT(lang, "sec.cancel")),
          sk("button", { className: "sk_textBtn", type: "button", disabled: busy !== "", onClick: exportReport }, skT(lang, "sec.export")),
          data !== null && data.catalog ? sk("span", { className: "sk_secRuleCount" }, skT(lang, "sec.facts.catalog", { count: String(data.catalog.total) })) : null
        ]),
        progress,
        banner,
        error !== "" ? sk("div", { className: "sk_secError", role: "alert" }, error) : null,
        loading ? sk("div", { className: "sk_secLoading" }, skT(lang, "sec.loading")) : null,
        data !== null && data.lastScan === null && running === false && hasAnyFinding === false ? sk("div", { className: "sk_secLoading" }, skT(lang, "sec.neverRun")) : null,
        sk("div", { className: "sk_secFilters" }, [
          sk("div", { className: "sk_secSeg" }, ["all", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map(function (severity) {
            return sk("button", {
              className: "sk_secSegBtn",
              type: "button",
              "data-on": filters.severity === severity ? "" : undefined,
              onClick: function () { setFilters(Object.assign({}, filters, { severity: severity })); }
            }, severity === "all" ? skT(lang, "sec.filter.all") : severity, severity);
          })),
          sk("select", {
            className: "sk_select",
            value: filters.category,
            "aria-label": skT(lang, "sec.filter.category"),
            onChange: function (event) { setFilters(Object.assign({}, filters, { category: event.target.value })); }
          }, [sk("option", { value: "all" }, skT(lang, "sec.filter.category") + "：" + skT(lang, "sec.filter.all"))].concat(categories.map(function (category) {
            return sk("option", { value: category }, category, category);
          }))),
          sk("select", {
            className: "sk_select",
            value: filters.status,
            "aria-label": skT(lang, "sec.filter.status"),
            onChange: function (event) { setFilters(Object.assign({}, filters, { status: event.target.value })); }
          }, [sk("option", { value: "all" }, skT(lang, "sec.filter.status") + "：" + skT(lang, "sec.filter.all"))].concat(["detected", "blocked", "accepted", "reviewed", "fixed", "unresolved"].map(function (status) {
            return sk("option", { value: status }, skT(lang, skSecStatusKey(status)), status);
          }))),
          sk("input", {
            className: "sk_secSearch",
            type: "search",
            value: filters.query,
            placeholder: skT(lang, "sec.filter.search"),
            onChange: function (event) { setFilters(Object.assign({}, filters, { query: event.target.value })); }
          })
        ]),
        sk("div", { className: "sk_secListHead" }, skT(lang, "sec.findings", { count: String(findings.length) })),
        findings.length === 0 && loading === false
          ? sk("div", { className: "sk_secEmpty" }, [
            sk("strong", {}, skT(lang, "sec.empty.title")),
            sk("span", {}, skT(lang, "sec.empty.hint"))
          ])
          : sk("div", { className: "sk_secList" }, findings.map(findingRow)),
        sk("p", { className: "sk_secNote" }, skT(lang, "sec.note"))
      ])
    ])
  ]);
}

// Register the pure helpers for the client smoke test.
if (typeof window !== "undefined" && window.__DSH_CHARLOTTE_TEST__ === true && window.__skTest !== undefined) {
  window.__skTest.skSecurityCounts = skSecurityCounts;
  window.__skTest.skSecurityFilter = skSecurityFilter;
}

// #endregion
