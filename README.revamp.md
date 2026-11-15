# dsh-charlotte 实现说明（0.7.3）

本插件由两半组成，同一份数据、同一组接口服务三个界面：

- **宿主**（`lib/`，普通 ESM）：合并可写根、只读挂载与宿主技能注册表，产出统一索引；推荐引擎；使用/收藏状态；`/charlotte/api`。
- **客户端**（`revamp/*.js`，切片进 `client/client.baseline.js`）：管理页、右侧详情抽屉、输入框上方的推荐卡、加载链路。
- **构建**：`scripts/build-client.mjs` 从已检入基线切出 `client/client.js`，幂等、可重复。

## 1. 数据从哪来

`lib/catalog.js` 合并三类真实来源，同名时**可写根优先于注册表**：

| 来源 | 判定依据（真实字段） | 展示 |
|---|---|---|
| 可写根 | `lib/roots.js` 的 root id：`project-dsh` / `project-agents` / `user-dsh` / `user-agents` | 项目级 / 用户专属，可启停 |
| 只读挂载 | provider `charlotte` + `source` 为 `claude-code` / `codex` / `zcode` / `cursor` / `gemini` | 用户专属（外部挂载），开关写 `overrides.json` |
| 插件技能 | 注册表 `provider` 不是 `filesystem`/`charlotte`（`dsh-blender`、`dsh-office`、`mattpocock-skills-zh`…） | 插件提供，只读 |
| 系统内置 | `provider === "filesystem"` 且 `source === "bundled"` | 系统内置，只读 |
| 运行时内嵌 | `provider === "runtime"`、无 path | 插件提供，只读 |

没有任何一张「技能名 → 分类」的总表。分类与关键词都来自技能自己的文本。

## 2. 分类：9 个功能类，证据可查

`lib/taxonomy.js` 只固定**分类标签**：开发工作、代码质量、项目理解、文档与知识、任务协作、设计与创作、办公文档、邮件沟通、学习教练。**每个技能落在哪一类由分类器计算**，输入是 name、description、whenToUse、推导出的 keywords 与正文前 4000 字；按字段加权（name 6 / whenToUse 4 / description 2 / 正文 1），返回命中的词与所在字段。

- **名称锚定**：若技能名本身出现某类词汇（`zh-code-review`、`office-render`），只有这些类参与竞争，且此时不读正文，避免长正文压过名字。
- **包身份先验**：provider 名里出现某类词汇时（`dsh-office`、`dsh-blender`），该类加 6 分。它只修正近似平局，不是「provider → 分类」的映射表；归属仍要求技能自身文本参与。
- 没有「其他」类；零命中时仍给最通用类，但标 `confidence: "weak"`，详情页显示「无关键词命中」。
- 真实 86 个技能的离线校验：9 类全部非空、无 weak；`zh-code-review` → 代码质量、`office-render` → 办公文档、`zh-codebase-design` → 项目理解、`blender-export` → 设计与创作。
- 分类计数由 `/index` 实时计算；计数为 0 的类不渲染。

## 3. 元数据补全与来源标注

`lib/enrich.js` 为每个技能补：

| 字段 | 来源 | provenance |
|---|---|---|
| purpose | description 第一句 | derived |
| keywords | frontmatter `metadata.keywords`/`tags`、分类词、名称/描述中的拉丁词 | declared / derived |
| triggers | frontmatter `triggers`、`when-to-use`，或从「当用户…」「Use when…」等句式与引号短语推导 | declared / derived / absent |
| useCases / avoidCases | 含「适用于 / Use when / 不适用 / avoid」的句子 | derived / absent |
| dependencies | frontmatter `dependencies`/`requires`，或正文里真实出现的 `/name`、`Skill tool with "name"` | declared / derived |
| version | frontmatter `version` | declared / absent |

不虚构能力、不补默认时间。usage 与 favorite/pin 来自 `~/.dsh/charlotte/state.json`，是插件自己写入的真实事件。

### 简介的唯一来源（0.7.2）

推荐卡、技能列表和详情抽屉都调用同一个 `skSkillIntro(skill, lang)`：它只读该 Skill 自己的 `description`（中文界面优先取同一套 `i18n.simple` 翻译，和技能列表完全一致），不读推荐理由、匹配关键词或打分文本。Skill 没有描述时显示「该技能没有填写描述。」；索引读取不到时显示「无法读取技能描述」。推荐原因作为独立字段显示在简介下方，不再占据简介位置。

缓存：进程内索引 15 秒 TTL，`skills/change` 或写操作后立刻失效；`~/.dsh/charlotte/enrich-cache.json` 以 `path + mtime + body 长度` 为签名，重启不重读 80 个 SKILL.md。

### 中文简介（两段式）

