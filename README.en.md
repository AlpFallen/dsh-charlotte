# dsh-charlotte

[中文](README.md) | English

A skill launcher and skill hub inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

`dsh-charlotte` gives the Harness one focused launcher entry: an index-driven management page (compact list, evidence-based functional categories, pinned/frequent strip, right-side detail drawer), host-side live recommendations, and a full authorize -> load -> execute state chain. External Claude Code / Codex / ZCode / Cursor / Gemini skill directories are mounted read-only as one dsh skill source, and enable, install, delete and trash management stay available.

## Install

In the desktop app: Settings -> Plugins -> Add plugin -> Install a third-party plugin, enter `https://github.com/AlpFallen/dsh-charlotte` (the same dialog accepts npm package names and local directories), restart, and the dsh-charlotte button appears above Settings in the sidebar. The desktop profile is owned by the Electron app, so the CLI refuses `dsh plugin --profile desktop add` with `profile "desktop" is managed exclusively by the Electron application`.

For the web profile:

```sh
dsh plugin --profile web add github:AlpFallen/dsh-charlotte
```

The running environment here is the desktop app's bundled DSH `0.2.1-rc.3` (Node `24.21.0`); this plugin loads and runs there, and the screenshots below come from it. A separate CLI install of DSH `0.1.5-rc.2` was used for an interface comparison. The host seams (`webServer.register` with `WebRoute`, the `agent/pre-step` waterfall, `ctx.skills`) have the same shape in both; the client slot `conversation.input.dock` changed contract in 0.2 (`PropsRenderFactories`, the draft-editor split), the UI works on 0.2.1-rc.3, and newer 0.2.x builds are unverified.

The repository ships the compiled client bundle (`client/client.js`), so a GitHub install needs no build step. For live development, clone it, point the profile dependency at `"link:/absolute/path/to/dsh-charlotte"`, run `pnpm install`, and restart the app.

## Screenshots

| Launcher home | Recommendation card (cropped) |
|---|---|
| ![Launcher home: recommendation card, category counts, frequency-aware rows](mockups/preview/home-v0.7.png) | ![Recommendation card: name, reason, Use and Ignore, cropped to the card](mockups/preview/dock-v0.7.png) |

| All skills | Detail drawer |
|---|---|
| ![Skill list with sort, source and availability filters](mockups/preview/all-skills-v0.7.png) | ![Detail drawer: purpose, why recommended, triggers, permissions, usage history](mockups/preview/detail.png) |

## What you get

