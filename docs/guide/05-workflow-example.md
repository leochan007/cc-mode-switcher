# 05 · End-to-End Example — Requirement to Delivery

One feature, walked the whole way through: a user request → `cc-plan` session → human review → `cc-worker` session → delivered code, plus the Tab / Detach / Clone shortcuts used along the way.

## Scenario

Add **"export / import role configurations"** to CC Mode Switcher — a button that exports the current `roles.yaml` + `models.yaml` (with secrets redacted) as a single JSON, and a paired button that imports the same JSON back, asking before clobbering existing roles.

## Step 0 · Workspace ready

1. Open the project directory: **📂** in the toolbar → pick your `cc-mode-switcher/` checkout. (The path is remembered; next time the app remembers.)
2. The **Switcher** tab loads. You should see `Plan` and `Worker` in the roles table, each bound to a model.

## Step 1 · Plan session — write `plan_output.md`

### 1.1 Open a Plan tab

- Click the `Plan` row to select it.
- Click **▶ Start Selected Role** in the toolbar.

A new **internal xterm tab** opens in the right pane. The bootstrap script is sourced automatically; you see the `✓ available: cc-plan` banner.

### 1.2 Type `cc-plan`

The shell function runs, exports the env, and `exec`s claude. After a moment you're inside the Claude Code REPL with the Plan prompt active.

### 1.3 Send the planning prompt

Type (or paste) the planning prompt:

```text
You are this project's architect, in Plan mode. Your only output is a plan
document — do not write implementation code.

Requirement: add Export / Import for role configurations. The user wants to
share a role setup with a teammate (or back it up before editing), without
leaking API keys.

Constraints:
- Export = both ~/.cc-mode-switcher/models.yaml and ~/.cc-mode-switcher/roles.yaml
  combined into a single JSON file.
- API keys in models.yaml must be redacted in the export.
- Import = read the JSON, show a diff against the current state, ask for
  confirmation before overwriting any role / model.
- The UI goes in the Settings panel.

First read the relevant code ( src/..., configs, package.json ), then write
the plan to .cc-delivery/plan_output.md using this project's standard plan
template (background / current state / approach incl. rejected alternatives /
task breakdown with files / out of scope / acceptance criteria / risks).
Anything uncertain becomes an OPEN QUESTION — don't guess.
```

The Plan session reads the codebase, asks you for clarifications if needed, and eventually writes `.cc-delivery/plan_output.md` ending in `PLANNER_READY: <one-line summary>`. It also sets `.cc-delivery/status.md.lock.owner = "planner"` on its way out so Worker knows the plan is fresh.

### 1.4 Human review

Open `.cc-delivery/plan_output.md` in your editor (or `cat` it in another terminal). Check:

- Does the task breakdown make sense? Are the file lists accurate?
- Are the `OPEN QUESTION`s reasonable? Make calls on each.
- Are `Out of scope` items things you'd actually want to defer?
- Are `Acceptance criteria` testable?

If yes: flip the `Status:` line to `approved`. If no: send a follow-up message in the Plan session asking for a revision — it stays in `draft` until you approve.

## Step 2 · Clone the Plan tab for parallel reference

You want to keep the Plan tab open while Worker runs, for cross-checking. **Clone it**:

- Focus the Plan tab (click in its xterm).
- Press **`Cmd+T`** → a new tab opens, same cwd, same role, same snapshotted settings. Now you have two Plan tabs.

> `Cmd+T` clones the **active** tab, reusing the snapshotted cwd / role / settings. Edit the role config later and the clones don't change — they're frozen at the moment of creation.

Close the original Plan tab (right-click → Close, or ✕). Now you have one Plan tab open with the plan file loaded in another terminal.

## Step 3 · Detach for a bigger window

Right-click the Plan tab → **Detach**. The tab detaches into its own BrowserWindow with title `cc-mode-switcher | 🧠 Plan(GLM-5.3)`. You can drag it to a second monitor, resize freely, and it stays in sync (any output that arrives after detach replays from the ring buffer).

