# 🎯 CC Mode Switcher

**English** | [简体中文](README.zh-CN.md)

Plan / Work dual-mode environment switcher for [Claude Code](https://claude.com/product/claude-code). Bind a different model to each mode — e.g. a reasoning model for **Plan** (architecture / design / review) and a fast model for **Work** (implementation / debugging) — then launch Claude Code in the right mode with one click.

Built with Electron + Vue 3 + TypeScript.

## Features

### 🤖 Model Management
- Add / edit / duplicate / delete model configs (display name, base URL, API key, model ID)
- **Drag-and-drop reordering** with a grip handle and drop-position indicator
- **Provider presets** with URL autocomplete — GLM (Zhipu), MiniMax, DeepSeek, Kimi (Moonshot), Z.ai, Qwen (DashScope)
- Type a name or model ID (`glm-5.2`, `MiniMax-M2`, …) and the base URL auto-fills
- Quick-pick model ID chips once a provider is matched
- **Connection test** per model — green toast with latency (`connected in 143ms`) or red toast with the network error

### 🔄 Plan / Work Switcher
- Bind one model per mode; duplicates land right below the original (`X copy`, `X copy (1)`, …)
- Delete requires confirmation via modal dialog
- Generates a ready-to-paste shell snippet for the selected mode

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

## Generated Environment

The snippet injected into your terminal (Work mode shown; Plan adds `MAX_THINKING_TOKENS` and the alias):

```bash
export ANTHROPIC_BASE_URL="https://open.bigmodel.cn/api/anthropic"
export ANTHROPIC_AUTH_TOKEN="sk-..."
export ANTHROPIC_DEFAULT_OPUS_MODEL="glm-5.2"
export ANTHROPIC_DEFAULT_SONNET_MODEL="glm-5.2"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="glm-5.2"
export ANTHROPIC_DEFAULT_FABLE_MODEL="glm-5.2"
export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME="glm-5.2"
export ANTHROPIC_DEFAULT_SONNET_MODEL_NAME="glm-5.2"
export ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME="glm-5.2"
export ANTHROPIC_DEFAULT_FABLE_MODEL_NAME="glm-5.2"
export ANTHROPIC_MODEL="glm-5.2"
export CLAUDE_CODE_SUBAGENT_MODEL="glm-5.2"
```

| Mode | Thinking | How to launch |
| --- | --- | --- |
| Plan | ✅ `MAX_THINKING_TOKENS=16000` | `claude-plan` → `claude --permission-mode plan` |
| Work | ➖ default | `claude` |

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
  models: ['glm-5.2', 'glm-5.2-air', 'glm-4.6', 'glm-4.5']
}
```

Any Anthropic-compatible endpoint works.

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
