# dsh-charlotte 交接文档（0.7.3）

产品身份统一为 `dsh-charlotte`：模块 id、API 前缀、状态目录、provider 名一致。

## 目录

| 路径 | 作用 |
|---|---|
| `lib/index.js` | 宿主入口：注册只读挂载 provider、`/charlotte/api`、`agent/pre-step`/`turn-stopping`/`request-error` 观察器 |
| `lib/api.js` | HTTP API：旧的 roots/skills/catalog/toggle/override/upload*/trash* 保持不变；新增 index/config/prefs/use/event/recommend/session-state/import-path |
| `lib/catalog.js` | 统一索引：三类来源合并、来源分类、分类/依赖/统计合成、内存 + 磁盘缓存 |
| `lib/taxonomy.js` | 9 个功能分类与证据分类器（固定标签，不固定归属） |
| `lib/enrich.js` | 从技能自身文本补全 purpose/keywords/triggers/useCases/依赖/版本，带 provenance |
| `lib/recommend.js` | 打分器：价值门槛、双语同义词、排序、组合比例、冷却/频率/忽略、配置校验 |
| `lib/state.js` | `~/.dsh/charlotte/state.json`：收藏/置顶/使用记录/会话推荐账本，原子写 |
| `lib/i18n.js` + `locale/skills.zh.json` | 中文两段式简介：`simple`（列表大白话）+ `professional`（详情专业版）；技能声明的 `simple-zh`/`professional-zh` 优先，其次是带源哈希的目录；原文变动后旧文案自动失效 |
| `lib/mount/` | 只读挂载内核（第三方 MIT 代码，许可证保留在目录内） |
| `lib/merged-provider.js`、`lib/overrides.js`、`lib/importer.js`、`lib/trash.js`、`lib/roots.js`、`lib/frontmatter.js`、`lib/zip.js` | 宿主功能模块；`importer.js` 新增本地目录读取 |
| `client/client.baseline.js` | 已检入的编译基线（模块 id 与 API 前缀已统一） |
| `client/client.js` | 构建产物，页面实际加载的 bundle |
| `revamp/launcher.js` | 语言层、管理页（左侧导航、智能推荐首页、收藏页、全部技能次级页、详情抽屉）、加载 store 与链路 |
| `revamp/recommend-dock.js` | `conversation.input.dock` 推荐卡与槽位注册 |
| `revamp/footer.js` | 侧栏按钮与抽屉外壳（单入口、无版本头） |
| `revamp/market.css` | `.sk_*` / `.skd_*` 样式 |
| `scripts/build-client.mjs` | 从基线切片生成 `client.js`，幂等，并校验「无硬编码目录、无自动发送」 |
| `scripts/smoke-client.mjs` | 29 项离线客户端冒烟 |
| `scripts/host-smoke.mjs` | 16 项宿主契约冒烟（0.5 行为回归） |
| `scripts/host-index-smoke.mjs` | 35 项索引/推荐/推荐首页/点名直通/权限/依赖/安装/配置/中文化集成冒烟 |
| `scripts/zh-coverage.mjs` | 读取运行中接口或快照，校验纯英文技能的翻译缺失与过期 |
| `scripts/render-probe.mjs` | 23 个组件的真 React SSR 探针 |
| `backups/pre-0.6.0/` | 本次改动前的文件副本（无 git，回滚用） |
| `mockups/preview/` | 0.6 设计样稿 PNG（示例数据，非运行产物） |

## 运行

- profile 用 `link:` 指向本目录；客户端改动 `npm run build` + 刷新页面即可。
- **宿主改动（`lib/`）需完全退出 App（含托盘）再重开**；`/index` 等新接口在旧进程里不存在。
- 状态目录：`~/.dsh/charlotte/`（`state.json`、`overrides.json`、`enrich-cache.json`、`trash/`）。
- API 前缀：`/charlotte/api`；provider 名：`charlotte`；语言键：`dsh-charlotte:lang`。

## 行为