## Step 4 · Worker session — implement

### 4.1 Open a Worker tab

- Click the `Worker` row in the roles table.
- Press **`Cmd+N`** → role picker → pick `Worker` (or `Option+T` if `Worker` is already selected).

A new internal xterm tab opens with the Worker bootstrap. Type `cc-worker`.

### 4.2 Worker reads the plan and proceeds

The Worker prompt enforces:

1. **Read `.cc-delivery/plan_output.md`** — if missing, abort with `WORKER_NO_PLAN:`.
2. **Check `.cc-delivery/status.md.lock.owner`** — if non-empty and not `"worker"`, abort with `WORKER_BLOCKED: lock held by <owner>`. Otherwise acquire the lock.
3. Implement, file by file. Refresh `status.md.lock.heartbeat_at` before long writes.
4. Append a one-line receipt per milestone to `.cc-delivery/worker_output.md` (schema: `## <task-id> — done|in_progress|blocked @ <ISO>`).
5. **Release the lock** (`status.md.lock.owner: ""`) and end with `WORKER_DONE:`.

You don't need to babysit — the four-layer isolation guarantees it can't edit the plan file, can't enable Superpowers, and the tools it's allowed to use are scoped to what the plan said to touch.

### 4.3 Mid-flight gap

Worker hits one of the `OPEN QUESTION`s in the plan (say, "redaction format: `***` vs `<REDACTED>` vs full omission?"). It:

1. Stops the current task.
2. Appends a `blocked` receipt to `.cc-delivery/worker_output.md`:
   ```
   ## T2 — blocked @ 2026-08-20T11:00:00+08:00
   T2 (redaction): plan asks how to redact apiKey in export. Suggesting
   `***REDACTED***` (matches conventions in similar tools). Awaiting Planner / human call.
   ```
3. Tells you in the chat.
4. Waits.

You reply: "Use `***REDACTED***`. Continue." Worker resumes.

## Step 5 · Verify

Worker says `WORKER_DONE: export/import shipped; lock released.` You verify:

- The new buttons appear in Settings → Export / Import.
- Export → produces a JSON with `apiKey: "***REDACTED***"` for every model.
- Import → with a teammate's export → shows diff, prompts before overwriting.
- Existing roles / models are intact if you cancel the import.
- `.cc-delivery/status.md.lock.owner === ""` (Worker released the lock).

## Step 6 · Tidy up

- Close the Worker tab (right-click → Close).
- The detached Plan tab stays open for reference — close it whenever.
- `~/.cc-delivery/plan_output.md` + `status.md` + `worker_output.md` stay on disk as the audit trail of this delivery.

## Shortcuts used

| Shortcut | When | What it does |
| --- | --- | --- |
| `▶ Start Selected Role` | toolbar | Start the role selected in the left pane |
| `Option+T` | anywhere in the workspace | Same — new internal tab with selected role |
| `Cmd+T` | xterm focus | Clone the active tab (same cwd + role snapshot) |
| `Cmd+N` | xterm focus | Open the role picker |
| Right-click tab → Detach | tab UI | Pop the tab into its own window |
| `⚙️ Settings → Reset Roles` | settings | Restore default Plan + Worker (keeps models + prompt files) |

## Variations

- **External terminal**: same flow, but `▶ Open in Terminal` (in the Launch Panel) opens Terminal.app instead of an internal tab. The `cc-<role>` aliases work the same way.
- **Multiple parallel Workers**: open as many Worker tabs as you want — they all see the same `plan_output.md`, each appends to `worker_output.md` with its own task-id prefix. The `status.md` lock is advisory (honor-system mutex) — only one Worker should hold it at a time. Don't run them on overlapping files at the same time.
- **Custom roles**: add a `test-runner` role (read + Bash + test paths only), a `security-audit` role (read + Grep + Glob only), etc. Each one is just another row in the table.