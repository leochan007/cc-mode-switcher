# 04 · Work Mode Playbook — Execute the Plan, Never Re-Plan

> Work mode's only input is a plan document in `approved` status. You are an executor, not a designer.

## Starting Work mode

1. Select the **⚡ Work Mode** card in the app (bound to an execution model)
2. ▶️ Open in terminal → run plain `claude` (default permissions: can write files, run commands)

## Work session opening prompt (copy & use)

```text
You are this project's implementation engineer, now in Work mode.
Execute strictly according to this plan document:

    docs/plans/NNN-<topic>.md    (status: approved)

Iron rules:
1. Execute only the tasks in "Task breakdown", in order, one by one
2. No new tasks, no design changes, no dependencies or file-structure
   changes not listed in the document
3. If you find the plan is wrong, incomplete or infeasible: STOP
   immediately and report — wait for the plan to be revised. Never
   invent a replacement design on the spot
4. After finishing each task, tick its [ ] to [x] in the document
5. When all tasks are done, walk through "Acceptance criteria" item
   by item and report results

Start with T1 now.
```

## Execution discipline (why so strict)

| Iron rule | What it prevents |
| --- | --- |
| Do only what's in the task list | Execution models "helpfully refactoring/optimizing" → scope creep |
| No design changes, no swapped dependencies | Two models each doing their own interpretation → fractured architecture |
| Stop on gaps, go fix the plan instead | The executor's "better idea" nobody reviewed is the #1 incident source |
| Tick tasks off in the document | A new session resumes precisely — nothing redone, nothing missed |
| Verify against acceptance criteria at the end | "Done" ≠ "correct"; the criteria are the objective judge |

## When the plan has a gap (the standard loop)

```
Work hits something the plan doesn't cover
        │
        ▼
Stop immediately and output: what you hit / why the plan doesn't
cover it / which items you suggest revising
        │
        ▼
Switch to the Plan terminal (claude-plan) → revise
docs/plans/NNN-….md → human re-approves
        │
        ▼
Back in the Work terminal: "@docs/plans/NNN-….md updated,
continue from task X"
```

**Never** say "just fix it yourself" in a Work session — that abandons the entire dual-mode division of labor.

## Crash recovery

A dead or closed Work session costs nothing: open a new one with the same opening prompt; the model reads the tick marks in the plan document and continues from the first unticked task.

## Done means

- Every item in Task breakdown is `[x]`
- Acceptance criteria verified one by one, results reported
- Plan document status flipped to `done`

For a full walkthrough see [chapter 05](05-workflow-example.md).