- **One dsh-charlotte entry** — the sidebar button opens the launcher. Secondary administration lives under **More**: scope, drag-and-drop install, recycle bin, refresh and language.
- **Pinned & frequent** — the top strip shows pinned skills first, then favourites, then the most-used skills (real counters, at most four). With no data the strip is not rendered at all; no sample rows are invented.
- **Evidence-based categories** — Development, Code Quality, Project Understanding, Docs & Knowledge, Task Collaboration, Design & Creation, Office Documents, Mail & Communication, Learning & Coaching. Which category a skill lands in is computed from its own name, description and triggers, and the matching terms are shown in the detail panel. There is no "other" bucket, and empty categories are not rendered.
- **Compact list + side panel** — each row carries name and real version, the full description, availability, source, favourite/pin controls, Use and Details. Details open in a right-side drawer: why it was recommended, use/avoid cases, triggers, permissions, dependencies, version, source path, real usage history and field provenance.
- **Search, filters, sort** — search covers name, description, purpose, keywords, triggers and category labels; filters cover category, source (project / yours / plugin / built-in) and availability. Sorting offers usage, name and recency only: there is no real download timestamp, so there is no download-time sort.
- **One-click load** — Use first authorizes on the host (visibility, enablement, dependencies), then stages the official `/name` token in the current or a new conversation's composer. No message is submitted and no Agent turn starts; the instructions are injected when you send your own message. Clicking again while loading cancels; failures show the host's real reason.
- **Honest disabled state** — a Skill disabled for the model stays user-invocable (the host's explicit user path) and is labelled user-only; a Skill that is not user-invocable cannot be used.
- **Plugin-provided skills** — skills registered by any dsh plugin or bundled provider now appear in the same grid as read-only `Plugin` cards, with their provider label, a read-only Details view and the same **Use Skill** loading flow. The station can display and load them but cannot enable/disable or delete them; their source plugin owns the files. Registry summaries ride on `/skills.registry`, and details come from `/registry-skill`.
- **Mounted external skills** — the read-only provider registers `~/.claude/skills`, `~/.codex/skills`, `~/.zcode/skills`, `~/.cursor/skills`, `~/.gemini/skills` (plus `~/.gemini/antigravity/skills`), each workspace's `.claude|.codex|.zcode|.cursor|.gemini/skills`, and any `extraDirs`. Files stay where they are: frontmatter is mapped (`disable-model-invocation`, `user-invocable`, Codex `agents/openai.yaml` policy, raw metadata preserved), non-kebab names are slugged, a missing description is synthesized, and edits hot-reload. Symlinked skill entries are followed once, so `~/.claude/skills/<name> -> ../.agents/skills/<name>` still mounts.
- **Skill browsing** — writable roots (global `~/.dsh/skills`, shared `~/.agents/skills`, per-workspace `<project>/.dsh/skills` / `.agents/skills`), the mounted catalog and plugin providers merge into one unified index and list. Search covers name, description, purpose, keywords and triggers; enable/disable writes the `disable-model-invocation` frontmatter flag for local skills and the override file for mounted ones; delete moves into a restorable trash.
- **Drag-and-drop install** — drop a skill folder or a `.zip` archive into the install panel, or pick them. Zip archives are decompressed server-side. Files are validated (SKILL.md with kebab-case `name` and `description`) and previewed before anything is written; every install is staged and renamed into place.
- **Trash** — deletions move to `~/.dsh/charlotte/trash` with an origin manifest; restore or empty from the panel.
- **Chinese UI: plain-language line, official text, professional summary** — skill names stay in their original form; the list shows one Chinese sentence a high-school student can follow; Details shows the skill's official description (Chinese when the skill wrote Chinese, otherwise the English original) followed by a Chinese professional paragraph. Both Chinese fields prefer the skill's own `simple-zh` / `professional-zh`, then a hash-guarded catalogue (`locale/skills.zh.json`) whose entries are ignored as soon as the source text changes. Recommendation reasons are localized too.
- **Body audit** — every skill body is checked for bare ESC, Unicode tag characters, bidi controls and zero-width characters; the detail drawer lists each finding and count, and the aggregate lives in Diagnostics.
- **Injection cost** — every skill shows an ≈token/char estimate with CJK counted separately; labelled as a heuristic, not a tokenizer.
- **Usage ledger** — real loads, runs, successes and failures, a 14-day load trend, per-skill success and recommendation adoption; a zero denominator renders as "—" instead of an invented rate.
- **Tags** — free-form tags per skill (Enter adds, clicking a tag removes); search covers tags.
- **Shared-pool migration** — move a skill from a writable root into the shared pool `~/.agents/skills` and leave a relative symlink behind; copy, verify, then swap, with automatic restore on failure.
- **Diagnostics** — skipped files, invalid frontmatter and mount-scan failures are shown in the UI instead of only in the log.
- **Wide detail + copy body** — the detail drawer is 760px wide and can copy the full skill body in one click.
- **Bilingual UI** — the launcher surface (title, search, filters, list, dialogs, recommendation card, More menu) switches between Chinese and English and remembers the choice; the reused install and recycle-bin bodies keep their existing Chinese copy.

## Live recommendations

The host evaluates candidates at `agent/pre-step` from your actual prompt and the real skill metadata, and parks the result host-side. The client only asks for it after the turn settles (`running` true -> false), so the card appears above the composer when the answer is finished and never interrupts generation. Recommendation is never treated as loading.

- Pipeline: quick filter (disabled / not user-invocable / missing dependency are dropped) -> semantic match (CJK and Latin tokens plus a small bilingual synonym bridge, weighted trigger/keyword/description fields) -> ranking -> permission and dependency check -> recommendation.
- Value gate: small talk, simple Q&A and very short prompts produce nothing. One candidate is the default; a second or third must be close to the top score (`comboRatio`) and must not duplicate the same function.
- De-duplication: the same skill is not re-offered for the same task; Ignore suppresses it until the need materially changes; cooldown, per-session frequency and thresholds are configurable.
- The card shows only name, category, reason and Use / Ignore. Use runs the same authorized load chain as the management page.

## How "load" works

DSH has no per-Session Skill attachment and no host API that loads instructions without a model turn. The supported non-executing preparation is the official `/name` composer token: loading stages `/skill-name ` in the target conversation's input and closes the launcher. No message is sent, no Agent turn starts, and no hidden user message is inserted. When you type your task and send, the host turns the token into the Skill instructions. If you clear the token before sending, the Skill is not applied.

States are staged separately: discovered -> recommended -> pending confirmation -> loading -> loaded -> executing -> succeeded / failed / cancelled. "Loaded" only means the token is really in the composer; "executing" requires the host to observe the skill instructions entering the request at pre-step; "succeeded" means that turn finished normally. Failures show the real reason (permission, missing dependency, busy composer, missing service) and never fake success.

## Config

All fields optional, under the `dsh-charlotte` plugin row in your profile patch. Unknown keys fail fast at startup.

```yaml
plugins:
  dsh-charlotte:
    sources:
      claude: true                      # ~/.claude/skills + <project>/.claude/skills
      codex: { project: false }          # per-source switches
      zcode: true
      cursor: true
      gemini: true
    extraDirs:
      - { path: ~/my-skills, label: mine, rank: 300 }
    watch: true
    slugifyNames: true
    synthesizeDescription: true
    recommend:                          # optional; invalid values fail fast at startup
      enabled: true
      maxItems: 3                       # at most three per recommendation
      threshold: 0.18
      minIntentChars: 10
      minValueScore: 0.2
      cooldownMs: 45000
      maxPerSession: 8
      dedupeJaccard: 0.6
      sameTaskJaccard: 0.55
      comboRatio: 0.75
```

## Security model

- Skill writes only ever land inside the writable roots above plus the station's own state (`~/.dsh/charlotte/`); every path is containment-checked after normalization, symlinks are never followed during copies, and uploads reject traversal segments.
- External agent directories are mounted read-only; the switch state lives in the station's override file, not in their `SKILL.md`.
- Mutating HTTP endpoints reject cross-origin requests; the API is served on the same local server as the GUI.
- Load, enable and favourite are re-checked server-side: `/use` re-validates visibility, enablement and dependencies; a `loaded` event is only accepted for a session that was just authorized. Front-end display never replaces a permission check.
- Skill usage authorization is not operation authorization: deleting files, sending messages or submitting data still go through DSH tool permissions and approval independently.
- Mounted and uploaded skills are third-party content — review them before enabling.

## Status

0.8.0. Host changes (`lib/`) need the app fully quit and reopened; client changes (`revamp/`, CSS) need `npm run build` plus a page refresh. Runtime state (`state.json`, `overrides.json`, `enrich-cache.json`, `trash/`) lives in `~/.dsh/charlotte/`, never in this repository.

## Development

```sh
npm install
npm run build                  # rebuild client/client.js from client.baseline.js + revamp/
npm test                       # 30 client + 16 host-contract + 42 index/recommend/i18n checks
npm run check:zh               # simple + professional coverage and hash check for every skill
node scripts/host-smoke.mjs    # host contract only: config, roots, provider, legacy API
node scripts/host-index-smoke.mjs  # index, categories, recommendations, permissions, dependencies, path install
node scripts/render-probe.mjs  # optional real-React render probe (18 components)
```

The client half is a patch over the checked-in compiled baseline (`client/client.baseline.js`), sliced by `scripts/build-client.mjs`; the source fragments live in `revamp/`. The host half is plain ESM under `lib/`.

## License

MIT. Third-party notices for the MIT-licensed code vendored under `lib/mount/` are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
