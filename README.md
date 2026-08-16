# 🎯 CC Mode Switcher

**English** | [简体中文](README.zh-CN.md)

Plan / Work dual-mode environment switcher for [Claude Code](https://claude.com/product/claude-code). Bind a different model to each mode — e.g. a reasoning model for **Plan** (architecture / design / review) and a fast model for **Work** (implementation / debugging) — then launch Claude Code in the right mode with one click.

Built with Electron + Vue 3 + TypeScript.

## Design Philosophy

The idea comes from how Anthropic routes work internally: planning-shaped tasks go to certain models, execution-shaped tasks to others. Think of a company — the cognition you expect in leadership is different from what you need in the execution layer; the people who make the plan and the people who carry it out are never the same group, and their cost is never the same either.

This tool can't be that smart. It draws the simplest possible line — **plan vs. everything else** — and, because it sits on top of Claude Code, leaves the routing decision to a human convention: *you* decide which model thinks (Plan) and which model executes (Work). Expensive reasoning tokens are spent only where they matter; cheap models do the mechanical work.

## Features

### 🤖 Model Management
- Add / edit / duplicate / delete model configs (display name, base URL, API key, model ID)
- **Drag-and-drop reordering** with a grip handle and drop-position indicator
- **Provider presets** with URL autocomplete — GLM (Zhipu), MiniMax, DeepSeek, Kimi (Moonshot), Z.ai, Qwen (DashScope)
- Type a name or model ID (`glm-5.3`, `MiniMax-M3`, …) and the base URL auto-fills
- Quick-pick model ID chips once a provider is matched
- **Connection test** per model — green toast with latency (`connected in 143ms`) or red toast with the network error

![Model management](docs/public/images/model_config.png)

### 🔄 Plan / Work Switcher
- Bind one model per mode; duplicates land right below the original (`X copy`, `X copy (1)`, …)
- Delete requires confirmation via modal dialog
- Generates a ready-to-paste shell snippet for the selected mode

![Plan/Work switcher](docs/public/images/switcher_main.png)

### ▶️ Open in Terminal
- First use: pick your terminal app (Terminal.app, iTerm, or any other — falls back to a generated `.command` file)
- Opens a new terminal window with all environment variables injected — nothing is executed for you
- Plan mode also defines `claude-plan` alias; a ready hint is echoed

### 🛡️ Env Override Guard
Claude Code's `~/.claude/settings.json` `env` block takes **precedence over terminal environment variables** and silently overrides your model. The app:
- Detects conflicting keys (`ANTHROPIC_*`, `CLAUDE_CODE_SUBAGENT_MODEL`, `MAX_THINKING_TOKENS`) on every launch
- Prompts to remove them (a timestamped backup is written first; unrelated settings are untouched)
- Shows the status in Settings so you can clean it anytime

### ⚙️ Settings & Polish
- 🌙 Dark (default) / ☀️ Light theme — CSS-variable based, toggle in the header or Settings
- English (default) / 简体中文 — quick toggle in the header or Settings
- Icon-only action buttons with hover tooltips
- Centered toast notifications
- Everything persists in `localStorage`

![Settings](docs/public/images/system_settings.png)

## Generated Environment

The snippet injected into your terminal (Work mode shown; Plan adds `MAX_THINKING_TOKENS` and the alias):

```bash
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
```

| Mode | Thinking | How to launch |
| --- | --- | --- |
| Plan | ✅ `MAX_THINKING_TOKENS=16000` | `claude-plan` → `claude --permission-mode plan` |
| Work | ➖ default | `claude` |

## Requirements

| Dependency | Version | Notes |
| --- | --- | --- |
| Node.js | ≥ 22 (20.19+ works) | Vite 7 requires Node 20.19+ / 22.12+; tested with Node 26 |
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

## Project Structure

```
src/
├── main/            # Electron main process (IPC, terminal launch, override guard)
├── preload/         # contextBridge API
└── renderer/
    └── src/
        ├── components/    # Vue SFCs (panels, cards, modal, toast, …)
        ├── composables/   # models, i18n, theme, terminal, toast
        ├── i18n/          # en / zh message catalogs
        ├── data/          # provider presets
        └── assets/        # global styles
```

## FAQ

**Why does Claude Code still use a different model after opening the terminal?**
Your `~/.claude/settings.json` `env` block overrides terminal env vars. The app detects this and offers a one-click clean (with backup). See *Env Override Guard* above.

**The `TSM AdjustCapsLock…` / `IMKCFRunLoopWakeUpReliable` log lines in dev?**
Harmless macOS input-method noise present in every Electron app. The window auto-reloads if the renderer ever crashes.

## License

[MIT](LICENSE) © 2026 leochan007
