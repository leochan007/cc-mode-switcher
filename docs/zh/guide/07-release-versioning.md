# 07 · 发布与版本管理

本项目通过 **macOS / Windows / Linux** 三个平台的安装包发布，全部由**三个手动 GitHub Actions 工作流**驱动。**没有任何自动触发** —— 每次发布都是 GitHub 网页上的显式操作。**不需要任何本地命令行。**

## 三个工作流

| 工作流 | 文件 | 作用 |
| --- | --- | --- |
| **List releases** | `.github/workflows/list-releases.yml` | 只读 —— 列出服务器上现有的 release。动手前先跑这个。 |
| **Set version & tag** | `.github/workflows/set-version.yml` | 写入 `release vX.Y.Z` 提交，推送 tag。升级、降级、任意版本都走它。 |
| **Release Electron App** | `.github/workflows/release.yml` | 构建三个平台的安装包并发布 GitHub Release。仅手动。 |

发布循环永远是**两步**：

```
第一步：Set version & tag  →  创建 commit + tag（不构建）
第二步：Release Electron App  →  构建 + 发布 GitHub Release
```

第一步可以重复多次再走第二步 —— 两个工作流完全解耦。

## 一次性配置

在 GitHub repo 网页上：

1. **Settings → Actions → General → Workflow permissions** → 选 **Read and write permissions**
2. 点 **Save**

不设这个，runner 推不回去 commit / tag，第一步每次都在 `git push` 处失败。

## 看现有版本

升降级、重发之前，先看服务器上有什么。

**Actions → List releases → Run workflow → 等 → 进这次运行 → 展开 "Print releases + tags"**

输出两段：

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

两段对照看：**第二段有、第一段没有**的 tag，说明它的 GitHub Release 被删了 —— 这种 tag 可以走第二步重发。

## 升级（自动算 patch / minor / major）

**Actions → Set version & tag → Run workflow**，填：

| 输入 | 值 |
| --- | --- |
| `mode` | `auto` |
| `bump` | `patch`（或 `minor` / `major`） |
| `version` | 留空 |

做的事：

1. 读 `package.json` 当前版本
2. 按 `bump` 算出新版本（如 `1.0.0` + `patch` → `1.0.1`）
3. 把新版本写进 `package.json` + `pnpm-lock.yaml` + `SettingsPanel.vue` 里的版本号
4. 提交 `release v1.0.1`
5. 打 `v1.0.1` tag，commit + tag 一起推到 `origin/main`

**还不构建** —— 走第二步。

## 直接指定版本（升级 或 降级）

**Actions → Set version & tag → Run workflow**，填：

| 输入 | 值 |
| --- | --- |
| `mode` | `set` |
| `bump` | 无所谓 |
| `version` | `2.0.0`（任意值，比当前低就是降级，比如 `0.9.6`） |

效果同上，但目标版本是你填的。降级不破坏旧的 —— 之前的 tag 和 release 完整保留。

如果填的 tag 在 origin 上已经存在，工作流**直接 abort** 并明确告诉你：要么换个版本号，要么用第二步 + 那个 tag 重发。

## 构建并发布 GitHub Release

**Actions → Release Electron App → Run workflow**，填：

| 输入 | 值 |
| --- | --- |
| `version` | 留空（自动选 origin 上 semver 最高的 tag） |

留空时，工作流列出 origin 上所有 semver tag，挑最高的，checkout 它，跑 `pnpm build` + `electron-builder --publish always`。macOS / Windows / Linux 通过 matrix strategy 并行构建。

### Draft → 正式发布，全自动

electron-builder 的 `releaseType` **默认是 `draft`** —— 三个并行构建把各自的产物上传到**同一个 draft release**。之后有一个专门的 `publish` job，只在**三个构建全部成功**后才运行，把 draft 转成正式发布（`gh release edit <tag> --draft=false`）。

为什么保留 draft 这一步：

- Release 永远不会带着**不完整的产物**对外公开 —— 比如 `.dmg` 已上传而 `.exe` 还在构建
- 任何一个平台失败，Release 就停在 **draft**（只有维护者可见）—— 修复后重跑即可，不会出现半公开状态
- `releases/latest` 和[下载页](../download)指向的都是已正式发布的版本，所以它们必须是完整的

> **Release 一直停在 Draft = 至少有一个平台的构建失败了。** 去看 Actions 运行记录，重跑失败的 job，`publish` job 会自动把它转正。

想用某个特定（不是最新）的 tag —— 比如跳过 `v1.1.0`、发 `v1.0.3`，或重打一个 Release 损坏的 tag —— 填 `version=1.0.3`（或 `v1.0.3`），两种写法都行。

工作流**永远**：

- 用一个 tag（不会偷偷跑 HEAD）
- 如果算出来的 tag 在 origin 上不存在就报错，告诉你先跑 `Set version & tag`
- `git checkout` 这个 tag，所以发布的产物和 tag commit 一一对应

## 重发已有 tag

同一个工作流，`version` 填具体版本：

| 输入 | 值 |
| --- | --- |
| `version` | `1.0.0`（或 `v1.0.0`） |

适用场景：

- 不小心把 GitHub Release 删了
- 上次构建产物有问题，要重打
- 给旧 release 补一个新平台的包

runner checkout 同一个 tag，重新构建，`electron-builder --publish always` 用新产物覆盖已有 Release。

## 删 release / tag

工作流从不主动删任何东西。要清理：

GitHub 网页：仓库 → Releases → 找到要删的，点垃圾桶图标。

或者本地有 `gh` CLI：

```bash
# 只删 Release（tag 留着 —— 上面「重发」流程能恢复）
gh release delete v1.0.0

# Release 和 tag 都删
gh release delete v1.0.0 --yes
git push origin --delete v1.0.0
```

或者更保守：GitHub UI 把 Release 改成 **Draft** 隐藏，tag 和所有产物都还在。

## 为什么要全部手动

没有任何 `push: tags: v*` 触发器存在。每次发布都需要显式点 **Run workflow**。原因：

- **解耦**：可以升几个版本号再统一触发构建，不需要每次都立刻发包
- **可预期**：`main` 上迭代时不会有意外动作
- **可恢复**：任何 commit / tag 状态都能从网页上重现，不依赖本地 git 历史
- **可审计**：每次发布在 Actions 日志里都有明确的人类发起动作

## 完整场景示例

### 给旧小版本打 hotfix

```
1. Actions → Set version & tag → Run workflow
   mode=set, version=0.9.6

2. Actions → Release Electron App → Run workflow
   tag= 留空
```

当前 main HEAD 被打上 `v0.9.6` tag 并发布。之前的 `v1.0.0` tag 和 release 一个不动。

### 替换损坏的 release

```
1. 不动 package.json —— 直接 push 一个空 commit 触发重建：
   git commit --allow-empty -m "trigger rebuild" && git push

2. Actions → Release Electron App → Run workflow
   tag=v1.0.1
```

`v1.0.1` tag 已经存在，第一步的版本号工作流会拒绝。直接走第二步 + 现有 tag，checkout 那次 commit 重新发布。

### 把 draft 提升成正式 release

工作流的 `publish` job 会在三个构建全部成功后自动转正 —— Release 停留在 Draft 说明有构建失败（或 `publish` job 没跑）。常规恢复方式：打开失败的 Actions 运行，重跑失败的 job，`publish` job 会自动转正。

确需手动处理时（例如产物齐全但 `publish` job 本身失败了）：

```
gh release edit v0.9.5 --draft=false
```

或在 GitHub 上打开该 draft，点击 **Publish release**。
