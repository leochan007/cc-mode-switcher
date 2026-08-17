# 06 · Release & Versioning Workflow

This project ships **macOS / Windows / Linux** installers via GitHub Releases, driven entirely by three manual GitHub Actions workflows. There is **no automatic trigger** — every publish is a deliberate human action taken on the GitHub web UI. **No local command line is required.**

## The three workflows

| Workflow | File | Purpose |
| --- | --- | --- |
| **List releases** | `.github/workflows/list-releases.yml` | Read-only — prints what already exists on GitHub. Run this first before doing anything else. |
| **Set version & tag** | `.github/workflows/set-version.yml` | Writes a `release vX.Y.Z` commit, pushes the `vX.Y.Z` tag. Upgrade, downgrade, or arbitrary version. |
| **Release Electron App** | `.github/workflows/release.yml` | Builds macOS / Windows / Linux installers and publishes the GitHub Release. Manual-only. |

The publish cycle is always **two steps**:

```
Step 1: Set version & tag  →  creates commit + tag (no build)
Step 2: Release Electron App  →  builds + publishes GitHub Release
```

You can repeat Step 1 many times before doing Step 2 if you want — the workflows are fully decoupled.

## One-time setup

In your GitHub repo:

1. **Settings → Actions → General → Workflow permissions** → choose **Read and write permissions**
2. Click **Save**

Without this, the runner cannot push commits / tags back to the repo and every Step 1 will fail at the `git push`.

## See what already exists

Before bumping, downgrading, or re-publishing, check what's already on the server.

**Actions → List releases → Run workflow → wait → open the run → expand "Print releases + tags"**

Output is two lists:

```
================================================================
  GitHub Releases (most recent 30)
================================================================
v1.0.0  v1.0.0  Published  2026-08-17
v0.9.5  v0.9.5  Draft      2026-08-15

================================================================
  Tags on origin (most recent 30)
================================================================
refs/tags/v1.0.0
refs/tags/v0.9.5
refs/tags/v0.9.0
```

The diff between the two lists is informative: a tag that appears in the **second** list but not the **first** means its GitHub Release was deleted — that tag can be re-published via the **Release Electron App** workflow.

## Bump up (auto, patch / minor / major)

**Actions → Set version & tag → Run workflow**, with:

| Input | Value |
| --- | --- |
| `mode` | `auto` |
| `bump` | `patch` *(or `minor` / `major`)* |
| `version` | *(leave blank)* |

What it does:

1. Reads the current version from `package.json`
2. Bumps it (e.g. `1.0.0` + `patch` → `1.0.1`)
3. Writes the new version into `package.json`, `pnpm-lock.yaml`, and the version label in `SettingsPanel.vue`
4. Commits `release v1.0.1`
5. Tags `v1.0.1` and pushes both commit + tag to `origin/main`

**Nothing is built yet** — go to Step 2.

## Set to an explicit version (upgrade OR downgrade)

**Actions → Set version & tag → Run workflow**, with:

| Input | Value |
| --- | --- |
| `mode` | `set` |
| `bump` | *(ignored)* |
| `version` | `2.0.0` *(or anything — a value lower than current = downgrade, e.g. `0.9.6`)* |

Same effect as above, but the target version is whatever you typed. Downgrade is non-destructive — the old tag and its Release stay in place.

If the tag you typed already exists on origin, the workflow aborts with a clear message: either pick a different version, or use Step 2 with that tag to re-publish.

## Build & publish the GitHub Release

**Actions → Release Electron App → Run workflow**, with:

| Input | Value |
| --- | --- |
| `tag` | *(leave blank to build whatever is currently on `main` HEAD — typically the commit Step 1 just pushed)* |

The runner checks out that ref, runs `pnpm install` + `electron-builder --publish always`, and creates a GitHub Release named after the version in `package.json`. The three OS targets build in parallel via matrix strategy.

## Re-publish an existing tag

Use this when:

- You accidentally deleted a GitHub Release
- The previous build had a bad artifact and you want a fresh build at the same tag
- You want to add a new OS target to an old release

**Actions → Release Electron App → Run workflow**, with:

| Input | Value |
| --- | --- |
| `tag` | `v1.0.0` *(the tag you want to re-publish)* |

The runner checks out that tag, rebuilds, and overwrites the existing Release with fresh artifacts. `--publish always` creates the Release if it's missing, updates it if it exists.

## Deleting releases or tags

None of the workflows ever delete anything. To clean up, use the GitHub web UI (repo → Releases → trash icon on the release) or a local terminal with the `gh` CLI:

```bash
# Delete just the Release (keep the tag — re-publishable via the flow above)
gh release delete v1.0.0

# Delete Release AND tag
gh release delete v1.0.0 --yes
git push origin --delete v1.0.0
```

Or mark the Release as **Draft** in the web UI to hide it without losing anything — the tag, artifacts, and download links all stay live.

## Why everything is manual

No `push: tags: v*` trigger exists anywhere. Every publish needs an explicit **Run workflow** click. Reasons:

- **Decoupled**: bump a version without immediately building (e.g. batch a few version bumps before triggering builds)
- **Predictable**: nothing happens while you're iterating on `main`
- **Recoverable**: any commit/tag state is reproducible from the web UI alone, no local git history needed
- **Auditable**: every release has a clear human-initiated action in the Actions log

## End-to-end examples

### Hotfix release to an old minor

```
1. Actions → Set version & tag → Run workflow
   mode=set, version=0.9.6

2. Actions → Release Electron App → Run workflow
   tag=(leave blank)
```

The current `main` HEAD is tagged `v0.9.6` and published. The previous `v1.0.0` tag and Release stay untouched.

### Replace a corrupted release

```
1. Don't touch package.json — just push a build fix to main:
   git commit --allow-empty -m "trigger rebuild" && git push

2. Actions → Release Electron App → Run workflow
   tag=v1.0.1
```

The `v1.0.1` tag already exists, so Step 1's version-bump workflow would refuse. Going directly to Step 2 with the existing tag checks out that exact commit and re-publishes.

### Promote a draft to a real release

```
1. Find the draft via List releases.

2. Open the draft on GitHub, edit it (Draft → Release), or:
   gh release edit v0.9.5 --draft=false
```

This isn't a workflow — it's just the GitHub Releases UI / `gh` CLI, since drafts are GitHub-native state.
