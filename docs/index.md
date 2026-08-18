# 📚 CC Mode Switcher Documentation

**English** | [简体中文](/zh/)

## ⬇️ Download

macOS / Windows / Linux installers live on **[GitHub Releases → latest](https://github.com/leochan007/cc-mode-switcher/releases/latest)** — see the [download page](download.md) for per-OS files and install notes.

## 📑 Documentation Index

| Chapter | Contents | For whom |
| --- | --- | --- |
| [00 · Introduction](guide/00-introduction) | Multi-role switcher positioning, the problem it solves, design philosophy (roles are first-class, physical isolation, `.cc-delivery` contract), feature overview | Everyone — start here |
| [01 · Quick Start](guide/01-getting-started) | The workspace layout, five-step first-time setup (models / roles / terminal / launch) | New users |
| [02 · Models & Providers](guide/02-models-and-providers) | `~/.cc-mode-switcher/models.yaml` + `roles.yaml` format, provider presets, connection test, `--setting-sources ""` override guard | Everyone |
| [03 · Roles Playbook](guide/03-roles-playbook) | Designing your role roster: four-layer isolation, `OPEN QUESTION` discipline, `.cc-delivery` contract, `cc-<role>` aliases | Core workflow |
| [04 · Worker Role Playbook](guide/04-worker-mode-playbook) | Executing strictly from `plan_output.md`, handling mid-flight gaps, resuming | Core workflow |
| [05 · End-to-End Example](guide/05-workflow-example) | One feature from requirement → Plan → human approval → Worker → delivery, plus shortcut tour | See it in action |
| [06 · Local Build](guide/06-local-build) | Clean install: clear node_modules, pnpm store, electron / electron-builder caches, then reinstall | When `pnpm run dev` or `pnpm run dist` misbehaves |
| [07 · Release & Versioning Workflow](guide/07-release-versioning) | GitHub Actions workflows for cloud builds, version bumps / downgrades, GitHub Releases — all manual, no local CLI | Maintainers |

## Core Idea

```
                ┌──────────────┐  plan_output.md  ┌──────────────┐
   Need ────▶   │  Plan role   │ ───────────────▶ │ Worker role  │ ──▶ Delivery
                │ (reasoning,  │  (.cc-delivery/    │ (execution,  │
                │  read-only)  │   single source    │  write+test) │
                └──────────────┘   of truth)        └──────────────┘
                      ▲                                  │
                      └──── come back to revise ────────┘
                           when the plan has gaps
```

- **Roles are first-class**: not a Plan/Work toggle, but any number of roles (Plan + Worker ship as defaults, add / delete / rename freely), each with its own model, system prompt, thinking budget, and tool allow/deny list.
- **One session = one role**: parameters are snapshotted into the pty at session creation; config changes affect only new sessions.
- **`.cc-delivery/plan_output.md` is the single source of truth across roles**. Plan writes, Worker reads. No IPC, no shared context — just a file on disk.
- **Humans are the approver**. You flip `Status: approved` after reviewing the plan before Worker is allowed to touch anything.
- **Zero-touch on your environment**. `~/.claude/settings.json` is never read or written; `~/.zshrc` is never touched. All config lives under `~/.cc-mode-switcher/`.