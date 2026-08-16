# 📚 CC Mode Switcher Documentation

**English** | [简体中文](/guide/zh/)

## Screenshots

**Switcher** — bind a model per mode and launch

![Switcher](/images/switcher_main.png)

**Models** — provider presets, autocomplete, connection test, drag sorting

![Models](/images/model_config.png)

**Settings** — theme, language, terminal picker, override guard

![Settings](/images/system_settings.png)

## Chapters

| Chapter | Contents | For whom |
| --- | --- | --- |
| [01 · Quick Start](guide/01-getting-started.md) | First-time setup and your first session in 5 minutes | New users |
| [02 · Models & Providers](guide/02-models-and-providers.md) | Presets, autocomplete, connection test, env vars, override guard | Everyone |
| [03 · Plan Mode Playbook](guide/03-plan-mode-playbook.md) | Producing plan documents (the intermediate artifact) with Plan mode | Core workflow |
| [04 · Work Mode Playbook](guide/04-work-mode-playbook.md) | Executing the plan strictly — **never re-plan mid-flight** | Core workflow |
| [05 · End-to-End Example](guide/05-workflow-example.md) | One feature from requirement to delivery, the whole way | See it in action |

## Core Idea

```
        ┌──────────────┐   plan document   ┌──────────────┐
Need ─▶ │  Plan mode   │ ───────────────▶ │  Work mode   │ ──▶ Delivery
        │ (reasoning)  │ (single source   │ (execution)  │
        └──────────────┃  of truth)       └──────────────┘
              ▲                               │
              └──── come back to revise ───────┘
                   when the plan has gaps
```

- **Strict division of labor**: Plan mode thinks and designs (it produces the plan document). Work mode implements (it consumes the plan document). Never mix them.
- **The plan document is the single source of truth**: when Work mode hits a gap in the plan, it stops and goes back to Plan mode — it never improvises.
- **Humans are the approver**: you review the plan document and mark it `approved` before Work mode is allowed to touch anything.
