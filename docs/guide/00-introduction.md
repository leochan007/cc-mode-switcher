# 00 · Introduction

What CC Mode Switcher is, why it exists, and the ideas it's built on. Five-minute read; everything else in the guide assumes this chapter.

## The problem it solves

[Claude Code](https://claude.com/product/claude-code) is one tool but your work with it is **two different jobs**:

- **Thinking** — architecture, design, review, breaking a vague requirement into a concrete plan
- **Executing** — turning that plan into code, running tests, fixing mechanical details

These jobs want **different models**. A strong reasoning model makes the plan better; a fast, cheap model is plenty for carrying it out. But Claude Code's model selection lives in env vars / settings files, and switching them by hand means editing `~/.claude/settings.json` (which silently overrides everything else), re-exporting env vars per terminal, and hoping you didn't leave the expensive model bound to a mechanical task.

**CC Mode Switcher turns that into two clicks**: bind a reasoning model to **Plan** and a fast model to **Work**, then open a terminal in whichever mode the current job needs.

```
        ┌──────────────┐   plan document   ┌──────────────┐
Need ─▶ │  Plan mode   │ ───────────────▶ │  Work mode   │ ──▶ Delivery
        │ (reasoning)  │ (single source   │ (execution)  │
        └──────────────┃  of truth)       └──────────────┘
              ▲                               │
              └──── come back to revise ──────┘
                   when the plan has gaps
```

## Design philosophy

### Plan vs. everything else

The idea comes from how work is routed inside a company: the people who make the plan and the people who carry it out are never the same group, and their cost is never the same either. This tool draws the simplest possible line — **plan vs. everything else** — and leaves the routing decision to a human convention: *you* decide which model thinks (Plan) and which model executes (Work). Expensive reasoning tokens are spent only where they matter.

### The plan document is the single source of truth

Work mode consumes the plan document; it never improvises. When execution hits a gap in the plan, it stops and goes back to Plan mode for a revision — see the [Plan Mode Playbook](03-plan-mode-playbook.md) and [Work Mode Playbook](04-work-mode-playbook.md).

### Humans are the approver

The app never starts a session on its own. You review the plan and mark it `approved` before Work mode is allowed to touch anything.

### Zero-touch on your environment

- **Never reads or writes `~/.claude/settings.json`** — or any settings file, project or user level. No backups, no surprises.
- **Never writes `~/.zshrc`** — aliases are defined for the opened terminal session only.
- App state lives in `localStorage`; per-session model config lives in a `mktemp` directory that dies with the session.

Technically this works because every alias launches Claude Code with `--setting-sources ""` (skip all default settings files) plus `--settings "$CC_MODE_DIR/<ModelName>.json"` (a temp file that then wins over every other source). Details in [02 · Models & Providers](02-models-and-providers.md).

### Explicit over automatic

No background daemons, no auto-updating config, no automatic releases — publishing is a manual, two-click GitHub Actions workflow by design. The tool does exactly what you clicked, nothing more.

## Feature overview

| Feature | What you get |
| --- | --- |
| 🤖 Model management | Add / edit / duplicate / delete configs, drag-to-reorder, per-model connection test with latency |
| 🏷️ Provider presets | GLM, MiniMax, DeepSeek, Kimi, Z.ai, Qwen — base URL auto-fills by keyword, model ID quick-pick chips |
| 🔄 Mode binding | One model per mode (Plan / Work), shown as badges on the mode cards |
| ▶️ Open in Terminal | New terminal window with the selected mode's alias (`cc-p` / `cc-w`) ready to type |
| ⚙️ Settings | Dark / light theme, English / 简体中文, everything persisted in `localStorage` |

![Plan/Work switcher](/images/switcher_main.png)

## Platform support

| OS | UI | Open in Terminal |
| --- | --- | --- |
| macOS 12+ | ✅ | ✅ (Terminal.app / iTerm / other via `.command`) |
| Windows 10/11 | ✅ | ➖ coming later |
| Linux | ✅ | ➖ coming later |

"Open in Terminal" drives Terminal.app / iTerm via AppleScript, so it's macOS-only for now.

---

Ready to try it? → [01 · Quick Start](01-getting-started.md)