中文界面里技能名保持原文；**列表里的一句简介必须是中文，且高中生能看懂**。详情抽屉再分两层：

1. **官方描述**：技能自己写的 description。原文是中文就显示中文，没有中文就显示英文原文，不改写、不翻译；
2. **专业版简介**：紧跟官方描述下面的一段中文技术概述，说明这个技能到底做什么、覆盖哪些能力。

两段中文的解析顺序（`lib/i18n.js`）：

1. `declared`：技能自己在 `SKILL.md` 里声明 `simple-zh` / `professional-zh`（或 `description-zh`），永远优先；
2. `catalog`：随包发布的 `locale/skills.zh.json`。每条带 `sourceHash`，**只有与当前 description 哈希一致才使用**；技能原文一改，旧文案立即失效，不会拿过期内容冒充新技能；
3. `absent`：显示「该技能暂无中文简介，原文见详情」；如果技能本身就用中文写描述，则直接用它自己的描述当列表简介。

当前 86 个技能已全部有 `simple` + `professional` 两段（含中文描述的技能：官方描述保留中文，专业版另写一段技术概述），`npm run check:zh` 逐条校验缺失、过期、字段不完整，任一不满足即退出码 1。新增技能两种做法：在 `SKILL.md` 写 `simple-zh` / `professional-zh`，或往 `locale/skills.zh.json` 补条目（hash 用 `descriptionHash`）。

## 4. 推荐引擎

`lib/recommend.js` 是确定性本地打分器（不是 LLM、不是 embedding）：

0. **点名直通**：如果提示词里明确出现了某个可调用技能的全名、名称片段（>=4 个拉丁字符）或短 trigger（如「grill」），跳过短句/寒暄/价值门槛、冷却、频率上限和忽略记录，直接进入权限与依赖校验；「点名grill」也可以触发。只匹配名称和短 trigger，不匹配普通 description 关键词。
1. **快速筛选**：未启用/用户不可调用/依赖缺失/被忽略/本任务已展示 → 直接排除。
2. **语义匹配**：中文二元/三元组 + 英文词 token；双语同义词组（建模/modeling、表格/xlsx、邮件/email…）做桥接；字段加权（名称点名、触发条件、关键词、description/purpose、分类词）。
3. **相关度排序**：分数 = 0.20 点名 + 0.26 触发 + 0.34 关键词覆盖 + 0.15 描述覆盖 + 0.05 分类；排除场景命中会衰减。
4. **组合与去重**：默认只推 1 个；第二、第三个必须 ≥ 最高分 × `comboRatio`（默认 0.75），同分类且关键词高度重合视为重复，只留一个。
5. **权限与依赖**：只推 `userInvocable && !disabled` 且声明依赖 `satisfied` 的技能。

价值门槛：`valueScore` 看任务动词、代码/文件信号、长度；寒暄、简单问答、短提示返回 `none`（reason 为 `intent-too-short` / `low-value` / `no-match`）。

时机：宿主在 `agent/pre-step` 用用户本轮原文评估，把候选**停在 pending**；客户端在会话 `running: true → false` 后才取，因此推荐卡永远出现在回答结束之后，不打断生成。

### 智能推荐首页（0.7）

管理页默认打开「智能推荐」，不再默认展示全部技能。首页数据来自宿主 `GET /home`：

1. **当前对话**：`agent/pre-step` 评估过的最近一次推荐会保存在宿主内存的 `latest` 中（与 `pending` 分开，dock 显示后不会丢）。`/home` 返回 `source: "conversation"` 和当轮 intent 片段；展示前按当前索引重新检查存在性、`userInvocable`、停用状态与依赖，任一条不满足就剔除。
2. **使用记录**：没有可用的对话推荐时，宿主用真实计数（loads + invokes，含置顶/收藏与最近使用衰减）排序，返回 `source: "history"`；理由直接引用真实次数。
3. **空状态**：两者都没有时返回 `source: "none"`，页面只显示搜索框与功能分类入口。

客户端对旧宿主（没有 `/home`）有降级：先读 `/session-state.pending`，再按同一套真实计数做历史排序；两条路径都不使用硬编码推荐或示例数据。默认展示最相关的 1 个，最多 1 个主推荐 + 2 个次级推荐。

去重/冷却/频率/忽略都在宿主侧执行并持久化：同一任务（token 指纹 Jaccard ≥ `sameTaskJaccard`）不重复推；`cooldownMs` 内不重推；每会话 `maxPerSession` 次封顶；`忽略` 记录该技能 + 本任务指纹，只有需求实质变化（指纹相似度低于阈值）才会再出现。

配置（全部可调，见 §8）：

