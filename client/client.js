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
var uploadFiles = (body) => call("/upload", { method: "POST", body });
var uploadZip = (body) => call("/upload-zip", { method: "POST", body });
var toggleSkill = (body) => call("/toggle", { method: "POST", body });
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
// #region dsh-charlotte markdown renderer
//
// Dependency-free Markdown for skill documentation. HTML is rendered as text
// and links are limited to http(s), mailto and same-document anchors.

var SK_MD_BACKTICK = String.fromCharCode(96);

/**
 * Strip a leading YAML frontmatter block.
 * @param {string} text - raw SKILL.md.
 * @returns {string} body without frontmatter.
 */
function skStripFrontmatter(text) {
  var source = String(text ?? "").replace(/\uFEFF/g, "").replace(/\r\n?/g, "\n");
  if (!/^---\s*\n/.test(source)) return source;
  var close = source.indexOf("\n---", 4);
  if (close === -1) return source;
  var after = close + 4;
  if (source.charAt(after) === "\n") after += 1;
  return source.slice(after);
}

/**
 * Allow only safe link protocols.
 * @param {string} value - candidate URL.
 * @returns {string|null} safe URL or null.
 */
function skSafeUrl(value) {
  var url = String(value ?? "").trim();
  if (url === "") return null;
  if (url.charAt(0) === "#") return url;
  try {
    var parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") return url;
  } catch (error) {
    return null;
  }
  return null;
}

function skMdRow(line) {
  var value = String(line ?? "").trim();
  if (value.charAt(0) === "|") value = value.slice(1);
  if (value.charAt(value.length - 1) === "|") value = value.slice(0, -1);
  return value.split("|").map(function (cell) { return cell.trim(); });
}

function skMdTableSeparator(line) {
  var cells = skMdRow(line);
  return cells.length > 0 && cells.every(function (cell) { return /^:?-{3,}:?$/.test(cell); });
}

function skMdStartsBlock(line) {
  var text = String(line ?? "");
  if (/^\s*$/.test(text)) return true;
  if (/^\s*#{1,6}\s+/.test(text)) return true;
  if (new RegExp("^\\s*" + SK_MD_BACKTICK + "{3,}|^\\s*~{3,}").test(text)) return true;
  if (/^\s*>/.test(text)) return true;
  if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(text)) return true;
  if (/^\s*\|/.test(text)) return true;
  if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(text)) return true;
  return false;
}

/**
 * Parse one Markdown document into block tokens.
 * @param {string} text - markdown.
 * @returns {Array<object>} blocks.
 */
function skParseMarkdown(text) {
  var source = skStripFrontmatter(String(text ?? "")).replace(/\r\n?/g, "\n");
  var lines = source.split("\n");
  var blocks = [];
  var index = 0;
  var fencePattern = new RegExp("^\\s*(" + SK_MD_BACKTICK + "{3,}|~{3,})\\s*([A-Za-z0-9_-]*)");
  while (index < lines.length) {
    var line = lines[index];
    if (/^\s*$/.test(line)) { index += 1; continue; }
    var fence = fencePattern.exec(line);
    if (fence !== null) {
      var marker = fence[1].charAt(0);
      var language = fence[2] || "";
      index += 1;
      var code = [];
      var closePattern = new RegExp("^\\s*" + (marker === SK_MD_BACKTICK ? SK_MD_BACKTICK : "~") + "{3,}\\s*$");
      while (index < lines.length && closePattern.test(lines[index]) === false) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", lang: language, text: code.join("\n") });
      continue;
    }
    var heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading !== null) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      index += 1;
      continue;
    }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }
    if (/^\s*>/.test(line)) {
      var quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }
    if (/^\s*\|/.test(line) && index + 1 < lines.length && skMdTableSeparator(lines[index + 1])) {
      var header = skMdRow(line);
      index += 2;
      var rows = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        rows.push(skMdRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", header: header, rows: rows });
      continue;
    }
    if (/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)) {
      var items = [];
      while (index < lines.length) {
        var item = /^(\s*)([-+*]|\d+[.)])\s+(.*)$/.exec(lines[index]);
        if (item === null) {
          if (items.length > 0 && /^\s{2,}\S/.test(lines[index])) {
            items[items.length - 1].text += " " + lines[index].trim();
            index += 1;
            continue;
          }
          break;
        }
        var indent = item[1].replace(/\t/g, "  ").length;
        items.push({ depth: Math.min(6, Math.floor(indent / 2)), ordered: /^\d/.test(item[2]), text: item[3] });
        index += 1;
      }
      blocks.push({ type: "list", items: items });
      continue;
    }
    var paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && skMdStartsBlock(lines[index]) === false) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}

/**
 * Parse inline Markdown into React nodes.
 * @param {string} text - inline text.
 * @param {string} prefix - key prefix.
 * @returns {Array<string|object>} nodes.
 */
function skInline(text, prefix) {
  var source = String(text ?? "");
  var nodes = [];
  var buffer = "";
  var key = 0;
  var index = 0;
  var pushKey = function (tag, props, children) {
    key += 1;
    return sk(tag, Object.assign({ key: prefix + "-" + String(key) }, props ?? {}), children);
  };
  var flush = function () {
    if (buffer !== "") { nodes.push(buffer); buffer = ""; }
  };
  while (index < source.length) {
    var character = source.charAt(index);
    if (character === "\\" && index + 1 < source.length) {
      buffer += source.charAt(index + 1);
      index += 2;
      continue;
    }
    if (character === SK_MD_BACKTICK) {
      var codeEnd = source.indexOf(SK_MD_BACKTICK, index + 1);
      if (codeEnd > index) {
        flush();
        nodes.push(pushKey("code", { className: "sk_mdInlineCode" }, source.slice(index + 1, codeEnd)));
        index = codeEnd + 1;
        continue;
      }
    }
    if (character === "!" && source.charAt(index + 1) === "[") {
      var imageMatch = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(source.slice(index));
      if (imageMatch !== null) {
        flush();
        var imageUrl = skSafeUrl(imageMatch[2]);
        var alt = imageMatch[1] === "" ? imageMatch[2] : imageMatch[1];
        nodes.push(pushKey("span", { className: "sk_mdImage" }, imageUrl === null
          ? alt
          : pushKey("a", { className: "sk_mdLink", href: imageUrl, target: "_blank", rel: "noreferrer noopener" }, alt)));
        index += imageMatch[0].length;
        continue;
      }
    }
    if (character === "[") {
      var linkMatch = /^\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(source.slice(index));
      if (linkMatch !== null) {
        flush();
        var href = skSafeUrl(linkMatch[2]);
        var label = skInline(linkMatch[1], prefix + "-l" + String(key));
        nodes.push(href === null
          ? pushKey("span", { className: "sk_mdLinkBlocked" }, label)
          : pushKey("a", { className: "sk_mdLink", href: href, target: "_blank", rel: "noreferrer noopener" }, label));
        index += linkMatch[0].length;
        continue;
      }
    }
    if (character === "<") {
      var autoMatch = /^<((?:https?:\/\/|mailto:)[^>\s]+)>/.exec(source.slice(index));
      if (autoMatch !== null) {
        flush();
        var autoHref = skSafeUrl(autoMatch[1]);
        nodes.push(autoHref === null
          ? autoMatch[0]
          : pushKey("a", { className: "sk_mdLink", href: autoHref, target: "_blank", rel: "noreferrer noopener" }, autoMatch[1]));
        index += autoMatch[0].length;
        continue;
      }
    }
    var strongMatch = /^\*\*([^*]+)\*\*/.exec(source.slice(index)) ?? /^__([^_]+)__/.exec(source.slice(index));
    if (strongMatch !== null) {
      flush();
      nodes.push(pushKey("strong", null, skInline(strongMatch[1], prefix + "-b" + String(key))));
      index += strongMatch[0].length;
      continue;
    }
    var strikeMatch = /^~~([^~]+)~~/.exec(source.slice(index));
    if (strikeMatch !== null) {
      flush();
      nodes.push(pushKey("del", null, skInline(strikeMatch[1], prefix + "-s" + String(key))));
      index += strikeMatch[0].length;
      continue;
    }
    var emMatch = /^\*([^*\n]+)\*/.exec(source.slice(index)) ?? /^_([^_\n]+)_/.exec(source.slice(index));
    if (emMatch !== null) {
      flush();
      nodes.push(pushKey("em", null, skInline(emMatch[1], prefix + "-i" + String(key))));
      index += emMatch[0].length;
      continue;
    }
    buffer += character;
    index += 1;
  }
  flush();
  return nodes;
}

/**
 * Render one flat list as nested lists.
 * @param {Array<object>} items - depth-bearing items.
 * @param {string} prefix - key prefix.
 * @returns {Array<object>} list elements.
 */
function skMdList(items, prefix) {
  var root = [];
  var stack = [{ depth: -1, children: root }];
  for (var index = 0; index < items.length; index += 1) {
    var item = items[index];
    while (stack.length > 1 && stack[stack.length - 1].depth >= item.depth) stack.pop();
    var node = { text: item.text, ordered: item.ordered, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push({ depth: item.depth, children: node.children });
  }
  var render = function (nodes, groupPrefix) {
    var groups = [];
    var current = null;
    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      var node = nodes[nodeIndex];
      if (current === null || current.ordered !== node.ordered) {
        current = { ordered: node.ordered, items: [] };
        groups.push(current);
      }
      current.items.push(node);
    }
    return groups.map(function (group, groupIndex) {
      var tag = group.ordered ? "ol" : "ul";
      return sk(tag, { className: "sk_mdList", key: groupPrefix + "-" + String(groupIndex) }, group.items.map(function (node, itemIndex) {
        return sk("li", { key: groupPrefix + "-" + String(groupIndex) + "-" + String(itemIndex) }, [
          skInline(node.text, groupPrefix + "-t" + String(groupIndex) + "-" + String(itemIndex)),
          node.children.length > 0 ? render(node.children, groupPrefix + "-c" + String(groupIndex) + "-" + String(itemIndex)) : null
        ]);
      }));
    });
  };
  return render(root, prefix);
}

/**
 * Render block tokens.
 * @param {Array<object>} blocks - parsed blocks.
 * @param {string} prefix - key prefix.
 * @returns {Array<object>} React elements.
 */
function skMdBlocks(blocks, prefix) {
  return blocks.map(function (block, index) {
    var key = prefix + "-" + String(index);
    if (block.type === "heading") {
      return sk("h" + String(block.level), { key: key, className: "sk_mdHeading sk_mdH" + String(block.level) }, skInline(block.text, key));
    }
    if (block.type === "code") {
      var language = String(block.lang ?? "").replace(/[^A-Za-z0-9_-]/g, "");
      return sk("pre", { key: key, className: "sk_mdPre" }, sk("code", {
        className: language === "" ? "sk_mdCode" : "sk_mdCode language-" + language
      }, block.text));
    }
    if (block.type === "list") {
      return sk("div", { key: key, className: "sk_mdListWrap" }, skMdList(block.items, key));
    }
    if (block.type === "table") {
      return sk("div", { key: key, className: "sk_mdTableWrap" }, sk("table", { className: "sk_mdTable" }, [
        sk("thead", { key: "head" }, sk("tr", { key: "hr" }, block.header.map(function (cell, cellIndex) {
          return sk("th", { key: "h-" + String(cellIndex) }, skInline(cell, key + "-h" + String(cellIndex)));
        }))),
        sk("tbody", { key: "body" }, block.rows.map(function (row, rowIndex) {
          return sk("tr", { key: "r-" + String(rowIndex) }, row.map(function (cell, cellIndex) {
            return sk("td", { key: "c-" + String(cellIndex) }, skInline(cell, key + "-r" + String(rowIndex) + "-" + String(cellIndex)));
          }));
        }))
      ]));
    }
    if (block.type === "quote") {
      return sk("blockquote", { key: key, className: "sk_mdQuote" }, skInline(block.text, key));
    }
    if (block.type === "hr") {
      return sk("hr", { key: key, className: "sk_mdHr" });
    }
    return sk("p", { key: key, className: "sk_mdParagraph" }, skInline(block.text, key));
  });
}

/**
 * Render one Markdown document.
 * @param {{text: string, emptyText?: string}} props - props.
 * @returns {object|null} document.
 */
function SkMarkdown(props) {
  var blocks = skParseMarkdown(props.text);
  if (blocks.length === 0) {
    return props.emptyText ? sk("p", { className: "sk_mdEmpty" }, props.emptyText) : null;
  }
  return sk("div", { className: "sk_md" }, skMdBlocks(blocks, "md"));
}

if (typeof window !== "undefined" && window.__DSH_CHARLOTTE_TEST__ === true && window.__skTest !== undefined) {
  window.__skTest.skParseMarkdown = skParseMarkdown;
  window.__skTest.skStripFrontmatter = skStripFrontmatter;
  window.__skTest.skSafeUrl = skSafeUrl;
  window.__skTest.skInline = skInline;
}

