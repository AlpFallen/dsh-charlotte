# Spec: 0.8.0 技能页面对齐竞品能力

状态：已实现，待 review（本文档用于评审与验收，不描述未来工作）

## 背景

0.7.3 是「推荐 + 授权加载 + 统一索引」的启动器。对照同类 DSH 技能插件后，确认有六项能力是竞品已有、我们缺的：

| 能力 | 参照实现 | 参照点 |
|---|---|---|
| 正文审计 | dsh-skill-hub | 裸 ESC、Unicode 标签字符、双向控制符会让「看过」不等于「看见」 |
| provider 跳过诊断 | dsh-skill-hub | 被静默跳过的技能必须给出原因 |
| 注入开销 | @weibaohui/skills-management | 每条技能注入的上下文成本要可见 |
| 调用台账 | dsh-skill-browser | 次数、成功率、趋势、拒绝伪比率 |
| 共享池软链迁移 | @weibaohui/skills-management | 多 agent 共用一个池子，原位置留链接 |
| 场景标签 | dsh-skill-hub | 计算分类之外的手动归类 |
| 宽屏详情 + 复制正文 | @michengai/dsh-skills-manager | 760px 详情、一键复制 |

## 范围与验收

1. **正文审计**
   - 宿主对每条读到的正文检查：裸 ESC（high）、Unicode 标签字符 U+E0000–E007F（high）、双向控制符（high）、其他 C0 与 DEL（medium）、零宽字符（low）。ESC 单独计数，不重复计入 medium。
   - 每条索引记录带 `audit: { findings: [{id, severity, count}], clean, severity }`；整份索引带聚合 `audit`，含每个 finding 命中的技能数。
   - 验收：`host-index-smoke` 的「the index audits skill bodies for hidden characters」通过；干净正文 `clean === true`。

2. **provider 跳过诊断**
   - 可写根枚举在跳过文件时收集原因（缺 SKILL.md、frontmatter 无效、读取失败）；挂载 provider 暴露最近一次扫描的 issues。
   - `/index` 返回 `diagnostics: [{area, root?, message}]`，挂载与可写两类都在内。
   - 验收：诊断面板能列出被跳过的路径；`enumerateRoot(root, issues)` 不改变原有枚举结果。

3. **注入开销**
   - `estimateInjection(text, extra)` 返回 `{chars, cjk, tokens, method: 'heuristic'}`；CJK 一字一 token，ASCII 四字符一 token，其他两码点一 token，且最少计 1 个 token（空正文不显示 0）。
   - 索引记录带 `cost`；界面标注「估算，不是分词器」。
   - 验收：`injection cost is an explicit heuristic and scales with the body` 通过；正文为空时仍计算名称与描述的成本。

4. **调用台账**
   - 状态 schema 升到 2：每个技能保留最近 30 天的 `days` 桶（loads/invokes/completions/failures）。
   - `GET /ledger` 返回 totals、14 天稠密趋势、每行 successRate 与 adoptionRate；分母为零必须是 `null`，不得输出 0 或 100。
   - 验收：`GET /ledger reports real ratios and null when nothing was attempted` 通过。

5. **共享池迁移**
   - `POST /migrate` 把一个可写根里的目录技能复制进 `~/.agents/skills/<name>`（可用 `DSH_AGENTS_HOME` 覆盖），验证 `SKILL.md` 存在，再把原目录换成相对软链。
   - 拒绝情形返回 409 与稳定 code：`already-linked`、`already-in-pool`、`target-exists`、`not-a-directory`、`missing-source`、`invalid-name`。
   - 任一步失败都还原原目录，不允许半迁移。
   - 验收：`POST /migrate moves a skill into the shared pool and leaves a relative link` 通过，第二次调用返回 409 / `already-linked`。

6. **标签与宽屏详情**
   - `POST /tags` 保存去重、trim、最长 24 字、最多 8 个的标签；搜索覆盖标签。
   - 详情抽屉宽度 760px，可复制正文（`GET /body`），可迁入共享池，可增删标签。
   - 验收：`POST /tags stores tags and the index exposes them` 通过；渲染探针 23 条通过。

## 非目标

- 市场发现与安装（SkillHub / ClawHub / skills.sh 三个源）。理由是接入成本十几天起，且不是本插件的定位。
- AI 自动分组（dsh-skill-browser 的做法）。成本高、收益不确定。
- 覆盖 provider 式启停重构（@lokda 的做法）。现有覆盖表可用，重构风险大于收益。
- DSH 0.1.5 双版本兼容。运行环境是桌面 App 内置的 0.2.1-rc.3。

## 接口约束

`/tags` 与 `/migrate` 只接受 POST；其它方法返回 405。`/body` 只读宿主已解析的路径（可写根内，或挂载 provider 的现存候选），不返回主机绝对路径。

## 基线与测试口径

- 运行基线：桌面 App 内置 DSH `0.2.1-rc.3`、Node `24.21.0`；更新的 0.2.x 未验证。
- 测试：`npm test` = 29 客户端 + 16 宿主契约 + 44 索引/推荐；`node scripts/render-probe.mjs` = 23 条渲染探针。

## 文件地图

| 能力 | 主要位置 |
|---|---|
| 审计 | `lib/audit.js`、`lib/catalog.js`、`revamp/launcher.js`（详情抽屉） |
| 诊断 | `lib/roots.js`、`lib/mount/provider.js`、`lib/merged-provider.js`、`lib/api.js` |
| 开销 | `lib/cost.js`、`lib/catalog.js` |
| 台账 | `lib/state.js`（schema 2）、`lib/ledger.js`、`lib/api.js`、`revamp/launcher.js` |
| 迁移 | `lib/pool.js`、`lib/api.js` |
| 标签 | `lib/state.js`、`lib/api.js`、`revamp/launcher.js`（搜索与详情） |

## 已知限制与未验证

- 共享池迁移在真机 `~/.agents/skills` 上未跑过，只在 `DSH_AGENTS_HOME` 指向沙箱时验证。
- 迁移有一个无法完全消除的崩溃窗口：`rename(source → parked)` 与 `symlink` 之间进程被杀，原路径会缺失，只剩 `<source>.migrating-<pid>`。正常失败路径全部还原，崩溃路径需要人工恢复，暂不做启动时自动修复。
- 台账按本地日历日分桶、按本地时区展示；同一份状态在不同时区会显示不同的日期标签。这是产品选择，不是缺陷。
- 客户端界面未在重启后的 App 里逐项点过，只有渲染探针与 HTML 字符串层面的验证。
- 标签按技能名全局存储，不区分工作区：同名技能在两个工作区共用一份标签。
