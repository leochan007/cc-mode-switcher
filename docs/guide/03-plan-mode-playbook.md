# 03 · Plan Mode Playbook — Producing the Plan Document

> Plan mode's only output is **an executable plan document**. No production code, no implementation.

## Why a plan document

Without an intermediate artifact, the "plan" lives only in a session's context: it dies with the session, degrades when you switch models, and lets the executing model improvise. Materializing the plan into a document means:

- It becomes Work mode's **single source of truth**
- A human can review, edit and approve it before anything runs
- If a Work session crashes, a fresh session resumes exactly from the same document
- Plan and Work models can each be optimal for their job (see [chapter 02](02-models-and-providers.md#model-pairing))

## Starting Plan mode

1. Select the **🧠 Plan Mode** card in the app (bound to a reasoning model)
2. ▶️ Open in terminal → run `claude-plan`
3. Equivalent to `claude --permission-mode plan` + `MAX_THINKING_TOKENS=16000` (thinking on)

Claude Code's plan permission mode is **read-only** by design — the mechanism itself guarantees "design only, touch nothing".

## Plan document conventions

- Directory: `docs/plans/` in the project root
- Naming: `NNN-<kebab-topic>.md` (e.g. `001-export-import-configs.md`), incrementing
- One plan, one topic — don't go big

## Standard plan document template

```markdown
# Plan: <one-line topic>

- Status: draft | approved | in-progress | done
- Author: claude-plan (<model-id>) @ <date>
- Refs: <requirement source / issue link>

## 1. Background & goal
Why this matters; what verifiable state "done" looks like.

## 2. Current state
Relevant code/modules and their behavior; key constraints
(framework versions, platform, performance, compatibility).

## 3. Approach
The chosen solution and why; list rejected alternatives and reasons
(prevents Work mode from reinventing them).

## 4. Task breakdown
Smallest independently verifiable tasks, dependency-ordered.

- [ ] T1: <what> — files: <paths>
- [ ] T2: <what> — files: <paths>

## 5. Out of scope
Adjacent problems this plan deliberately does not handle.

## 6. Acceptance criteria
- [ ] <observable, verifiable items>

## 7. Risks & rollback
What can go wrong, and how to back out.
```

## Plan session opening prompt (copy & use)

```text
You are this project's architect, now in Plan mode. Your only output is a
plan document — do not write implementation code.

Requirement: <state the requirement as concretely as possible>

First read the relevant code (src/…, configs, dependencies), then output a
plan document with this structure to docs/plans/NNN-<topic>.md (NNN = max
existing number + 1): Background & goal / Current state / Approach (incl.
rejected alternatives) / Task breakdown (each independently verifiable,
with involved files) / Out of scope / Acceptance criteria / Risks & rollback.

Rules:
- Task granularity: something Work mode finishes and verifies in one session
- Be specific down to modules and functions, but no large code blocks
- Anything uncertain becomes an OPEN QUESTION in the document — never guess
```

## Plan mode discipline

| Rule | Why |
| --- | --- |
| Only produce/revise the plan document, never production code | The permission mode enforces read-only; hold yourself to it too |
| Write OPEN QUESTION instead of guessing | A guessed plan amplifies errors into execution |
| Every task lists its files | Work mode goes straight there, less room for improvisation |
| Tasks must be independently verifiable | An unverifiable task has no completion criterion |
| Always write Out of scope | Closes the door on Work mode "helpfully" doing more |

## Done means

The plan document is complete (no unresolved OPEN QUESTIONs) → **human review** → status flipped to `approved` → only then may [Work mode](04-work-mode-playbook.md) begin.
