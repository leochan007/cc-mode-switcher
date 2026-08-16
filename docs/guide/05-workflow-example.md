# 05 · End-to-End Example — Requirement to Delivery

Scenario: add **model config export/import** to cc-mode-switcher. The full Plan → human approval → Work loop.

## Step 0 · Setup

| Terminal | Mode | Bound model (example) |
| --- | --- | --- |
| Terminal A (Plan) | `claude-plan` | glm-5.3 (reasoning) |
| Terminal B (Work) | `claude` | qwen3-coder-plus (execution) |

The app injects each mode's env into its own terminal — they don't interfere and can stay open side by side.

## Step 1 · Plan session (Terminal A)

Opening prompt (from [chapter 03](03-plan-mode-playbook.md)):

```text
You are this project's architect, now in Plan mode. Your only output is a
plan document — do not write implementation code.

Requirement: support exporting the configured model list to a file and
importing it back (for machine migration / backup). Note that API keys
are sensitive — the approach must account for that.

Read src/renderer/src/composables/useModels.ts and related components,
then output the plan document to docs/plans/001-export-import-models.md …
```

Excerpt of the produced document:

```markdown
# Plan: Model config export/import

- Status: draft
- Author: claude-plan (glm-5.3) @ 2026-08-16

## 1. Background & goal
Configs must migrate across machines; goal: one-click JSON export,
one-click import with merge.

## 3. Approach
Export: button in the Models panel → IPC → main process writes the file
(renderer has no fs access). Content = JSON.stringify(models); API keys
masked by default, "include secrets" optional.
Rejected: copying raw localStorage files — browser-storage dependent,
not portable.

## 4. Task breakdown
- [ ] T1: exportModels(includeSecrets) / importModels(json) in useModels — src/renderer/src/composables/useModels.ts
- [ ] T2: IPC export-models / import-models (dialog.showSaveDialog/showOpenDialog + fs) — src/main/index.ts, src/preload/index.ts
- [ ] T3: export/import buttons + merge strategy on conflict (overwrite by id, append new) — src/renderer/src/components/ModelsPanel.vue
- [ ] T4: en/zh i18n strings — src/renderer/src/i18n/{en,zh}.ts

## 5. Out of scope
No encrypted export, no cloud sync, no per-model checkbox selection.

## 6. Acceptance criteria
- [ ] An exported JSON fully restores the list on a fresh localStorage
- [ ] Default export contains no plaintext API keys
- [ ] Importing a model with an existing id updates it instead of duplicating
```

## Step 2 · Human approval (don't skip)

Read the document and check:
- Is the granularity right (is T2 too big — split save/open into two?)
- Does Out of scope match expectations
- Any OPEN QUESTIONs left

Then flip `- Status: draft` to `approved`.

## Step 3 · Work session (Terminal B)

Opening prompt (from [chapter 04](04-work-mode-playbook.md)):

```text
You are this project's implementation engineer, now in Work mode.
Execute strictly per docs/plans/001-export-import-models.md (status: approved).
Iron rules: only tasks in the list; no new tasks, no design changes; on any
gap — stop and report, never design on the spot; tick tasks off as you go;
verify every acceptance criterion at the end.
Start with T1.
```

Execution transcript:

```
Work: T1 done → ticks [x] T1
Work: T2 export IPC done → import needs "merge strategy" detail,
      but plan T3 already specifies it (overwrite by id) → continue
Work: T3 done → [x] T3
Work: T4 done → [x] T4
Work: acceptance criteria: 3/3 pass → reports, flips status to done
```

Contrast: without the plan document, the Work model would very likely "helpfully" add export encryption, checkbox-style export, maybe auto-sync — exactly what Out of scope excludes here.

## Step 4 · Wrap-up

- Work reports the verification; you spot-check the critical path (export → wipe → import → test connection)
- Plan status → `done`, kept as decision history
- Commit (message may reference the plan: `implements docs/plans/001-…`)

## Timeline

```
Need ──▶ Plan terminal: draft plan ──▶ human review/approve ──▶ Work terminal: execute list
                                                                   │
              ┌────────── gap found: stop & report ◀───────────────┤
              ▼                                                   │
      Plan terminal: revise ──▶ re-approve ─────────────────────────┤
                                                                   ▼
                                            acceptance passes ──▶ done ──▶ commit
```

Economics: deep thinking happens only in Plan (expensive model); mechanical execution all happens in Work (cheap model) — that is the entire point of the dual-mode split.
