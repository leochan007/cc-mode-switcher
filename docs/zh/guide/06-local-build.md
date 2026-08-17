# 06 · 本地构建

`pnpm run dev` 起不来窗口、或 `pnpm run dist` 打出来的安装包不能用的时候，最快的恢复路径就是**完整干净重建**。这一页是按顺序的清单 —— 从顶部往下走，逐级升级。

> 没把握就先从**第 1 级**试。绝大部分偶发问题在这一级就解决了。再往下的级别，是「dev 服务起不来」或「dist 输出损坏」这种硬伤。

## 第 1 级 —— 重跑 install（多数情况）

删 `node_modules` 重装就行。保留 lockfile，依赖版本不变。

```bash
# 项目根目录
rm -rf node_modules
pnpm install
pnpm run dev    # 这时候应该能起 Electron + renderer 了
```

如果 `pnpm install` 报 **`Error: Electron uninstall`**（pnpm ≥ 10 才会出），是 pnpm 默认拦了 postinstall 脚本。两种解法：

- 跑 `pnpm approve-builds` 勾上 `electron`（和 `esbuild`），勾一次 pnpm 就记住
- 或者把下面这行提交到 `package.json`，以后不再问：

  ```json
  "pnpm": { "onlyBuiltDependencies": ["electron", "esbuild"] }
  ```

## 第 2 级 —— 清 Electron 缓存

Electron 预编译二进制下载到 per-user 缓存目录。缓存如果坏了（下载中断、镜像源污染、杀毒软件隔离），重装 `node_modules` 没用 —— 坏文件还在。

**macOS / Linux** —— 缓存路径：

```
# electron 自身
~/Library/Caches/electron/                    (macOS)
~/.cache/electron/                            (Linux)

# electron-builder 缓存的二进制
~/Library/Caches/electron-builder/            (macOS)
~/.cache/electron-builder/                    (Linux)
```

**Windows**：

```
%LOCALAPPDATA%\electron\Cache\
%LOCALAPPDATA%\electron-builder\Cache\
```

清掉，再重装：

```bash
# macOS 示例
rm -rf ~/Library/Caches/electron
rm -rf ~/Library/Caches/electron-builder
pnpm install
pnpm run dev
```

## 第 3 级 —— 清 pnpm store + 按 lockfile 重建

如果问题在 pnpm 的 content-addressable 共享 store（跨项目复用），就需要动 store。lockfile 保留，不会引入随机版本。

```bash
# 看 pnpm store 在哪
pnpm store path

# 删掉当前 lockfile 不再需要的那些包（保留正在用的）
pnpm install --frozen-lockfile
# 如果怀疑 store 本身中毒，核弹选项：
pnpm store prune    # 只删未被引用的包 —— 安全
# （没有 `pnpm store clear` 公共命令；`prune` 就是对外的 API）
```

如果 `pnpm install --frozen-lockfile` 还报错，先做第 2 级清缓存，**再**重新 install。

## 第 4 级 —— 换一个新 Electron 版本

有时候某个具体 Electron 版本在你这台机器 / 架构上发布的二进制就是坏的。修法：`package.json` 里把 electron 版本往上滚一格：

```json
"devDependencies": {
  "electron": "42.0.0"        ← 升到一个更新的 patch 版本
}
```

然后：

```bash
rm -rf node_modules
pnpm install
pnpm run dev
```

国内网络走 `https://npmmirror.com/mirrors/electron/` 最快，设 `ELECTRON_MIRROR` 环境变量或 `.npmrc` 即可（见 [编译环境要求 → 国内镜像加速](02-models-and-providers#国内镜像加速)）。

## 第 5 级 —— 核弹：pnpm / electron / electron-builder 全部清干净

前 4 级都没救、面对莫名其妙错误时才用。**会重新下载所有依赖、所有 Electron 二进制、所有 electron-builder 辅助包** —— 预计 1–3 GB，几分钟。

```bash
# 项目根目录
rm -rf node_modules

# 用户级缓存
rm -rf ~/Library/Caches/electron ~/Library/Caches/electron-builder    # macOS
# rm -rf ~/.cache/electron ~/.cache/electron-builder                  # Linux
# rmdir /s /q "%LOCALAPPDATA%\electron\Cache" "%LOCALAPPDATA%\electron-builder\Cache"  # Windows

# pnpm store
pnpm store prune

# 清掉上次 electron-builder 的输出
rm -rf release out dist

# 全新安装
pnpm install
pnpm approve-builds    # 如果 pnpm ≥ 10 又问

# 冒烟测试
pnpm run dev
# 如果打包也坏了：
pnpm run dist
```

## 常见错误 → 修法对照表

| 症状 | 可能原因 | 修法 |
| --- | --- | --- |
| `Error: Electron uninstall` | pnpm ≥ 10 拦了 Electron postinstall | 第 1 级 —— `pnpm approve-builds` |
| Dev 服务起来了但窗口白屏 | Vite 缓存陈旧 | `rm -rf node_modules/.vite && pnpm run dev` |
| `Electron failed to install correctly` | 预编译二进制缓存损坏 | 第 2 级 |
| macOS 上 `codesign error` / `code signing failed` | 构建缓存陈旧 | `rm -rf release out && pnpm run dist` |
| 切分支后 `cannot find module 'electron'` | `node_modules` 来自另一份 lockfile | 第 1 级 |
| native 模块莫名错误（比如 `node-gyp`） | node-gyp / prebuilds 缓存陈旧 | 第 1 级之后跑 `pnpm rebuild` |
| 安装包启动后立刻退出 | 架构错了（比如 Intel Mac 上跑了 arm64 dmg） | 检查 `package.json` → `build.mac.arch`；重新打包 |

## 验证重建成功

三步冒烟测试，按顺序：

```bash
# 1. 类型检查（最便宜，先跑）
pnpm exec vue-tsc --noEmit

# 2. dev 启动 —— ~5 秒内窗口应该出来
pnpm run dev

# 3. 生产构建 —— 出可用的 .dmg / .exe / .AppImage
pnpm run dist
ls -lh release/
```

任何一步报错，错误信息通常能定位是哪一层坏的（依赖 / 缓存 / 签名 / native 模块）。再回头看对照表。

## 还是不行？

求助前先抓这些信息：

```bash
pnpm --version
node --version       # 项目以 Node 24+ 为目标（≥ 22 也支持）
pnpm install --reporter=ndjson 2>&1 | tee install.log
pnpm run dev 2>&1 | tee dev.log
```

`install.log` + `dev.log` + 系统架构（Unix `uname -a`、Windows `ver`），第 5 级之后还救不回来的话基本就够定位了。
