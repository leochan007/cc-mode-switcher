# 03 · Roles Playbook — Designing Your Role Roster

Roles are first-class in v2. The shipped `Plan` and `Worker` are sensible defaults; whether you keep them, rename them, add more, or replace them entirely is your call. This chapter covers the design philosophy, the discipline that makes role boundaries actually work, and the conventions for the `.cc-delivery` contract that crosses role boundaries.

## Why roles are first-class

Old v1 hard-coded only Plan / Worker — two modes, fixed two-pane UI. v2 flipped that: a **role** is whatever you want it to be, defined in YAML, generated into the table / dropdown / `cc-<role>` aliases by simple iteration. The app has no role names baked in anywhere.

Common role patterns beyond the canonical two:

| Role | Purpose | Tools | Prompt |
| --- | --- | --- | --- |
| `Plan` (default) | Architecture / design / review | read-only, no Bash | "produce a plan document, no code" |
| `Worker` (default) | Implement the plan | write / edit / Bash / test | "read plan_output.md, then implement" |
| `doc-writer` | Documentation pass | read + Write (Markdown paths only) | "review code → update user-facing docs" |
| `security-audit` | Threat-model review | read + Glob + Grep | "audit auth surface, list findings, no fixes" |
| `refactor` | Mechanical restructuring | read + Edit + Bash (test only) | "apply mechanical refactor; tests must stay green" |
| `upgrade` | Dependency bumps | Bash + Edit (deps files only) | "bump deps, fix breaking changes" |

Each role gets its own model, prompt, and tool policy — the table is the source of truth.

## The four layers of role isolation

A role's "boundary" is enforced by **four independent layers**, each one catching what the others miss:

| # | Layer | What it does | Bypassable by user? |
| --- | --- | --- | --- |
| 1 | **System prompt** | Tells the model its job + hard rules ("don't write code in Plan mode") | No — it's the model's instruction |
| 2 | **Physical isolation** | A new pty session is spawned with the role's settings baked in | No — params are snapshotted at session creation |
| 3 | **Tool allow/deny list** | `--allowedTools` / `--disallowedTools` passed to claude | No — claude refuses to call denied tools |
| 4 | **UI labeling** | Tab title + table row show role + model + thinking state | Cosmetic only |

Layer 3 is the hard one. If the Plan role has `disallowedTools: [Edit, Write, NotebookEdit, Bash]` then *no matter what the model says*, claude will refuse the call. The model can hallucinate wanting to edit a file all it wants — the tool isn't there.

Layer 4 is the soft one. A glance at the tab title (`Plan | 🧠 Plan(GLM-5.3)`) tells you which mode you're in even if the prompt and tools let it slip.

## Discipline for each role

Whatever roles you define, the same discipline applies: **make the role's output location explicit, and cross role boundaries only through disk files.**

### The `.cc-delivery` contract (v2 — 2026-08-19)

For the canonical Plan ↔ Worker flow, both prompts write to a fixed location inside the project. Contract v2 introduces a structured status lock and renames the worker log file:

```
<your-project>/.cc-delivery/
├── plan_output.md     ← Plan writes here (active plan)
├── status.md          ← protocol lock (owner + heartbeat) — both roles update JSON block
└── worker_output.md   ← Worker appends structured receipts (was: worker_report.md)
```

- **Plan's only output**: `.cc-delivery/plan_output.md` — architecture / file-by-file change plan / risks / acceptance criteria. **No production code blocks**.
- **Plan's exit signal**: ends its response with the literal line `PLANNER_READY: <one-line summary>`.
- **Worker's first action**: read `.cc-delivery/plan_output.md`. If it's missing, stop with `WORKER_NO_PLAN: please run the Planner role first.`
- **Worker's second action**: check `.cc-delivery/status.md` `lock.owner` — if non-empty and not `"worker"`, emit `WORKER_BLOCKED: lock held by <owner>` and stop. Otherwise acquire the lock (`"worker"` + `heartbeat_at`).
- **Worker's milestones**: append a one-line receipt to `.cc-delivery/worker_output.md` after each meaningful change (schema: `## <task-id> — done|in_progress|blocked @ <ISO>`).
- **Worker's exit signal**: ends with `WORKER_DONE: <one-line summary>` **and** releases the lock (`status.md` `lock.owner: ""`).

The literal exit signals make it easy for the human (and other tooling) to know when to switch roles — search for `PLANNER_READY:` / `WORKER_DONE:` in the session transcript.

**Lock semantics (advisory, not hard-mutex):** the lock is an honor-system protocol — both roles check it on entry and refresh `heartbeat_at` on writes. A stale lock (>30 min without heartbeat) can be force-released by Planner, with the force-release recorded in the next `worker_output.md` receipt.

### Cross-role discipline rules

| Rule | Why |
| --- | --- |
| Roles communicate only through disk files (`.cc-delivery/`) | No IPC, no shared context; survives session crashes and role swaps |
| One session = one role (snapshot at creation) | Changing config mid-flight can't surprise an already-running session |
| The role's prompt must specify its output location | Otherwise the model defaults to "explain in chat" — gone with the session |
| Tab title shows role + model | Visual confirmation of which mode you're in |
| Don't share env between roles | Each session exports its own `ANTHROPIC_*` block; no inheritance from the parent shell |

## Configuring a role

Two ways:

### Through the UI

1. **Cell-edit** in the table: click the **Model** cell of a row → dropdown of your `models.yaml` entries; click the **Thinking** cell → toggle.
2. **✏️ Edit** for the full form: opens a modal with Display label, Bound model, Thinking toggle, System prompt file (with 📁 browser for `.md` files), Allowed tools, Denied tools, Denied plugins. Save → `roles.yaml` is updated.

### By hand

Edit `~/.cc-mode-switcher/roles.yaml` directly. The app picks up changes the next time you open a session — the YAML view (button in the table header) gives you syntax validation inline.

> **Known limitation**: saving from the table view **strips YAML comments** (it re-serialises the structure). If you write comments in `roles.yaml`, edit through the YAML view to keep them.

## Starting a role session

1. Select the role row in the table (left pane).
2. The Launch Panel below shows the full `cc-<role>()` command for that role — copy button at the top, or `▶ Open in Terminal` / `▶ Start internal terminal` buttons.
3. After clicking ▶:
   - **Internal xterm**: a new tab opens in the right pane. The bootstrap script is sourced automatically; you see:
     ```
     ✓ launch.sh:  /Users/<you>/.cc-mode-switcher/.launch-cache/launch.sh
     ✓ available:  cc-plan
     ```
     Type `cc-plan` (or your role's id) to start Claude.
   - **External terminal**: a new Terminal.app / iTerm window opens with the same setup. The bootstrap sources `launch.sh` and you land in an interactive shell where `cc-plan` works.

Both paths produce the same end state — a shell session with `cc-<role>` defined, the per-role settings file written, and the model env in scope inside the function.

## Done means

A role's session is "done" when its prompt's exit signal fires:

- Plan: `PLANNER_READY: <one-line summary>` (and `plan_output.md` is complete with no `OPEN QUESTION`s)
- Worker: `WORKER_DONE: <one-line summary>` (and the status.md lock is released)
- Custom roles: define your own exit signal in the prompt; the human reviews.

Next: read [04 · Worker Role Playbook](04-worker-mode-playbook.md) for the execution side, or jump to [05 · End-to-End Example](05-workflow-example.md) to see it in action.