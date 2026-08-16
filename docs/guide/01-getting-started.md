# 01 · Quick Start

> Environment requirements (Node/pnpm versions, mirrors for mainland China) are in the root `README.md`. This chapter starts after installation.

## First-time setup in five steps

### Step 1: Add models

1. Open the **🤖 Models** tab, click ➕ in the top-right corner
2. Type a **Display Name** or **Model ID** (e.g. `glm-5.3`, `MiniMax-M3`) — the Base URL **auto-fills** by keyword
3. Or click the Base URL field and pick from the preset dropdown (GLM / MiniMax / DeepSeek / Kimi / Z.ai / Qwen)
4. Enter your **API Key**; once a provider is matched, click the **model ID chips** to fill the Model ID
5. Save

Add at least two models — one for Plan (strong reasoning), one for Work (fast/cheap). See [chapter 02 · model pairing](02-models-and-providers.md#model-pairing).

### Step 2: Test the connection

Click 📡 on a model card:
- 🟢 Green toast: `connected in 143ms (HTTP 200)` → endpoint reachable
- 🔴 Red toast: `unreachable (ENOTFOUND / timeout)` → check the URL / network

> Any HTTP status code (including 404/401) counts as "reachable" — DNS/TLS/link are fine; real calls go to the POST endpoint.

### Step 3: Bind modes

Switch to the **🔄 Switcher** tab, in **Mode Binding**:
- **Plan uses model** → pick the reasoning model
- **Work uses model** → pick the execution model

Both mode cards show the bound model badge.

### Step 4: Choose a terminal

Click ▶️ in the command area (first use opens a file picker):
- **Terminal.app**: pick `/System/Applications/Utilities/Terminal.app`
- **iTerm**: pick iTerm.app
- Other terminals work too, via a generated `.command` file fallback

Change it anytime in **⚙️ Settings → Terminal**.

### Step 5: Open a terminal and start

Click ▶️ **Open in terminal**:
1. If prompted about env overrides (`~/.claude/settings.json` has stale config), click **Clean & continue** — otherwise the old config silently overrides your model
2. The new terminal window shows `✅ env ready — run: claude-plan` (Plan mode) or `run: claude` (Work mode)
3. Type the command to start:

| Selected mode | Run in terminal | Effect |
| --- | --- | --- |
| Plan | `claude-plan` | `claude --permission-mode plan` + thinking enabled |
| Work | `claude` | Default permissions, normal execution |

> Switching modes: go back to the app, click the other mode card, then ▶️ again for a new terminal window (the old terminal keeps its env — you can keep one terminal per mode).

## Common actions

| Action | Where |
| --- | --- |
| Drag to reorder models | ⠿ grip on the left of each card, Models tab |
| Edit a model | ✏️ on the card |
| Duplicate a config | 📋 on the card (copies named `X copy`, `X copy (1)`, …) |
| Delete a model | 🗑️ → modal confirmation |
| Language / theme | Quick toggles top-right or Settings |

Next: read [03 · Plan Mode Playbook](03-plan-mode-playbook.md) and [04 · Work Mode Playbook](04-work-mode-playbook.md).
