# Plan: 全栈 Logo 替换（v2 视觉统一）

- Status: approved
- Author: leochan007 (Plan session) @ 2026-08-19
- Refs:
  - 用户提供的新 logo 源文件：`docs/public/images/logo.png`（256×256 PNG，深色圆角方底 + 绿色双 C 互锁链条 — "CC" 视觉双关）
  - 用户已确认范围：**全栈**（App 图标 + README 标题图 + VitePress 站 logo + favicon）
  - 项目 Plan-only 工作流：本计划**只产出文档**，所有资产生成 / 落点变更 / 代码改动由后续 Work 会话按本文执行

## 1. 背景与目标

### 1.1 背景
旧版项目无正式 logo 资产：
- `README.md` / `README.zh-CN.md` 标题前用 🎯 emoji 充门面
- `package.json → build` 未配 `icon`，mac/win/linux 三平台都用 Electron 默认图标
- `docs/.vitepress/config.mts` 未设 `logo`，浏览器 tab 也无独立 favicon
- `docs/public/` 没有 favicon / 站 logo

现状视觉一致性差，桌面应用辨识度低，站点品牌感缺失。2026-08-19 用户落定新 logo 设计稿（绿色双 C 互锁链条），决定一次性铺到所有出现位置。

### 1.2 目标
1. 在所有用户触点呈现同一份视觉 logo（同一色调、同一构图）
2. 提供符合 macOS / Windows / Linux 各自规范的 App 图标
3. VitePress 站点左上角 logo + 浏览器 tab favicon 全部就位
4. README 标题从 emoji 升级为正式 logo 图
5. 全程不破坏现有功能（深色/浅色主题、zh/en 两套文档、Electron 打包流程）

## 2. 现状（Current state）

### 2.1 已有的资产
- `docs/public/images/logo.png` — 用户新落定的源文件，256×256 RGB，非隔行，66 KB
  - 视觉：深色圆角方底（接近 #0E1B1A → #1A2A28 径向渐变），前景两枚绿色 (#5BD78A → #2DBA68 渐变) 互锁 C 形链条，右链尾有一个亮绿圆点高光
  - 已隐含 macOS "圆角方块" App 图标容器边界，**无需另套圆角蒙版**

### 2.2 各触点现状清单

| 触点 | 文件 | 现状 | 是否需改 |
| --- | --- | --- | --- |
| macOS App 图标 | `package.json → build.mac.icon` | 未配（用 Electron 默认） | ✅ |
| Windows App 图标 | `package.json → build.win.icon` | 未配 | ✅ |
| Linux App 图标 | `package.json → build.linux.icon` | 未配 | ✅ |
| GitHub README 标题图 | `README.md` / `README.zh-CN.md` 第 1 行 | `# 🎯 CC Mode Switcher` | ✅ |
| VitePress 站 logo | `docs/.vitepress/config.mts → themeConfig.logo` | 未配 | ✅ |
| VitePress 站点 favicon | `docs/public/` | 无 | ✅ |
| Browser favicon (HTML head) | `docs/.vitepress/config.mts → head` | 未配 | ✅ |
| App 窗口内 UI | `src/renderer/src/components/*.vue` | 无任何 logo 引用 | ⚪ 暂不动（in-app 走 SVG 图标按钮方案由另案规划） |
| 文档站截图 | `docs/public/images/*.png` | 截图本身不需改 | ⚪ 不动 |

### 2.3 源文件分辨率约束
`logo.png` 源文件是 256×256。
- macOS `.icns` 推荐 1024×1024 母版；electron-builder 默认会从配的 PNG 缩放，但 256→1024 升采样会糊
- Windows `.ico` 通常 256×256 就够
- Linux 512×512 是常见上限
- favicon 标准源 512×512 可覆盖所有目标尺寸

→ **需要 Work 会话询问用户是否有更高分辨率母版（如 1024×1024 / 矢量 AI/SVG）；若无，按"256×256 升采样到 512/1024 + Lanczos/AI 放大"方案走，并在风险章节标注轻微细节损失。**

## 3. 方案

