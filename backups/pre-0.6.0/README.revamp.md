# dsh-charlotte 客户端改版说明（0.5.0）

本目录是 `dsh-charlotte` 的运行副本。客户端是**已检入编译基线**上的切片补丁：

- 输入：`client/client.baseline.js`（已统一为 `dsh-charlotte` 的模块 id 与 `/charlotte/api` 前缀）；
- 改版片段：`revamp/station-ui.js`、`revamp/footer.js`、`revamp/market.css`；
- 输出：`client/client.js`，由 `scripts/build-client.mjs` 生成，可重复执行；
- 宿主：`lib/`（普通 ESM）与 `lib/mount/`（只读挂载内核，第三方 MIT 代码，声明见根目录 `THIRD_PARTY_NOTICES.md`）。

## 这一版改了什么

| 文件 | 说明 |
|---|---|
| `revamp/station-ui.js` | 语言层、StationApp、SkillBrowse、MoreMenu、InvokeDialog、原生/挂载/registry 详情弹窗、加载 helpers |
| `revamp/footer.js` | 侧栏按钮 + 抽屉外壳；抽屉不再有标题栏/版本号/标签页，关闭按钮在站内标题行 |
| `revamp/market.css` | 新增样式，全部限定在 `.sk_*` 与少量 `.ss_*` 覆盖内 |
| `scripts/build-client.mjs` | 从 `client.baseline.js` 切片生成 `client.js`；校验产品身份与锚点 |
| `scripts/smoke.mjs` | 48 项离线冒烟：渲染、词条、分组、registry 卡片、加载 helpers、CSS 契约 |
| `scripts/render-probe.mjs` | 真 React 服务端渲染探针，覆盖 19 个组件 |
| `lib/api.js` | 新增 `/registry-skill` 只读详情；`/skills` 已带 `registry` 摘要 |
| `lib/mount/watch.js` | 日志前缀统一为 `charlotte:` |
| `LICENSE` / `NOTICE.md` / `THIRD_PARTY_NOTICES.md` | 产品许可证与第三方 MIT 声明分离 |

## 页面结构

1. 标题行：`dsh-charlotte` + 副标题，右侧 **更多** 与关闭按钮。没有版本号、没有标签页、没有重复标题栏。
2. 搜索框：`Search skills by name, description, or purpose`。
3. 分组筛选：`All / 模型+用户 / 仅模型 / 仅用户 / 不可调用`，计数来自当前聚合结果；零计数组不显示。
4. 卡片网格：大屏 `repeat(3,minmax(0,1fr))`，`≤1040px` 两列，`≤680px` 单列。
5. 卡片：分类图标、名称、`Agent Skill · 分类`、一句 `short` 文案、状态、范围/只读/插件 chip、**使用技能** + **详情**。
6. **更多**：作用域选择、拖拽安装、回收站、刷新、中英切换。安装与回收站复用原视图，作为二级弹层打开。

卡片不放大段分众文案，也不放启停开关；启停、删除与长文案都在详情弹窗里。这样卡面只服务于“快速理解并加载”。

## 技能来源

浏览页合并三类数据：

- 可写文件系统根：`/skills.groups`，可启停、删除；
- 外部只读挂载：`/catalog`，开关只写 `overrides.json`；
- 插件/内置 provider：`/skills.registry` 中未被前两类同名覆盖的技能，只读展示（`Plugin` + `Read-only` chip），详情走 `/registry-skill`，不提供启停/删除。

## 分组

调用策略分组来自现有数据，不额外扫描目录：

- `/skills` 的 `meta.modelInvocable` + `meta.userInvocable`；
- `/catalog` 的 `invocation.modelInvocable` + `invocation.userInvocable`；
- `/skills.registry` 的 `invocation.modelInvocable` + `invocation.userInvocable`。

分组规则：

| 组 | model | user | 卡片行为 |
|---|---|---|---|
| `both` | true | true | 可用 |
| `model` | true | false | 可用，标「不可调用」的 user 说明 |
| `user` | false | true | 可用，标「仅用户」 |
| `none` | false | false | 使用按钮禁用 |

同名技能只显示一张卡：本地技能优先，其次是外部挂载，最后才是 registry provider 里未被覆盖的项；与技能注册表的 rank 顺序一致。

## 加载而非执行

`revamp/station-ui.js` 的 `#region loading`：

DSH 没有 per-Session 的 Skill attachment，也没有“只加载指令但不执行”的宿主 API。官方机制是：直接用户消息里的 `/name` token 在 `agent/pre-step` 被转成技能指令。因此本版采用受支持的非执行准备方式——把官方 `/name` token 放进目标会话的 composer draft，不提交：

