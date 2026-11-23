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