### 3.1 资产目录布局
新建 `build-assets/`（仓库根）作为打包资源工作目录，**不进 git**（`out` 风格，加进 `.gitignore`），仅作为工作产物中间站。所有最终引用都从 `docs/public/images/` 或 `build/` 出。

```
build-assets/
└── logo/
    ├── src/
    │   └── logo.png              ← copy of docs/public/images/logo.png (canonical source)
    ├── icon-source-512.png       ← upscaled to 512 (Linux + favicon base)
    ├── icon-source-1024.png      ← upscaled to 1024 (macOS retina base)
    ├── icon.ico                  ← Windows multi-size .ico (16/32/48/64/128/256)
    ├── icon.icns                 ← macOS .icns (16/32/64/128/256/512/1024)
    ├── favicon-16.png
    ├── favicon-32.png
    ├── favicon-48.png
    ├── apple-touch-icon.png      ← 180×180
    ├── android-chrome-192.png
    ├── android-chrome-512.png
    └── logo-mark.svg             ← 用于 VitePress 站 logo（透明背景，提取双 C 主体）
```

最终仓库落点（**要进 git** 的）：
- `docs/public/images/logo.png` — 源文件（已有）
- `docs/public/images/logo-mark.svg` — VitePress 站 logo 用 SVG（透明底）
- `docs/public/favicon.ico` — 浏览器 favicon（VitePress 自动从 `public/favicon.ico` 加载）
- `docs/public/favicon-16x16.png` / `favicon-32x32.png` / `apple-touch-icon.png` — 显式尺寸 favicon（HTML head 引用）
- `build/icon.png` — Electron 打包入口（512×512 PNG，mac/win/linux 三平台通用）
- `build/icon.ico` — Windows 专属
- `build/icon.icns` — macOS 专属
- `README.md` / `README.zh-CN.md` — 标题改为 `<img>` 引用 `docs/public/images/logo.png`

### 3.2 各触点配置方案

#### 3.2.1 Electron App 图标（`package.json → build`）
新增字段（image 格式硬性要求 .png / .ico / .icns 三种之一；electron-builder 会按平台挑）：
```jsonc
"build": {
  "icon": "build/icon.png",         // 兜底（也是 Linux 用）
  "mac":   { "icon": "build/icon.icns" },   // 覆盖全局
  "win":   { "icon": "build/icon.ico"  },   // 覆盖全局
  "linux": { "icon": "build/icon.png" }     // 显式声明（虽然等于全局兜底）
}
```
**注意**：electron-builder 不会自动从 `.png` 生成 `.icns` / `.ico` —— 必须 Work 会话用 `png2icns` / `imagemagick` / `iconutil` 手工出齐三个格式并提交。

#### 3.2.2 VitePress 站 logo（`docs/.vitepress/config.mts`）
在 root 与 zh 两个 locale 的 `themeConfig` 都加：
```ts
logo: { src: '/cc-mode-switcher/images/logo-mark.svg', alt: 'CC Mode Switcher' }
```
- `base` 已经是 `/cc-mode-switcher/`，路径前缀别漏
- logo 高 28px 左右（VitePress 默认 navbar height 较矮，过大会爆框）
- 提供浅色 / 深色主题双版（`logo-mark.svg` + `logo-mark-dark.svg`）— 用 `appearance` 切换：
  ```ts
  logo: {
    srcset: { light: '/cc-mode-switcher/images/logo-mark.svg',
              dark:  '/cc-mode-switcher/images/logo-mark-dark.svg' },
    alt: 'CC Mode Switcher'
  }
  ```
  - light（深底 logo 在浅色站点顶部白底上看着没问题，但视觉冲击弱）→ 用 SVG 提一个亮色（白/浅灰底 + 绿 C）的浅主题版
  - 这个浅色版由 Work 会话从原 PNG 反提 / 手工矢量化

