# 🎯 CC Mode Switcher

[English](README.md) | **简体中文**

[Claude Code](https://claude.com/product/claude-code) 的 Plan / Work 双模式环境切换器。给两种模式分别绑定不同的模型 —— 例如 **Plan**（架构 / 设计 / 评审）用推理模型、**Work**（实现 / 调试）用快速模型 —— 一键以正确的模式启动 Claude Code。

基于 Electron + Vue 3 + TypeScript 构建。

## 功能

### 🤖 模型管理
- 新增 / 编辑 / 复制 / 删除模型配置（显示名称、Base URL、API Key、模型 ID）
- **拖拽排序**（把手拖动，带上/下落点指示线）
- **Provider 预设** + URL 自动补全 —— 智谱 GLM、MiniMax、DeepSeek、Kimi（月之暗面）、Z.ai、通义千问（DashScope）
- 输入名称或模型 ID（`glm-5.3`、`MiniMax-M3`……）自动填入 Base URL
- 匹配到 Provider 后显示模型 ID 快捷 chips
- 每个模型可**测试连接** —— 绿色 toast 显示延迟（`连接成功 143ms`），红色 toast 显示网络错误

### 🔄 Plan / Work 切换器
- 两种模式各绑定一个模型；复制生成的配置紧跟原条目下方（`X copy`、`X copy (1)`……）
- 删除需经 Modal 对话框二次确认
- 按当前模式生成可直接粘贴的 shell 片段

### ▶️ 在终端中打开
- 首次使用：通过文件选择器选择终端应用（Terminal.app、iTerm 或其他 —— 通用回退为生成 `.command` 文件）
- 打开新的终端窗口并注入全部环境变量 —— **不会替你执行任何命令**
- Plan 模式额外定义 `claude-plan` alias，并 echo 就绪提示

### 🛡️ 环境变量覆盖防护
Claude Code 的 `~/.claude/settings.json` 中 `env` 块的优先级**高于终端环境变量**，会静默覆盖你切换的模型。本应用会：
- 每次启动终端前检测冲突变量（`ANTHROPIC_*`、`CLAUDE_CODE_SUBAGENT_MODEL`、`MAX_THINKING_TOKENS`）
- 提示一键清除（先写入带时间戳的备份；无关配置原样保留）
- Settings 页常驻显示覆盖状态，随时可清除

### ⚙️ 设置与细节
- 🌙 深色（默认）/ ☀️ 浅色主题 —— 基于 CSS 变量，头部或设置页均可切换
- English（默认）/ 简体中文 —— 头部或设置页快捷切换
- 图标按钮 + 悬停 tooltip
- 居中显示的 toast 通知
- 所有配置持久化到 `localStorage`

## 生成的环境变量

注入终端的内容如下（以 Work 模式为例；Plan 模式额外增加 `MAX_THINKING_TOKENS` 和 alias）：

```bash
export ANTHROPIC_BASE_URL="https://open.bigmodel.cn/api/anthropic"
export ANTHROPIC_AUTH_TOKEN="sk-..."
export ANTHROPIC_DEFAULT_OPUS_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_SONNET_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_FABLE_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME="glm-5.3"
export ANTHROPIC_DEFAULT_SONNET_MODEL_NAME="glm-5.3"
export ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME="glm-5.3"
export ANTHROPIC_DEFAULT_FABLE_MODEL_NAME="glm-5.3"
export ANTHROPIC_MODEL="glm-5.3"
export CLAUDE_CODE_SUBAGENT_MODEL="glm-5.3"
```

| 模式 | Thinking | 启动方式 |
| --- | --- | --- |
| Plan | ✅ `MAX_THINKING_TOKENS=16000` | `claude-plan` → `claude --permission-mode plan` |
| Work | ➖ 默认 | 直接运行 `claude` |

## 编译环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 22（20.19+ 亦可） | Vite 7 要求 Node 20.19+ / 22.12+；已在 Node 26 上验证 |
| pnpm | ≥ 9 | 推荐 —— 锁文件为 `pnpm-lock.yaml`（npm ≥ 10 也可以） |
| macOS | 12+ | Apple Silicon 或 Intel 均可。打包安装包需要 Xcode 命令行工具（`xcode-select --install`） |

> Windows/Linux：界面可以正常构建运行，但**「在终端中打开」目前仅支持 macOS**（依赖 AppleScript / `.command` 文件）。

### ⚠️ pnpm ≥ 10 注意

pnpm 10 默认拦截依赖的 postinstall 脚本，Electron 二进制不会下载，`npm run dev` 会报 `Error: Electron uninstall`。解决：

```bash
pnpm approve-builds   # 勾选 electron（和 esbuild）
```

或在安装前于 `package.json` 中添加：

```json
"pnpm": { "onlyBuiltDependencies": ["electron", "esbuild"] }
```

## 国内镜像加速

加速依赖与 Electron 二进制下载：

```bash
# npm/pnpm 源
pnpm config set registry https://registry.npmmirror.com

# Electron 二进制 + electron-builder 辅助二进制
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
```

或在项目根目录放一个 `.npmrc`：

```ini
registry=https://registry.npmmirror.com
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

## 快速开始

```bash
pnpm install   # 或 npm install
npm run dev    # 启动开发服务 + Electron
```

其他脚本：

```bash
npm run build   # 构建 main/preload/renderer 产物
npm run dist    # 打包安装包（electron-builder）
```

## 扩展 Provider 预设

在 [`src/renderer/src/data/providers.ts`](src/renderer/src/data/providers.ts) 中加一条即可 —— 表单自动补全、关键词自动填入、模型 ID chips 都会自动生效：

```ts
{
  id: 'glm',
  name: 'GLM (Zhipu)',
  baseUrl: 'https://open.bigmodel.cn/api/anthropic',
  keywords: ['glm', 'bigmodel', 'zhipu', '智谱'],
  models: ['glm-5.3', 'glm-5.3-air', 'glm-4.6', 'glm-4.5']
}
```

任何 Anthropic 兼容端点都可用。

## 项目结构

```
src/
├── main/            # Electron 主进程（IPC、终端启动、覆盖防护）
├── preload/         # contextBridge API
└── renderer/
    └── src/
        ├── components/    # Vue 组件（面板、卡片、弹窗、toast……）
        ├── composables/   # 模型、i18n、主题、终端、toast
        ├── i18n/          # 中英文文案
        ├── data/          # Provider 预设
        └── assets/        # 全局样式
```

## 常见问题

**打开终端后 Claude Code 为什么还是用了别的模型？**
`~/.claude/settings.json` 的 `env` 块会覆盖终端环境变量。应用会检测到这一点并提供一键清除（带备份），见上方「环境变量覆盖防护」。

**开发时日志里的 `TSM AdjustCapsLock…` / `IMKCFRunLoopWakeUpReliable` 是什么？**
macOS 输入法框架的无害噪音，所有 Electron 应用都有。渲染进程若崩溃，窗口会自动重载。

## 许可证

[MIT](LICENSE) © 2026 leochan007