- 单入口：侧栏「dsh-charlotte」；设置页分节保留。
- 简介：推荐卡、列表、详情共用 `skSkillIntro`，只读 Skill 自己的 description / i18n.simple；推荐原因单独显示；缺描述显示明确空状态。
- 列表：名称/版本、完整描述、可用状态（用户与模型 / 仅用户 / 仅模型 / 不可用 / 已停用）、来源（项目级/用户专属/插件提供/系统内置）、收藏、置顶、使用、详情。
- 中文界面：技能名保持原文；列表一句中文大白话；详情依次是官方描述（原文中文用中文，否则英文原文）和专业版中文概述；两段中文走「技能声明 → 哈希匹配目录 → 中文提示」，并在详情标注来源。
- 首页：默认「智能推荐」。宿主 `/home` 优先返回当前对话的最近一次推荐（重新校验可用性/权限/依赖），没有时按真实使用记录排序；默认 1 个主推荐、最多 3 个。没有可用推荐时显示搜索框与分类入口。
- 常用与收藏：独立页面，置顶 → 收藏 → 常用，去重分组。
- 分类：由分类器按技能文本计算，证据在详情抽屉；无「其他」类；零计数类不渲染。
- 搜索：名称、描述、用途、关键词、触发条件、分类标签、来源标签。
- 排序：调用频率 / 名称 / 最近使用；不提供下载时间（没有真实数据）。
- 详情：右侧抽屉，含推荐理由（仅真实推荐过）、依赖、权限、使用记录、字段 provenance、启停开关。
- 推荐：宿主在 `agent/pre-step` 评估并停放，客户端在回合结束后取；默认 1 个，最多 3 个；使用/忽略即时生效；忽略、冷却、频率、同任务去重均在宿主侧。
- 点名直通：提示词直接出现技能名/名称片段/短 trigger 时跳过价值门槛、冷却、频率和忽略，只保留权限与依赖校验；例如「点名grill」。
- 推荐采纳：点「使用」时，`/use` 授权 → `sessions.using` → `conversation.input.requestDraftInitialization`（`/name ` + 完整下一步）→ `/event loaded`；不 `send`/`submit`。下一步优先承接用户原话，没有原话时用技能 useCases/purpose。
- 采纳漏斗：`recommended`（卡片显示）、`accepted`（点使用）、`dismissed`（忽略）分别计数，存 `state.json` 的 usage 行，不混入 loads/invokes。
- 执行：宿主在 `pre-step` 看到真实 skill-invocation 记 `invoked`，`turn-stopping` 记 `completed`，`request-error` 记 `failed`。
- 对模型停用但用户可调用的技能仍可加载（标「仅用户」）；`userInvocable:false` 的使用按钮禁用。

## 验证

```sh
npm run build                  # 幂等；两次产物哈希一致
npm test                       # 29 + 16 + 35
node scripts/render-probe.mjs  # 24 个组件
npm run check:zh               # 中文简介覆盖（读运行中的 /skills + /catalog）
```

当前结果：29 client / 16 host contract / 35 host integration 全过；render-probe 23/23 OK；真实 86 技能离线索引无 weak 分类、9 类非空，86 个技能全部有 simple + professional 两段中文（check:zh 0 缺失、0 过期、0 不完整）；中文意图（审查 / xlsx / 邮件 / Blender 建模 / 寒暄）分别得到正确推荐或正确不推荐。

## 部署与回滚

- 客户端回滚基线：`cp client/client.baseline.js client/client.js`，刷新。
- 完整重建：`npm run build`。
- 0.6.0 前文件：`backups/pre-0.6.0/`（用同路径覆盖回去即可）；`client/client.js` 的旧产物也在其中。
- `scripts/deploy.sh` 在 `link:` 模式下不需要执行。

## 已知限制

- 推荐是本地确定性打分 + 固定双语同义词表，不是 embedding；同义词表未覆盖的领域词会漏配（可调阈值或补表）。
- 「成功」指注入过技能的回合正常结束，不代表回答质量；技能内容中的高风险操作仍由 DSH 工具审批独立校验。
- 推荐卡只能放 `conversation.input.dock`（聊天流 `chat.flow` 是 single 槽，不能追加节点）。
- 推荐卡可收起/展开，收起状态存 `localStorage` 的 `dsh-charlotte:dock-collapsed`；收起后只保留标题、数量和展开按钮。
- 「完整下一步」是确定性模板（用户原话优先，否则技能 useCases/中文简介/purpose），不是模型改写；用户仍需检查后发送。采纳计数已入库，详情页暂未展示采纳率。
- 加载依赖客户端 `sessions` / `uiSession` / `uiWorkspace` / `workspaces` / `conversation`；缺失或 composer 正在提交时报真实原因。
- DSH 没有 per-Session Skill attachment；加载只写 composer token，用户发送后才注入。
- 安装/回收站主体沿用基线中文文案；插件技能只读。
- 中文简介是「人工文案 + 源哈希」而不是实时机器翻译：技能原文更新后要补新文案，否则列表退回「暂无中文简介」，官方描述仍在详情里。
- 真机页面尚未在本轮重启后目视确认（宿主不热更新）；需退出重开后刷新一次。当前运行中的实例可能是上一版宿主，`/index` 里还没有 `i18n` 字段。
