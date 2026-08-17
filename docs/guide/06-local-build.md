# 06 · Local Build

When `pnpm run dev` fails to launch the window, or `pnpm run dist` produces a broken installer, the fastest path back to a known-good state is a **full clean rebuild**. This page is the ordered checklist — start at the top, only escalate as far down as you need.

> When in doubt, start with **Level 1**. Most transient issues resolve there. The deeper levels are for when the dev server literally cannot start or the dist output is corrupted.

## Level 1 — Re-run install (most cases)

Just nuke `node_modules` and reinstall. Keeps the lockfile so you get the same dependency versions.

```bash
# from the project root
rm -rf node_modules
pnpm install
pnpm run dev    # should now launch Electron with the renderer
```

If `pnpm install` fails with **`Error: Electron uninstall`** on pnpm ≥ 10, you're hitting the postinstall-script block. Either:

- Run `pnpm approve-builds` and tick `electron` (and `esbuild`) once — pnpm remembers the choice
- Or commit this to `package.json` so you don't get asked again:

  ```json
  "pnpm": { "onlyBuiltDependencies": ["electron", "esbuild"] }
  ```

## Level 2 — Drop the local Electron cache

Electron's prebuilt binaries are downloaded into a per-user cache. If that cache got corrupted (truncated download, partial mirror, antivirus quarantine), the reinstall won't fix it — the bad file is still there.

**macOS / Linux** — the cache lives in:

```
# electron itself
~/Library/Caches/electron/                    (macOS)
~/.cache/electron/                            (Linux)

# electron-builder's cached binaries
~/Library/Caches/electron-builder/            (macOS)
~/.cache/electron-builder/                    (Linux)
```

**Windows**:

```
%LOCALAPPDATA%\electron\Cache\
%LOCALAPPDATA%\electron-builder\Cache\
```

Clear them, then reinstall:

```bash
# macOS example
rm -rf ~/Library/Caches/electron
rm -rf ~/Library/Caches/electron-builder
pnpm install
pnpm run dev
```

## Level 3 — Drop the pnpm store + rebuild from the lockfile

If the issue is in pnpm's content-addressable store (shared across all your projects), escalate to clearing that. The lockfile is preserved so you don't get a random-version drift.

```bash
# Find where your pnpm store lives
pnpm store path

# Drop everything except what's currently needed by your lockfile
pnpm install --frozen-lockfile
# If you suspect the store itself is poisoned, the nuclear option:
pnpm store prune    # removes unused packages only — safe
# (there's no `pnpm store clear`; `prune` is the public API)
```

If `pnpm install --frozen-lockfile` still errors, delete `node_modules` + the cache (Level 2) **then** re-run.

## Level 4 — Pin a fresh Electron version

Sometimes a specific Electron release has a bad binary for your OS / arch. The fix is to bump the version in `package.json` to one that's known good:

```json
"devDependencies": {
  "electron": "42.0.0"        ← bump to a newer patch release
}
```

Then:

```bash
rm -rf node_modules
pnpm install
pnpm run dev
```

The GitHub mirror at `https://npmmirror.com/mirrors/electron/` is the fastest source if you're behind GFW — set it via `ELECTRON_MIRROR` env var or `.npmrc` (see [Requirements → Mirrors](../02-models-and-providers#mirrors-for-mainland-china)).

## Level 5 — Nuclear: wipe everything pnpm / electron / electron-builder knows about

Use when nothing above worked and you're staring at bizarre errors. **You will redownload every dependency, every Electron binary, every electron-builder helper** — expect 1–3 GB and a few minutes.

```bash
# from the project root
rm -rf node_modules

# user-level caches
rm -rf ~/Library/Caches/electron ~/Library/Caches/electron-builder    # macOS
# rm -rf ~/.cache/electron ~/.cache/electron-builder                  # Linux
# rmdir /s /q "%LOCALAPPDATA%\electron\Cache" "%LOCALAPPDATA%\electron-builder\Cache"  # Windows

# pnpm store
pnpm store prune

# clear any local dist leftovers from a previous electron-builder run
rm -rf release out dist

# fresh install
pnpm install
pnpm approve-builds    # if pnpm ≥ 10 asks again

# smoke test
pnpm run dev
# if packaging also broke:
pnpm run dist
```

## Common error → fix map

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Error: Electron uninstall` | pnpm ≥ 10 blocked Electron's postinstall | Level 1 — `pnpm approve-builds` |
| Dev server starts but window is blank / white | Stale Vite cache | `rm -rf node_modules/.vite && pnpm run dev` |
| `Electron failed to install correctly` | Corrupted prebuilt binary cache | Level 2 |
| `code signing failed` / `codesign error` on macOS | Stale build cache | `rm -rf release out && pnpm run dist` |
| `cannot find module 'electron'` after switching branches | `node_modules` from another lockfile | Level 1 |
| Random native module errors (e.g. `node-gyp`) | Stale node-gyp / prebuilds cache | `pnpm rebuild` after Level 1 |
| Installer launches but immediately exits | Wrong arch built (e.g. arm64 dmg on Intel mac) | Check `package.json` → `build.mac.arch`; rebuild |

## Verifying the rebuild worked

Three smoke tests, in order:

```bash
# 1. Lint / typecheck (catches the cheapest errors)
pnpm exec vue-tsc --noEmit

# 2. Dev launch — the window should open within ~5 seconds
pnpm run dev

# 3. Production build — produces a working .dmg / .exe / .AppImage
pnpm run dist
ls -lh release/
```

If any of these fail, the error message usually points at the layer that broke (deps, cache, signing, native module). Re-run the table above against the new symptom.

## Still stuck?

Capture before asking for help:

```bash
pnpm --version
node --version       # project targets Node 24+ (≥ 22 supported)
pnpm install --reporter=ndjson 2>&1 | tee install.log
pnpm run dev 2>&1 | tee dev.log
```

`install.log` + `dev.log` + the OS / arch (`uname -a` on Unix, `ver` on Windows) are usually enough to diagnose anything that survives Level 5.