// #endregion


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
    "state.fav": "收藏",
    "batch.mode": "批量",
    "batch.exit": "退出批量",
    "batch.selected": "已选 {count} 个",
    "batch.selectAll": "全选当前列表",
    "batch.clear": "清除选择",
    "batch.export": "导出清单",
    "batch.delete": "删除所选",
    "batch.confirm": "删除所选 {count} 个技能？它们会进入回收站，可恢复。",
    "batch.confirmed": "确认删除",
    "batch.noWritable": "所选技能都不是可写根里的本地技能，无法删除。",
    "batch.none": "还没有选择技能。",
    "batch.done": "已删除 {done} 个，失败 {failed} 个。",
    "batch.exported": "已导出 {count} 个技能的清单。",
    "activity.title": "最近操作",
    "activity.empty": "还没有安装、删除或迁移记录。",
    "activity.install": "安装",
    "activity.delete": "删除",
    "activity.migrate": "迁移",
    "activity.ok": "成功",
    "activity.fail": "失败",
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
    "action.loadFailed": "读取失败",
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
    "detail.info": "技能信息",
    "detail.files": "文件数",
    "detail.filesUnknown": "无法获取",
    "detail.updated": "最后修改",
    "detail.path": "安装路径",
    "detail.copyPath": "复制路径",
    "detail.pathCopied": "路径已复制。",
    "detail.pathCopyFailed": "复制路径失败：{reason}",
    "detail.showBody": "查看正文",
    "detail.hideBody": "收起正文",
    "detail.bodyLoading": "正在读取正文…",
    "detail.bodyFailed": "读取正文失败：{reason}",
    "detail.bodyTruncated": "只显示前 {shown} 个字符，完整内容请用「复制正文」。",
    "inspect.title": "质量与安全检查",
    "inspect.loading": "正在检查…",
    "inspect.failed": "检查失败：{reason}",
    "inspect.unavailable": "这个技能没有可读的文件，无法检查。",
    "inspect.quality": "质量",
    "inspect.security": "安全",
    "inspect.level.ok": "正常",
    "inspect.level.warn": "警告",
    "inspect.level.error": "异常",
    "inspect.level.high": "高风险",
    "inspect.files": "检查了 {files} 个文件",
    "inspect.where": "{file}:{line}",
    "inspect.dependents": "被依赖",
    "inspect.dependentsHint": "这些技能在声明或正文里引用了它。",
    "inspect.unknownRelation": "正文提及（不确定）",
    "inspect.noDependents": "没有技能声明依赖它。",
    "review.title": "使用前安全确认",
    "review.pending": "这个技能还没有被确认。先看上面的检查结果，再决定是否允许使用。",
    "review.accept": "我已了解风险，仍要使用",
    "review.accepted": "已确认，可以加载",
    "review.done": "已记录这次确认",
    "review.saving": "正在确认…",
    "review.badge": "待审查",
    "review.risk.high": "高风险",
    "review.risk.warn": "有警告",
    "review.risk.ok": "未发现明显风险",
    "review.riskLabel": "初步风险",
    "related.title": "没有匹配时，这些技能可能相关",
    "related.loading": "正在查找相关技能…",
    "related.failed": "相关推荐加载失败：{reason}",
    "related.empty": "没有找到相关技能。",
    "related.use": "使用",
    "detail.source": "来源",
    "detail.permissions": "声明权限",
    "detail.noPermissions": "技能没有声明权限或工具。",
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
    "detail.trash": "移入回收站",
    "detail.deleting": "正在移入…",
    "detail.trashHint": "删除只会进入回收站，不会永久删除。",
    "detail.trashConfirm": "把「{name}」移入回收站？之后可以在回收站恢复。",
    "detail.trashConfirmDeps": "有 {count} 个技能声明依赖「{name}」；删除后它们可能无法正常工作。仍要移入回收站？",
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
    "notice.loadedSession": "已放入该会话的输入框。",
    "notice.failed": "加载失败：{reason}",
    "notice.cancelled": "已取消加载。",
    "notice.prefFailed": "收藏状态保存失败：{reason}",
    "notice.toggleFailed": "开关保存失败：{reason}",
    "notice.indexFailed": "无法读取技能列表（HTTP {status}）：{reason}",
    "notice.indexFailedPlain": "无法读取技能列表：{reason}",
    "notice.offline": "无法连接插件服务。",
    "notice.dismiss": "关闭提示",
    "notice.installDone": "已导入技能「{name}」。",
    "notice.installReplaced": "已用新版本替换「{name}」。",
    "notice.installSkipped": "没有安装「{name}」：{reason}",
    "notice.installExists": "同名技能已存在，按冲突策略跳过",
    "notice.installPartial": "导入完成：{done} 个成功，{skipped} 个跳过。",
    "notice.installMany": "已导入 {done} 个技能。",
    "notice.installFailed": "安装失败：{reason}",
    "notice.deleteDone": "已把「{name}」移入回收站，可在回收站恢复。",
    "notice.deleteFailed": "删除失败：{reason}",
    "notice.restoreDone": "已恢复「{name}」。",
    "notice.restoreDoneGeneric": "已恢复该技能，可以在列表里重新打开它。",
    "notice.restoreFailed": "恢复失败：{reason}",
    "notice.trashEmptied": "回收站已清空。",
    "notice.trashEmptyFailed": "清空回收站失败：{reason}",
    "empty.title": "没有匹配的技能",
    "empty.hint": "换个关键词，或清除分类与来源筛选。",
    "empty.all.title": "还没有任何技能",
    "empty.all.hint": "导入一个技能，或把本机已有的技能目录接进来。",
    "empty.all.action": "打开安装",
    "empty.clearSearch": "清空搜索",
    "empty.filter.title": "当前筛选没有结果",
    "empty.filter.hint": "清除分类、来源或状态筛选，查看全部技能。",
    "empty.filter.action": "清除筛选",
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
    "more.updates": "版本与更新",
    "updates.title": "版本与更新",
    "updates.intro": "这里列出带版本号的技能。当前技能来源没有提供“可用新版本”信息，因此无法检查更新，也不会自动覆盖任何文件。",
    "updates.empty": "没有带版本号的技能。",
    "updates.noSource": "缺少更新源：请从原始仓库或安装包更新技能，更新前自行备份。",
    "updates.version": "版本",
    "updates.name": "技能",
    "stats.topTitle": "常用排行",
    "stats.topHint": "按插件记录的「加载 + 真实调用」次数排序，未调用过的不列入。",
    "stats.neverTitle": "从未通过插件使用",
    "stats.neverHint": "这些技能在插件记录里没有任何加载或调用；不代表宿主从未使用过它们。",
    "stats.neverEmpty": "所有技能都有使用记录。",
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
    "error.denied": "没有权限执行这一步：技能可能只允许用户手动调用，或已被停用。",
    "error.notFound": "找不到目标技能，可能已被删除或移出了当前工作区。",
    "error.server": "插件服务返回错误（HTTP {status}）。",
    "error.badRequest": "请求不被接受：{reason}",
    "error.reviewRequired": "这个技能还需要完成安全审查。请打开详情，查看检查结果并确认。",
    "time.justNow": "刚刚",
    "dock.title": "技能推荐",
    "dock.count": "仅 {count} 个",
    "dock.use": "使用",
    "dock.ignore": "忽略",
    "dock.loading": "正在校验权限…",
    "dock.loaded": "已放入输入框，发送后生效。",
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
    "skills.searchSub": "搜索「{query}」：{count} 个结果",
    "skills.refreshing": "刷新中…",
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
    "state.fav": "Favourites",
    "batch.mode": "Select",
    "batch.exit": "Exit select",
    "batch.selected": "{count} selected",
    "batch.selectAll": "Select all visible",
    "batch.clear": "Clear selection",
    "batch.export": "Export manifest",
    "batch.delete": "Delete selected",
    "batch.confirm": "Delete {count} selected skills? They move to the trash and can be restored.",
    "batch.confirmed": "Delete now",
    "batch.noWritable": "None of the selected skills is a local skill in a writable root; nothing can be deleted.",
    "batch.none": "Nothing selected yet.",
    "batch.done": "Deleted {done}, failed {failed}.",
    "batch.exported": "Exported a manifest of {count} skills.",
    "activity.title": "Recent operations",
    "activity.empty": "No install, delete or migration recorded yet.",
    "activity.install": "Install",
    "activity.delete": "Delete",
    "activity.migrate": "Migrate",
    "activity.ok": "ok",
    "activity.fail": "failed",
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
    "action.loadFailed": "Could not load",
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
    "detail.info": "Skill details",
    "detail.files": "Files",
    "detail.filesUnknown": "Unavailable",
    "detail.updated": "Last modified",
    "detail.path": "Install path",
    "detail.copyPath": "Copy path",
    "detail.pathCopied": "Path copied.",
    "detail.pathCopyFailed": "Could not copy the path: {reason}",
    "detail.showBody": "Show body",
    "detail.hideBody": "Hide body",
    "detail.bodyLoading": "Reading body…",
    "detail.bodyFailed": "Could not read the body: {reason}",
    "detail.bodyTruncated": "Showing the first {shown} characters; use Copy body for the full text.",
    "inspect.title": "Quality & security check",
    "inspect.loading": "Checking…",
    "inspect.failed": "Check failed: {reason}",
    "inspect.unavailable": "This skill has no readable files, so it cannot be checked.",
    "inspect.quality": "Quality",
    "inspect.security": "Security",
    "inspect.level.ok": "OK",
    "inspect.level.warn": "Warning",
    "inspect.level.error": "Error",
    "inspect.level.high": "High risk",
    "inspect.files": "Checked {files} files",
    "inspect.where": "{file}:{line}",
    "inspect.dependents": "Depended on by",
    "inspect.dependentsHint": "These skills reference it in their declared dependencies or body text.",
    "inspect.unknownRelation": "Body mention only (uncertain)",
    "inspect.noDependents": "No skill declares a dependency on it.",
    "review.title": "Safety confirmation",
    "review.pending": "This skill has not been confirmed yet. Review the scan above, then decide whether to allow it.",
    "review.accept": "I understand the risk; use it anyway",
    "review.accepted": "Confirmed; it can be loaded",
    "review.done": "Confirmation recorded",
    "review.saving": "Confirming…",
    "review.badge": "Review",
    "review.risk.high": "High risk",
    "review.risk.warn": "Warning",
    "review.risk.ok": "No obvious risk",
    "review.riskLabel": "Initial risk",
    "related.title": "No direct match; these may be related",
    "related.loading": "Looking for related skills…",
    "related.failed": "Could not load related skills: {reason}",
    "related.empty": "No related skills found.",
    "related.use": "Use",
    "detail.source": "Source",
    "detail.permissions": "Declared permissions",
    "detail.noPermissions": "The skill declares no permissions or tools.",
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
    "detail.trash": "Move to trash",
    "detail.deleting": "Moving…",
    "detail.trashHint": "Delete only moves the skill to the trash; nothing is permanently removed.",
    "detail.trashConfirm": "Move \u300c{name}\u300d to the trash? It can be restored from there.",
    "detail.trashConfirmDeps": "{count} skills declare a dependency on \u300c{name}\u300d; they may stop working. Move it to the trash anyway?",
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
    "notice.loadedSession": "Added to that conversation's composer.",
    "notice.failed": "Could not load: {reason}",
    "notice.cancelled": "Load cancelled.",
    "notice.prefFailed": "Could not save favourite: {reason}",
    "notice.toggleFailed": "Could not save the switch: {reason}",
    "notice.indexFailed": "Cannot read skills (HTTP {status}): {reason}",
    "notice.indexFailedPlain": "Cannot read skills: {reason}",
    "notice.offline": "Cannot reach the plugin service.",
    "notice.dismiss": "Dismiss",
    "notice.installDone": "Imported \u300c{name}\u300d.",
    "notice.installReplaced": "Replaced \u300c{name}\u300d with the new version.",
    "notice.installSkipped": "Not installed \u300c{name}\u300d: {reason}",
    "notice.installExists": "A skill with that name already exists; skipped by the conflict policy",
    "notice.installPartial": "Imported {done}, skipped {skipped}.",
    "notice.installMany": "Imported {done} skills.",
    "notice.installFailed": "Install failed: {reason}",
    "notice.deleteDone": "Moved \u300c{name}\u300d to the trash; it can be restored.",
    "notice.deleteFailed": "Delete failed: {reason}",
    "notice.restoreDone": "Restored \u300c{name}\u300d.",
    "notice.restoreDoneGeneric": "Skill restored; it is back in the list.",
    "notice.restoreFailed": "Restore failed: {reason}",
    "notice.trashEmptied": "Trash emptied.",
    "notice.trashEmptyFailed": "Could not empty the trash: {reason}",
    "empty.title": "No matching skills",
    "empty.hint": "Try another keyword, or clear the category and source filters.",
    "empty.all.title": "No skills yet",
    "empty.all.hint": "Import a skill, or connect a skill directory that is already on this machine.",
    "empty.all.action": "Open install",
    "empty.clearSearch": "Clear search",
    "empty.filter.title": "No results with these filters",
    "empty.filter.hint": "Clear the category, source or state filter to see every skill.",
    "empty.filter.action": "Clear filters",
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
    "more.updates": "Versions & updates",
    "updates.title": "Versions & updates",
    "updates.intro": "Skills that declare a version are listed here. The installed sources expose no newer-version information, so updates cannot be checked and no file is overwritten automatically.",
    "updates.empty": "No skill declares a version.",
    "updates.noSource": "No update source: update a skill from its original repository or package, and back it up first.",
    "updates.version": "Version",
    "updates.name": "Skill",
    "stats.topTitle": "Most used",
    "stats.topHint": "Ranked by plugin-recorded loads plus real invocations; never-used skills are not listed.",
    "stats.neverTitle": "Never used through the plugin",
    "stats.neverHint": "No load or invocation recorded by this plugin; that does not mean the host never used them.",
    "stats.neverEmpty": "Every skill has some recorded usage.",
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
    "error.denied": "Not allowed: the skill may be user-only or disabled.",
    "error.notFound": "That skill no longer exists, or it left the current workspace.",
    "error.server": "The plugin service returned an error (HTTP {status}).",
    "error.badRequest": "Request rejected: {reason}",
    "error.reviewRequired": "This skill still needs a safety review. Open its detail, check the scan, and confirm.",
    "time.justNow": "just now",
    "dock.title": "Skill suggestion",
    "dock.count": "{count} only",
    "dock.use": "Use",
    "dock.ignore": "Ignore",
    "dock.loading": "Checking permissions…",
    "dock.loaded": "Added to the composer; it applies when you send.",
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
    "skills.searchSub": "Search \"{query}\": {count} result(s)",
    "skills.refreshing": "refreshing…",
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
 * Split text into plain/matched segments for the current search query.
 * Only the first occurrence of the first matching term is marked: enough to
 * show why a row matched, without turning the list into a rainbow.
 * @param {string} text - display text.
 * @param {string} query - raw search box value.
 * @returns {Array<string|{mark: string}>} segments in order.
 */
function skHighlightParts(text, query) {
  var value = String(text ?? "");
  var raw = String(query ?? "").trim();
  if (raw === "") return [value];
  var terms = raw.split(/\s+/).filter(function (term) { return term !== ""; }).map(function (term) { return term.toLowerCase(); });
  var lower = value.toLowerCase();
  for (var index = 0; index < terms.length; index += 1) {
    var at = lower.indexOf(terms[index]);
    if (at < 0) continue;
    return [
      value.slice(0, at),
      { mark: value.slice(at, at + terms[index].length) },
      value.slice(at + terms[index].length)
    ];
  }
  return [value];
}

/**
 * Render highlighted search text.
 * @param {string} text - display text.
 * @param {string} query - raw search box value.
 * @returns {Array} React children.
 */
function skHighlighted(text, query) {
  return skHighlightParts(text, query).map(function (part, index) {
    if (typeof part === "string") return part;
    return sk("mark", { key: "hl-" + String(index), className: "sk_mark" }, part.mark);
  });
}

/**
 * One reusable empty state: what is empty, why, and the action that helps.
 * @param {{title: string, hint: string, actionLabel: string, onAction: Function, glyph?: object}} props - props.
 * @returns {object} empty panel.
 */
