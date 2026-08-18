# 00 · 产品介绍

CC Mode Switcher 是什么、为什么做它、背后的设计理念。5 分钟读完,后续章节都默认你了解本章内容。

## 它解决什么问题

[Claude Code](https://claude.com/product/claude-code) 是一个工具,但你用它做的事其实是**很多种完全不同的工作**:

- **思考** —— 架构设计、方案评审、把模糊需求拆解成可执行的 plan
- **执行** —— 把 plan 落成代码、跑测试、处理机械性细节
- **专项** —— 安全审计、写文档、依赖升级……这些场景你希望用专门的 prompt + 工具白名单

这些工作需要的**模型、提示词、工具权限都不一样**。强推理模型让 plan 更好;快而便宜的模型执行起来绰绰有余;有写文档 prompt 的专项模型写起来最在行。但 Claude Code 的模型选择藏在环境变量 / 配置文件里,手动切换意味着改 `~/.claude/settings.json`(它会悄悄覆盖其他一切配置)、每个终端重新 export 一遍环境变量,还得时刻提防昂贵模型被绑在机械任务上浪费 token。

**CC Mode Switcher 把这一切装进一个工作台**:定义任意多个**角色**(每个角色有自己的模型、提示词、thinking 预算、工具黑白名单),然后按当前任务需要打开对应角色的 tab。**一个会话 = 一个角色 = 一套硬化过的环境**。

```
                ┌──────────────┐  plan_output.md  ┌──────────────┐
   需求 ────▶   │  Plan 角色   │ ───────────────▶ │ Worker 角色  │ ──▶ 交付
                │ (推理,只读) │  (.cc-delivery/    │ (执行,      │
                │              │   单一事实源)      │  写+测试)   │
                └──────────────┘                   └──────────────┘
                      ▲                                  │
                      └──── 发现漏洞回到 Plan 修订 ──────┘
```

## 设计理念

### 角色是一等公民

v1 时代只有 Plan / Worker —— 两个硬编码角色、固定双栏 UI。v2 翻转这个:**角色**是 `~/.cc-mode-switcher/roles.yaml` 里的一条 YAML 条目。出厂预置 `Plan` 和 `Worker` 应付常见场景,但你可以删掉它们,任意添加(`a1`、`test-c3`、`doc-writer`、`security-audit`……),或重命名。代码里**完全没有角色名硬编码** —— 表格、下拉、alias 全都是遍历 YAML 第一级 key 动态生成的。

### 一个会话、一个角色 —— 物理隔离

一个 pty / shell 会话在创建时就绑定到一个角色。角色的模型、system prompt、thinking 预算、工具黑白名单、`--disallowed-plugins` 都作为快照写入该 pty 的环境。后续修改角色配置**只影响新建会话**,已开的 Tab 保持原绑定不变。Plan 会话根本拿不到 Edit / Write / Bash(工具被禁了),即使模型"想"即兴发挥,shell 也不会让它。

### `plan_output.md` 契约

Plan 角色唯一的工作就是写 `.cc-delivery/plan_output.md`。Worker 角色启动的第一件事就是读它 —— 如果文件不存在,直接停下来告诉你"请先跑 Plan"。这个文件就是**跨角色边界的单一事实源**;没有 IPC,没有共享上下文,只是一个磁盘上的文件。

### 人类是审批者

应用从不自动开启会话。你挑角色、你点 ▶、你敲 `cc-<角色>`(或者自动启动) —— 看完 plan 后再翻 `approved`,只有这时 Worker 才被允许动任何东西。

### 对你的环境零侵入

- **绝不读写 `~/.claude/settings.json`**(项目级或用户级都不碰)。配置经由一个临时文件传递,通过 `--settings "$CC_MS_SETTINGS_FILE"` 引用。
- **绝不写 `~/.zshrc` / `~/.zprofile`**。alias 只对打开的会话有效,通过临时 `launch.sh` source 到该 shell。
- **应用配置存在 `~/.cc-mode-switcher/`**(`models.yaml` + `roles.yaml` + `prompts/*.md`)—— 可读、可改、git 跟踪、删掉等于完全卸载。

### 显式优于自动

无后台守护进程、无配置自动更新、无自动发布 —— 发布是手动的 GitHub Actions 工作流。工具只做你点的那些,不做任何更多的事。

## 功能一览

| 功能 | 你得到什么 |
| --- | --- |
| 🤖 **模型管理** | 在 `~/.cc-mode-switcher/models.yaml` 增删改;每个模型可单独连接测试 |
| 🏷️ **服务商预设** | GLM / Claude / DeepSeek / Kimi / Z.ai / Qwen —— 关键字自动填 Base URL;模型 ID 一键填充 |
| 📋 **角色表格** | 添加任意多角色;单元格直接编辑模型/thinking;拖拽排序;右键复制/删除;搜索过滤;行点击选中 |
| 🔧 **角色编辑弹窗** | Display label、绑定模型、thinking 开关、system prompt 文件选择、allowed-tools / denied-tools / denied-plugins 列表 |
| 📑 **YAML 视图** | 直接编辑 `roles.yaml`,内联语法校验;表格 ↔ YAML 双向同源(已知限制:表格保存会丢注释,YAML 视图保留) |
| 🖥️ **内部 xterm Tab** | xterm.js + node-pty 每个 Tab 独立;右键菜单(复制/粘贴/全选);detach 时 ring buffer 重放 |
| 🪟 **外部终端** | 打开 Terminal.app / iTerm,跑完全相同的 bootstrap —— `cc-<角色>` 行为一致 |
| ⌨️ **Mac 快捷键** | `Cmd+T` 克隆当前 Tab(复用快照的 cwd / 角色);`Cmd+N` 角色选择器;`Option+T` 用选中角色新建终端 |
| 🔌 **Tab 分离** | 右键 Tab → 独立窗口(标题 `{项目} | {角色}({模型})`);同一窗口的菜单合并回主窗口 |
| 🌍 **i18n** | English / 简体中文;主题切换(暗/亮);全部持久化到 app 配置 |
| ♻️ **重置角色** | 恢复默认 Plan + Worker;保留你的 `models.yaml` 和改过的 prompt 文件 |

![Switcher 工作台](/images/switcher_main.png)

## 会话是怎么启动的

内置(xterm Tab)和外部(Terminal.app / iTerm)终端都走同一条管道:

1. Renderer 调 `buildLaunchScripts({ entries: [此角色], cwd })` —— 单一事实源,定义 `cc-<角色>()` 函数。
2. shell 脚本写到 **`~/.cc-mode-switcher/.launch-cache/launch.sh`**(base64 解码;文件可读可审查)。
3. shell 在**当前进程**里 source 这个脚本:
   - **内置**:`node-pty` 写入 `. '<launch.sh>'` 到 spawn 的 zsh。
   - **外部**:`.command` 写 `launch.sh` 和 `zdot/.zshrc`(临时一行钩子,source `launch.sh` 并恢复 `ZDOTDIR`),然后 `exec /bin/zsh` —— 用户落在一个新 zsh 里,它已经 pickup 了同一份 `launch.sh`。
4. 在 shell 里敲 `cc-plan`(或 `cc-worker`,或任何角色 id)调用函数 export `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_MODEL` 等,然后 `exec claude <该角色的 flags>`。

结果:内置外置终端行为完全一致 —— 同样的 env、同样的 settings 文件、同样的 `cc-<角色>` alias —— 区别仅在承载的 host 是 Electron 的 xterm 还是 Terminal.app。

## 平台支持

| OS | UI | 内置 xterm | 外部终端 |
| --- | --- | --- | --- |
| macOS 12+ | ✅ | ✅ | ✅(Terminal.app / iTerm / 任何处理 `.command` 的 app) |
| Windows 10/11 | ✅ | ✅ | ➖ 后续 |
| Linux | ✅ | ✅ | ➖ 后续 |

---

试试看 → [01 · 快速上手](01-getting-started.md)