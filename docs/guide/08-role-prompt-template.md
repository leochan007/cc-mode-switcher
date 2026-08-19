# 08 · Role Prompt Template

> Any role you add in this app should follow the same prompt structure, signal vocabulary, and file-ownership rules. This makes handoff between roles as predictable as documentation between departments in a company.

## 1. Why a template

When roles are ad-hoc free-form prompts, three problems appear quickly:

1. **Inconsistent handoff** — Role A writes something Role B can't reliably parse.
2. **Unclear ownership** — Two roles edit the same file and overwrite each other.
3. **Status is invisible** — You can't tell from outside what role is doing what.

This guide gives every role a **single template**, a **standard signal vocabulary**, and a **file-ownership map**. Roles that don't follow the template are not broken — they're just less interoperable.

---

## 2. The 7-section prompt template

Every role's `systemPrompt` should have these sections in this order:

```markdown
# Role: <name>

## 1. Identity
<one paragraph: who you are, what kind of work you do>

## 2. Inputs
<what you read to do your work — files, env vars, conversation>

## 3. Outputs (Deliverables)
<what files you write, what signals you emit, where they go>

## 4. Tools / Constraints
<hard rules — allowed tools, denied tools, plugin restrictions>

## 5. Workflow
<numbered steps, no ambiguity>

## 6. Coordination contract
<which files you own, which you only read, which other roles depend on you>

## 7. Termination
<the exact final-line signal for each possible outcome>
```

### Section-by-section rules

| Section | Rule |
| --- | --- |
| **1. Identity** | One paragraph. State the role's *job*, not its *personality*. Don't include "you are a helpful assistant" filler. |
| **2. Inputs** | List every file path, env var, or conversation element the role depends on. If it's required to start work, mark it REQUIRED. |
| **3. Outputs** | List every file the role writes. State file-ownership explicitly (see §4 below). |
| **4. Tools / Constraints** | Hard rules only — things that *must not* happen. Avoid soft language ("try to", "preferably"). |
| **5. Workflow** | Numbered, sequential steps. If a step is conditional, branch it explicitly (`if X, do A; else do B`). |
| **6. Coordination contract** | "I own X. I only-read Y. I depend on Z from upstream." Be explicit about who else writes what. |
| **7. Termination** | Every role emits a final-line signal. See §3 below for the vocabulary. |

---

## 3. Standard signal vocabulary

Every role's response ends with **exactly one** of these signals on the **last line** (no markdown, no code fence, no prefix):

| Signal | Meaning | Who uses it |
| --- | --- | --- |
| `<ROLE>_READY` | Work done, handoff to downstream is possible | Any role that produces a deliverable |
| `<ROLE>_DONE` | Terminal completion of the whole task | The last role in a chain |
| `<ROLE>_BLOCKED` | Cannot proceed, needs upstream or user | Any role |
| `<ROLE>_NO_INPUT` | Missing critical input (e.g., no plan to execute) | Any role |
| `<ROLE>_NEEDS_INPUT` | Must ask the user a question | Any role |
| `<ROLE>_RUNNING` | Mid-work status (used in `status.md`, not as final-line) | Any role, in `status.md` only |

`<ROLE>` is the lowercase role name with hyphens replaced by underscores (`worker`, `planner`, `code-reviewer`, etc.).

### Examples

```
PLANNER_READY: outlined 7 file changes for the Settings panel refactor
WORKER_DONE: implemented all 7 file changes from plan; tests pass
WORKER_NO_PLAN: .cc-delivery/plan_output.md missing — run Planner role first
WORKER_BLOCKED: §4 entry 3 references a deleted file; needs Planner review
```

The app greps the **last line** of each role response for these signals to track handoff state.

---

## 4. `.cc-delivery/` file-ownership map

The `.cc-delivery/` directory in your project cwd is the **shared workspace** for multi-role sessions. Files inside it follow strict ownership rules:

| File | Owner | Other roles |
| --- | --- | --- |
| `plan_output.md` | **Planner** | read-only for everyone else |
| `worker_report.md` | **Worker** (append-only) | read-only for everyone else |
| `decisions.md` | any role (append-only) | read-only for everyone else |
| `status.md` | any role (replace the JSON block) | read-only for everyone else |

### Ownership rules

