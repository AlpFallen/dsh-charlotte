---
name: charlotte
description: >
  dsh-charlotte 是 DeepSeek Harness 的技能启动器与技能库，只占一个侧栏入口：
  列出/搜索/筛选/收藏技能，把 Claude Code、Codex、ZCode、Cursor、Gemini 的技能目录只读挂载进 dsh，
  按当前对话在输入框上方推荐技能，并通过官方 /技能名 token 把技能放进输入框。
  当用户问 dsh-charlotte 是什么、能做什么、怎么装、怎么配、为什么推荐了某个技能、
  技能是怎么被加载的，用本技能的内容回答，不要凭印象编。
license: MIT
---

# dsh-charlotte

DeepSeek Harness 的技能启动器与技能库。一个侧栏入口，管住所有技能。

## 一句话

dsh 原生有技能目录，但没有管理界面、没有跨 agent 的共用视图、没有推荐。
dsh-charlotte 补的正是这三块：一个数据驱动的技能管理页、一个把外部 agent 技能目录
只读挂载进来合并成统一索引的 provider、以及一个在当前对话里挑技能推荐的宿主侧引擎。

## 用户看到的

- 侧栏只有一个「dsh-charlotte」入口。作用域、拖拽安装、回收站、刷新、语言收进「更多」菜单。
- 首屏：常置顶、再收藏、最后按真实调用频率补足（最多 4 条）；没有数据时整块不渲染，不编造示例。
- 列表行：名称与版本、完整描述、可用状态、来源、收藏/置顶、使用、详情。
- 详情抽屉四个标签：技能介绍（中文简介 + 官方描述 + 真实 SKILL.md）、安全检查、技能信息、使用记录。
- 输入框上方的推荐卡：名称、用途摘要、推荐原因、使用 / 忽略。

## 它真正做的事

1. **挂载**：把 `~/.claude/skills`、`~/.codex/skills`、`~/.zcode/skills`、`~/.cursor/skills`、
   `~/.gemini/skills`（含 `~/.gemini/antigravity/skills`）、各工作区的
   `.claude|.codex|.zcode|.cursor|.gemini/skills`，以及配置里的 `extraDirs`，
   以只读方式注册成一个 dsh 技能来源。文件原地不动，做 frontmatter 字段映射、非 kebab 名自动
   slug、缺描述自动合成、改动热更新、符号链接跟随一次。开关只写 dsh-charlotte 自己的覆盖表。
2. **索引**：可写根（`~/.dsh/skills`、`~/.agents/skills`、工作区内的 `.dsh/skills` 与
   `.agents/skills`）、挂载目录、插件 provider 提供的能力合成一个索引。
3. **加载**：点击「使用」先在宿主校验可见性、启用状态与依赖，再把官方 `/技能名 ` token 放进
   当前或新建对话的输入框，然后关闭启动器。不发送消息、不启动 Agent 回合、不插隐藏用户消息。
   用户发送时才由宿主把 token 转成技能指令，删掉 token 技能就不生效。
4. **推荐**：宿主在 `agent/pre-step` 用本轮原文匹配真实技能元数据，结果停在宿主侧；
   这轮回答结束后才在输入框上方展示。快速筛选 → 语义匹配（中英 token + 双语同义词）→
   相关度排序 → 权限与依赖检查 → 推荐。寒暄、过短提示、简单问答不推荐。
5. **管理**：拖拽文件夹或 zip 安装（先校验 name 与 description 再预览，确认后才写入，写入先暂存再改名）、
   删除进回收站可恢复、共享池迁移、标签、收藏、批量删除、诊断面板、调用台账。

## 安装

桌面应用：设置 → 插件 → 添加插件 → 安装第三方插件，填仓库地址（也接受 npm 包名和本地目录），
装完重启应用，侧栏设置按钮上方出现入口。桌面 profile 由 App 托管，CLI 不能直接给它加插件。
命令行 web profile 用 `dsh plugin --profile web add` 加仓库标识。命令行安装方式与仓库地址见 README。

## 配置

全部可选，写在 profile 补丁层的 `dsh-charlotte` 行下；未知键启动即报错。

- `sources.claude|codex|zcode|cursor|gemini`：`true` / `false` / `{ enabled, project, root, rank }`。
- `extraDirs`：`[{ path, label, rank }]`，自定义技能目录。
- `watch` 与四个 `watch*` 参数：热更新的开关与节奏。
- `slugifyNames`、`synthesizeDescription`：外来 frontmatter 的兼容策略。
- `recommend`：`enabled`、`maxItems`、`threshold`、`minIntentChars`、`minValueScore`、
  `cooldownMs`、`maxPerSession`、`dedupeJaccard`、`sameTaskJaccard`、`comboRatio`。

## 安全边界

- 写入只落在可写根目录和 `~/.dsh/charlotte/`；每个路径规范化后做包含性检查。
- 外部 agent 目录只读挂载，不写回它们的 SKILL.md。
- 变更类接口拒绝跨源请求（含 `Origin: null`），只接受 loopback Host。
- 安全扫描是宿主侧静态规则审计：不执行技能代码，有误报与漏报，结果不能证明某个技能是安全的。
  安装、启用、恢复、使用前自动扫描；严重级阻断没有普通确认绕过路径。
- 技能使用授权不等于具体操作授权，删除文件、发消息等高风险动作仍由 DSH 工具权限独立校验。

## 限制（如实说明）

- 没有更新源，因此没有「检查更新 / 回滚」按钮，不会自动覆盖用户文件。
- 扫描器只做文本规则，不执行代码；插件提供但无可读路径的技能显示「无法检查」。
- 批量删除只处理可写根里的本地技能；挂载与插件技能不会被删。
- 改 `lib/` 要完全退出 App（含托盘）再重开，刷新页面不够；改 `revamp/` 只需重新构建后刷新。

## 文档

产品说明与配置示例在 README（中英双份），安全模型、技能对齐规范、改造建议在 `文档/`，
项目结构与协作约定在 PROJECT.md。