- `skDraftPrompt(name)`：`/name `（尾部空格方便用户接着输入）。
- `skPrepareDraft(sessionId, name)`：`sessions.using(id, { source: "charlotte" }, ...)` 取 binding → `binding.ctx.get("conversation").input.requestDraftInitialization(binding, { prompt, whenDraftExists: "append" })`；不调用 `send`、不调用 `submit`。
- `skLoadIntoCurrent(name)`：对当前会话执行上面的准备；没有活动会话时报 `error.invokeNoSession`。
- `skLoadIntoNew(name, workspacePath)`：`uiWorkspace.connectWorkspace(workspaceId)` 走宿主的“新建/复用空白会话”流程 → `openSession(id)` → `skPrepareDraft`；不提交消息。
- `skFocusSession(id)`：抽屉关闭后把键盘焦点还给 composer；新会话的 composer 可能晚一拍挂载，所以调度两次尝试。
- 成功：关闭弹窗；抽屉模式下同时关闭抽屉，导航到目标会话，输入框里已有 `/技能名 `，等用户自己输入并发送。设置分节无法关闭抽屉时显示一次 `notice.loaded`。
- 宿主在用户发送第一条消息时才把 `/name` 转成技能指令；发送前不会产生 Agent 回合，也没有隐藏/占位用户消息。
- 工作区选择顺序：当前浏览作用域 → 当前会话所属工作区 → 最近活跃工作区。

弹窗状态：`busyRef` 同步防重复点击；请求期间两个选项与关闭/取消禁用；成功关闭；失败保留弹窗并显示错误；Esc 在 busy 时不关闭。

## 管理功能位置

| 功能 | 位置 |
|---|---|
| 搜索 / 分组筛选 | 浏览页 |
| 查看详情、启停、删除 | 卡片 → 详情弹窗 |
| 作用域 | 更多 → Scope |
| 拖拽安装 / zip 安装 / 路径安装 | 更多 → 拖拽安装 |
| 回收站恢复 / 清空 | 更多 → 回收站 |
| 刷新 | 更多 → 刷新 |
| 中英切换 | 更多 → 语言 |

安装与回收站视图复用 `InstallTab` / `TrashTab`；关闭面板会触发浏览页重新加载。

## 构建与验证

```sh
npm run build   # client.baseline.js + revamp/* -> client/client.js
npm test        # 48 客户端冒烟 + 16 宿主冒烟
node scripts/render-probe.mjs  # 可选：真 React SSR
```

冒烟覆盖：bundle/槽位、双语词条、10 个技能的策展文案与 short、分组计数与筛选、卡片字段与 disabled 状态、原生/挂载/registry 三类弹窗、registry 卡片与 supplier 去重、`sessions.using` / `requestDraftInitialization` / `connectWorkspace` / `openSession` 的假服务断言、发送与提交计数为零、无会话/无服务/输入框 busy/非用户可调用技能的错误路径、焦点回归、CSS 类覆盖、3/2/1 栅格、focus-visible、无版本号、无 ImportTab、无旧产品身份字符串。

## 部署

- 改 `revamp/`、`market.css`：`npm run build` → 刷新页面（Cmd+R）。
- 改 `lib/`（宿主半）：完全退出 App（含托盘）再重开，`/charlotte/api` 才会换成新代码。
- profile 已用 `link:` 指向本目录；`scripts/deploy.sh` 在 link 模式下只提示“无需拷贝”。

## 回滚

- 客户端回到改版前基线：`cp client/client.baseline.js client/client.js`，再刷新页面。
- 完整重建：`npm run build`（构建始终从 `client.baseline.js` 开始，幂等）。
- 宿主与 profile 的回滚按各自备份恢复。

## 已知限制

- DSH 没有 per-Session 的 Skill attachment；加载的只是 composer 里的 `/技能名` token。用户发送第一条消息时宿主才注入技能指令；如果用户删掉 token，就不会加载。
- 当前会话已有草稿时，token 会作为新段落追加，不覆盖用户文字；新对话复用宿主的空白会话时同理。
- 加载依赖客户端 `sessions` / `uiSession` / `uiWorkspace` / `workspaces` / `conversation` 服务；缺少任一服务或 composer 正在提交时，弹窗会禁用/报错并给出说明。
- 设置页里的分节也能加载；新会话会在背后的主视图打开，设置页本身不会跳走，因此用 `notice.loaded` 提示。
- 安装 / 回收站视图保留现有中文文案；本版只本地化了它们的标题与关闭按钮。
- 分组基于本页的 `/skills` + `/catalog` + `/skills.registry` 聚合，不包含按当前会话 preset 动态解析的可见性差异。
- 插件 provider 的技能只读：不能启停或删除；它们的开关/卸载由提供它的插件管理。
- `/registry-skill` 返回 provider 的原始 `SKILL.md` 内容；没有 `path` 的 provider 技能只显示内容与 provider，不显示路径。
