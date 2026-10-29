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
var scanSources = (workspace) => call("/scan", { method: "POST", body: { ...workspace !== "" ? { workspace } : {} } });
var importSkills = (body) => call("/import", { method: "POST", body });
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
function StationApp(props) {
  const [workspaces, setWorkspaces] = (0, import_react.useState)([]);
  const [workspace, setWorkspace] = (0, import_react.useState)("");
  const [tab, setTab] = (0, import_react.useState)("library");
  (0, import_react.useEffect)(() => {
    void fetchRoots().then((r) => {
      if (r.ok) setWorkspaces(r.body.workspaces ?? []);
    });
  }, []);
  const wsParam = workspace;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_tabs", role: "tablist", children: [["library", "\u6280\u80FD\u5E93"], ["import", "\u5BFC\u5165\u6280\u80FD"], ["install", "\u62D6\u62FD\u5B89\u88C5"], ["trash", "\u56DE\u6536\u7AD9"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_tab", "data-on": tab === id ? "true" : void 0, role: "tab", onClick: () => setTab(id), children: label }, id)) }),
    tab !== "trash" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_wsBar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_meta", children: "\u4F5C\u7528\u57DF" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: "ss_select", value: workspace, onChange: (e) => setWorkspace(e.target.value), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5168\u5C40\uFF08\u7528\u6237\u6280\u80FD\uFF09" }),
        workspaces.map((ws) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: ws.path, children: ws.title }, ws.path))
      ] })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_body", children: [
      tab === "library" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LibraryTab, { workspace: wsParam }) : null,
      tab === "import" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImportTab, { workspace: wsParam }) : null,
      tab === "install" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InstallTab, { workspace: wsParam }) : null,
      tab === "trash" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrashTab, {}) : null
    ] })
  ] });
}
function TargetSelector(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_row", style: { justifyContent: "space-between" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: "ss_select", value: props.targetRoot, onChange: (e) => props.onTarget(e.target.value), title: "\u5BFC\u5165\u76EE\u6807", children: [
      GLOBAL_ROOTS.map((root) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: root.id, children: root.label }, root.id)),
      props.workspace !== "" ? [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: `project-dsh:${props.workspace}`, children: "\u9879\u76EE .dsh/skills" }, "project-dsh"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: `project-agents:${props.workspace}`, children: "\u9879\u76EE .agents/skills" }, "project-agents")
      ] : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: "ss_select", style: { flex: "none", width: 120 }, value: props.conflict, onChange: (e) => props.onConflict(e.target.value), title: "\u540C\u540D\u51B2\u7A81\u7B56\u7565", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "skip", children: "\u51B2\u7A81\u8DF3\u8FC7" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "rename", children: "\u51B2\u7A81\u6539\u540D" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "replace", children: "\u51B2\u7A81\u66FF\u6362" })
    ] })
  ] });
}
function LibraryTab(props) {
  const [groups, setGroups] = (0, import_react.useState)([]);
  const [query, setQuery] = (0, import_react.useState)("");
  const [busy, setBusy] = (0, import_react.useState)("");
  const [error, setError] = (0, import_react.useState)("");
  const load = (0, import_react.useCallback)(() => {
    void fetchSkills(props.workspace).then((r) => {
      if (r.ok) setGroups(r.body.groups ?? []);
      else setError(`\u52A0\u8F7D\u5931\u8D25\uFF08HTTP ${String(r.status)}\uFF09`);
    }).catch((e) => setError(String(e)));
  }, [props.workspace]);
  (0, import_react.useEffect)(() => {
    load();
  }, [load]);
  const onToggle = (rootId, name, modelInvocable) => {
    setBusy(`${rootId}/${name}`);
    void toggleSkill({ rootId, name, ...props.workspace !== "" ? { workspace: props.workspace } : {}, modelInvocable }).then((r) => {
      if (!r.ok) setError(`\u5207\u6362\u5931\u8D25\uFF08HTTP ${String(r.status)}\uFF09`);
    }).catch((e) => setError(String(e))).finally(() => {
      setBusy("");
      load();
    });
  };
  const onDelete = (rootId, name) => {
    if (!window.confirm(`\u628A\u6280\u80FD\u300C${name}\u300D\u79FB\u5165\u56DE\u6536\u7AD9\uFF1F\u53EF\u5728\u56DE\u6536\u7AD9\u6062\u590D\u3002`)) return;
    setBusy(`${rootId}/${name}`);
    void deleteSkill({ rootId, name, ...props.workspace !== "" ? { workspace: props.workspace } : {} }).then((r) => {
      if (!r.ok) setError(`\u5220\u9664\u5931\u8D25\uFF08HTTP ${String(r.status)}\uFF09`);
    }).catch((e) => setError(String(e))).finally(() => {
      setBusy("");
      load();
    });
  };
  const filtered = (0, import_react.useMemo)(() => groups.map((group) => ({
    ...group,
    skills: group.skills.filter((skill) => query === "" || skill.name.includes(query) || (skill.meta?.description ?? "").toLowerCase().includes(query.toLowerCase()))
  })), [groups, query]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "ss_search", placeholder: "\u641C\u7D22\u6280\u80FD\u540D\u79F0\u6216\u63CF\u8FF0", value: query, onChange: (e) => setQuery(e.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_row", style: { justifyContent: "space-between" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_meta", children: "\u542F\u7528\u5F00\u5173\u63A7\u5236\u6A21\u578B\u80FD\u5426\u8C03\u7528\u8BE5\u6280\u80FD\uFF1B\u5220\u9664\u4F1A\u79FB\u5165\u56DE\u6536\u7AD9\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn", onClick: load, children: "\u5237\u65B0" })
    ] }),
    error !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_err", children: error }) : null,
    filtered.every((group) => group.skills.length === 0) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_empty", children: "\u8FD9\u91CC\u8FD8\u6CA1\u6709\u6280\u80FD\u3002\u53BB\u300C\u5BFC\u5165\u6280\u80FD\u300D\u6216\u300C\u62D6\u62FD\u5B89\u88C5\u300D\u6DFB\u52A0\u4E00\u4E2A\u5427\u3002" }) : filtered.map((group) => group.skills.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_groupTitle", children: group.label }),
      group.skills.map((skill) => {
        const enabled = skill.meta?.modelInvocable ?? true;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_cardHead", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_name", title: skill.path, children: skill.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `ss_badge ${enabled ? "on" : "off"}`, children: enabled ? "\u6A21\u578B\u53EF\u8C03\u7528" : "\u5DF2\u505C\u7528" }),
            skill.kind === "file" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_badge", children: "\u5355\u6587\u4EF6" }) : null
          ] }),
          skill.meta?.description !== void 0 && skill.meta.description !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_desc", children: skill.meta.description }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_desc", children: "\uFF08\u65E0\u63CF\u8FF0\uFF09" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                className: "ss_switch",
                "data-on": enabled ? "true" : void 0,
                role: "switch",
                "aria-checked": enabled,
                title: enabled ? "\u505C\u7528\uFF08\u6A21\u578B\u4E0D\u518D\u53EF\u89C1\uFF09" : "\u542F\u7528",
                disabled: busy === `${group.rootId}/${skill.name}`,
                onClick: () => onToggle(group.rootId, skill.name, !enabled),
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_switchThumb" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_meta", children: enabled ? "\u5DF2\u542F\u7528" : "\u5DF2\u505C\u7528" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn danger", disabled: busy === `${group.rootId}/${skill.name}`, onClick: () => onDelete(group.rootId, skill.name), children: "\u5220\u9664" })
          ] })
        ] }, `${group.rootId}/${skill.name}`);
      })
    ] }, group.rootId))
  ] });
}
function ImportTab(props) {
  const [reports, setReports] = (0, import_react.useState)(null);
  const [scanning, setScanning] = (0, import_react.useState)(false);
  const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [targetRoot, setTargetRoot] = (0, import_react.useState)("user-dsh");
  const [conflict, setConflict] = (0, import_react.useState)("skip");
  const [outcomes, setOutcomes] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)("");
  const [importing, setImporting] = (0, import_react.useState)(false);
  const scan = () => {
    setScanning(true);
    setError("");
    setOutcomes(null);
    void scanSources(props.workspace).then((r) => {
      if (r.ok) {
        setReports(r.body.reports ?? []);
        setSelected(/* @__PURE__ */ new Set());
      } else setError(`\u626B\u63CF\u5931\u8D25\uFF08HTTP ${String(r.status)}\uFF09`);
    }).catch((e) => setError(String(e))).finally(() => setScanning(false));
  };
  (0, import_react.useEffect)(() => {
    scan();
  }, [props.workspace]);
  const keyOf = (candidate) => candidate.path;
  const togglePick = (candidate) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = keyOf(candidate);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const doImport = () => {
    if (reports === null || selected.size === 0) return;
    const items = reports.flatMap((report) => report.candidates).filter((candidate) => selected.has(keyOf(candidate))).map((candidate) => ({ sourcePath: candidate.path }));
    setImporting(true);
    setError("");
    void importSkills({ items, targetRoot, conflict, ...props.workspace !== "" ? { workspace: props.workspace } : {} }).then((r) => {
      if (r.ok) {
        setOutcomes(r.body.outcomes ?? []);
        setSelected(/* @__PURE__ */ new Set());
        scan();
      } else setError(`\u5BFC\u5165\u5931\u8D25\uFF08HTTP ${String(r.status)}\uFF09`);
    }).catch((e) => setError(String(e))).finally(() => setImporting(false));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_row", style: { justifyContent: "space-between" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_meta", children: "\u626B\u63CF Claude Code / Codex / Cursor / Gemini \u7684\u6280\u80FD\u76EE\u5F55\uFF08\u53EA\u8BFB\uFF09\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn", onClick: scan, disabled: scanning, children: scanning ? "\u626B\u63CF\u4E2D\u2026" : "\u91CD\u65B0\u626B\u63CF" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TargetSelector, { workspace: props.workspace, targetRoot, conflict, onTarget: setTargetRoot, onConflict: setConflict }),
    error !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_err", children: error }) : null,
    outcomes !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_cardHead", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_name", children: "\u5BFC\u5165\u7ED3\u679C" }) }),
      outcomes.map((outcome) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `ss_badge ${outcome.status === "skipped" ? "warn" : "on"}`, children: outcome.status }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ss_meta", children: [
          outcome.name !== "" ? outcome.name : outcome.sourcePath,
          outcome.error !== void 0 ? ` \u2014 ${outcome.error}` : ""
        ] })
      ] }, outcome.sourcePath))
    ] }) : null,
    reports === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_empty", children: scanning ? "\u6B63\u5728\u626B\u63CF\u2026" : "\u70B9\u51FB\u300C\u91CD\u65B0\u626B\u63CF\u300D\u5F00\u59CB" }) : reports.map((report) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_groupTitle", children: [
        report.source.label,
        " \xB7 ",
        report.candidates.length,
        " \u4E2A\u6280\u80FD"
      ] }),
      report.candidates.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_empty", children: [
        "\u672A\u53D1\u73B0\u6280\u80FD\uFF08",
        report.scannedDirs.length === 0 ? "\u76EE\u5F55\u4E0D\u5B58\u5728" : "\u76EE\u5F55\u4E3A\u7A7A",
        "\uFF09"
      ] }) : report.candidates.map((candidate) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ss_cardHead", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.has(keyOf(candidate)), onChange: () => togglePick(candidate) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_name", children: candidate.name }),
          candidate.conflict ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_badge warn", children: "\u5DF2\u5B58\u5728\u540C\u540D" }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_badge", children: candidate.scope === "project" ? "\u9879\u76EE" : "\u7528\u6237" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ss_meta", children: fmtSize(candidate.sizeBytes) })
        ] }),
        candidate.description !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_desc", children: candidate.description }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ss_meta", children: candidate.path })
      ] }, candidate.path))
    ] }, report.source.id)),
    reports !== null && reports.some((report) => report.candidates.length > 0) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "ss_btn primary", onClick: doImport, disabled: importing || selected.size === 0, children: importing ? "\u5BFC\u5165\u4E2D\u2026" : `\u5BFC\u5165\u6240\u9009\uFF08${String(selected.size)}\uFF09` }) : null
  ] });
}
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
.ss_version{font-size:11px;color:var(--dsw-alias-label-tertiary)}
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
function StationFooterButton(props) {
  const [open, setOpen] = (0, import_react2.useState)(false);
  (0, import_react2.useEffect)(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const drawer = open ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "ss_overlay", onClick: () => setOpen(false), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ss_panel", role: "dialog", "aria-label": "\u6280\u80FD\u7AD9", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ss_panelHead", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StationIcon, { size: 18 }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "ss_title", children: "\u6280\u80FD\u7AD9" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "ss_version", children: "dsh-charlotte 0.5.0" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "ss_iconBtn", type: "button", onClick: () => setOpen(false), "aria-label": "\u5173\u95ED", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3 3l10 10M13 3L3 13", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StationApp, {})
  ] }) }) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "button",
      {
        className: props.wide === false ? "ss_footBtn ss_footBtnRail" : "ss_footBtn",
        type: "button",
        onClick: () => setOpen((value) => !value),
        title: "\u6280\u80FD\u7AD9",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StationIcon, {}),
          props.wide === false ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u6280\u80FD\u7AD9" })
        ]
      }
    ),
    drawer !== null && typeof document !== "undefined" ? (0, import_react_dom.createPortal)(drawer, document.body) : null
  ] });
}
function StationSettingsSection() {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { display: "flex", flexDirection: "column", minHeight: 480 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StationApp, { embedded: true }) });
}
function apply(ctx) {
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
    label: "\u6280\u80FD\u7AD9"
  }, StationSettingsSection));
}

    return module.exports;
  }
});
