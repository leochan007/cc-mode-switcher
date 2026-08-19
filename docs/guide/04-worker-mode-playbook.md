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
>    user: `WORKER_NO_PLAN: please run the Planner role first.`
> 2. Check `.cc-delivery/status.md` `lock.owner`. If non-empty and not `"worker"`,
>    emit `WORKER_BLOCKED: lock held by <owner>` and stop. Otherwise acquire the lock
>    (write `"worker"` + `heartbeat_at`).
> 3. Implement the plan, file by file. Refresh `status.md` `heartbeat_at` before any
>    write that may take >5 min.
> 4. After each meaningful milestone, append a one-line receipt to
>    `.cc-delivery/worker_output.md` (schema: `## <task-id> — done|in_progress|blocked @ <ISO>`).
> 5. When the plan is complete, **release the lock** (`status.md` `lock.owner: ""`)
>    and end your response with `WORKER_DONE: <one-line summary>`.

## Discipline rules

| Rule | Why |
| --- | --- |
| **Read `plan_output.md` first. Always.** | Without it, you're improvising — the whole point of the split is gone |
| **Acquire the status.md lock before any write.** | Two parallel Workers would clobber each other — the lock is the (advisory) mutex |
| **Implement, don't re-plan** | If the plan has a gap, stop and tell the human — don't silently make it up |
| **Don't edit `plan_output.md`** | That's the Planner's file. Add blockers to `worker_output.md` if needed |
| **Append to `worker_output.md` per milestone** | One line per receipt (v2 schema); lets you see progress at a glance, restart mid-plan without losing context |
| **Refresh `heartbeat_at` on long writes** | A stale lock (>30 min) can be force-released by Planner; refresh before the cliff |
| **End with `WORKER_DONE:` and release lock** | The literal signal is greppable; the lock release is what makes handoff safe |
| **Don't enable Superpowers** | It's disabled by `--disallowed-plugins`. Trying to bypass is a discipline failure |

## Handling plan gaps

Plans are sometimes incomplete. The Plan role writes `OPEN QUESTION` blocks for things it's unsure about — your job is to surface those, not resolve them.

If you hit an `OPEN QUESTION` while implementing:

1. **Stop** the current task.
2. Append a `blocked` receipt to `.cc-delivery/worker_output.md`:
   ```
   ## T3 — blocked @ 2026-08-20T11:00:00+08:00
   T3 (refactor auth helper): plan says "extract `verify_token` into a helper
   module" but doesn't specify sync vs async. Current call site assumes sync;
   async would ripple. Awaiting Planner / human call.
   ```
3. Tell the human in the chat — paste the relevant `OPEN QUESTION` block from `plan_output.md`.
4. **Wait**. The human either edits the plan (status flips back to `draft`, then re-`approved`) or makes the call inline.
5. Do not invent a resolution. Do not "make it work" and move on.

## Restarting mid-plan

If the Worker session crashes or you close the tab, the next session starts fresh. The state lives in `.cc-delivery/plan_output.md` (the contract), `.cc-delivery/status.md` (lock + handoff state), and `.cc-delivery/worker_output.md` (your receipts).

To resume:

1. Open a new Worker session.
2. Read all three files. Note: if `status.md.lock.owner` is still `"worker"` from the previous session, the previous one crashed without releasing — force-release by writing `lock.owner: ""` and noting it in your first receipt.
3. Pick up at the last completed task from `worker_output.md`'s task list.
4. Continue.

The plan / status / output files are the **only** state that crosses sessions. Your session chat history is gone with the session — that's by design.

## After `WORKER_DONE`

1. Read `.cc-delivery/worker_output.md` yourself to verify completeness.
2. Confirm `.cc-delivery/status.md.lock.owner === ""` (you released the lock on the way out).
3. Run the project's tests / build (whatever the plan called for).
4. Hand off to whatever the next step is (PR? deploy? another planning cycle?). The role is done.

If something turns out wrong after `WORKER_DONE` — a missed edge case, a regression — that's a **new** planning cycle. Open a Plan session again, point it at `plan_output.md` + the actual code state, and write a revision. Don't keep patching in the Worker role past its remit.

Next: [05 · End-to-End Example](05-workflow-example.md) walks one feature from "user request" to "delivered".