function SkEmptyState(props) {
  return sk("div", { className: "sk_emptyPanel" }, [
    props.glyph === undefined || props.glyph === null ? null : sk("span", { className: "sk_emptyGlyph" }, [props.glyph]),
    sk("h3", { className: "sk_emptyTitle" }, props.title),
    sk("p", { className: "sk_emptyHint" }, props.hint),
    sk("button", { className: "sk_textBtn", type: "button", onClick: props.onAction }, props.actionLabel)
  ]);
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
      if (state === "fav" && skill.stats?.favorite !== true) return false;
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
  if (panel === "updates") return "updates.title";
  if (panel === "security") return "sec.title";
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

/**
 * User-facing text for one failed API response. Known statuses get a plain
 * sentence; anything else keeps the server's own message, and the technical
 * details go to the developer console instead of the interface.
 * @param {{status: number, body: object}} result - API result.
 * @returns {string} message safe to show.
 */
function skErrorText(result) {
  var body = result === null || result === undefined ? {} : result.body ?? {};
  var status = result === null || result === undefined ? 0 : Number(result.status) || 0;
  var reason = typeof body.error === "string" ? body.error : "";
  if (status === 0) return skT(skGetLang(), "error.network");
  if (status === 403) return skT(skGetLang(), "error.denied");
  if (status === 404) return skT(skGetLang(), "error.notFound");
  if (status === 409 && body.code === "review-required") return skT(skGetLang(), "error.reviewRequired");
  if (status === 400) {
    return reason === "" ? skT(skGetLang(), "error.server", { status: String(status) }) : skT(skGetLang(), "error.badRequest", { reason: reason });
  }
  if (reason !== "") {
    if (typeof console !== "undefined" && typeof console.warn === "function") console.warn("[dsh-charlotte] API error", status, reason);
    return reason;
  }
  if (typeof console !== "undefined" && typeof console.warn === "function") console.warn("[dsh-charlotte] API error", status);
  return skT(skGetLang(), "error.server", { status: String(status) });
}

var skApi = {
  index: function (workspace, signal) {
    return skCall("/index" + (workspace !== "" ? "?workspace=" + encodeURIComponent(workspace) : ""), { signal: signal });
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
  home: function (sessionId, workspace, signal) {
    var query = [];
    if (typeof sessionId === "string" && sessionId !== "") query.push("session=" + encodeURIComponent(sessionId));
    if (typeof workspace === "string" && workspace !== "") query.push("workspace=" + encodeURIComponent(workspace));
    return skCall("/home" + (query.length > 0 ? "?" + query.join("&") : ""), { signal: signal });
  },
  ignore: function (body) {
    return skCall("/recommend/ignore", { method: "POST", body: body });
  },
  toggle: function (body) {
    return skCall("/toggle", { method: "POST", body: body });
  },
  delete: function (body) {
    return skCall("/delete", { method: "POST", body: body });
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
  search: function (query, workspace, max) {
    var params = "q=" + encodeURIComponent(query);
    if (typeof workspace === "string" && workspace !== "") params += "&workspace=" + encodeURIComponent(workspace);
    if (typeof max === "number") params += "&max=" + String(max);
    return skCall("/search?" + params);
  },
  inspect: function (name, workspace) {
    var params = "name=" + encodeURIComponent(name);
    if (typeof workspace === "string" && workspace !== "") params += "&workspace=" + encodeURIComponent(workspace);
    return skCall("/inspect?" + params);
  },
  ledger: function (workspace) {
    return skCall("/ledger" + (typeof workspace === "string" && workspace !== "" ? "?workspace=" + encodeURIComponent(workspace) : ""));
  },
  review: function (body) {
    return skCall("/review", { method: "POST", body: body });
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
  var request = skCall("/import-path", { method: "POST", body: body, timeoutMs: 120000 });
  request.then(skReportInstallSafe);
  return request;
};

// One notice sink, registered by StationApp: helper-level results (install,
// trash) are reported even though those components keep their own inline text.
var skNoticeSink = null;

/** @param {Function|null} sink - receives (kind, text). */
function skNoticeSetSink(sink) {
  skNoticeSink = typeof sink === "function" ? sink : null;
}

/**
 * Push one user-facing notice. No sink means the station is not mounted.
 * @param {string} kind - ok | info | warn | err.
 * @param {string} text - already localized message.
 */
function skNotice(kind, text) {
  if (skNoticeSink === null) return;
  try {
    skNoticeSink(kind, String(text ?? ''));
  }
  catch (error) {
    // A notice must never break the action that produced it.
  }
}

/**
 * Turn one install response (`outcome` or `outcomes`) into a notice, so every
 * install entry point reports the same way the launcher does.
 * @param {{ok: boolean, status: number, body: object}} result - API result.
 */
function skReportInstall(result) {
  if (result === null || result === undefined) return;
  var body = result.body ?? {};
  var rows = Array.isArray(body.outcomes) ? body.outcomes : (body.outcome !== undefined ? [body.outcome] : []);
  var blocked = body.code === "security-blocked"
    || (Array.isArray(body.blocked) && body.blocked.length > 0)
    || rows.some(function (row) { return row !== null && row !== undefined && row.code === "security-blocked"; });
  var reviewName = "";
  if (Array.isArray(body.outcomes)) {
    var named = body.outcomes.find(function (row) { return row !== null && row !== undefined && typeof row.name === "string" && row.name !== ""; });
    if (named !== undefined) reviewName = named.name;
  } else if (body.outcome !== null && body.outcome !== undefined && typeof body.outcome.name === "string") {
    reviewName = body.outcome.name;
  }
  if (blocked) {
    var blockedRow = rows.find(function (row) { return row !== null && row !== undefined && row.code === "security-blocked"; });
    var reviewFindings = Array.isArray(body.findings) ? body.findings : (blockedRow !== undefined && Array.isArray(blockedRow.findings) ? blockedRow.findings : []);
    var reviewSummary = body.summary !== null && typeof body.summary === "object" ? body.summary : (blockedRow !== undefined ? blockedRow.summary : undefined);
    if (typeof skOpenSecurityReview === "function") {
      skOpenSecurityReview(Object.assign({}, body, {
        name: reviewName,
        source: "install",
        code: "security-blocked",
        findings: reviewFindings,
        summary: reviewSummary,
        scanId: body.scanId ?? (blockedRow !== undefined ? blockedRow.scanId : undefined),
        reviewable: false
      }));
    } else if (body.notify !== false) {
      skOpenSecurityCenter(body);
    }
  }
  if (rows.length === 0) {
    if (!result.ok) skNotice("err", skT(skGetLang(), "notice.installFailed", { reason: skErrorText(result) }));
    return;
  }
  var done = 0;
  var skipped = 0;
  var replaced = 0;
  var first = null;
  var reason = "";
  for (var index = 0; index < rows.length; index += 1) {
    var row = rows[index];
    if (row === null || row === undefined) continue;
    if (first === null) first = row;
    if (row.status === "skipped") {
      skipped += 1;
      if (reason === "" && typeof row.error === "string") reason = row.error;
      continue;
    }
    done += 1;
    if (row.status === "replaced") replaced += 1;
  }
  var firstRow = first === null ? {} : first;
  if (done === 0) {
    skNotice("warn", skT(skGetLang(), "notice.installSkipped", {
      name: typeof firstRow.name === "string" && firstRow.name !== "" ? firstRow.name : (typeof firstRow.sourcePath === "string" ? firstRow.sourcePath : ""),
      // A successful skip (conflict policy) has no error text; falling back to
      // skErrorText() would print "HTTP 200" as the reason.
      reason: reason !== "" ? reason : result.ok ? skT(skGetLang(), "notice.installExists") : skErrorText(result)
    }));
    return;
  }
  if (rows.length === 1) {
    var label = typeof firstRow.name === "string" ? firstRow.name : "";
    skNotice("ok", skT(skGetLang(), replaced > 0 ? "notice.installReplaced" : "notice.installDone", { name: label }));
    if (!blocked && label !== "" && typeof skOpenSecurityReview === "function") skOpenSecurityReview({ name: label, source: "install", auto: true });
    return;
  }
  if (skipped === 0) {
    skNotice("ok", skT(skGetLang(), "notice.installMany", { done: String(done) }));
    if (!blocked && reviewName !== "" && typeof skOpenSecurityReview === "function") skOpenSecurityReview({ name: reviewName, source: "install", auto: true });
    return;
  }
  skNotice("warn", skT(skGetLang(), "notice.installPartial", { done: String(done), skipped: String(skipped) }));
  if (!blocked && reviewName !== "" && typeof skOpenSecurityReview === "function") skOpenSecurityReview({ name: reviewName, source: "install", auto: true });
}

/**
 * Report an install result without ever letting a notice error reject the
 * caller's promise chain.
 * @param {object} result - API result.
 */
function skReportInstallSafe(result) {
  try {
    skReportInstall(result);
  }
  catch (error) {
    // Reporting is best effort; the install itself already has its result.
  }
}

// The install panel keeps its own inline result; these wrappers add the shared
// notice without changing what the panel receives.
var skBaseUploadFiles = typeof uploadFiles === "function" ? uploadFiles : null;
var skBaseUploadZip = typeof uploadZip === "function" ? uploadZip : null;
if (skBaseUploadFiles !== null) {
  uploadFiles = function (body) {
    var request = skBaseUploadFiles(body);
    request.then(skReportInstallSafe);
    return request;
  };
}
if (skBaseUploadZip !== null) {
  uploadZip = function (body) {
    var request = skBaseUploadZip(body);
    request.then(skReportInstallSafe);
    return request;
  };
}

// Trash actions live in the baseline panel; report them through the shared
// notice too, so restore/empty failures are not only technical status codes.
var skBaseRestoreTrash = typeof restoreTrash === "function" ? restoreTrash : null;
var skBaseEmptyTrash = typeof emptyTrash === "function" ? emptyTrash : null;
if (skBaseRestoreTrash !== null) {
  restoreTrash = function (id) {
    return skBaseRestoreTrash(id).then(function (result) {
      if (result.ok) skNotice("ok", skT(skGetLang(), "notice.restoreDoneGeneric"));
      else {
        if (result.body !== null && result.body !== undefined && result.body.code === "security-blocked" && typeof skOpenSecurityReview === "function") {
          skOpenSecurityReview(Object.assign({}, result.body, { name: result.body.name ?? "", source: "restore", code: "security-blocked", reviewable: false }));
        }
        skNotice("err", skT(skGetLang(), "notice.restoreFailed", { reason: skErrorText(result) }));
      }
      return result;
    });
  };
}
if (skBaseEmptyTrash !== null) {
  emptyTrash = function () {
    return skBaseEmptyTrash().then(function (result) {
      if (result.ok) skNotice("ok", skT(skGetLang(), "notice.trashEmptied"));
      else skNotice("err", skT(skGetLang(), "notice.trashEmptyFailed", { reason: skErrorText(result) }));
      return result;
    });
  };
}

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
function skDraftPrompt(name) {
  return "/" + name + " ";
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
function skUseSkill(name, workspacePath) {
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
    if (!result.ok) {
      // An aborted fetch comes back as a resolved result with `aborted: true`;
      // keep it a cancellation rather than showing it as a failed load.
      if (result.body !== null && result.body !== undefined && result.body.aborted === true) {
        var abortError = new Error("aborted");
        abortError.name = "AbortError";
        throw abortError;
      }
      var code = result.body !== null && result.body !== undefined ? result.body.code : undefined;
      if ((code === "security-blocked" || code === "review-required") && typeof skOpenSecurityReview === "function") {
        var retryUse = function () {
          var first = code === "review-required"
            ? skApi.review({ name: name, workspace: scopePath, decision: "accepted" })
            : Promise.resolve({ ok: true });
          return Promise.resolve(first).then(function (reviewResult) {
            if (reviewResult.ok !== true) return reviewResult;
            return skUseSkill(name, workspacePath);
          });
        };
        skOpenSecurityReview(Object.assign({}, result.body, {
          name: name,
          source: "use",
          code: code,
          onContinue: retryUse
        }));
      }
      // Friendly text for the interface, technical reason for the load-failed
      // event and the developer console.
      var failure = new Error(skErrorText(result));
      failure.cause = skApiError(result);
      throw failure;
    }
    return skPrepareDraft(sessionId, name);
  }).then(function () {
    skFocusSession(sessionId);
    skLoadSet(name, { phase: "loaded", error: "", controller: null });
    skReportEvent(name, "loaded", "", scopePath, sessionId);
    if (typeof window !== "undefined") {
      window.setTimeout(function () {
        if (skLoadSnapshot(name).phase === "loaded") skLoadSet(name, { phase: "idle" });
      }, 4000);
    }
    return { ok: true, sessionId: sessionId };
  }).catch(function (error) {
    var aborted = error !== null && error !== undefined && (error.name === "AbortError" || String(error).indexOf("aborted") !== -1);
    if (aborted) {
      skLoadSet(name, { phase: "cancelled", controller: null });
      skReportEvent(name, "cancelled", "", scopePath, sessionId);
      return { ok: false, cancelled: true };
    }
    var reason = error instanceof Error ? error.message : String(error);
    var technical = error instanceof Error && typeof error.cause === "string" && error.cause !== "" ? error.cause : reason;
    if (technical !== reason && typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[dsh-charlotte] load-failed", technical);
    }
    skLoadSet(name, { phase: "error", error: reason, controller: null });
    skReportEvent(name, "load-failed", technical, scopePath, sessionId);
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
/**
 * Small magnifier glyph for search empty states.
 * @param {{size?: number}} props - pixel size.
 * @returns {object} svg.
 */
function SkSearchGlyph(props) {
  var size = props.size ?? 20;
  return sk("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", "aria-hidden": "true" }, [
    skH("circle", { cx: "7", cy: "7", r: "4.5" }, "c"),
    skH("path", { d: "M10.5 10.5L14 14", strokeLinecap: "round" }, "l")
  ]);
}

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
    props.value !== "" ? sk("button", {
      className: "sk_searchClear",
      type: "button",
      "aria-label": skT(lang, "empty.clearSearch"),
      title: skT(lang, "empty.clearSearch"),
      onClick: function () {
        props.onChange("");
        if (ref.current !== null) ref.current.focus();
      }
    }, "✕") : null,
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
          props.onUse(skill, true);
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
          props.onUse(skill, true);
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
  var query = typeof props.query === "string" ? props.query : "";
  var selectMode = props.selectMode === true;
  var selected = props.selected === true;
  var state = skStateOf(skill, lang);
  var load = useSkLoad(skill.name);
  var busy = load.phase === "loading";
  var label = load.phase === "loading" ? skT(lang, "action.cancel") : load.phase === "loaded" ? skT(lang, "action.useAgain") : skT(lang, "action.use");
  var activate = function () {
    if (selectMode) props.onSelect(skill);
    else props.onDetail(skill);
  };
  return sk("div", {
    className: "sk_row" + (selectMode ? " sk_rowSelect" : "") + (selected ? " sk_rowSelected" : ""),
    role: selectMode ? "checkbox" : "button",
    "aria-checked": selectMode ? (selected ? "true" : "false") : undefined,
    tabIndex: 0,
    onClick: activate,
    onKeyDown: function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    }
  }, [
    selectMode
      ? sk("span", { className: "sk_check" + (selected ? " sk_checkOn" : ""), "aria-hidden": "true" }, selected ? "✓" : "")
      : sk("div", { className: "sk_glyph" }, [skH(SkCatGlyph, { id: skill.category?.id })]),
    sk("div", { className: "sk_rowMain" }, [
      sk("div", { className: "sk_rowName" }, [
        sk("span", { className: "sk_rowNameText" }, skHighlighted(skill.name, query)),
        skill.review?.reviewed !== true ? sk("span", { className: "sk_reviewBadge" }, skT(lang, "review.badge")) : null,
        skill.version !== null && skill.version !== undefined ? sk("span", { className: "sk_ver" }, "v" + String(skill.version)) : null
      ]),
      sk("div", { className: "sk_rowDesc" }, skHighlighted(skSkillIntro(skill, lang), query))
    ]),
    sk("div", { className: "sk_state" }, [sk("span", { className: "sk_dot", "data-kind": state.dot }), state.label]),
    sk("div", { className: "sk_src", title: skill.source?.detail ?? "" }, skill.source?.label ?? ""),
    selectMode ? null : sk("div", { className: "sk_actions" }, [
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
  var counts = props.stateCounts ?? {};
  var states = [
    { id: "all", label: skT(lang, "state.all") },
    { id: "both", label: skT(lang, "state.both") },
    { id: "user", label: skT(lang, "state.user") },
    { id: "model", label: skT(lang, "state.model") },
    { id: "off", label: skT(lang, "state.off") },
    { id: "disabled", label: skT(lang, "rail.disabled") },
    { id: "fav", label: skT(lang, "state.fav") }
  ].map(function (row) {
    return { id: row.id, label: row.label, count: typeof counts[row.id] === "number" ? counts[row.id] : null };
  });
  var sourceLabel = props.source === "all" ? skT(lang, "filter.all") : (sources.find(function (row) { return row.id === props.source; }) ?? { label: props.source }).label;
  var stateLabel = props.state === "all" ? skT(lang, "filter.all") : (states.find(function (row) { return row.id === props.state; }) ?? { label: props.state }).label;
  var menu = props.menu;
  return sk("div", { className: "sk_toolbar" }, [
    sk("div", { className: "sk_sorts", role: "group", "aria-label": skT(lang, "sort.label") }, [
      sk("button", { className: "sk_sort", type: "button", "data-on": props.sort === "freq" ? "" : undefined, onClick: function () { props.onSort("freq"); } }, skT(lang, "sort.freq")),
      sk("button", { className: "sk_sort", type: "button", "data-on": props.sort === "name" ? "" : undefined, onClick: function () { props.onSort("name"); } }, skT(lang, "sort.name")),
      sk("button", { className: "sk_sort", type: "button", "data-on": props.sort === "recent" ? "" : undefined, onClick: function () { props.onSort("recent"); } }, skT(lang, "sort.recent"))
    ]),
    sk("button", {
      className: "sk_filter",
      type: "button",
      "data-act": props.selectMode ? "" : undefined,
      "aria-pressed": props.selectMode ? "true" : "false",
      onClick: props.onSelectMode
    }, props.selectMode ? skT(lang, "batch.exit") : skT(lang, "batch.mode")),
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
        }, [sk("span", null, row.label), row.count === null ? null : sk("em", null, String(row.count))]);
      })) : null
    ])
  ]);
}