#### 3.2.3 VitePress favicon（HTML head）
在 `config.mts → head` 数组加（**全路径要带 base**）：
```ts
head: [
  ['link', { rel: 'icon', type: 'image/x-icon',
             href: '/cc-mode-switcher/favicon.ico' }],
  ['link', { rel: 'icon', type: 'image/png', sizes: '32x32',
             href: '/cc-mode-switcher/favicon-32x32.png' }],
  ['link', { rel: 'icon', type: 'image/png', sizes: '16x16',
             href: '/cc-mode-switcher/favicon-16x16.png' }],
  ['link', { rel: 'apple-touch-icon', sizes: '180x180',
             href: '/cc-mode-switcher/apple-touch-icon.png' }],
  ['link', { rel: 'manifest', href: '/cc-mode-switcher/site.webmanifest' }],
],
```
外加 `docs/public/site.webmanifest` 一份（name / short_name / icons 数组）。

#### 3.2.4 README 标题
`README.md` 第 1 行：
```diff
- # 🎯 CC Mode Switcher
+ <p align="center">
+   <img src="docs/public/images/logo.png" alt="CC Mode Switcher" width="128" />
+ </p>
+
+ <h1 align="center">CC Mode Switcher</h1>
```
`README.zh-CN.md` 同改。"English | 简体中文" 链接条保留原位。

### 3.3 颜色提取（用于 SVG 矢量化 + 浅色版调色板）
Work 会话跑 `sips -g` / `magick identify` 或 PIL 取色：
- 底色最深：`#0E1B1A`（深绿黑）
- 底色次深：`#1A2A28`
- 链条深绿：`#2DBA68`
- 链条亮绿：`#5BD78A`
- 高光圆点：`#9CF3B8`

## 4. 任务拆解（Work 会话执行清单）

> 本节是给后续 Work 会话的执行脚本；Plan 会话**到此即停**，不实际跑下列命令。

### Phase A — 资产生成（在 Work 机器上操作）
1. **源文件备份 & 升采样**
   - `cp docs/public/images/logo.png build-assets/logo/src/logo.png`
   - 用 `magick build-assets/logo/src/logo.png -filter Lanczos -resize 512x512 build-assets/logo/icon-source-512.png`
   - 用 `magick ... -filter Lanczos -resize 1024x1024 build-assets/logo/icon-source-1024.png`
   - **先询问用户**：是否有更高分辨率母版？有则覆盖升采样产物
2. **macOS `.icns` 生成**
   - `mkdir icon.iconset && cd icon.iconset`
   - 生成 16/32/64/128/256/512/1024 各一份（含 @2x）：`magick -resize 16x16 icon_16x16.png` …（详见 Apple 官方 iconset 命名）
   - `iconutil -c icns icon.iconset -o build/icon.icns`
3. **Windows `.ico` 生成**
   - `magick build-assets/logo/icon-source-256.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico`
4. **favicon 系列 PNG**
   - 16 / 32 / 48 / 180 / 192 / 512 各自一份 `magick -resize`
5. **SVG 矢量化（logo-mark）**
   - 用 `potrace` 或 `magick ... -threshold` + 手工描线，或 Inkscape `Trace Bitmap`
   - 输出两份 SVG：`docs/public/images/logo-mark.svg`（深底适配浅色站）/ `logo-mark-dark.svg`（深底适配深色站）
   - **若矢量化质量差**：用源 PNG 抠图 + 简单几何重建（两个 C 形圆环路径），不追求像素级还原
6. **`site.webmanifest`**：JSON 一份，5 个字段
7. **`.gitignore` 追加**：`build-assets/`、`out/`、`release/`

### Phase B — 代码 & 文档落点
8. **`package.json → build`**：按 §3.2.1 补 icon 三字段
9. **`docs/.vitepress/config.mts`**：
   - root locale `themeConfig.logo` 加 SVG（双主题 srcset）
   - zh locale 同
   - 顶层 `head` 加 favicon 四条 link + manifest
10. **`README.md` / `README.zh-CN.md`**：按 §3.2.4 改标题块
11. **新增 `docs/public/site.webmanifest`**

### Phase C — 验证
12. **本地构建**
    - `pnpm run build` → 不报错
    - `pnpm run dist` → 三平台产物里 `Icon` 字段非默认（用 `xattr -p` 或 Resources 查看）
13. **站点本地预览**
    - `pnpm run docs:dev` → 浏览器 tab 看到 favicon，navbar 左侧 logo 双主题切换正确
    - `pnpm run docs:build` → dist 输出含 `favicon.ico`、`logo-mark.svg`、`site.webmanifest`
