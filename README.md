# 🎯 CC Mode Switcher

**English** | [简体中文](README.zh-CN.md)

Multi-role scheduler for [Claude Code](https://claude.com/product/claude-code). Define any number of roles (default: 🧠 **Planner** + ⚙️ **Worker**), bind a different model to each — e.g. a reasoning model for planning and a fast model for execution — then launch Claude Code in the right role from a built-in multi-tab terminal (xterm.js + node-pty) or your favourite external terminal. Tab = one role, one pty session, one tool allow / deny list.

Built with Electron + Vue 3 + TypeScript. Disk-backed YAML configuration (no localStorage for the things that matter).

## Design Philosophy

The idea comes from how Anthropic routes work internally: planning-shaped tasks go to certain models, execution-shaped tasks to others. Think of a company — the cognition you expect in leadership is different from what you need in the execution layer; the people who make the plan and the people who carry it out are never the same group, and their cost is never the same either.

This tool can't be that smart. It draws the simplest possible line — **plan vs. everything else** — and, because it sits on top of Claude Code, leaves the routing decision to a human convention: *you* decide which model thinks (Plan) and which model executes (Work). Expensive reasoning tokens are spent only where they matter; cheap models do the mechanical work.

## Features

### 🤖 Model Management
- Add / edit / duplicate / delete model configs (display name, base URL, API key, model ID)
- **Provider presets** with URL autocomplete — GLM (Zhipu), MiniMax, DeepSeek, Kimi (Moonshot), Z.ai, Qwen (DashScope)
- Type a name or model ID (`glm-5.3`, `MiniMax-M3`, …) and the base URL auto-fills
- Quick-pick model ID chips once a provider is matched
- **Connection test** per model — green toast with latency (`connected in 143ms`) or red toast with the network error

![Model management](docs/public/images/model_config.png)

### 🎭 Multi-role Scheduler (Rancher-for-roles)
- Any number of roles, defined in `~/.cc-mode-switcher/roles.yaml` — no hard-coded list of roles in the app
- Each role picks: a model, an extended-thinking toggle, a system-prompt file path, allowed tools, denied tools, and denied plugins
- Default roles are **🧠 Planner** (read-only) and **⚙️ Worker** (writes files) — built-in prompts at `~/.cc-mode-switcher/prompts/{plan,worker}.md` define the `.cc-delivery/` file contract between roles
- **Table view** for clicks: filter, inline cell edits, right-click to duplicate / delete
- **YAML view** for power users: live syntax check, dirty-state indicator, save reloads the table
- Two-way same source: editing the table writes YAML; editing YAML and saving refreshes the table
- **Reset** restores the default plan + worker roles but keeps your models and any edits you made to the prompt files

![Plan/Work switcher](docs/public/images/switcher_main.png)

### ⌨️ Built-in Multi-tab Terminal
- xterm.js + node-pty in the main process — each tab is one pty session, bound to one role + one model
- **Tab title**: `{project} | {roleLabel}({modelName})` (e.g. `acme-web | 🧠 Planner(glm-5.3)`)
- Right-click a tab to **clone** (reuse the same role + cwd) or **detach** to a separate window
- Mac shortcuts (active only when the terminal pane has focus):
  - **Cmd+T** — clone the focused tab
  - **Cmd+N** — open the role picker and start a new session
  - **Option+T** — start the role currently selected on the left
- Detached window exposes a single "↩ merge into main" button that transfers the session back
- Per-session snapshot: changing role bindings afterwards does **not** affect already-open tabs

### 🚫 Zero-touch on Claude Code settings
Claude Code's `~/.claude/settings.json` `env` block would otherwise override terminal env vars. We sidestep it with two flags per session:
- `--setting-sources ""` — Claude Code skips **all** default settings files (user / project / local)
- `--settings "$CC_MODE_DIR/<ModelName>.json"` — loads the per-session temp JSON (named after the bound model) at **highest priority**, overriding everything
- The app **never reads or writes** `~/.claude/settings.json` or any settings file — no backups, no surprises

### 📦 Release & Versioning (GitHub Actions, manual)
macOS / Windows / Linux installers are published to GitHub Releases — **[download the latest build here](https://github.com/leochan007/cc-mode-switcher/releases/latest)**, or see the [download page](https://leochan007.github.io/cc-mode-switcher/download) for per-OS install notes.

Releases are driven by **three manual workflows** — no automatic triggers, no local CLI needed:
- **List releases** — see what already exists before doing anything
- **Set version & tag** — bump up (`patch` / `minor` / `major`), downgrade, or set any version. Writes a `release vX.Y.Z` commit and pushes the tag
- **Release Electron App** — builds the three OS targets in parallel and creates / updates the GitHub Release

Full operational guide: [Release & Versioning Workflow](docs/guide/07-release-versioning.md).

### ⚙️ Settings & Polish
- 🌙 Dark (default) / ☀️ Light theme — CSS-variable based, toggle in the toolbar
- English (default) / 简体中文 — quick toggle in the toolbar
- Icon-only action buttons with hover tooltips
- Centered toast notifications
- Models + role config persists in `~/.cc-mode-switcher/*.yaml`; UI preferences (theme, language) in `localStorage`

![Settings](docs/public/images/system_settings.png)

## Generated Launch Scripts

The detail panel below the role table shows the full shell snippet for the selected role — same content the built-in terminal runs and same what the "open in external terminal" button sends. Example, plan role bound to GLM-5.3:

```bash
# cc-mode-switcher · plan
export ANTHROPIC_BASE_URL="https://open.bigmodel.cn/api/anthropic"
export ANTHROPIC_AUTH_TOKEN="sk-..."
export ANTHROPIC_DEFAULT_OPUS_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_SONNET_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_FABLE_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME="glm-5.3"
export ANTHROPIC_DEFAULT_SONNET_MODEL_NAME="glm-5.3"
export ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME="glm-5.3"
export ANTHROPIC_DEFAULT_FABLE_MODEL_NAME="glm-5.3"
export ANTHROPIC_MODEL="glm-5.3"
export CLAUDE_CODE_SUBAGENT_MODEL="glm-5.3"
export MAX_THINKING_TOKENS=16000

# Per-role temp settings file (priority > ~/.claude/settings.json)
CC_MODE_DIR=$(mktemp -d -t cc-mode-XXXXXX)

cat > "$CC_MODE_DIR/GLM-5.3.json" <<'CCMODE_EOF'
{
  "env": { ... same 13 keys as above ... }
}
CCMODE_EOF

# Launch claude with role-scoped prompt + tool permissions
exec claude --setting-sources '' --settings "$CC_MODE_DIR/GLM-5.3.json" \
            --system-prompt-file ~/.cc-mode-switcher/prompts/plan.md \
            --disallowed-plugins 'superpowers' \
            --allowedTools Read,LS,Glob,Grep \
            --disallowedTools Edit,Write,NotebookEdit,Bash
```

`superpowers` is always forced into `--disallowed-plugins` regardless of role config, and every session uses `--setting-sources ""` so `~/.claude/settings.json` is never read.

Selecting the Work card instead regenerates the same block with Work's bindings — `MAX_THINKING_TOKENS` line is omitted, the temp file becomes e.g. `$CC_MODE_DIR/MiniMax-M3.json`, and the alias is `cc-w='claude --setting-sources "" --settings "$CC_MODE_DIR/MiniMax-M3.json"'`. Switch cards any time and click ▶️ again to open a fresh terminal in the new mode.

`--setting-sources ""` skips every default settings file (user / project / local), so `~/.claude/settings.json` never loads. `--settings "$CC_MODE_DIR/<ModelName>.json"` then loads the per-mode temp JSON at **higher priority than any other source**, making it the single source of truth.

## Requirements

| Dependency | Version | Notes |
| --- | --- | --- |
| Node.js | ≥ 22 (24+ recommended) | Vite 7 requires Node 20.19+ / 22.12+; this project targets Node 24 |
| pnpm | ≥ 9 | Preferred — the lockfile is `pnpm-lock.yaml` (npm ≥ 10 also works) |
| macOS | 12+ | Apple Silicon or Intel. Packaging installers needs Xcode Command Line Tools (`xcode-select --install`) |

> Windows/Linux: the UI builds and runs, but **"Open in Terminal" is macOS-only** for now (it uses AppleScript / `.command` files).

### ⚠️ pnpm ≥ 10 note

pnpm 10 blocks dependency postinstall scripts by default, so Electron's binary never downloads and `npm run dev` fails with `Error: Electron uninstall`. Fix:

```bash
pnpm approve-builds   # select electron (and esbuild)
```

or add to `package.json` before installing:

```json
"pnpm": { "onlyBuiltDependencies": ["electron", "esbuild"] }
```

## Mirrors for mainland China

Speed up dependency and Electron binary downloads:

```bash
# npm/pnpm registry
pnpm config set registry https://registry.npmmirror.com

# Electron binary + electron-builder helper binaries
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
```

Or commit a project-level `.npmrc`:

```ini
registry=https://registry.npmmirror.com
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

## Getting Started

```bash
pnpm install   # or npm install
npm run dev    # start dev server + Electron
```

Other scripts:

```bash
npm run build   # build main/preload/renderer bundles
npm run dist    # package installers (electron-builder)
```

## Extending Provider Presets

Add an entry to [`src/renderer/src/data/providers.ts`](src/renderer/src/data/providers.ts) — the form autocomplete, keyword auto-fill, and model ID chips pick it up automatically:

```ts
{
  id: 'glm',
  name: 'GLM (Zhipu)',
  baseUrl: 'https://open.bigmodel.cn/api/anthropic',
  keywords: ['glm', 'bigmodel', 'zhipu', '智谱'],
  models: ['glm-5.3', 'glm-5.3-air', 'glm-4.6', 'glm-4.5']
}
```

Any Anthropic-compatible endpoint works.

## Documentation

Full chaptered guides live in [`docs/`](docs/) — English by default, [简体中文版](docs/zh/) available:

- [Quick start](docs/guide/01-getting-started.md) — first-time setup in 5 steps
- [Models & providers](docs/guide/02-models-and-providers.md) — presets, env vars, override guard, model pairing
- [Plan mode playbook](docs/guide/03-plan-mode-playbook.md) — produce plan documents as the intermediate artifact
- [Work mode playbook](docs/guide/04-work-mode-playbook.md) — execute the plan strictly, never re-plan mid-flight
- [End-to-end example](docs/guide/05-workflow-example.md) — one feature from requirement to delivery
- [Release & versioning workflow](docs/guide/07-release-versioning.md) — GitHub Actions workflows for cloud builds, version up / down, GitHub Releases (all manual, no local CLI)
- [Local build](docs/guide/06-local-build.md) — clean install: clear node_modules, pnpm store, electron / electron-builder caches, then reinstall (when `pnpm run dev` / `pnpm run dist` misbehaves)

## Project Structure

```
src/
├── main/            # Electron main process (IPC, terminal launch)
├── preload/         # contextBridge API
└── renderer/
    └── src/
        ├── components/    # Vue SFCs (panels, cards, modal, toast, …)
        ├── composables/   # models, i18n, theme, terminal, toast
        ├── i18n/          # en / zh message catalogs
        ├── data/          # provider presets
        └── assets/        # global styles
```

## Release Workflow

Publishing is a **two-step manual process** — nothing fires automatically. Both steps happen entirely on GitHub via the Actions tab; no local CLI required.

| Step | Workflow | What it does |
| --- | --- | --- |
| 1 | **Set version & tag** | Writes a `release vX.Y.Z` commit, pushes the `vX.Y.Z` tag to origin. Old tags/releases are untouched. |
| 2 | **Release Electron App** | Builds mac / win / linux artifacts and creates/updates the GitHub Release. |

A third helper, **List releases**, prints what's already on the server so you can decide whether to bump, downgrade, or re-publish.

### First-time setup (one-off, on GitHub)

Repo → **Settings → Actions → General** → **Workflow permissions** → **Read and write permissions** → Save. Without this, the runner can't push back to the repo.

### See what already exists

Actions → **List releases** → **Run workflow** → wait → open the run → expand **Print releases + tags**. You get two lists:

- **Releases** (via `gh release list`) — every published GitHub Release with status (Published / Draft / Pre-release)
- **Tags** (via `git ls-remote --tags`) — every tag, including ones whose Release was deleted

If a tag shows up in the second list but not the first, its Release was deleted — re-publish it via step 2 with that tag.

### Bump up (auto, patch / minor / major)

Actions → **Set version & tag** → **Run workflow**:

| Input | Value |
| --- | --- |
| `mode` | `auto` |
| `bump` | `patch` *(or `minor` / `major`)* |
| `version` | *(leave blank)* |

What happens: bumps `package.json` + `pnpm-lock.yaml` + the version label in `SettingsPanel.vue`, commits `release vX.Y.Z`, pushes the new tag. **Nothing is built yet** — go to step 2.

### Set to an explicit version (upgrade OR downgrade)

Actions → **Set version & tag** → **Run workflow**:

| Input | Value |
| --- | --- |
| `mode` | `set` |
| `bump` | *(ignored)* |
| `version` | `2.0.0` *(or anything — lower than current is a downgrade, e.g. `0.9.6`)* |

What happens: same as above, but the target version is whatever you typed. Downgrades are non-destructive — the previous tag and its Release stay in place.

If the tag you typed already exists on origin, the workflow aborts and tells you to either pick a different version or re-publish via step 2.

### Build & publish the GitHub Release

Actions → **Release Electron App** → **Run workflow**:

| Input | Value |
| --- | --- |
| `tag` | *(leave blank to build whatever is currently on main — i.e. the commit step 1 just pushed)* |

The runner checks out that ref, runs `electron-builder --publish always`, and creates a GitHub Release named after the version in `package.json`. mac / win / linux all build in parallel.

### Re-publish an existing tag (accidental delete, rebuild, …)

Actions → **Release Electron App** → **Run workflow**:

| Input | Value |
| --- | --- |
| `tag` | `v1.0.0` *(fill the tag you want to re-publish)* |

The runner checks out that tag, rebuilds, and overwrites the existing Release with fresh artifacts.

### Deleting releases / tags

The workflows never delete. To clean up, do it from GitHub's web UI (repo → Releases → trash icon on the release) or from any terminal that has the `gh` CLI:

```bash
# Delete just the Release (keep the tag — re-publishable via step above)
gh release delete v1.0.0

# Delete Release + tag
gh release delete v1.0.0 --yes
git push origin --delete v1.0.0
```

Or mark it **Draft** in the web UI to hide without losing it.

## FAQ

**Why doesn't this app touch my `~/.claude/settings.json`?**
Because it doesn't need to. Every alias launches Claude Code with two flags: `--setting-sources ""` skips user / project / local settings files entirely, and `--settings "$CC_MODE_DIR/<ModelName>.json"` loads a per-mode temp JSON (named after the bound model, regenerated on every click) at **higher priority than any source** — including `~/.claude/settings.json`. App settings live in `$CC_MODE_DIR`, never in your home directory.

**The `TSM AdjustCapsLock…` / `IMKCFRunLoopWakeUpReliable` log lines in dev?**
Harmless macOS input-method noise present in every Electron app. The window auto-reloads if the renderer ever crashes.

## License

[MIT](LICENSE) © 2026 leochan007
