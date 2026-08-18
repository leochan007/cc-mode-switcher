# 04 · Worker Role Playbook — Execute, Don't Re-Plan

The Worker role is the executor in the canonical Plan ↔ Worker flow. Its only input is `.cc-delivery/plan_output.md` from a previous Plan session. It must implement the plan strictly — never re-plan mid-flight.

## Why a separate Worker role

The model that makes a great plan (slow, careful, expensive reasoning) is the wrong model for the mechanical work of implementing it (write the file, run the test, fix the typo). Putting both jobs in one session makes the cheap model over-cautious and the expensive model waste tokens on mechanical edits.

A separate Worker role solves both:

- **Bound to a fast model** — typically `GLM-4.5-Air`, `Claude Haiku`, `DeepSeek`, etc.
- **Thinking off** by default — no `MAX_THINKING_TOKENS`.
- **Tools allowed** — `Edit`, `Write`, `NotebookEdit`, `Bash`, etc.
- **Tools denied** — typically only what you want to keep off-limits (e.g. `WebSearch` in the shipped default to force local-only work).

## Starting the Worker role

1. Confirm `.cc-delivery/plan_output.md` exists and its `Status:` line is `approved` (you flipped it after human review).
2. Select the `Worker` row in the roles table.
3. Click ▶ (or `Option+T`, or `Cmd+N` and pick Worker).
4. In the new terminal tab, type `cc-worker`.

The shipped Worker prompt starts with:

> You are the **Worker** role in a multi-role Claude Code session.
> Your job is to execute the plan produced by the Planner.
>
> ## Hard constraints
> - Superpowers plugin is disabled. Do not attempt to enable it.
> - Honour the tool allow / deny list given to this session.
> - `WebSearch` is denied — rely on local files.
>
> ## Required workflow
> 1. Read `.cc-delivery/plan_output.md` first. If it is missing, stop and tell the
>    user: `NO_PLAN: please run the Planner role first.`
> 2. Implement the plan, file by file.
> 3. After each meaningful milestone, append a short note to
>    `.cc-delivery/worker_report.md` (what changed, what blockers arose).
> 4. When the plan is complete, end your response with the exact line:
>    `WORK_DONE: all plan items implemented.`

## Discipline rules

| Rule | Why |
| --- | --- |
| **Read `plan_output.md` first. Always.** | Without it, you're improvising — the whole point of the split is gone |
| **Implement, don't re-plan** | If the plan has a gap, stop and tell the human — don't silently make it up |
| **Don't edit `plan_output.md`** | That's the Planner's file. Add questions to `worker_report.md` if needed |
| **Append to `worker_report.md` per milestone** | Lets you see progress at a glance, restart mid-plan without losing context |
| **End with `WORK_DONE:`** | A literal signal you can grep for to know "this session delivered" |
| **Don't enable Superpowers** | It's disabled by `--disallowed-plugins`. Trying to bypass is a discipline failure |

## Handling plan gaps

Plans are sometimes incomplete. The Plan role writes `OPEN QUESTION` blocks for things it's unsure about — your job is to surface those, not resolve them.

If you hit an `OPEN QUESTION` while implementing:

1. **Stop** the current task.
2. Add to `.cc-delivery/worker_report.md`:
   ```
   ## Blockers

   - T3 (refactor auth helper): plan says "extract `verify_token` into a helper
     module" but doesn't specify whether it should be sync or async. The current
     call site assumes sync; refactoring to async would ripple.
   ```
3. Tell the human in the chat — paste the relevant `OPEN QUESTION` block from `plan_output.md`.
4. **Wait**. The human either edits the plan (status flips back to `draft`, then re-`approved`) or makes the call inline.
5. Do not invent a resolution. Do not "make it work" and move on.

## Restarting mid-plan

If the Worker session crashes or you close the tab, the next session starts fresh. The state lives in `.cc-delivery/plan_output.md` (the contract) and `.cc-delivery/worker_report.md` (your progress notes).

To resume:

1. Open a new Worker session.
2. Read both files.
3. Pick up at the last completed task from `worker_report.md`'s milestone list.
4. Continue.

The plan / report files are the **only** state that crosses sessions. Your session chat history is gone with the session — that's by design.

## After `WORK_DONE`

1. Read `.cc-delivery/worker_report.md` yourself to verify completeness.
2. Run the project's tests / build (whatever the plan called for).
3. Hand off to whatever the next step is (PR? deploy? another planning cycle?). The role is done.

If something turns out wrong after `WORK_DONE` — a missed edge case, a regression — that's a **new** planning cycle. Open a Plan session again, point it at `plan_output.md` + the actual code state, and write a revision. Don't keep patching in the Worker role past its remit.

Next: [05 · End-to-End Example](05-workflow-example.md) walks one feature from "user request" to "delivered".