14. **视觉回归**：手机模拟器（窄屏）、Chrome / Safari / Firefox tab、暗/亮主题切换

## 5. Out of scope（明确不做）

- App 窗口**内部 UI**（SettingsPanel / SwitcherPanel / ModelsPanel）的 logo 嵌入 —— 当前 in-app 走 xterm + IconButton.vue 图标按钮体系，无 logo 槽位；如要加，留给单独 plan（"in-app 品牌化"）
- 应用启动闪屏（splash screen）—— electron-builder 不支持 splash，需另案
- macOS `.icns` 内的 16-bit 深色模式变体 —— electron-builder 默认产物已含，无须手工做
- 浅色 SVG 版的精雕 —— 浅色站点的 navbar 白底，目前深色 SVG 已能看（深绿 C 链配白底对比够），Work 会话只做一个基础浅色版即可，不追求像素级反转

## 6. 验收（Acceptance）

- [ ] `build/icon.png`、`build/icon.ico`、`build/icon.icns` 三文件存在且非空
- [ ] `pnpm run dist` 产物（macOS dmg / Windows nsis / Linux AppImage）双击后桌面 / Dock / 任务栏图标均为新 logo，**不是 Electron 默认图标**
- [ ] `docs/public/favicon.ico`、`favicon-16x16.png`、`favicon-32x32.png`、`apple-touch-icon.png` 全部存在
- [ ] `docs/public/site.webmanifest` 通过 https://www.pwabuilder.com/ 或类似工具校验合法
- [ ] VitePress 站 dev / build 后：
  - 浏览器 tab favicon 是新 logo
  - navbar 左侧 logo 双主题切换正确
  - 控制台无 404 favicon 报错
- [ ] `README.md` / `README.zh-CN.md` 在 GitHub 渲染后，标题区域显示 logo 图（不再显示 🎯）
- [ ] 所有改动走一次 `pnpm run build && pnpm run dist` 全绿，无新增 lint / type 错误
- [ ] git diff 整洁：`build-assets/` 不进 git（已在 .gitignore），只 commit `build/icon.*` / `docs/public/*` / `package.json` / `config.mts` / `README*.md`

## 7. 风险（Risks）

| 风险 | 概率 | 影响 | 缓解 |
| --- | --- | --- | --- |
| 256×256 升采样到 1024 高频细节模糊 | 中 | macOS retina 大图标下链条边缘发糊 | Work 会话第一步先问用户要母版；无则用 Lanczos + 二次锐化（`magick -unsharp 0x1`） |
| SVG 矢量化工具对绿渐变圆点高光还原差 | 高 | 浅色 SVG 版看着不像原图 | 接受降级：浅色版只保留双 C 主体，去掉圆点高光；或干脆用 PNG 而非 SVG 给 VitePress 站 logo（性能可忽略） |
| `.icns` 在不同 macOS 版本显示不一致 | 低 | Dock 图标大小不一 | electron-builder 默认产出 16/32/64/128/256/512/1024 全套，按 Apple iconset 标准命名 |
| VitePress navbar logo 过高压扁 navbar | 中 | 站点顶部布局抖动 | logo SVG 强制 height: 28px / viewBox 缩到合理比例 |
| 用户后续反悔要换 logo | 必然 | 改动散在多处 | 全链路走单一源文件（`docs/public/images/logo.png`）+ 派生脚本化（Phase A 1-7 步），下次换 logo 只换源文件重跑命令即可 |

## 8. 给 Work 会话的开局提示

- 本计划已 `approved`，Work 会话**直接按 §4 Phase A → B → C 顺序执行**，不再回到规划
- 询问用户的时机：**Phase A 第 1 步**，问"是否有更高分辨率母版？"；有则覆盖升采样产物，没有则按 §7 缓解走 Lanczos
- 任何视觉偏差（升采样糊、SVG 不准）→ 走 §7 缓解表，不擅自换设计方向
- 全部完工后回复"✅ Logo 全栈替换完成"，并在 PR 描述里贴 macOS Dock / 站点 navbar / README 渲染三张截图