- **Write** to a file only if you are its owner (or `status.md` / `decisions.md`, which are shared).
- **Append** to `worker_report.md` / `decisions.md` — never overwrite.
- **Replace** the entire JSON block in `status.md` — never partially edit it.
- **Never** write to `plan_output.md` if you are not Planner. If the plan needs revision, surface it via `worker_report.md` and emit `WORKER_BLOCKED`.

### `status.md` schema

`status.md` has a single JSON block (with `json` language hint) at the top. Replace the whole block on each update:

```json
{
  "current_role": "<which role last acted>",
  "phase": "<completed | implementing | blocked | …>",
  "last_signal": "<ROLE>_<STATE>",
  "plan_path": "<path to plan_output.md if Planner ran>",
  "milestones_done": 0,
  "milestones_total": 0,
  "updated_at": "<ISO 8601 timestamp>"
}
```

Field meanings:
- `current_role` — the role whose response produced this status
- `phase` — coarse state (`completed` / `implementing` / `blocked`); role-specific phases allowed
- `last_signal` — the termination signal of the most recent response
- `milestones_done` / `milestones_total` — Worker-only progress; omit for other roles
- `updated_at` — ISO 8601 UTC, e.g. `2026-08-19T16:45:00Z`

---

## 5. Worked example: Plan + Worker contract

This is the canonical handoff between two roles in this app. They are designed to be **mutually self-consistent** — every field Planner writes, Worker reads.

### Planner's output (writes `plan_output.md`)

```markdown
# Plan: Add CSV export to Settings panel

## 1. Goal
Let users export all configured roles as CSV.

## 2. Scope
### In
- Settings panel gets an "Export CSV" button.
- CSV download includes: role id, label, model, thinking flag, prompt excerpt.

### Out
- Import-from-CSV (future work).
- Excel / xlsx format.

## 3. Architecture
- Add `exportRolesCsv()` to `useConfig.ts`.
- Trigger via new button in `SettingsPanel.vue`.
- Browser-side download (no IPC).

## 4. File changes
- `src/renderer/src/composables/useConfig.ts`: add `exportRolesCsv()` function
- `src/renderer/src/components/SettingsPanel.vue`: add "Export CSV" button + click handler
- `docs/guide/02-models-and-providers.md`: document the new export format

## 5. Risks
- Large role lists (≥100) may produce big CSV — use streaming? — defer.

## 6. Open questions
- Should CSV include the role `color` field? — flag for Worker.
```

### Worker's input (reads `plan_output.md`)

Worker's prompt explicitly tells it:
- Read `plan_output.md`
- If missing or §4 absent → emit `WORKER_NO_PLAN`
- Execute §4 line-by-line
- Append each milestone to `worker_report.md`
- End with `WORKER_DONE`

Both prompts reference the **same file paths**, the **same schema**, and the **same signals** — that's the contract.

---

## 6. Checklist for writing a new role prompt

When you add a new role, run through this list before saving:

- [ ] **Identity** in one paragraph, no fluff
- [ ] **Inputs** lists every file/env/conversation element the role depends on
- [ ] **Outputs** declares every file the role writes; ownership is explicit
- [ ] **Tools / Constraints** is a hard list, no soft language
- [ ] **Workflow** is numbered, conditional steps branch explicitly
- [ ] **Coordination contract** names every file it owns vs reads
- [ ] **Termination** lists every possible final-line signal
- [ ] Signals use the **standard vocabulary** (§3) with the role's own `<ROLE>_` prefix`
- [ ] If the role hands off to another role, both prompts reference the **same file paths and signal words**

If the new role hands off to an existing role, **edit the existing role's prompt too** so its "Inputs" section matches what the new role promises to deliver.

---

## 7. Editing built-in prompts

The two built-in roles (Planner, Worker) live inline in `roles.yaml` after first run. To edit them:

1. In the app, click the **YAML** view in the role table.
2. Modify `systemPrompt` directly.
3. Save — the app validates YAML and reloads roles.

If you want to **reset to the defaults** (e.g. you've made a mess), use the Settings panel → "Reset roles" button. This restores the canonical Plan + Worker prompts shown in this guide.

---

## See also

- [00 · Introduction](00-introduction.md) — what the app does
- [02 · Models & Providers](02-models-and-providers.md) — model configuration
- [03 · Roles Playbook](03-roles-playbook.md) — running roles from the UI
- [05 · End-to-End Example](05-workflow-example.md) — one feature from plan to delivery