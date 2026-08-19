# Implementation feedback — 001-multi-role-switcher

Status: notes from initial implementation, **plan not modified**.

## Completed

All 17 tasks from `plans/001-multi-role-switcher.md` are implemented and the
`pnpm build` + `vue-tsc` pipelines are clean.

## Minor notes (no action requested)

1. **Cmd+T / Cmd+N focus detection** — The plan calls for using
   `attachCustomKeyEventHandler` on the xterm instance for precise focus
   handling. The current implementation uses a heuristic
   (`activeElement.classList.contains('xterm')` / closest('.xterm')) because
   the same key dispatcher must work across non-terminal UI as well (Option+T
   works anywhere). If you want xterm-internal interception in addition, the
   call site is `XtermTab.vue`.

2. **`App.vue` imports `selectedRoleId` placeholder fallback** — When the
   user deletes the currently-selected role, the table auto-picks the next
   one via a `watch(roles, ...)`. The plan didn't call this out explicitly
   but it's needed to keep the detail panel from going stale.

3. **Detach / Attach ownership** — The `pty.ts` registry tracks the owning
   window via `webContents.id` (an integer). The plan talks about "the same
   session across windows" but doesn't forbid two detached windows pointing
   at one session simultaneously. The current implementation lets the most
   recent `session:detach` win; opening two detached windows for the same
   session will cause the second to overwrite the first's owner pointer.
   For v1 of this feature that's acceptable (the plan says "right-click Tab
   → separate" — one tab, one detach).

4. **Migrations are read-only** — `useConfig.ts` reads `cc_models`,
   `cc_plan_id`, `cc_work_id` from localStorage but **does not delete them**
   on disk. The plan says "迁移/重构破坏 v1 用户数据 → localStorage 只读迁移
   不删除" — so this matches, but it does mean the user might still see the
   old `Switcher` tab data in DevTools. If you want to clean them up after
   a successful migration, add a `localStorage.removeItem` block right after
   the `saveModels/saveRoles` call.

5. **`xterm` textarea focus** — Cmd+T inside xterm currently calls
   `cloneTab()` from a global keydown handler that runs *after* xterm has
   already consumed the keystroke. We `ev.preventDefault()` to keep the `t`
   character from leaking into the running claude session, but if you ever
   add more keys you'll want to switch to the `attachCustomKeyEventHandler`
   approach from note #1.

## Test plan (manual, until automated)

- [ ] `pnpm dev` boots with the workspace layout
- [ ] `~/.cc-mode-switcher/{models,roles}.yaml` + `prompts/{plan,worker}.md`
      are created on first boot
- [ ] Old `cc_models` / `cc_plan_id` / `cc_work_id` in localStorage migrate
      into roles.yaml without data loss
- [ ] `pnpm build && pnpm dist` produces a working dmg
- [ ] `Reset` restores default plan+worker, leaves models + user-edited
      prompt files untouched
- [ ] YAML editor: invalid YAML shows error hint, doesn't overwrite file
- [ ] RolesTable inline edits round-trip through YAML on the next reload
- [ ] Tab cloning via Cmd+T and Cmd+N role picker both start a real pty
- [ ] Detach → independent window, attach → merges back without orphans