```js
{ enabled, maxItems: 3, threshold: 0.18, minIntentChars: 10, minValueScore: 0.2,
  cooldownMs: 45000, maxPerSession: 8, dedupeJaccard: 0.6, sameTaskJaccard: 0.55, comboRatio: 0.75 }
```

## 5. 状态与加载/执行链路

严格分阶段，前端状态只是宿主事实的镜像：

| 阶段 | 谁产生 | 依据 |
|---|---|---|
| 发现 | 宿主索引 | 技能出现在 `/index` |
| 推荐 | 宿主 `pre-step` | 评分过阈值且过门槛 |
| 待确认 | 宿主 pending | `/session-state` 返回候选 |
| 加载中 | 客户端 | 已发 `/use`、尚未 staging 完成 |
| 已加载 | 宿主 + 客户端 | `/use` 授权成功且 composer 里写入了 `/name ` 加完整下一步，`/event phase=loaded` |
| 执行中 | 宿主 `pre-step` | 本轮消息里真实出现 skill-invocation（或用户消息中的 `/name` 且技能在索引中） |
| 成功 | 宿主 `turn-stopping` | 注入过技能的回合正常结束 |
| 失败 | 宿主 / 客户端 | `agent/request-error`，或 `/use` 被拒、staging 失败；原因原样展示 |
| 已取消 | 客户端 | 加载中再次点击「使用/取消」abort 请求并上报 |

- 点击「使用」之前，任何技能都不会被加载；未确认时当前任务照常完成。
- 加载 = 把官方 `/name` token 加一句完整的下一步写进 composer，不 `send`、不 `submit`；构建脚本显式禁止这些字符串进入产物。
- 下一步的来源是确定性的：优先用用户上一条原话（`/name 基于我上一条消息继续推进：“原话”。信息不够就先问我。`），没有原话时用技能自己的 useCases / purpose。不是模型生成的话术，用户仍需检查并手动发送。
- 失败不伪造成功：`/use` 的 403/409、staging 的 blocked、无会话/无服务都会带真实原因显示。
- 多技能：可选组合按 `dependencyOrder()` 拓扑排序；声明依赖成环会返回 `cycles`，前端按选中集合排序，正文提及型依赖只在双方都被选中时参与排序。
- 异步竞态：每次加载一个 AbortController；重复点击会取消上一次；请求有 15s 超时；写操作后重新拉 `/index`，从不本地乐观伪造持久状态。

## 6. 权限边界

- 所有关键判断在服务端：`/use` 重新校验技能存在、`userInvocable`、`disabled`、依赖满足；`/event loaded` 只接受 2 分钟内由 `/use` 授权过的 (session, skill)；`/prefs` 校验技能存在。
- 所有写接口同源校验；跨站浏览器请求 403。
- 「启用/禁用」只改可写根的 frontmatter（`disable-model-invocation` / `user-invocable`）或挂载覆盖表；插件技能只读。
- 技能使用授权 ≠ 具体操作授权：删除文件、发消息、提交数据等高风险动作仍由 DSH 工具权限与审批独立校验，插件不绕过；详情页明确写出这一点。
- 前端只做展示与发起，不替代后端检查。

## 7. 页面结构

- **左侧导航（固定）**：智能推荐（默认）、常用与收藏（含真实计数）、功能分类（全部技能 + 9 个计算分类，均带计数）、底部管理入口。管理菜单向上展开：作用域、安装（含本地路径安装，走 `/import-path`）、回收站、刷新、语言。
- **智能推荐首页**：主推荐卡展示名称、分类、可用状态、来源、完整用途（中文简介 + 官方描述）、推荐原因、依赖状态和「立即使用」；点「立即使用」会把 `/name` 加完整下一步填进输入框，用户检查后发送。最多再给 2 个次级推荐（名称、用途、原因、使用/详情）。推荐不可用时显示简洁搜索框 + 分类入口。
- **常用与收藏（独立页面）**：置顶 → 收藏 → 常用，去重分组；空状态引导去全部技能。
- **全部技能（次级页面）**：顶部排序（调用频率 / 名称 / 最近使用）、来源与状态筛选、分类筛选（窄屏时左侧导航收为顶部横向胶囊）。**没有下载时间排序**——不存在真实下载时间，不提供该选项。
- 列表行：分类图标、名称（含真实版本号）、完整描述（两行截断）、可用状态、来源、收藏/置顶、使用、详情。
- 详情为右侧抽屉：技能简介（同一 `skSkillIntro`）、官方描述（与简介不同时单独显示）、专业版简介、推荐理由（仅显示本页真实推荐过的）、分类依据、适用场景、触发条件、排除场景、关键词、权限与依赖、来源/路径/更新时间、使用记录、字段来源、启停开关。
- 推荐卡：`conversation.input.dock` 列表槽位，输入框正上方；名称、分类、技能简介（与列表/详情同一 `skSkillIntro`）、推荐原因（次要位置）、使用/忽略。卡片可收起/展开，状态记在 `localStorage`；收起后只保留标题、数量和展开按钮。DSH 的聊天流 `conversation.chat.flow` 是 single 槽，插件无法在消息流内追加节点，因此这是唯一不 hack DOM 的内嵌位置。