// #endregion

// #region dialog focus ---------------------------------------------------------
/**
 * Focusables a dialog may tab through, in DOM order. Hidden or disabled
 * controls are skipped so Tab cannot land on something invisible.
 * @param {Element} container - dialog root.
 * @returns {HTMLElement[]} focusable elements.
 */
function skFocusables(container) {
  var nodes = container.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]):not([type='hidden']),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])");
  var items = [];
  for (var index = 0; index < nodes.length; index += 1) {
    var node = nodes[index];
    if (node.getAttribute("aria-hidden") === "true") continue;
    if (node.getClientRects().length === 0) continue;
    items.push(node);
  }
  return items;
}

/**
 * Trap Tab inside one dialog and restore focus when it closes.
 *
 * Plain function (not a hook), so a component can call it from its own effect
 * and run the returned cleanup on unmount or when the dialog closes.
 * @param {Element|null} container - dialog root.
 * @returns {Function} cleanup: removes the listener and restores focus.
 */
function skTrapFocus(container) {
  if (container === null || container === undefined || typeof document === "undefined") return function () { };
  var previous = document.activeElement;
  var items = skFocusables(container);
  if (items.length > 0) {
    items[0].focus();
  }
  else {
    container.setAttribute("tabindex", "-1");
    container.focus();
  }
  var onKey = function (event) {
    if (event.key !== "Tab") return;
    var nodes = skFocusables(container);
    if (nodes.length === 0) {
      event.preventDefault();
      return;
    }
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    var active = document.activeElement;
    var inside = container.contains(active);
    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", onKey, true);
  return function () {
    document.removeEventListener("keydown", onKey, true);
    if (previous !== null && previous !== undefined && typeof previous.focus === "function" && document.contains(previous)) {
      previous.focus();
    }
  };
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
  var panelRef = (0, import_react.useRef)(null);
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
  if (props.panel === "security") {
    return skH(SkSecurityCenter, { lang: lang, workspace: props.workspace, onClose: props.onClose });
  }
  return sk("div", { className: "sk_panelScrim", onClick: props.onClose }, [
    sk("div", {
      className: "sk_panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": title,
      ref: panelRef,
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
            : props.panel === "updates"
              ? skH(SkUpdatesPanel, { lang: lang, workspace: props.workspace })
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
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onPanel("security"); setOpen(false); } }, skT(lang, "more.security")),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { if (typeof skOpenSecurityReview === "function") skOpenSecurityReview({ global: true, manual: true, source: "manual" }); setOpen(false); } }, skT(lang, "more.securityReview")),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onPanel("ledger"); setOpen(false); } }, skT(lang, "more.ledger")),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onPanel("diagnostics"); setOpen(false); } }, skT(lang, "more.diagnostics")),
      sk("button", { className: "sk_moreItem", type: "button", onClick: function () { props.onPanel("updates"); setOpen(false); } }, skT(lang, "more.updates")),
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
 * Fetch one read-only panel payload with a live guard and a retry counter.
 * @param {Function} request - returns the skCall promise.
 * @param {Array} deps - values that should refetch when changed.
 * @returns {{data: object|null, error: string, retry: number, setRetry: Function}} panel state.
 */
function useSkFetch(request, deps) {
  var dataState = (0, import_react.useState)(null);
  var data = dataState[0];
  var setData = dataState[1];
  var errorState = (0, import_react.useState)("");
  var error = errorState[0];
  var setError = errorState[1];
  var retryState = (0, import_react.useState)(0);
  var retry = retryState[0];
  var setRetry = retryState[1];
  (0, import_react.useEffect)(function () {
    var live = true;
    setError("");
    void request().then(function (result) {
      if (!live) return;
      if (!result.ok) {
        setError(skErrorText(result));
        return;
      }
      setData(result.body);
    }).catch(function (thrown) {
      if (live) setError(String(thrown));
    });
    return function () { live = false; };
  }, deps.concat([retry]));
  return { data: data, error: error, retry: retry, setRetry: setRetry };
}

/**
 * One failure surface for the secondary panels: what failed, plus a retry that
 * re-runs the request instead of leaving a dead loading label on screen.
 * @param {{lang: 'zh'|'en', message: string, onRetry: Function}} props - props.
 * @returns {object} failure panel.
 */
function SkLoadFailure(props) {
  var lang = props.lang;
  return sk("div", { className: "sk_emptyPanel" }, [
    sk("div", { className: "sk_emptyTitle" }, skT(lang, "action.loadFailed")),
    sk("p", { className: "sk_emptyHint" }, props.message),
    sk("button", { className: "sk_textBtn", type: "button", onClick: props.onRetry }, skT(lang, "action.retry"))
  ]);
}

/**
 * Usage ledger panel: totals, a real 14-day trend and per-skill rows.
 * Every ratio is null-safe: no denominator means an em dash, never 0% or 100%.
 * @param {{lang: 'zh'|'en', workspace: string}} props - props.
 * @returns {object} panel body.
 */
function SkLedgerPanel(props) {
  var lang = props.lang;
  var fetched = useSkFetch(function () {
    return skApi.ledger(props.workspace ?? "");
  }, [props.workspace]);
  var data = fetched.data;
  var error = fetched.error;
  var retry = fetched.retry;
  var setRetry = fetched.setRetry;
  if (data === null && error !== "") {
    return skH(SkLoadFailure, { lang: lang, message: error, onRetry: function () { setRetry(retry + 1); } });
  }
  if (data === null) return sk("div", { className: "sk_loading" }, skT(lang, "loading"));
  var totals = data.totals ?? {};
  var trend = Array.isArray(data.trend) ? data.trend : [];
  var peak = 1;
  trend.forEach(function (row) { if (row.value > peak) peak = row.value; });
  var rate = function (value) {
    return value === null || value === undefined ? skT(lang, "ledger.noRate") : String(Math.round(value * 100)) + "%";
  };
  var rows = Array.isArray(data.skills) ? data.skills.slice(0, 50) : [];
  var ranked = rows.filter(function (row) { return row.loads + row.invokes > 0; })
    .sort(function (left, right) { return (right.loads + right.invokes) - (left.loads + left.invokes) || left.name.localeCompare(right.name); })
    .slice(0, 5);
  var neverUsed = rows.filter(function (row) { return row.loads + row.invokes === 0; }).slice(0, 8);
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
    Array.isArray(data.activity) ? sk("div", { className: "sk_sec" }, [
      sk("div", { className: "sk_secLabel" }, skT(lang, "activity.title")),
      data.activity.length === 0
        ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "activity.empty"))
        : sk("ul", { className: "sk_bullets" }, data.activity.slice(0, 20).map(function (row, index) {
          var kind = row.kind === "install" || row.kind === "delete" || row.kind === "migrate" ? skT(lang, "activity." + row.kind) : String(row.kind);
          var mark = row.ok === true ? skT(lang, "activity.ok") : skT(lang, "activity.fail");
          return sk("li", { key: "act-" + String(index) }, skTime(row.at) + " · " + kind + " · " + String(row.name ?? "") + " · " + mark + (row.detail === "" || row.detail === undefined ? "" : " · " + String(row.detail)));
        }))
    ]) : null,
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
      ]),
    sk("div", { className: "sk_sec" }, [
      sk("div", { className: "sk_secLabel" }, skT(lang, "stats.topTitle")),
      sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "stats.topHint")),
      ranked.length === 0
        ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "ledger.empty"))
        : sk("ul", { className: "sk_bullets" }, ranked.map(function (row) {
          return sk("li", { key: "top-" + row.name }, row.name + " · " + String(row.loads) + "/" + String(row.invokes));
        }))
    ]),
    sk("div", { className: "sk_sec" }, [
      sk("div", { className: "sk_secLabel" }, skT(lang, "stats.neverTitle")),
      sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "stats.neverHint")),
      neverUsed.length === 0
        ? sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "stats.neverEmpty"))
        : sk("ul", { className: "sk_bullets" }, neverUsed.map(function (row) {
          return sk("li", { key: "never-" + row.name }, row.name);
        }))
    ])
  ]);
}

/**
 * Version & update panel. It lists real declared versions and states plainly
 * that no update source exists, instead of offering a button that cannot work.
 * @param {{lang: 'zh'|'en', workspace: string}} props - props.
 * @returns {object} panel body.
 */
