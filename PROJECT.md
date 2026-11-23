# dsh-charlotte 项目入口

本文件是**项目结构与协作入口**；产品说明（安装、功能）在 [README.md](README.md)，当前交接记录在 [HANDOFF.md](HANDOFF.md)。

## 现状

- 版本：0.8.0（`package.json`，未升版）
- 分支：`feat/0.8.0-skill-parity`；安全审计与标签式详情改动仍在工作树，**未提交、未推送远端**
- 代码：宿主 `lib/` 为普通 ESM；客户端 `revamp/` 为源切片，`client/client.js` 由 `scripts/build-client.mjs` 构建生成
- 测试：43 客户端 + 18 宿主契约 + 58 索引 + 67 安全；32 条渲染探针
- 最近一次整理前的完整快照提交：`49d7649`（`chore: snapshot before repository tidy`）

## 目录地图

| 路径 | 职责 | 能否手改 |
|---|---|---|
| `lib/` | 宿主：API、索引、推荐、安装/回收站、检查与搜索 | 改源文件，重启 App 生效 |
| `client/` | `client.baseline.js` 为基础产物；`client.js` 为构建结果 | 不要手改 `client.js` |
| `revamp/` | 客户端源切片（launcher、detail-drawer、markdown、security-center、security-review、dock、footer、CSS） | 改这里，再 `npm run build` |
| `scripts/` | 构建与冒烟测试 | 改后跑全套测试 |
| `locale/` | 技能中文简介目录（按源哈希失效） | 需要维护 |
| `skills/` | 插件自述技能 `charlotte`，打包进 npm 包，最低优先级挂载 | 只改 SKILL.md 内容 |
| `文档/` | 现行文档，从 [文档/00-文档索引.md](文档/00-文档索引.md) 起读 | 只改文档内容 |
| `历史/` | 旧版本与历史文档的唯一副本，只读；见 [历史/00-历史索引.md](历史/00-历史索引.md) | 禁止修改 |
| `.github/` | CI（安装、测试、构建一致性） | 改后本地跑 `npm test` |
| `publish/` | 独立可推送的 GitHub 副本；由工作树生成，已 gitignore | 重新生成，不手改 |
| `node_modules/` | 依赖，已 gitignore | 不提交 |
| `.gitignore` | 最小忽略集：node_modules、.DS_Store、日志、凭据、publish | 保持最小 |

`资料/` 未创建：本项目没有业务数据或证照；若未来引入，放项目内 `资料/`，加敏感声明，并保持仓库 private。

## 怎么跑

```sh
npm install
npm run build                  # 由 client.baseline.js + revamp/ 重建 client/client.js
npm test                       # 43 客户端 + 18 宿主契约 + 58 索引 + 67 安全
node scripts/render-probe.mjs  # 32 条渲染探针
DSH_WEB_URL=http://127.0.0.1:<端口> npm run check:zh
```

- 客户端改动：`npm run build` 后刷新页面。
- 宿主改动（`lib/`）：完全退出 App（含托盘）再重开。
- 本地 profile 用 `link:` 指向本目录；App 端口每次启动会变。
- 开发约定、已知限制、四阶段改动明细见 [HANDOFF.md](HANDOFF.md)。

## 红线

1. 不手改 `client/client.js`；只改 `revamp/` 后重建，构建两次 sha 必须一致。
2. 不改 `lib/`、`client/`、`revamp/`、`scripts/`、`locale/` 的目录结构：`package.json` 的 `files` 白名单与 CI 依赖这些路径。
3. `历史/` 只读；历史版本只以 `*.tar.gz` 形式存在，文件名日期用 `yyyy-mm-dd`。
4. 不提交凭据、token、`.env`、个人路径、邮箱、电话或用户数据截图；仓库是公开的，提交前按公开内容审一遍。
5. 更新/删除技能必须走确认与回收站，不自动覆盖用户文件。
6. 未经确认不推送远端。

## Git 用法

- 提交顺序：整理前快照 → 归档删除 → 目录迁移 → 文档与索引，各自独立提交。
- 回滚单个整理提交：`git revert <commit>`；回到整理前完整状态：`git checkout 49d7649 -- .`（不会删除后续新增文件，需另查）。
- 当前分支有上游 `origin/feat/0.8.0-skill-parity`，但本轮**未推送**，所以本地 HEAD 领先远端。
- `publish/` 是独立副本，不属于当前仓库的历史；要单独推送时在副本内初始化仓库，不要把它提交回当前仓库。

## 旧路径映射表

| 旧路径 | 现在位置 |
|---|---|
| `docs/security-model.md` | [文档/01-安全模型.md](文档/01-安全模型.md) |
| `specs/skill-parity-0.8.0.md` | [文档/02-0.8.0-技能对齐规范.md](文档/02-0.8.0-技能对齐规范.md) |
| `dsh-charlotte-agent-change-recommendations.md` | [文档/03-改造建议-2026-11-15.md](文档/03-改造建议-2026-11-15.md) |
| `backups/pre-0.6.0/**` | `历史/备份-2026-11-15.tar.gz` 内 `backups/pre-0.6.0/**` |
| `README.revamp.md` | `历史/备份-2026-11-15.tar.gz` 内同名文件 |
| `dsh-charlotte.md`（0.7.3 交接稿） | `历史/备份-2026-11-15.tar.gz` 内同名文件 |
| `README.md.before-publish`、`README.zh.md.before-publish`、`package.json.before-publish` | `历史/备份-2026-11-15.tar.gz` 内同名文件 |
| `backups/` | 已删除；恢复见 [历史/00-历史索引.md](历史/00-历史索引.md) |
