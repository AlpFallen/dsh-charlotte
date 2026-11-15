# dsh-charlotte 交接文档

本文件说明 `dsh-charlotte`（0.5.0）的目录结构、运行方式、验证与回滚。产品身份统一为 `dsh-charlotte`；模块 id、API 前缀、状态目录、provider 名都使用同一名字。

## 目录

| 路径 | 作用 |
|---|---|
| `lib/index.js` | 宿主入口：注册只读挂载 provider 与 `/charlotte/api` 路由 |
| `lib/api.js` | HTTP API：roots / skills（含 registry 摘要）/ skill / toggle / delete / trash* / catalog / override / registry-skill |
| `lib/mount/` | 只读挂载内核（第三方 MIT 代码，许可证保留在目录内） |
| `lib/merged-provider.js`、`lib/overrides.js`、`lib/importer.js`、`lib/trash.js`、`lib/roots.js`、`lib/frontmatter.js`、`lib/zip.js` | 宿主功能模块 |
| `client/client.baseline.js` | 已检入的编译基线（模块 id 与 API 前缀已统一） |
| `client/client.js` | 构建产物，页面实际加载的 bundle |
| `revamp/station-ui.js` | 语言层、启动器页面、分组、加载弹窗、原生/挂载/registry 详情弹窗、加载 helpers |
| `revamp/footer.js` | 侧栏按钮与抽屉外壳（单入口、无版本头） |
| `revamp/market.css` | 启动器样式（`.sk_*` 为主） |
| `scripts/build-client.mjs` | 从基线切片生成 `client.js`，幂等 |
| `scripts/smoke.mjs` | 48 项离线客户端冒烟 |
| `scripts/host-smoke.mjs` | 16 项宿主冒烟 |
| `scripts/render-probe.mjs` | 19 个组件的真 React SSR 探针 |
| `README.md` / `README.zh.md` / `README.revamp.md` | 安装、功能、改版实现说明 |
| `THIRD_PARTY_NOTICES.md` | `lib/mount/` 的 MIT 第三方声明 |

## 运行

- profile 用 `link:` 指向本目录；客户端改动 `npm run build` + 刷新页面即可。
- 宿主改动（`lib/`）需完全退出 App（含托盘）再重开。
- 状态目录：`~/.dsh/charlotte/`（`overrides.json`、`trash/`）。
- API 前缀：`/charlotte/api`；provider 名：`charlotte`。
- 语言存储键：`dsh-charlotte:lang`。

## 启动器行为

- 单入口：侧栏「dsh-charlotte」；设置页分节保留。
- 卡片：图标、名称、分类、短描述、状态、范围/只读/插件 chip、使用技能、详情。
- 数据源：可写文件系统根 + 外部只读挂载 + `/skills.registry` 里未被前两类同名覆盖的插件/bundled provider 技能（只读，详情走 `/registry-skill`）。
- 分组：`both / model / user / none`，对应 `模型+用户 / 仅模型 / 仅用户 / 不可调用`。
- 更多：作用域、拖拽安装、回收站、刷新、中英切换。
- 加载（不执行）：
  - 当前会话：`sessions.using` → `conversation.input.requestDraftInitialization(binding, { prompt: "/技能名 ", whenDraftExists: "append" })`；
  - 新对话：`uiWorkspace.connectWorkspace` → `openSession` → 同一个 draft 准备；
  - 不调用 `send` / `submit`；宿主在用户发送第一条消息时把 `/name` token 转成技能指令。
- 对模型停用但用户可调用的技能仍可加载，卡片标「仅用户」；`userInvocable:false` 的使用按钮禁用。

## 验证

```sh
npm run build
npm test
node scripts/render-probe.mjs   # 可选
```

`npm test` 当前结果：48 客户端 + 16 宿主全过；`render-probe` 19 个组件全部 OK、无 React 警告；`npm run build` 两次产物哈希一致。

## 部署与回滚

- 客户端回滚基线：`cp client/client.baseline.js client/client.js`，刷新页面。
- 完整重建：`npm run build`。
- profile 备份按安装时的备份文件恢复；`scripts/deploy.sh` 在 `link:` 模式下不需要执行。

## 已知限制

- 加载依赖客户端 `sessions` / `uiSession` / `uiWorkspace` / `workspaces` / `conversation` 服务；缺失或 composer 正在提交时弹窗禁用/报错并说明。
- DSH 没有 per-Session Skill attachment；加载的只是 composer 里的 `/技能名` token，用户发送第一条消息时才注入技能指令。
- 设置页内加载时，新会话在背后的主视图打开。
- 安装/回收站主体保留现有中文文案。
- 分组只基于本页聚合数据，不按会话 preset 动态解析可见性。