function SkUpdatesPanel(props) {
  var lang = props.lang;
  var fetched = useSkFetch(function () {
    return skApi.index(props.workspace ?? "");
  }, [props.workspace]);
  var data = fetched.data;
  var error = fetched.error;
  var retry = fetched.retry;
  var setRetry = fetched.setRetry;
  if (data === null && error !== "") {
    return skH(SkLoadFailure, { lang: lang, message: error, onRetry: function () { setRetry(retry + 1); } });
  }
  if (data === null) return sk("div", { className: "sk_loading" }, skT(lang, "loading"));
  var rows = (Array.isArray(data.skills) ? data.skills : []).filter(function (skill) {
    return skill.version !== null && skill.version !== undefined && String(skill.version) !== "";
  });
  return sk("div", null, [
    sk("p", { className: "sk_secText", "data-dim": "", style: { padding: "14px 18px 0" } }, skT(lang, "updates.intro")),
    rows.length === 0
      ? sk("p", { className: "sk_secText", "data-dim": "", style: { padding: "14px 18px" } }, skT(lang, "updates.empty"))
      : sk("table", { className: "sk_hist", style: { margin: "14px 18px 0" } }, [
        sk("thead", { key: "th" }, [sk("tr", null, [
          sk("th", null, skT(lang, "updates.name")),
          sk("th", null, skT(lang, "updates.version"))
        ])]),
        sk("tbody", { key: "tb" }, rows.map(function (skill) {
          return sk("tr", { key: "up-" + skill.name }, [
            sk("td", null, skill.name),
            sk("td", null, String(skill.version))
          ]);
        }))
      ]),
    sk("p", { className: "sk_secText", "data-dim": "", style: { padding: "18px" } }, skT(lang, "updates.noSource"))
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
  var fetched = useSkFetch(function () {
    return skApi.index(props.workspace ?? "");
  }, [props.workspace]);
  var data = fetched.data;
  var error = fetched.error;
  var retry = fetched.retry;
  var setRetry = fetched.setRetry;
  if (data === null && error !== "") {
    return skH(SkLoadFailure, { lang: lang, message: error, onRetry: function () { setRetry(retry + 1); } });
  }
  if (data === null) return sk("div", { className: "sk_loading" }, skT(lang, "loading"));
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

/**
 * Placeholder rows for the first list load; no spinner overlay, the page stays
 * interactive and the shape matches the real rows.
 * @param {{rows?: number}} props - props.
 * @returns {object} skeleton list.
 */
function SkListSkeleton(props) {
  var rows = typeof props.rows === "number" ? props.rows : 4;
  var items = [];
  for (var index = 0; index < rows; index += 1) {
    items.push(sk("div", { key: "skrow-" + String(index), className: "sk_skeletonRow" }, [
      sk("span", { className: "sk_skeletonGlyph" }),
      sk("span", { className: "sk_skeletonMain" }, [
        sk("span", { className: "sk_skeletonLine sk_skeletonTitle" }),
        sk("span", { className: "sk_skeletonLine" })
      ]),
      sk("span", { className: "sk_skeletonLine sk_skeletonAction" })
    ]));
  }
  return sk("div", { className: "sk_skeletonList", "aria-hidden": "true" }, items);
}

/**
 * Related skills shown when a search has no direct hit. Items come from the
 * host's deterministic matcher over the live index; the block states its own
 * loading/error/empty state instead of leaving a blank area.
 * @param {{lang: 'zh'|'en', state: object|null, onDetail: Function, onUse: Function}} props - props.
 * @returns {object|null} related block.
 */
function SkRelatedSearch(props) {
  var lang = props.lang;
  var state = props.state;
  if (state === null) return null;
  var rows;
  if (state.status === "loading") rows = sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "related.loading"));
  else if (state.status === "error") rows = sk("p", { className: "sk_secText sk_bad" }, skT(lang, "related.failed", { reason: state.error }));
  else if (state.items.length === 0) rows = sk("p", { className: "sk_secText", "data-dim": "" }, skT(lang, "related.empty"));
  else {
    rows = sk("div", { className: "sk_related" }, state.items.map(function (item) {
      return sk("div", { key: "related-" + item.name, className: "sk_relatedRow" }, [
        sk("div", { className: "sk_relatedMain" }, [
          sk("div", { className: "sk_relatedName" }, item.name),
          sk("div", { className: "sk_relatedWhy" }, lang === "en" && typeof item.reasonEn === "string" && item.reasonEn !== "" ? item.reasonEn : item.reason)
        ]),
        sk("button", { className: "sk_textBtn", type: "button", onClick: function () { props.onDetail(item.name); } }, skT(lang, "action.detail")),
        sk("button", { className: "sk_textBtn", type: "button", onClick: function () { props.onUse(item.name); } }, skT(lang, "related.use"))
      ]);
    }));
  }
  return sk("div", { className: "sk_relatedWrap" }, [
    sk("div", { className: "sk_secLabel" }, skT(lang, "related.title")),
    rows
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
  var selectModeState = (0, import_react.useState)(false);
  var selectMode = selectModeState[0];
  var setSelectMode = selectModeState[1];
  var selectedState = (0, import_react.useState)({});
  var selected = selectedState[0];
  var setSelected = selectedState[1];
  var batchConfirmState = (0, import_react.useState)(false);
  var batchConfirm = batchConfirmState[0];
  var setBatchConfirm = batchConfirmState[1];
  var batchBusyState = (0, import_react.useState)(false);
  var batchBusy = batchBusyState[0];
  var setBatchBusy = batchBusyState[1];
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

  // Request identity for /index and /home. A newer request always wins: an
  // older answer (success, error or abort) may not write page state any more,
  // and every controller is aborted on workspace change or unmount.
  var indexSeq = (0, import_react.useRef)(0);
  var indexAbort = (0, import_react.useRef)(null);
  var homeSeq = (0, import_react.useRef)(0);
  var homeAbort = (0, import_react.useRef)(null);
  var alive = (0, import_react.useRef)(true);

  (0, import_react.useEffect)(function () {
    alive.current = true;
    return function () {
      alive.current = false;
      indexSeq.current += 1;
      homeSeq.current += 1;
      if (indexAbort.current !== null) indexAbort.current.abort();
      if (homeAbort.current !== null) homeAbort.current.abort();
    };
  }, []);

  var requestIndex = (0, import_react.useCallback)(function (options) {
    var settings = options ?? {};
    var showLoading = settings.showLoading !== false;
    indexSeq.current += 1;
    var seq = indexSeq.current;
    if (indexAbort.current !== null) indexAbort.current.abort();
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    indexAbort.current = controller;
    setLoading(showLoading);
    return skApi.index(props.workspace, controller === null ? undefined : controller.signal).then(function (result) {
      if (seq !== indexSeq.current || !alive.current) return null;
      if (!result.ok) {
        if (showLoading) setError(skT(skGetLang(), "notice.indexFailedPlain", { reason: skErrorText(result) }));
        return null;
      }
      setError("");
      setIndex(result.body);
      return result.body;
    }).catch(function (thrown) {
      if (seq !== indexSeq.current || !alive.current) return null;
      if (showLoading) setError(String(thrown));
      return null;
    }).finally(function () {
      if (seq !== indexSeq.current || !alive.current) return;
      if (indexAbort.current === controller) indexAbort.current = null;
      setLoading(false);
    });
  }, [props.workspace]);

  var load = (0, import_react.useCallback)(function () {
    void requestIndex({});
  }, [requestIndex]);

  (0, import_react.useEffect)(function () {
    load();
  }, [load, props.reloadToken, reload]);

  var skills = index === null || !Array.isArray(index.skills) ? [] : index.skills;

  // The recommendation home: ask the host for a conversation-derived pick and
  // fall back to its parked recommendation / this page's real usage history on
  // an older host. Every entry is re-resolved against the live index, so a
  // disabled or removed skill can never survive on screen.
  var requestHome = (0, import_react.useCallback)(function () {
    if (index === null) return;
    var records = Array.isArray(index.skills) ? index.skills : [];
    homeSeq.current += 1;
    var seq = homeSeq.current;
    if (homeAbort.current !== null) homeAbort.current.abort();
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    homeAbort.current = controller;
    setHomeLoading(true);
    setHomeError("");
    void skApi.home(sessionId, props.workspace, controller === null ? undefined : controller.signal).then(function (result) {
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
      return { source: "none", intent: "", at: Date.now(), items: [], error: skErrorText(result) };
    }).then(function (data) {
      if (seq !== homeSeq.current || !alive.current) return;
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
      if (seq !== homeSeq.current || !alive.current) return;
      setHomeError(skT(skGetLang(), "home.error", { reason: String(thrown) }));
      setHomeData({ source: "none", intent: "", at: Date.now(), items: [] });
    }).finally(function () {
      if (seq !== homeSeq.current || !alive.current) return;
      if (homeAbort.current === controller) homeAbort.current = null;
      setHomeLoading(false);
    });
  }, [index, sessionId, props.workspace]);

  (0, import_react.useEffect)(function () {
    requestHome();
  }, [requestHome, homeRefresh]);

  (0, import_react.useEffect)(function () {
    var onKey = function (event) {
      if (event.key !== "Escape") return;
      if (batchConfirm === true) {
        setBatchConfirm(false);
        return;
      }
      if (selectMode === true) {
        setSelectMode(false);
        setSelected({});
        return;
      }
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
  }, [menu, detail, batchConfirm, selectMode, props.onRequestClose]);

  (0, import_react.useEffect)(function () {
    if (menu === null) return undefined;
    var onClick = function () { setMenu(null); };
    window.addEventListener("click", onClick);
    return function () {
      window.removeEventListener("click", onClick);
    };
  }, [menu]);

  // Re-read one record after a write, so the UI never shows state the host did
  // not persist. It shares the index request identity: a delayed initial load
  // may not overwrite this newer answer, and this refresh cannot leave a
  // spinner behind.
  var refreshRecord = (0, import_react.useCallback)(function (name) {
    void requestIndex({ showLoading: false }).then(function (body) {
      if (body === null) return;
      if (detail !== null && detail.name === name) {
        var next = (body.skills ?? []).find(function (row) { return row.name === name; });
        if (next !== undefined) setDetail(next);
      }
    });
  }, [requestIndex, detail]);

  // A disabled button is not enough for a fast double click: keep one write in
  // flight per skill so two toggles cannot race each other.
  var prefBusy = (0, import_react.useRef)({});
  var toggleBusy = (0, import_react.useRef)({});
  var updatePref = function (skill, patch) {
    var body = { name: skill.name, ...props.workspace !== "" ? { workspace: props.workspace } : {} };
    if (patch.favorite !== undefined) body.favorite = patch.favorite;
    if (patch.pinned !== undefined) body.pinned = patch.pinned;
    if (prefBusy.current[skill.name] === true) return;
    prefBusy.current[skill.name] = true;
    void skApi.prefs(body).then(function (result) {
      if (!result.ok) {
        props.onNotice("err", skT(skGetLang(), "notice.prefFailed", { reason: skErrorText(result) }));
        return;
      }
      refreshRecord(skill.name);
    }).finally(function () {
      delete prefBusy.current[skill.name];
    });
  };

  var deleteBusyState = (0, import_react.useState)("");
  var deleteBusy = deleteBusyState[0];
  var setDeleteBusy = deleteBusyState[1];
  var removeSkill = function (skill) {
    if (deleteBusy !== "") return;
    setDeleteBusy(skill.name);
    void skApi.delete({
      workspace: props.workspace,
      rootId: skill.management?.rootId ?? "",
      name: skill.name
    }).then(function (result) {
      if (!result.ok) {
        props.onNotice("err", skT(skGetLang(), "notice.deleteFailed", { reason: skErrorText(result) }));
        return;
      }
      props.onNotice("ok", skT(skGetLang(), "notice.deleteDone", { name: skill.name }));
      setDetail(null);
      setReload(reload + 1);
    }).catch(function (thrown) {
      props.onNotice("err", skT(skGetLang(), "notice.deleteFailed", { reason: String(thrown) }));
    }).finally(function () {
      setDeleteBusy("");
    });
  };

  var toggleSkill = function (skill, kind) {
    if (toggleBusy.current[skill.name] === true) return;
    toggleBusy.current[skill.name] = true;
    var request;
    if (kind === "mounted") {
      request = skApi.override({ workspace: props.workspace, path: skill.management?.path ?? "", disabled: skill.policy?.disabled !== true });
    } else {
      // Send only the flag that was clicked. Sending both made the host's
      // `flagForToggle` pick modelInvocable first, so the user-invocable
      // switch silently toggled model invocation instead.
      var flagBody = {
        workspace: props.workspace,
        rootId: skill.management?.rootId ?? "",
        name: skill.name
      };
      if (kind === "user") flagBody.userInvocable = skill.policy?.userInvocable !== true;
      else flagBody.modelInvocable = skill.policy?.modelInvocable !== true;
      request = skApi.toggle(flagBody);
    }
    var enabling = kind === "mounted"
      ? skill.policy?.disabled === true
      : kind === "user"
        ? skill.policy?.userInvocable !== true
        : skill.policy?.modelInvocable !== true;
    void Promise.resolve(request).then(function (result) {
      if (!result.ok) {
        if (result.body !== null && result.body !== undefined && result.body.code === "security-blocked" && typeof skOpenSecurityReview === "function") {
          skOpenSecurityReview(Object.assign({}, result.body, {
            name: skill.name,
            source: skill.source ?? null,
            code: "security-blocked",
            onContinue: function () { return toggleSkill(skill, kind); }
          }));
        }
        props.onNotice("err", skT(skGetLang(), "notice.toggleFailed", { reason: skErrorText(result) }));
        return;
      }
      refreshRecord(skill.name);
      if (enabling && typeof skOpenSecurityReview === "function") skOpenSecurityReview({ name: skill.name, source: "enable", skill: skill, auto: true });
    }).finally(function () {
      delete toggleBusy.current[skill.name];
    });
  };

  var useSkill = function (skill, recommendation) {
    if (recommendation === true) {
      var acceptedSession = skCurrentSessionId();
      if (acceptedSession !== "") skReportEvent(skill.name, "accepted", "", props.workspace, acceptedSession);
    }
    void skUseSkill(skill.name, props.workspace).then(function (outcome) {
      if (outcome.ok) {
        props.onNotice("ok", skT(skGetLang(), "notice.loaded"));
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
  var stateCounts = (0, import_react.useMemo)(function () {
    var result = { all: skills.length, both: 0, user: 0, model: 0, off: 0, disabled: 0, fav: 0 };
    skills.forEach(function (skill) {
      var availability = skill.policy?.availability ?? "unavailable";
      if (availability === "both") result.both += 1;
      else if (availability === "user") result.user += 1;
      else if (availability === "model") result.model += 1;
      else if (availability === "disabled") result.disabled += 1;
      else result.off += 1;
      if (skill.stats?.favorite === true) result.fav += 1;
    });
    return result;
  }, [skills]);
  var relatedState = (0, import_react.useState)(null);
  var related = relatedState[0];
  var setRelated = relatedState[1];
  var relatedSeq = (0, import_react.useRef)(0);
  var indexMissing = index === null;
  (0, import_react.useEffect)(function () {
    var trimmed = query.trim();
    if (trimmed === "" || filtered.length > 0 || indexMissing === true) {
      relatedSeq.current += 1;
      setRelated(null);
      return;
    }
    var seq = relatedSeq.current + 1;
    relatedSeq.current = seq;
    setRelated({ status: "loading", items: [], error: "" });
    void skApi.search(trimmed, props.workspace, 4).then(function (result) {
      if (seq !== relatedSeq.current) return;
      if (!result.ok) {
        setRelated({ status: "error", items: [], error: skErrorText(result) });
        return;
      }
      setRelated({ status: "ready", items: Array.isArray(result.body.items) ? result.body.items : [], error: "" });
    }).catch(function (thrown) {
      if (seq === relatedSeq.current) setRelated({ status: "error", items: [], error: String(thrown) });
    });
  }, [query, filtered.length, indexMissing, props.workspace]);

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
      : (query !== ""
        ? skT(lang, "skills.searchSub", { query: query, count: filtered.length })
        : skT(lang, "skills.sub", { count: filtered.length, available: totals.available ?? 0 }))
        + (loading && index !== null ? " · " + skT(lang, "skills.refreshing") : "");

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

  var clearAllFilters = function () {
    setQuery("");
    setCategory("");
    setSource("all");
    setStateFilter("all");
  };
  // The empty state says which kind of empty this is: no skills at all, a
  // search with no hit, or filters that exclude everything.
  var emptyState = (totals.all ?? 0) === 0
    ? {
      glyph: skH(SkGridGlyph, { size: 22 }),
      title: skT(lang, "empty.all.title"),
      hint: skT(lang, "empty.all.hint"),
      actionLabel: skT(lang, "empty.all.action"),
      onAction: function () { props.onPanel("install"); }
    }
    : query !== ""
      ? {
        glyph: skH(SkSearchGlyph, {}),
        title: skT(lang, "empty.title"),
        hint: skT(lang, "empty.hint"),
        actionLabel: skT(lang, "empty.clearSearch"),
        onAction: function () { setQuery(""); }
      }
      : {
        glyph: skH(SkSlidersGlyph, { size: 22 }),
        title: skT(lang, "empty.filter.title"),
        hint: skT(lang, "empty.filter.hint"),
        actionLabel: skT(lang, "empty.filter.action"),
        onAction: clearAllFilters
      };

  var dependentsBySkill = (0, import_react.useMemo)(function () {
    var map = {};
    skills.forEach(function (record) {
      (record.requires ?? []).forEach(function (requirement) {
        if (typeof requirement?.name !== "string") return;
        if (!map[requirement.name]) map[requirement.name] = [];
        map[requirement.name].push({ name: record.name, kind: requirement.kind === "mention" ? "mention" : "declared" });
      });
    });
    return map;
  }, [skills]);
  var openRelated = function (name) {
    var record = skills.find(function (row) { return row.name === name; });
    if (record !== undefined) setDetail(record);
  };
  var useRelated = function (name) {
    var record = skills.find(function (row) { return row.name === name; });
    if (record !== undefined) useSkill(record);
  };

  var selectedNames = Object.keys(selected);
  var selectedCount = selectedNames.length;
  var toggleSelect = function (skill) {
    setSelected(function (previous) {
      var next = { ...previous };
      if (next[skill.name] === true) delete next[skill.name];
      else next[skill.name] = true;
      return next;
    });
  };
  var exitSelect = function () {
    setSelectMode(false);
    setSelected({});
    setBatchConfirm(false);
  };
  var selectAllVisible = function () {
    var next = {};
    filtered.forEach(function (skill) { next[skill.name] = true; });
    setSelected(next);
  };
  var exportSelection = function () {
    if (selectedCount === 0) {
      props.onNotice("warn", skT(skGetLang(), "batch.none"));
      return;
    }
    var rows = skills.filter(function (skill) { return selected[skill.name] === true; }).map(function (skill) {
      return {
        name: skill.name,
        version: skill.version ?? null,
        source: skill.source?.type ?? null,
        category: skill.category?.id ?? null,
        availability: skill.policy?.availability ?? null,
        path: skill.management?.path ?? null
      };
    });
    try {
      var payload = JSON.stringify({ exportedAt: new Date().toISOString(), skills: rows }, null, 2);
      var blob = new Blob([payload], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "dsh-charlotte-skills.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
      props.onNotice("ok", skT(skGetLang(), "batch.exported", { count: String(rows.length) }));
    }
    catch (thrown) {
      props.onNotice("err", String(thrown));
    }
  };
  var runBatchDelete = function () {
    if (batchBusy) return;
    var targets = skills.filter(function (skill) {
      return selected[skill.name] === true && skill.management?.kind === "writable";
    });
    if (targets.length === 0) {
      props.onNotice("err", skT(skGetLang(), "batch.noWritable"));
      setBatchConfirm(false);
      return;
    }
    setBatchBusy(true);
    var done = 0;
    var failed = 0;
    var chain = Promise.resolve();
    targets.forEach(function (skill) {
      chain = chain.then(function () {
        return skApi.delete({ workspace: props.workspace, rootId: skill.management?.rootId ?? "", name: skill.name })
          .then(function (result) {
            if (result.ok) done += 1;
            else failed += 1;
          })
          .catch(function () { failed += 1; });
      });
    });
    void chain.then(function () {
      var text = skT(skGetLang(), "batch.done", { done: String(done), failed: String(failed) });
      if (failed === 0) props.onNotice("ok", text);
      else props.onNotice("err", text);
      setSelected({});
      setBatchConfirm(false);
      setSelectMode(false);
      setReload(reload + 1);
    }).finally(function () {
      setBatchBusy(false);
    });
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
                stateCounts: stateCounts,
                selectMode: selectMode,
                onSelectMode: function () {
                  if (selectMode) {
                    setSelectMode(false);
                    setSelected({});
                    setBatchConfirm(false);
                    return;
                  }
                  setSelectMode(true);
                  setSelected({});
                },
                menu: menu,
                total: totals.all ?? 0,
                sourceRows: sourceRows,
                onSort: setSort,
                onSource: setSource,
                onState: setStateFilter,
                onMenu: setMenu
              }),
              !selectMode ? null : sk("div", { className: "sk_batchBar", role: "region", "aria-label": skT(lang, "batch.mode") }, batchConfirm
                ? [
                  sk("span", { className: "sk_batchText" }, skT(lang, "batch.confirm", { count: String(selectedCount) })),
                  sk("button", { className: "sk_textBtn", type: "button", disabled: batchBusy, onClick: function () { setBatchConfirm(false); } }, skT(lang, "action.cancel")),
                  sk("button", { className: "sk_textBtn sk_danger", type: "button", disabled: batchBusy, onClick: runBatchDelete }, batchBusy ? skT(lang, "detail.deleting") : skT(lang, "batch.confirmed"))
                ]
                : [
                  sk("span", { className: "sk_batchCount" }, selectedCount === 0 ? skT(lang, "batch.none") : skT(lang, "batch.selected", { count: String(selectedCount) })),
                  sk("button", { className: "sk_textBtn", type: "button", onClick: selectAllVisible }, skT(lang, "batch.selectAll")),
                  sk("button", { className: "sk_textBtn", type: "button", disabled: selectedCount === 0, onClick: function () { setSelected({}); } }, skT(lang, "batch.clear")),
                  sk("button", { className: "sk_textBtn", type: "button", disabled: selectedCount === 0, onClick: exportSelection }, skT(lang, "batch.export")),
                  sk("button", { className: "sk_textBtn sk_danger", type: "button", disabled: selectedCount === 0, onClick: function () { setBatchConfirm(true); } }, skT(lang, "batch.delete")),
                  sk("button", { className: "sk_textBtn", type: "button", onClick: exitSelect }, skT(lang, "batch.exit"))
                ]),
              loading && index === null
                ? skH(SkListSkeleton, {})
                : filtered.length === 0
                  ? sk("div", null, [
                    skH(SkEmptyState, emptyState),
                    query !== "" ? skH(SkRelatedSearch, { lang: lang, state: related, onDetail: openRelated, onUse: useRelated }) : null
                  ])
                  : sk("div", { className: "sk_list" }, filtered.map(function (skill) {
                    return skH(SkRow, {
                      skill: skill,
                      lang: lang,
                      query: query,
                      selectMode: selectMode,
                      selected: selected[skill.name] === true,
                      onSelect: toggleSelect,
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
      onToggle: toggleSkill,
      onDelete: removeSkill,
      deleting: deleteBusy,
      dependents: dependentsBySkill[detail.name] ?? []
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
/**
 * One notice row. Success/info/warn auto-dismiss; errors stay until the user
 * closes them, so a failure is never silently lost.
 * @param {{notice: {id: number, kind: string, text: string}, onDismiss: Function, lang: 'zh'|'en'}} props - props.
 * @returns {object} notice row.
 */
function SkNoticeRow(props) {
  var notice = props.notice;
  var lang = props.lang;
  (0, import_react.useEffect)(function () {
    if (notice.kind === "err" || typeof window === "undefined") return undefined;
    var ttl = notice.kind === "ok" ? 4000 : notice.kind === "warn" ? 8000 : 5000;
    var timer = window.setTimeout(function () {
      props.onDismiss(notice.id);
    }, ttl);
    return function () {
      window.clearTimeout(timer);
    };
  }, [notice.id, notice.kind, props.onDismiss]);
  return sk("div", { className: "sk_notice", "data-kind": notice.kind, role: notice.kind === "err" ? "alert" : "status" }, [
    sk("span", { className: "sk_noticeText" }, notice.text),
    sk("button", {
      className: "sk_noticeAction",
      type: "button",
      "aria-label": skT(lang, "notice.dismiss"),
      onClick: function () { props.onDismiss(notice.id); }
    }, "✕")
  ]);
}

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
  var securityOpenState = (0, import_react.useState)(false);
  var securityOpen = securityOpenState[0];
  var setSecurityOpen = securityOpenState[1];
  var securityReviewState = (0, import_react.useState)(null);
  var securityReview = securityReviewState[0];
  var setSecurityReview = securityReviewState[1];
  var securityReviewKey = (0, import_react.useRef)(0);
  var openSecurityReview = (0, import_react.useCallback)(function (detail) {
    securityReviewKey.current += 1;
    setSecurityReview(Object.assign({}, detail ?? {}, { key: "review-" + String(securityReviewKey.current) }));
  }, []);
  var openPanel = (0, import_react.useCallback)(function (name) {
    if (name === "security") {
      setSecurityOpen(true);
      return;
    }
    setPanel(name);
  }, []);
  var noticesState = (0, import_react.useState)([]);
  var notices = noticesState[0];
  var setNotices = noticesState[1];
  var noticeIdRef = (0, import_react.useRef)(0);
  var reloadState = (0, import_react.useState)(0);
  var reload = reloadState[0];
  var setReload = reloadState[1];
  var pushNotice = (0, import_react.useCallback)(function (kind, text) {
    var normalized = kind === "error" ? "err" : kind === "success" ? "ok" : kind === "warning" ? "warn" : kind;
    var allowed = normalized === "ok" || normalized === "warn" || normalized === "err" ? normalized : "info";
    noticeIdRef.current += 1;
    var item = { id: noticeIdRef.current, kind: allowed, text: String(text ?? "") };
    setNotices(function (previous) {
      var next = previous.concat([item]);
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
  }, []);
  var dismissNotice = (0, import_react.useCallback)(function (id) {
    setNotices(function (previous) {
      return previous.filter(function (row) { return row.id !== id; });
    });
  }, []);
  (0, import_react.useEffect)(function () {
    skNoticeSetSink(pushNotice);
    return function () {
      skNoticeSetSink(null);
    };
  }, [pushNotice]);
  (0, import_react.useEffect)(function () {
    var offCenter = skSecurityPromptSubscribe(function () {
      setSecurityOpen(true);
    });
    var offReview = typeof skSecurityReviewSubscribe === "function"
      ? skSecurityReviewSubscribe(function (detail) { openSecurityReview(detail); })
      : function () {};
    return function () {
      offCenter();
      offReview();
    };
  }, [openSecurityReview]);
  // A background scan after a body/external-directory change publishes a
  // notification for the changed skill; open the review once, not on every poll.
  (0, import_react.useEffect)(function () {
    var alive = true;
    var timer = window.setInterval(function () {
      if (securityReview !== null || securityOpen === true) return;
      var query = workspace !== "" ? "?workspace=" + encodeURIComponent(workspace) : "";
      void skCall("/security/status" + query).then(function (result) {
        if (!alive || !result.ok) return;
        var notes = Array.isArray(result.body.notifications) ? result.body.notifications : [];
        var hit = notes.find(function (row) { return typeof row.target === "string" && row.target.indexOf("skill:") === 0; });
        if (hit !== undefined) openSecurityReview({ name: hit.target.slice("skill:".length), source: "change", findings: [] });
      }).catch(function () {
        // Background review polling is best effort.
      });
    }, 30000);
    return function () {
      alive = false;
      window.clearInterval(timer);
    };
  }, [workspace, securityReview, securityOpen, openSecurityReview]);
  (0, import_react.useEffect)(function () {
    void skApi.roots().then(function (result) {
      if (result.ok && Array.isArray(result.body.workspaces)) setWorkspaces(result.body.workspaces);
    });
  }, []);
  return sk("div", { className: "sk_station" + (props.embedded === true ? " sk_stationEmbedded" : "") }, [
    sk("div", { className: "sk_notices", "aria-live": "polite" }, notices.map(function (row) {
      return skH(SkNoticeRow, { notice: row, onDismiss: dismissNotice, lang: skGetLang() }, "notice-" + row.id);
    })),
    skH(SkillBrowse, {
      workspace: workspace,
      workspaces: workspaces,
      onWorkspace: setWorkspace,
      onPanel: openPanel,
      reloadToken: reload,
      onNotice: pushNotice,
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
    }),
    securityOpen ? skH(SkSecurityCenter, {
      lang: skGetLang(),
      workspace: workspace,
      onClose: function () {
        setSecurityOpen(false);
        setReload(reload + 1);
      }
    }) : null,
    securityReview !== null ? skH(SkSecurityReview, {
      key: securityReview.key,
      initial: securityReview,
      lang: skGetLang(),
      workspace: workspace,
      onContinue: securityReview.onContinue,
      onClose: function () {
        setSecurityReview(null);
        setReload(reload + 1);
      }
    }) : null
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
    skErrorText: skErrorText,
    skHighlightParts: skHighlightParts,
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
    skFallbackHome: skFallbackHome,
    skFavGroups: skFavGroups,
    strings: SK_STRINGS,
    api: skApi,
    dock: typeof SkRecommendDock === "function" ? SkRecommendDock : null,
    registerDock: typeof skRegisterRecommendDock === "function" ? skRegisterRecommendDock : null
  };
}


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
    // Load stages the skill token and nothing else: the user writes the task.
    void skUseSkill(item.name, "").then(function (outcome) {
      if (!aliveRef.current) return;
      setBusy("");
      if (outcome.ok) {
        setStatus({ kind: "ok", text: skT(lang, "dock.loaded") });
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
/* The drawer must never start inside the macOS titlebar band. DSH desktop
   uses titleBarStyle "hiddenInset" with trafficLightPosition {x:16,y:18}:
   the three buttons end around y=30, and Windows' titleBarOverlay band is
   40px. Reserving one band above and below the centred panel means its top
   edge can never be closer than 48px to the window top, at any window size,
   so the native buttons always sit on the backdrop and never on the panel.
   This is the only place the geometry is expressed: no per-element padding,
   no media queries, no window-width guessing. If the host changes its
   window chrome later, this one value is the knob. */
.ss_panel{width:1180px;max-width:96vw;--sk-titlebar-band:48px;height:min(840px, calc(100vh - 2 * var(--sk-titlebar-band)))}
.ss_overlay{backdrop-filter:blur(2px)}
.sk_station{box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary);position:relative;font-size:13px;--sk-accent:#3d7ef0;--sk-accent-hover:#4f8bf5;--sk-r-sm:8px;--sk-r-md:12px;--sk-r-lg:14px;--sk-z-scrim:20;--sk-z-drawer:21;--sk-z-menu:30;--sk-z-popover:40;--sk-z-modal:50;--sk-z-toast:60}
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
.sk_recUse{height:36px;padding:0 20px;border:0;border-radius:var(--sk-r-sm,8px);background:var(--sk-accent,#3d7ef0);color:#fff;font:inherit;font-size:13.5px;font-weight:560;cursor:pointer}
.sk_recUse:hover{background:var(--sk-accent-hover,#4f8bf5)}
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
.sk_reviewBadge{flex:none;font-size:10px;line-height:16px;padding:0 6px;border-radius:999px;color:var(--dsw-alias-label-secondary,#c9c9d1);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2,#22232a)}
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
.sk_filterMenu{position:absolute;top:calc(100% + 6px);right:0;z-index:var(--sk-z-menu,30);min-width:188px;padding:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#17181b);box-shadow:0 14px 36px rgba(0,0,0,.28)}
.sk_filterMenu[hidden]{display:none}
.sk_filterItem{display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;text-align:left;cursor:pointer}
.sk_filterItem:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_filterItem[data-on]{font-weight:560}
.sk_filterItem em{font-style:normal;margin-left:auto;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}

/* ------------------------------- detail drawer ---------------------------- */
.sk_drawerScrim{position:absolute;inset:0;background:rgba(0,0,0,.24);z-index:var(--sk-z-scrim,20)}
.sk_drawer{position:absolute;top:0;right:0;bottom:0;width:min(760px,92vw);z-index:var(--sk-z-drawer,21);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#17181b);border-left:1px solid var(--dsw-alias-border-l2);box-shadow:-24px 0 60px rgba(0,0,0,.22)}
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
.sk_drawerFoot{flex:none;padding:13px 22px 16px;border-top:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.sk_confirmText{flex:1 1 100%;min-width:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}
.sk_primary{height:32px;padding:0 16px;border:0;border-radius:var(--sk-r-sm,8px);background:var(--sk-accent,#3d7ef0);color:#fff;font:inherit;font-size:13px;font-weight:520;cursor:pointer}
.sk_primary:hover{background:var(--sk-accent-hover,#4f8bf5)}
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
.sk_more{position:absolute;top:calc(100% + 8px);right:0;z-index:var(--sk-z-popover,40);width:272px;max-height:min(440px,72vh);overflow:auto;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#17181b);box-shadow:0 16px 40px rgba(0,0,0,.3)}
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
.sk_panelScrim{position:absolute;inset:0;background:rgba(0,0,0,.3);z-index:var(--sk-z-modal,50);display:flex;align-items:center;justify-content:center;padding:20px}
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
  .sk_toolbar{gap:8px;row-gap:6px;flex-wrap:wrap}
  .sk_row{grid-template-columns:22px minmax(0,1fr) auto;gap:10px;min-height:0;padding:12px 2px}
  .sk_state{display:none}
  .sk_src{display:none}
  .sk_actions{grid-column:2 / -1;justify-content:flex-end;margin-top:-6px}
  .sk_drawer{width:100%;max-width:100%}
  .sk_notice{margin:0 18px 8px}
  .sk_notices{margin:10px 18px 0}
  .skd_card{margin:0 10px 8px}
}

/* narrowest supported width (desktop window minimum is 520px) */
@media (max-width:600px){
  .sk_side{padding:8px 12px}
  .sk_navItem{height:28px;padding:0 8px}
  .sk_topbar{padding:14px 12px 8px}
  .sk_view{padding:0 12px 16px}
  .sk_notice{margin:0 12px 8px}
  .sk_notices{margin:8px 12px 0}
  .skd_card{margin:0 8px 8px}
  .sk_recHero{padding:18px 14px 16px}
  .sk_panelScrim{padding:10px}
  .sk_panel{width:100%;max-height:94%}
  .sk_drawerHead{padding:14px 14px 10px}
  .sk_drawerBody{padding:14px 14px 4px}
  .sk_drawerFoot{padding:10px 14px 12px;flex-wrap:wrap}
  .sk_ledgerTotals{grid-template-columns:repeat(2,minmax(0,1fr))}
}

/* ------------------------------- inspection ----------------------------- */
.sk_level{display:inline-flex;align-items:center;padding:1px 7px;border-radius:99px;font-size:11px;line-height:16px;background:var(--dsw-alias-bg-layer-3)}
.sk_level[data-level="ok"]{color:#30b45c}
.sk_level[data-level="warn"]{color:#c98a1c}
.sk_level[data-level="error"],.sk_level[data-level="high"]{color:var(--dsw-alias-state-error-primary,#e05b5b)}
.sk_relatedWrap{margin:16px 0 0;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2)}
.sk_related{display:flex;flex-direction:column;gap:2px;margin-top:6px}
.sk_relatedRow{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_relatedRow:last-child{border-bottom:0}
.sk_relatedMain{flex:1;min-width:0}
.sk_relatedName{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary)}
.sk_relatedWhy{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}

/* --------------------------------- selection ---------------------------- */
.sk_check{flex:none;width:18px;height:18px;margin-left:4px;border:1px solid var(--dsw-alias-border-l3,#55585e);border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;color:#fff;background:transparent}
.sk_checkOn{background:var(--sk-accent,#3d7ef0);border-color:var(--sk-accent,#3d7ef0)}
.sk_rowSelected{background:color-mix(in srgb,var(--sk-accent,#3d7ef0) 8%,transparent)}
.sk_batchBar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0 10px;border-bottom:1px solid var(--dsw-alias-border-l2);margin-bottom:2px}
.sk_batchCount{font-size:12px;color:var(--dsw-alias-label-secondary);margin-right:auto}
.sk_batchText{flex:1 1 100%;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}

/* -------------------------------- detail info --------------------------- */
.sk_pathRow{display:flex;align-items:flex-start;gap:9px;margin-top:8px;min-width:0}
.sk_pathText{flex:1;min-width:0;font:inherit;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:4px 8px;overflow-wrap:anywhere;white-space:normal}
.sk_infoActions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.sk_bodyPreview{margin-top:8px}
.sk_pre{margin:0;max-height:260px;overflow:auto;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2,transparent);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere}

/* ------------------------------ notices / search / skeleton ------------- */
.sk_notices{display:flex;flex-direction:column;gap:6px;margin:12px 30px 0;position:relative;z-index:var(--sk-z-toast,60)}
.sk_notices:empty{display:none}
.sk_notices .sk_notice{margin:0}
.sk_noticeText{flex:1;min-width:0;overflow-wrap:anywhere}
.sk_searchClear{flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;cursor:pointer;padding:0}
.sk_searchClear:hover{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}
.sk_mark{background:color-mix(in srgb,var(--sk-accent,#3d7ef0) 24%,transparent);color:var(--dsw-alias-label-primary);border-radius:3px;padding:0 1px}
.sk_danger{color:var(--dsw-alias-state-error-primary,#e05b5b)}
.sk_danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05b5b) 12%,transparent);color:var(--dsw-alias-state-error-primary,#e05b5b)}
.sk_skeletonList{display:flex;flex-direction:column;gap:2px;padding:2px 0}
.sk_skeletonRow{display:flex;align-items:center;gap:14px;min-height:72px;padding:10px 6px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_skeletonGlyph{width:22px;height:22px;border-radius:6px;background:var(--dsw-alias-bg-layer-3)}
.sk_skeletonMain{display:flex;flex-direction:column;gap:7px;flex:1;min-width:0}
.sk_skeletonLine{height:11px;border-radius:5px;background:var(--dsw-alias-bg-layer-3)}
.sk_skeletonTitle{width:34%}
.sk_skeletonAction{width:72px;height:26px;border-radius:7px;background:var(--dsw-alias-bg-layer-3);flex:none}
.sk_skeletonGlyph,.sk_skeletonLine,.sk_skeletonAction{animation:skSkeletonPulse 1.4s ease-in-out infinite}
@keyframes skSkeletonPulse{0%,100%{opacity:.45}50%{opacity:.9}}

/* ------------------------------- accessibility ---------------------------- */
.sk_closeBtn:focus-visible,.sk_textBtn:focus-visible,.sk_searchClear:focus-visible,.sk_danger:focus-visible,.sk_search:focus-within,.sk_sort:focus-visible,
.sk_filter:focus-visible,.sk_filterItem:focus-visible,.sk_row:focus-visible,.sk_use:focus-visible,
.sk_detailBtn:focus-visible,.sk_iconBtn:focus-visible,.sk_primary:focus-visible,.sk_switch:focus-visible,
.sk_moreBtn:focus-visible,.sk_moreItem:focus-visible,.sk_favRow:focus-visible,.sk_navItem:focus-visible,
.sk_homeCat:focus-visible,.sk_recRow:focus-visible,.sk_recUse:focus-visible,
.skd_use:focus-visible,.skd_ignore:focus-visible,.skd_toggle:focus-visible{
  outline:2px solid var(--dsw-alias-link,#4c8dff);outline-offset:2px
}
@media (prefers-reduced-motion:reduce){
  .sk_switch:after{transition:none}
  .sk_skeletonGlyph,.sk_skeletonLine,.sk_skeletonAction{animation:none;opacity:.6}
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


/* ------------------------------ security center --------------------------- */
.sk_secScrim{position:absolute;inset:0;z-index:var(--sk-z-modal,50);display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.42);backdrop-filter:blur(3px)}
.sk_secPanel{box-sizing:border-box;width:min(1040px,95vw);height:min(860px,calc(100vh - 2 * var(--sk-titlebar-band,48px)));display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#17181b);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.45);overflow:hidden}
.sk_secHead{display:flex;align-items:flex-start;gap:14px;padding:22px 24px 16px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:none}
.sk_secHeadText{flex:1;min-width:0}
.sk_secTitleRow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sk_secTitle{margin:0;font-size:19px;line-height:1.3;font-weight:650;letter-spacing:-.01em}
.sk_secSub{margin:5px 0 0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.sk_secMeta{margin:6px 0 0;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.sk_secBadge{font-size:10.5px;line-height:20px;padding:0 9px;border-radius:99px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.sk_secBadge[data-sev="CRITICAL"]{background:rgba(214,64,64,.16);color:#f07575;border-color:rgba(214,64,64,.35)}
.sk_secBadge[data-sev="HIGH"]{background:rgba(206,124,38,.16);color:#e6a15a;border-color:rgba(206,124,38,.32)}
.sk_secBadge[data-sev="MEDIUM"]{background:rgba(196,170,32,.14);color:#d6c05a;border-color:rgba(196,170,32,.3)}
.sk_secBadge[data-sev="LOW"]{background:rgba(74,125,200,.14);color:#7fa6e0;border-color:rgba(74,125,200,.3)}
.sk_secBadge[data-sev="INFO"]{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary)}
.sk_secBadge[data-sev="CLEAN"]{background:rgba(48,180,92,.14);color:#5ecf86;border-color:rgba(48,180,92,.3)}
.sk_secBadge[data-sev="SCANNING"]{background:rgba(74,125,200,.14);color:#7fa6e0;border-color:rgba(74,125,200,.3)}
.sk_secBody{flex:1;min-height:0;overflow:auto;padding:18px 24px 26px}
.sk_secStats{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-bottom:16px}
.sk_secStat{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2,transparent)}
.sk_secStatValue{font-size:19px;line-height:1.2;font-weight:650;font-variant-numeric:tabular-nums}
.sk_secStatLabel{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
.sk_secStat[data-sev="critical"] .sk_secStatValue{color:#f07575}
.sk_secStat[data-sev="high"] .sk_secStatValue{color:#e6a15a}
.sk_secStat[data-sev="medium"] .sk_secStatValue{color:#d6c05a}
.sk_secStat[data-sev="low"] .sk_secStatValue{color:#7fa6e0}
.sk_secControls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.sk_secPrimary{height:32px;padding:0 14px;border:0;border-radius:8px;background:var(--sk-accent,#3d7ef0);color:#fff;font:inherit;font-size:12.5px;font-weight:560;cursor:pointer}
.sk_secPrimary:hover{background:var(--sk-accent-hover,#4f8bf5)}
.sk_secPrimary:disabled{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);cursor:default}
.sk_secRuleCount{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.sk_secProgress{padding:12px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;margin-bottom:12px;background:var(--dsw-alias-bg-layer-2,transparent)}
.sk_secProgressHead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.sk_secProgressPhase{font-weight:600;color:var(--dsw-alias-label-secondary)}
.sk_secProgressCount,.sk_secProgressElapsed{font-variant-numeric:tabular-nums}
.sk_secProgressElapsed{margin-left:auto}
.sk_secBar{height:5px;border-radius:99px;background:var(--dsw-alias-bg-layer-3);overflow:hidden;margin:8px 0 6px}
.sk_secBarFill{height:100%;border-radius:99px;background:var(--sk-accent,#3d7ef0);transition:width .25s ease}
.sk_secProgressCurrent{font-size:11.5px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_secBanner{padding:9px 12px;border-radius:8px;font-size:12px;line-height:18px;margin-bottom:12px;border:1px solid rgba(206,124,38,.32);background:rgba(206,124,38,.1);color:#e6a15a}
.sk_secBanner[data-kind="failed"]{border-color:rgba(214,64,64,.35);background:rgba(214,64,64,.1);color:#f07575}
.sk_secError{padding:9px 12px;border-radius:8px;font-size:12px;line-height:18px;margin-bottom:12px;border:1px solid rgba(214,64,64,.3);background:rgba(214,64,64,.08);color:#f07575}
.sk_secLoading{padding:24px 4px;font-size:12.5px;color:var(--dsw-alias-label-tertiary)}
.sk_secFilters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l2);border-bottom:1px solid var(--dsw-alias-border-l2);margin-bottom:10px}
.sk_secSeg{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-3)}
.sk_secSegBtn{height:25px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;cursor:pointer}
.sk_secSegBtn[data-on]{background:var(--dsw-alias-bg-layer-1,#17181b);color:var(--dsw-alias-label-primary);font-weight:600}
.sk_secFilters .sk_select{height:28px;font-size:11.5px;max-width:170px}
.sk_secSearch{flex:1;min-width:180px;height:28px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:0}
.sk_secInput{box-sizing:border-box;width:100%;min-height:64px;margin:4px 0 8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;resize:vertical;outline:0}
.sk_secInput:focus{border-color:var(--dsw-alias-border-l3)}
.sk_secSearch:focus{border-color:var(--dsw-alias-border-l3)}
.sk_secListHead{font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);margin:6px 0 8px}
.sk_secList{display:flex;flex-direction:column}
.sk_secFinding{border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_secFindingHead{display:grid;grid-template-columns:78px 92px minmax(0,1fr) auto 14px;align-items:center;gap:8px;min-height:38px;cursor:pointer;outline:0}
.sk_secFindingHead:focus-visible{box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l3)}
.sk_secSev{font-size:10px;font-weight:700;letter-spacing:.04em;color:var(--dsw-alias-label-secondary)}
.sk_secFinding[data-sev="CRITICAL"] .sk_secSev{color:#f07575}
.sk_secFinding[data-sev="HIGH"] .sk_secSev{color:#e6a15a}
.sk_secFinding[data-sev="MEDIUM"] .sk_secSev{color:#d6c05a}
.sk_secFinding[data-sev="LOW"] .sk_secSev{color:#7fa6e0}
.sk_secRule{font-size:10.5px;font-family:var(--dsw-font-mono,ui-monospace,monospace);color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.sk_secFindingTitle{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_secState{font-size:10.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.sk_secChevron{font-size:9px;color:var(--dsw-alias-label-tertiary)}
.sk_secFindingMeta{display:flex;align-items:baseline;gap:10px;padding:0 0 8px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);flex-wrap:wrap}
.sk_secFindingDesc{flex:1;min-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_secPath{font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:10.5px;max-width:44%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_secTime{white-space:nowrap;font-variant-numeric:tabular-nums}
.sk_secDetail{padding:2px 0 14px 8px;border-left:2px solid var(--dsw-alias-border-l2);margin:0 0 6px 6px}
.sk_secField{margin:0 0 10px}
.sk_secFieldLabel{display:block;font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);margin-bottom:3px}
.sk_secFieldText{margin:0;font-size:12px;line-height:18.5px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.sk_secEvidence{margin:0;padding:9px 11px;max-height:220px;overflow:auto;border-radius:7px;background:var(--dsw-alias-bg-layer-3,rgba(255,255,255,.05));font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere}
.sk_secRefs{display:flex;flex-direction:column;gap:2px}
.sk_secRef{font-size:11px;color:var(--dsw-alias-link,#4c8dff);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_secRef:hover{text-decoration:underline}
.sk_secDetailActions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px}
.sk_secDetailActions .sk_textBtn,.sk_secDetailActions .sk_secPrimary{height:27px;font-size:11.5px}
.sk_secFix{padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;margin:8px 0;background:var(--dsw-alias-bg-layer-2,transparent)}
.sk_secFixHead{font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary);margin-bottom:4px}
.sk_secFix .sk_secFieldLabel{margin-top:6px}
.sk_secNote{margin:10px 0 0;font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.sk_secEmpty{display:flex;flex-direction:column;gap:4px;padding:36px 8px;text-align:center;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.sk_secEmpty strong{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
@media (max-width:900px){.sk_secStats{grid-template-columns:repeat(4,minmax(0,1fr))}.sk_secFindingHead{grid-template-columns:66px 80px minmax(0,1fr) 14px}.sk_secState{display:none}}

/* ------------------------------ security review --------------------------- */
.sk_srPanel{width:min(980px,94vw);height:min(820px,calc(100vh - 2 * var(--sk-titlebar-band,48px)))}
.sk_srBody{flex:1;min-height:0;overflow:auto;padding:18px 24px 24px}
.sk_srStats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:10px}
.sk_srMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:16px}
.sk_srMetric{display:flex;flex-direction:column;gap:3px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px}
.sk_srMetric strong{font-size:17px;line-height:1.2;font-variant-numeric:tabular-nums}
.sk_srMetric span{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
.sk_srChecks{display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;margin-bottom:16px;overflow:hidden}
.sk_srCheck{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_srCheck:last-child{border-bottom:0}
.sk_srCheckDot{width:7px;height:7px;margin-top:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}
.sk_srCheck[data-status="passed"] .sk_srCheckDot{background:#30b45c}
.sk_srCheck[data-status="warning"] .sk_srCheckDot{background:#d6c05a}
.sk_srCheck[data-status="failed"] .sk_srCheckDot{background:#f07575}
.sk_srCheck[data-status="partial"] .sk_srCheckDot{background:#e6a15a}
.sk_srCheckText{display:flex;flex-direction:column;gap:2px;min-width:0}
.sk_srCheckText strong{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary)}
.sk_srCheckText span{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}
.sk_srCheckState{font-size:11px;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.sk_srCheck[data-status="failed"] .sk_srCheckState{color:#f07575}
.sk_srCheck[data-status="warning"] .sk_srCheckState{color:#d6c05a}
.sk_srCheck[data-status="passed"] .sk_srCheckState{color:#5ecf86}
.sk_srPicker{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.sk_srPicker label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.sk_srPicker .sk_select{min-width:240px}
.sk_srAuth{padding:12px;border:1px solid rgba(206,124,38,.32);border-radius:10px;background:rgba(206,124,38,.07);margin:12px 0}
.sk_srFoot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 24px;border-top:1px solid var(--dsw-alias-border-l2);flex:none}
.sk_srFootState{font-size:11px;font-weight:600;margin-right:auto;color:var(--dsw-alias-label-tertiary)}
.sk_srFootState[data-sev="CLEAN"]{color:#5ecf86}
.sk_srFootState[data-sev="CRITICAL"]{color:#f07575}
.sk_srFootState[data-sev="HIGH"]{color:#e6a15a}
.sk_srFootState[data-sev="MEDIUM"]{color:#d6c05a}
.sk_srFootState[data-sev="SCANNING"]{color:#7fa6e0}
@media (max-width:900px){.sk_srStats{grid-template-columns:repeat(3,minmax(0,1fr))}.sk_srMetrics{grid-template-columns:repeat(2,minmax(0,1fr))}.sk_srCheck{grid-template-columns:12px minmax(0,1fr)}.sk_srCheckState{grid-column:2;justify-self:start}}

.sk_srAllList{display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;overflow:hidden;margin-bottom:16px}
.sk_srAllRow{display:grid;grid-template-columns:minmax(120px,1.2fr) minmax(120px,1fr) 84px 48px;gap:10px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_srAllRow:last-child{border-bottom:0}
.sk_srAllRow[role="button"]{cursor:pointer}
.sk_srAllRow[role="button"]:hover{background:var(--dsw-alias-bg-layer-3)}
.sk_srAllName{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.sk_srAllSource{font-size:11px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_srAllState{font-size:11px;font-weight:600;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.sk_srAllCount{justify-self:end;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.sk_srAllRow[data-state="PASSED"] .sk_srAllState{color:#5ecf86}
.sk_srAllRow[data-state="WARNING"] .sk_srAllState{color:#d6c05a}
.sk_srAllRow[data-state="BLOCKED"] .sk_srAllState{color:#f07575}
.sk_srAllRow[data-state="FAILED"] .sk_srAllState{color:#f07575}
.sk_srAllRow[data-state="PARTIAL"] .sk_srAllState,.sk_srAllRow[data-state="STALE"] .sk_srAllState{color:#e6a15a}
.sk_secBanner[data-kind="passed"]{border-color:rgba(48,180,92,.3);background:rgba(48,180,92,.1);color:#5ecf86}
.sk_secBanner[data-kind="cancelled"]{border-color:rgba(74,125,200,.3);background:rgba(74,125,200,.1);color:#7fa6e0}
@media (max-width:700px){.sk_srAllRow{grid-template-columns:minmax(0,1fr) 76px 40px}.sk_srAllSource{display:none}}




/* ---------------------- skill detail: tabbed information ------------------ */
.sk_detailDrawer{width:min(880px,94vw)}
.sk_detailNameRow{display:flex;align-items:baseline;gap:8px;min-width:0}
.sk_detailVersion{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}
.sk_detailState{display:inline-flex;align-items:center;gap:5px;font-size:11.5px}
.sk_detailDot{width:5px;height:5px;border-radius:50%;background:#30b45c}
.sk_detailState[data-kind="off"] .sk_detailDot{background:var(--dsw-alias-label-tertiary)}
.sk_detailTabs{display:flex;align-items:center;gap:2px;flex:none;padding:0 22px;border-bottom:1px solid var(--dsw-alias-border-l2);overflow-x:auto;scrollbar-width:none}
.sk_detailTabs::-webkit-scrollbar{display:none}
.sk_detailTab{flex:none;height:38px;padding:0 11px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}
.sk_detailTab:hover{color:var(--dsw-alias-label-primary)}
.sk_detailTab[data-on]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--sk-accent,#3d7ef0);font-weight:600}
.sk_tabsBody{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:18px 24px 30px}
.sk_detailTabBody{max-width:760px;min-width:0}
.sk_detailHero{padding:2px 0 14px}
.sk_eyebrow{font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);margin-bottom:6px}
.sk_detailHeroName{margin:0;font-size:22px;line-height:1.3;font-weight:650;letter-spacing:-.02em;overflow-wrap:anywhere}
.sk_detailLead{margin:8px 0 0;font-size:13.5px;line-height:21px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.sk_detailText{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.sk_detailMuted{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.sk_detailUnavailable{padding:12px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2,transparent)}
.sk_detailUnavailable strong{display:block;font-size:12.5px;color:var(--dsw-alias-label-primary);margin-bottom:4px}
.sk_detailUnavailable p{margin:0 0 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.sk_detailDoc{margin-top:2px}
.sk_detailChips{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0 10px}
.sk_detailTagEdit{margin-top:4px}
.sk_detailToggles{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.sk_detailToggles .sk_toggle{margin-left:0}
.sk_detailDeleteConfirm{padding:10px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05b5b) 30%,transparent);border-radius:9px;margin-top:8px}
.sk_detailDeleteConfirm .sk_detailText{margin-bottom:8px}

/* security tab */
.sk_detailSecurityHead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.sk_detailBadge{font-size:10.5px;line-height:20px;padding:0 9px;border-radius:99px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.sk_detailBadge[data-sev="CRITICAL"]{background:rgba(214,64,64,.15);color:#f07575;border-color:rgba(214,64,64,.32)}
.sk_detailBadge[data-sev="HIGH"]{background:rgba(206,124,38,.15);color:#e6a15a;border-color:rgba(206,124,38,.3)}
.sk_detailBadge[data-sev="MEDIUM"]{background:rgba(196,170,32,.13);color:#d6c05a;border-color:rgba(196,170,32,.28)}
.sk_detailBadge[data-sev="LOW"]{background:rgba(74,125,200,.13);color:#7fa6e0;border-color:rgba(74,125,200,.28)}
.sk_detailBadge[data-sev="CLEAN"]{background:rgba(48,180,92,.13);color:#5ecf86;border-color:rgba(48,180,92,.28)}
.sk_detailSecurityActions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:14px}
.sk_detailSecurityActions .sk_primary,.sk_detailSecurityActions .sk_textBtn{height:29px;font-size:12px}
.sk_detailRiskStats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-bottom:14px}
.sk_detailRiskStat{display:flex;flex-direction:column;gap:1px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2,transparent)}
.sk_detailRiskStat strong{font-size:18px;line-height:1.15;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.sk_detailRiskStat span{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
.sk_detailRiskStat[data-sev="critical"] strong{color:#f07575}
.sk_detailRiskStat[data-sev="high"] strong{color:#e6a15a}
.sk_detailRiskStat[data-sev="medium"] strong{color:#d6c05a}
.sk_detailRiskStat[data-sev="unresolved"] strong{color:var(--dsw-alias-label-primary)}
.sk_detailFindings{display:flex;flex-direction:column;margin-top:4px}
.sk_detailFinding{border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_detailFindingHead{display:grid;grid-template-columns:67px 86px minmax(0,1fr) auto 14px;align-items:center;gap:7px;width:100%;min-height:36px;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.sk_detailSev{font-size:9.5px;font-weight:700;letter-spacing:.04em;color:var(--dsw-alias-label-secondary)}
.sk_detailFinding[data-sev="CRITICAL"] .sk_detailSev{color:#f07575}
.sk_detailFinding[data-sev="HIGH"] .sk_detailSev{color:#e6a15a}
.sk_detailFinding[data-sev="MEDIUM"] .sk_detailSev{color:#d6c05a}
.sk_detailFinding[data-sev="LOW"] .sk_detailSev{color:#7fa6e0}
.sk_detailRule{font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:10px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk_detailFindingTitle{font-size:12px;line-height:17px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk_detailFindingState{font-size:10px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.sk_detailChevron{font-size:9px;color:var(--dsw-alias-label-tertiary)}
.sk_detailFindingBody{padding:4px 0 12px 8px;border-left:2px solid var(--dsw-alias-border-l2);margin:0 0 6px 5px}
.sk_detailFindingBody .sk_secLabel{margin-top:8px}
.sk_detailRefs{display:flex;flex-direction:column;gap:2px;margin-top:6px}
.sk_detailFindingBody .sk_mdPre{max-height:none;overflow-x:auto;overflow-y:visible;white-space:pre-wrap}

/* usage tab */
.sk_detailUsageStats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-bottom:16px}
.sk_detailUsageStat{display:flex;flex-direction:column;gap:2px;padding:10px 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2,transparent)}
.sk_detailUsageStat strong{font-size:19px;line-height:1.15;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.sk_detailUsageStat span{font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
.sk_hist th{text-align:left;padding:0 8px 6px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:10.5px;font-weight:600;color:var(--dsw-alias-label-tertiary)}
.sk_hist td{padding:6px 8px 6px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:11.5px;vertical-align:top}
.sk_hist td:first-child{white-space:nowrap;font-variant-numeric:tabular-nums}
.sk_hist td:last-child{text-align:left;color:var(--dsw-alias-label-tertiary);white-space:normal;overflow-wrap:anywhere}
.sk_detailFootHint{margin-left:auto;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}

/* markdown */
.sk_md{font-size:13px;line-height:21px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.sk_md > :first-child{margin-top:0}
.sk_md > :last-child{margin-bottom:0}
.sk_mdHeading{margin:20px 0 8px;line-height:1.3;font-weight:650;letter-spacing:-.01em;color:var(--dsw-alias-label-primary)}
.sk_mdH1{font-size:20px;padding-bottom:6px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.sk_mdH2{font-size:17px}
.sk_mdH3{font-size:15px}
.sk_mdH4,.sk_mdH5,.sk_mdH6{font-size:13.5px}
.sk_mdParagraph{margin:0 0 10px}
.sk_mdListWrap{margin:0 0 10px}
.sk_mdList{margin:0 0 6px;padding-left:20px}
.sk_mdList .sk_mdList{margin:4px 0 2px}
.sk_mdList li{margin:2px 0}
.sk_mdInlineCode{padding:1px 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-3,rgba(255,255,255,.06));font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:11.5px;color:var(--dsw-alias-label-primary)}
.sk_mdPre{box-sizing:border-box;margin:0 0 12px;padding:11px 13px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2,transparent);overflow-x:auto;overflow-y:visible;white-space:pre;tab-size:2}
.sk_mdCode{font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-primary)}
.sk_mdTableWrap{margin:0 0 12px;overflow-x:auto}
.sk_mdTable{width:100%;border-collapse:collapse;font-size:12px;line-height:18px}
.sk_mdTable th,.sk_mdTable td{padding:6px 9px;border:1px solid var(--dsw-alias-border-l2);text-align:left;vertical-align:top}
.sk_mdTable th{background:var(--dsw-alias-bg-layer-3,rgba(255,255,255,.05));font-weight:600}
.sk_mdQuote{margin:0 0 12px;padding:2px 0 2px 12px;border-left:2px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}
.sk_mdHr{margin:16px 0;border:0;border-top:1px solid var(--dsw-alias-border-l2)}
.sk_mdLink{color:var(--dsw-alias-link,#4c8dff);text-decoration:none;overflow-wrap:anywhere}
.sk_mdLink:hover{text-decoration:underline}
.sk_mdLinkBlocked{color:var(--dsw-alias-label-secondary);text-decoration:underline dotted}
.sk_mdImage{font-style:italic;color:var(--dsw-alias-label-tertiary)}
.sk_mdEmpty{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary)}
@media (max-width:760px){
  .sk_detailDrawer{width:100%}
  .sk_detailTabs{padding:0 14px}
  .sk_tabsBody{padding:14px 14px 24px}
  .sk_detailRiskStats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sk_detailUsageStats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sk_detailFindingHead{grid-template-columns:58px 76px minmax(0,1fr) 14px}
  .sk_detailFindingState{display:none}
}

.sk_detailTab:focus-visible,.sk_detailFindingHead:focus-visible{outline:2px solid var(--dsw-alias-link,#4c8dff);outline-offset:-2px}


/* ------------------------- skill detail: true modal ----------------------- */
@keyframes skDetailFadeIn{from{opacity:0}to{opacity:1}}
@keyframes skDetailPopIn{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes skDetailFadeOut{from{opacity:1}to{opacity:0}}
@keyframes skDetailPopOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(6px) scale(.99)}}
.sk_detailScrim{position:fixed;inset:0;z-index:var(--sk-z-modal,50);display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.52);backdrop-filter:blur(3px);overscroll-behavior:contain;animation:skDetailFadeIn .16s ease-out both}
.sk_detailModal{position:relative;box-sizing:border-box;width:min(1100px,82vw);max-width:calc(100vw - 48px);height:min(88vh,980px);max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-layer-1,#17181b);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:0 32px 90px rgba(0,0,0,.5);transform-origin:center;animation:skDetailPopIn .18s cubic-bezier(.2,.8,.2,1) both}
.sk_detailScrim[data-closing="true"]{animation:skDetailFadeOut .14s ease-in both}
.sk_detailModal[data-closing="true"]{animation:skDetailPopOut .16s ease-in both;pointer-events:none}
.sk_detailModal .sk_tabsBody{overscroll-behavior:contain}
.sk_detailConfirmOverlay{position:absolute;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.42);backdrop-filter:blur(2px);border-radius:inherit}
.sk_detailConfirmCard{box-sizing:border-box;width:min(440px,92%);padding:18px 20px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#17181b);box-shadow:0 18px 50px rgba(0,0,0,.4)}
.sk_detailConfirmCard strong{display:block;font-size:14px;font-weight:620;color:var(--dsw-alias-label-primary);margin-bottom:6px}
.sk_detailConfirmCard p{margin:0 0 14px;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary)}
.sk_detailConfirmActions{display:flex;align-items:center;justify-content:flex-end;gap:8px}
@media (max-width:760px){
  .sk_detailScrim{padding:0}
  .sk_detailModal{width:100%;max-width:none;height:100%;max-height:none;border-radius:0;border:0}
}
@media (prefers-reduced-motion:reduce){
  .sk_detailScrim,.sk_detailModal,.sk_detailScrim[data-closing="true"],.sk_detailModal[data-closing="true"]{animation:none}
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
  var panelRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(function () {
    if (!open) return undefined;
    // The drawer is a modal dialog: keep Tab inside it and restore focus to the
    // sidebar button when it closes (skTrapFocus lives in the launcher bundle).
    return skTrapFocus(panelRef.current);
  }, [open]);
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
      ref: panelRef,
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