## 8. 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/index?workspace=` | 统一索引：skills / categories / sources / totals |
| GET | `/config` | 推荐参数与挂载源 |
| GET | `/home?session=&workspace=` | 智能推荐首页：最近一次对话推荐（重新校验权限）→ 真实使用记录 → 空 |
| GET | `/session-state?session=` | 当前会话停放的推荐，以及最近一次对话推荐（`latest`） |
| POST | `/recommend` | 用给定 intent 评估（供调试/测试；日常由 pre-step 触发） |
| POST | `/recommend/ignore` | 忽略某技能 + 任务指纹 |
| POST | `/prefs` | 收藏/置顶 |
| POST | `/use` | 授权加载，返回官方 token |
| POST | `/event` | 上报 `loaded` / `load-failed` / `cancelled` / `recommended` / `accepted` / `dismissed`；`recommended`、`accepted`、`dismissed` 分开计数，不混入真实负载 |
| POST | `/import-path` | 本地目录安装（读盘拷贝，受大小上限约束） |
| 其余 | `/skills` `/catalog` `/toggle` `/override` `/upload*` `/trash*` … | 0.5 起的兼容接口，未改动契约 |

## 9. 构建与验证

```sh
npm run build                  # client.baseline.js + revamp/* -> client/client.js
npm test                       # 29 客户端 + 16 宿主契约 + 35 宿主集成
node scripts/render-probe.mjs  # 23 个组件的真 React SSR
DSH_WEB_URL=http://127.0.0.1:<当前端口> npm run check:zh   # 两段中文的覆盖与哈希校验
```

覆盖：分类准确性（真实 86 技能离线校验 + 用例）、匹配与价值门槛、组合/去重、冷却与频率、忽略后重新评估、权限边界、多技能依赖与环检测、加载失败与取消、异步竞态、状态持久化、目录安装、索引缓存失效、双语词条一致性、中文简介优先级与哈希失效、中文界面渲染中文简介、无硬编码目录、无自动发送/提交。

## 10. 部署与回滚

- 改客户端：`npm run build` → 刷新页面。
- 改宿主（`lib/`）：完全退出 App（含托盘）再打开，`/charlotte/api` 才会换新代码。
- 回滚：本目录无 git；0.6.0 改动前的副本在 `backups/pre-0.6.0/`（`lib/`、`revamp/`、`scripts/`、`client/client.js`、`package.json`、`cordis.patch.yml`）。客户端也可 `cp client/client.baseline.js client/client.js` 回到基线。
- 运行态：`~/.dsh/charlotte/{state.json,overrides.json,enrich-cache.json,trash/}`。

## 11. 已知限制（如实）

- 匹配是本地确定性打分 + 固定双语同义词表，没有 embedding；中英混杂、同义词表未覆盖的领域词会漏配，可调 `threshold` 或补 `SYNONYM_GROUPS`。不通过调 LLM 判意图，因此没有 token 成本，也不会出现「推荐解释由模型编造」。
- 「完整下一步」是确定性模板：有用户原话时承接原话，没有时用技能自己的 useCases / 中文简介 / purpose。它不是模型改写，可能不如上下文生成自然；用户仍需检查后手动发送。
- 采纳漏斗已记录 `recommended` / `accepted` / `dismissed` 三个独立计数；管理页详情暂未展示采纳率，接口已通过 `/index` 的 stats 暴露。
- 「成功」的语义是：注入过技能指令的回合正常结束。它不代表模型回答质量，也不代表技能内容里的高风险操作已获准；后者归 DSH 工具审批管。
- 客户端在 `conversation.input.dock` 渲染推荐卡；若上游移除该槽位，卡片不出现，管理页不受影响。
- 无实时下载时间字段，故不提供下载时间排序；「更新时间」取自文件 mtime。
- 挂载覆盖表按绝对路径记录；同名技能移动路径后需要重新开关。
- 插件技能只读；它们的启停/卸载由提供它的插件负责。
- `state.json` 以技能名为键；同一技能改名会丢失历史计数（不会串到别的技能上）。
- 中文简介目录是「人工文案 + 源哈希」的数据文件，不是实时机器翻译：技能原文更新后需要补新文案，否则列表退回「暂无中文简介」，官方描述仍在详情里。
- 本轮验证为 hermetic + 真 React SSR + 真实技能数据的离线索引；宿主代码不热更新，真机页面需完全退出 App 重开后再刷新一次。
