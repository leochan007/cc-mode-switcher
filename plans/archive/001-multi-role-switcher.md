# Plan: 多角色切换器重构（Multi-Role Switcher, v2）

- Status: approved
- Author: leochan007 (glm-5.3) @ 2026-08-18
- Refs: 用户提供的《cc-mode-switcher 开发 Plan（完整修订版）》会话原文；替代开源项目 cc-switch 的定位；
  rev2 2026-08-18：并入外部终端行为一致性修复（实测 `[Process completed]` 反馈）
  rev3 2026-08-18：上述修复已落地代码（launchViaDotCommand 去掉 exit 0 + buildExternalSessionScript 会话脚本）
  rev4 2026-08-18：外部终端语义定稿——不自动执行 claude；shell-ready（cd+env 注入+cc-<role> 可执行挂 PATH，
  用户自行敲 cc-<role>；zsh 函数不能跨 exec 存活，故用 PATH 可执行文件实现）
  rev5 2026-08-18：应"与内置无差别"要求改为同机制——launch.sh（buildLaunchScripts 产物）经 ZDOTDIR 链注入
  落回的交互登录 shell，cc-<role> 为函数形态（替代 rev4 的 PATH 可执行方案）；用户 rc 全保留、ZDOTDIR 无泄漏
  rev8 2026-08-18：external terminal 修两个问题——(1) 启动后 [Process completed]
  闪退：macOS Launch Services 跑 `.command` 文件用 `zsh <file>`（non-interactive），
  shebang 的 `-i` flag 不会被传递；rev7 的 `#!/bin/zsh -i` 方案在 macOS 上实测不可靠。
  改为极简 ZDOTDIR 链兜底：`.command` 末尾 `exec /bin/zsh` + 临时 zdot dir 内只放一份
  `.zshrc`（source launch.sh + 恢复 ZDOTDIR）。(2) 显示多个 cc-<role>：
  `launchExternalWithRole` 改为只传单个 role 的 entry（与 internal `openRoleTab`
  一致）——每个 role 启动只显示该 role 的 cc-<role>，不再混入其他 role。`.command`
  仍写到 `$HOME/.cc-mode-switcher/.launch-cache/cmds/` 规避 Gatekeeper。main 启动
  仍调 `pruneLaunchCache` 清陈旧内容。internal pty 完全不动
  rev7 2026-08-18：external terminal 改用 `#!/bin/zsh -i` shebang 试图让 .command
  进程保持 interactive——已被 rev8 取代（macOS Launch Services 不传 shebang 的 -i flag）
  rev6 2026-08-18：external ZDOTDIR 链加固方案——已被 rev7 取代（思路过度设计）

## 1. 背景与目标

旧版 cc-switch / 本项目 v1.x 硬编码仅 Plan/Worker 两个角色、固定双栏 UI，无法扩展。v2 将其重构为
**Claude-Code CLI 多角色切换器**：

- 多角色分层切换大模型：高价模型做规划，低成本模型做执行
- 会话物理隔离：单一 pty 会话绑定单一角色，防止模型越权执行不属于本角色的任务
- 角色之间不做进程间通信，依靠项目内固定目录 `.cc-delivery/` 的文件契约完成交付协作
- 双编辑体验：普通用户表格可视化操作；高级用户直接编辑 YAML，双向同源（对标 Rancher 操作 K8s）
- xterm.js 多 Tab 内置终端、Detach/Attach 分离合并窗口、Mac 终端快捷键（Cmd+T / Cmd+N）
- 彻底禁用 Superpowers 插件，不依赖 Claude 原生 plan 能力；约束全部依靠 system prompt + 工具黑白名单

完成标志：用户可在表格/YAML 中自定义任意角色，在右侧内置多 Tab 终端以任一角色启动 claude 会话，
Tab 可分离/合并，Cmd+T/Cmd+N 生效，`.cc-delivery` 文件契约跑通完整 Plan→Worker 工作流。

## 2. 现状（Current state）

- 技术栈：Electron 42 + Vue 3 + TS + electron-vite 5 + pnpm 10，无测试，打包 mac-dmg(arm64)/win-nsis/linux-AppImage
- `src/main/index.ts`：主窗口 + 4 个 IPC（剪贴板/连接测试/选终端 App/外部终端启动）。模型与角色概念不存在
- `src/renderer/src/composables/useModels.ts`：模型存 **localStorage**（`cc_models` 等 key），硬编码
  plan/work 双绑定（`planModelId`/`workModelId`）——本次重构的改造对象
- `SwitcherPanel.vue` 内已有可复用的核心资产：env 导出组（11 个 ANTHROPIC_* 变量）、
  per-mode 临时 `--settings` JSON 生成、`--setting-sources ""` 隔离、alias 生成、mktemp 工作目录脚本——
  迁移为角色通用逻辑
- `ModelsPanel/ModelForm/providers.ts`：模型 CRUD + 服务商预设 + 连接测试，整体保留（弹窗化）
- **v1 外部终端启动缺陷（✅ 2026-08-18 rev3 已修复）**：▶️ 传给外部终端的脚本只含 env 导出+alias+echo，
  不启动 claude、不 cd 项目目录；`.command` 兜底路径被 Terminal 以 `zsh <file> ; exit` 执行，
  脚本跑完即 `[Process completed]`，注入的 env 随子 shell 消亡。Terminal.app/iTerm 路径虽保活
  shell 但也只到“可手敲 alias”为止——三条路径行为互不一致（实测反馈 2026-08-18）。
  修复落点：`src/main/index.ts` launchViaDotCommand 末尾 `exit 0`→`exec /bin/zsh -l`（落回交互
  shell、export 的 env 跨 exec 存活）；`shared/launchCommand.ts` 新增 `buildExternalSessionScript()`
  （会话执行态：cd+bootstrap 持久化到 launch-cache+顶层 export env+直接拉起 claude）；
  `App.vue` 外部三路径（菜单 plain/菜单 with role/详情面板 🪟）统一改走会话脚本
- 无 xterm/node-pty/yaml 依赖；无 electron.vite.config.ts（零配置构建）
- **CLI 事实（已在本机 claude 2.1.163 验证通过）**：`--system-prompt-file <path>`、
  `--disallowed-plugins <names...>`、`--allowedTools`/`--disallowedTools`、`--settings`、`--setting-sources` 均可用

## 3. 方案（Approach）

### 3.1 配置体系（磁盘化，替代 localStorage）

目录 `~/.cc-mode-switcher/`：

| 文件 | 内容 | 说明 |
| --- | --- | --- |
| `models.yaml` | 模型资源池 | 一级 key = 模型 id（slug），字段 name/baseUrl/apiKey/modelID；仅连接信息，不绑定角色 |
| `roles.yaml` | 角色配置 | 一级 key = 角色 id（出厂预置 `plan`/`worker`，可全部删除）；程序零硬编码，运行时遍历一级 key |
| `prompts/plan.md`、`prompts/worker.md` | 提示词模板 | 首次启动落盘；Reset **不覆盖**用户已改文件 |

roles.yaml 单角色字段（对应需求：角色 ID/展示名称/模型引用/thinking/提示词路径/插件黑名单/工具允许/禁止）：

```yaml
plan:
  label: 🧠 Planner
  model: glm47                 # → models.yaml 一级 key；空 = 未绑定
  thinking: true               # → MAX_THINKING_TOKENS=16000
  systemPrompt: ~/…/prompts/plan.md
  disallowedPlugins: [superpowers]      # 全部会话强制禁用
  allowedTools:   [Read, LS, Glob, Grep]
  disallowedTools: [Edit, Write, NotebookEdit, Bash]
worker:
  label: ⚙️ Worker
  model: glm47-air
  thinking: false
  systemPrompt: ~/…/prompts/worker.md
  disallowedPlugins: [superpowers]
  allowedTools: []
  disallowedTools: [WebSearch]   # “禁用全局扫描”的默认落地，用户可改
```

- 读写/校验/reset/迁移全部在 main 进程（`yaml` 包），renderer 通过 IPC 拿结构化数据
- 一键 Reset：重写 roles.yaml 为默认 plan+worker；**不动** models.yaml 与用户提示词 md
- 迁移：首次启动 models.yaml 不存在时，把 localStorage `cc_models` 及旧 plan/work 绑定迁入（一次性）
- YAML 损坏兜底：读取失败 → 保留坏文件为 `roles.yaml.bak` 并重建默认，UI 提示

### 3.2 UI 布局（工作台单屏）

```
┌────────────── Toolbar：项目目录选择 | ▶ 新终端 | + 新增角色 | 模型管理 | Reset | 设置 ┐
├──────── 左列（可调宽） ────────┬──────────── 右列：终端区 ─────────────┤
│ [搜索 Filter____]  [表格|YAML] │ ┌ Tab1 ─┬ Tab2 ─┬ Tab3 ─┬ + ┐        │
│ ┌ 角色表格 ─────────────────┐ │ │  xterm.js 终端（每 Tab 独立 pty）│        │
│ │ ID|名称|模型▾|Thinking|操作│ │ │                                │        │
│ └───────────────────────────┘ │ └────────────────────────────────┘        │
│ ┌ 选中角色详情面板 ──────────┐ │                                           │
│ │ 只读命令预览+复制+弹窗     │ │                                           │
│ └───────────────────────────┘ │                                           │
└───────────────────────────────┴───────────────────────────────────────────┘
```

- 表格：单元格直接编辑（模型列下拉数据源=models.yaml）、拖拽排序、右键（复制/删除角色）、行点击选中
- 详情面板：只读高亮展示该角色完整 claude 启动命令/env/alias，实时刷新；“弹窗打开”= 无阻塞独立窗口
- YAML 视图：textarea 编辑 + 实时语法校验（错误行提示）+ 保存同步；表格↔YAML 双向同源
- 模型管理/应用设置改为 Toolbar 弹窗；首次启动无模型时自动弹出模型配置并给空态引导

### 3.3 终端模块（xterm.js + node-pty，main 进程持有会话）

- main 的 `pty.ts` 维护 SessionRegistry：`Map<sessionId, { pty, ringBuffer(≤2MB), meta, owner }>`
- IPC：`session:create / input / resize / kill / attach / detach / list`，输出经
  `webContents.send('session:data'|'session:exit')` 推送；attach 时重放 ringBuffer
- **统一会话脚本（内置终端与外部终端唯一事实源）**，由 `shared/launchCommand.ts` 生成：
  - **bootstrap 态**（内置 pty 用）：定义 `cc-<role>()` zsh 函数（函数内 export env + exec claude），
    用户在 shell 里自行敲 `cc-<role>`
  - **外部 shell-ready 态**（外部终端用，**rev8 定稿**：与内置**完全对齐**，每个 role 启动只暴露该 role 的 cc-<role>）：
    `.command` 跑完 setup 后 exec `/bin/zsh` 落回新交互 shell；新 shell 通过**极简 ZDOTDIR 链**（仅一份临时 `.zshrc`，source 同一份 `launch.sh` + 末尾恢复 ZDOTDIR）拾起 `cc-<role>()` 函数：
    ```zsh
    #!/bin/zsh
    cd '<项目目录>'
    mkdir -p ~/.cc-mode-switcher/.launch-cache ~/.cc-mode-switcher/.launch-cache/zdot
    printf '%s' '<base64 bootstrap>' | base64 -d > ~/.cc-mode-switcher/.launch-cache/launch.sh
    chmod +x ~/.cc-mode-switcher/.launch-cache/launch.sh
    # zdot/.zshrc: source 同一份 launch.sh + 恢复 ZDOTDIR(回到用户原值)
    printf '%s' '<zshrc>' > ~/.cc-mode-switcher/.launch-cache/zdot/.zshrc
    export ZDOTDIR_BACKUP="${ZDOTDIR:-}"
    export ZDOTDIR="~/.cc-mode-switcher/.launch-cache/zdot"
    exec /bin/zsh
    ```
    为什么不能只用 `#!/bin/zsh -i`：**macOS Launch Services 把 `.command` 文件用 `zsh <file>` 调用**（non-interactive），shebang 的 `-i` flag 不会被传递；跑完 .command 后 zsh 进程退出，Terminal.app 显示 `[Process completed]`。rev7 试过 `#!/bin/zsh -i`，实测失败。exec 一份新 zsh + ZDOTDIR 钩子是 macOS 上唯一不污染用户 rc 的可靠做法
- 启动方式：pty 起登录 shell（`/bin/zsh -l`）执行 **bootstrap 态脚本**（登录 shell 解决 GUI 进程
  PATH 找不到 claude 的问题），用户在 shell 内自行运行 `cc-<role>`
- **rev8 external terminal 完全对齐 internal pty**（同文件 + 同 env 语义 + 同 cc- role 暴露粒度）：
  - **同文件**：`buildLaunchScripts({ entries, description })` 产物是唯一真相源，internal /
    external 都源。settings.json 路径统一为 `$HOME/.cc-mode-switcher/.launch-cache/<RoleId>.json`
    （internal pty `/tmp/cc-ms-xxx/settings.json` 沿用为兼容旧实现，不被 launch.sh 引用）
  - **同 env 语义**：`cc-<role>()` 函数体 = `export ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN
    / ANTHROPIC_DEFAULT_*_MODEL(NAME) / ANTHROPIC_MODEL / CLAUDE_CODE_SUBAGENT_MODEL[ /
    MAX_THINKING_TOKENS（仅 thinking 开启）] + exec claude <flags>`。shell 静止时这些 env
    不导出；用户敲 `cc-<role>` 时才注入到 claude 子进程
  - **同 cc- role 暴露粒度**（rev8 关键修复）：`launchExternalWithRole(roleId)` 改用**单 entry**
    调用 `buildExternalSessionScript`，与 internal `openRoleTab` 完全一致——每个 role 启动
    external 只暴露该 role 的 `cc-<role>()`（如启动 Plan 只看到 `cc-plan`，不混入
    `cc-worker` 等其他 role）。`launchExternalPlainShell(cwd)` 仍走无 role 路径
  - **极简 ZDOTDIR 链**（rev8 替换 rev6 加固链）：临时 `~/.cc-mode-switcher/.launch-cache/zdot/.zshrc`
    只做两件事——① source `~/.cc-mode-switcher/.launch-cache/launch.sh`（定义 `cc-<role>()`）；
    ② 末尾恢复 ZDOTDIR 到 `ZDOTDIR_BACKUP`（或 unset），保证用户后续 shell 环境干净。
    去掉 rev6 的 `CC_MS_RECURSION_GUARD` / trap EXIT 兜底 / zdot/.zprofile —— 实测那些加固
    在 macOS 上过度设计，ZDOTDIR 链本身已足够（用户 .zshrc 不会被修改）
  - **`.command` 写入路径**：`$HOME/.cc-mode-switcher/.launch-cache/cmds/`（rev6 改动），
    规避 macOS Gatekeeper "Yes, I trust this folder" 对话框（`/tmp` 视为下载目录，选 "No"
    会让 Terminal.app 关闭所有 tab；home 目录首次信任后不再弹）
  - **三条路径一致**（菜单 plain / 菜单 with role / 详情面板 🪟）：均经
    `buildExternalSessionScript({ entries, cwd })` 生成脚本
  - **internal pty 不动**：仍用 `/tmp/cc-ms-xxx/` mkdtemp 临时目录（`createSessionFiles`
    → `cleanupSessionFiles` 生命周期不变）+ pty env 内注入 `CC_MS_SETTINGS_FILE`
    （`buildPtyEnv` 接受 `settingsFile` 参数）。这是 v5 之前的实现，**rev8 不修改**
  - **main 启动清理**：`app.whenReady` 中调用 `pruneLaunchCache()`，清理
    `$HOME/.cc-mode-switcher/.launch-cache/` 内 mtime > 1 天的陈旧内容（launch.sh / settings.json /
    zdot/ / cmds/），避免长期累积占盘（macOS 上 atime 不可靠，故用 mtime）
- **会话参数固化**：建 Tab 时深拷贝角色+模型快照；改配置只影响新建终端，不影响已开 Tab
- Tab 标题：`{项目目录名} | {角色label}({模型名称})`；克隆副本追加 ` #2`；Detach 窗口标题同格式
- Detach：Tab 右键 → 新 BrowserWindow 加载 `#detach=<sessionId>` → attach + 重放；
  Attach：分离窗口内“合并回主窗口”→ 主窗口 Tab 栏恢复
- Mac 快捷键（仅 xterm 获得焦点时生效，`attachCustomKeyEventHandler` + 窗口级捕获拦截默认行为）：
  - **Cmd+T**：克隆当前 Tab（复用固化的 cwd/角色/启动参数），标题加副本编号
  - **Cmd+N**：弹出角色选择（读 roles.yaml 全部角色 + 绑定模型），选定后起新 pty
  - **Option+T**（保留）：以左侧表格选中角色新建终端

### 3.4 越界防护（四层）

1. system prompt 强约束（预置模板内置 `.cc-delivery` 文件契约）
2. 会话物理隔离（单 pty 单角色一套 prompt+权限）
3. 工具黑白名单（plan 只读、worker 可写；全角色强制 `--disallowed-plugins superpowers`）
4. UI 标识（Tab/分离窗口标题标注角色+模型）

`.cc-delivery` 契约（写入双方提示词）：`plan_output.md`（Plan 产物：架构/方案/目录规划，禁止完整业务代码）、
`worker_report.md`（Worker 执行结果与问题记录）；Plan 完成后提示切 Worker；Worker 启动先读规划，
缺失则提示先跑 Plan。

### 3.5 已否决的备选

- ❌ 继续用 localStorage 存角色/模型 → 无法手编、无契约文件、与“Rancher 式 YAML”目标冲突
- ❌ pty 直接 spawn claude 二进制（不经 shell）→ GUI 进程 PATH 缺失，claude 常装于用户级路径
- ❌ 依赖 claude `--permission-mode plan` 做约束 → 需求明确“不依赖 Claude 内置 plan 能力”
- ❌ 会话间 IPC 通信/共享上下文 → 需求明确仅靠磁盘文件契约
- ❌ CodeMirror 做 YAML 编辑器 → v1 textarea+校验足够，控制依赖面

## 4. 任务拆解（依赖有序）

### M1 配置核心
- [ ] T1: 计划文档落盘（本文件）— `plans/001-multi-role-switcher.md`
- [ ] T2: main 配置服务：models/roles YAML 读写、默认角色+提示词模板落盘、reset、损坏兜底、迁移 IPC
  — 新建 `src/main/config.ts`、改 `src/main/index.ts`、`package.json`(+`yaml`)
- [ ] T3: renderer `useConfig`（models/roles 共享状态 + IPC 同步 + 旧 localStorage 迁移触发）
  — 新建 `composables/useConfig.ts`、改 `types.ts`（RoleConfig/ModelConfig）

### M2 角色管理 UI
- [ ] T4: 工作台新布局骨架（Toolbar + 左右分栏 + 弹窗容器）— `App.vue`、新建 `WorkspaceToolbar.vue`
- [ ] T5: 角色表格（搜索过滤/单元格编辑/拖拽排序/右键复制删除/新增/Reset 确认）
  — 新建 `components/RolesTable.vue`
- [ ] T6: 启动命令生成器共享化（从 SwitcherPanel 抽出，按 RoleConfig 生成两种形态：
  会话执行态=cd+env+临时 settings+claude 全参数+落回 shell；预览/复制态=setup+alias）
  — 新建 `shared/launchCommand.ts`；新建 `components/RoleDetailPanel.vue`（预览/复制/独立弹窗/
  ▶️ 外部终端打开）；改 `src/main/index.ts`（launch-terminal 接收会话执行态脚本，
  Terminal.app/iTerm/`.command` 三路径统一）
- [ ] T7: YAML 源码编辑视图（校验/错误提示/保存同步/切换保护）— 新建 `components/RolesYamlEditor.vue`
- [ ] T8: 模型管理弹窗化 + 首次启动空态引导 — 改 `ModelsPanel.vue`、`App.vue`

### M3 内置终端
- [ ] T9: pty 会话管理器 + 全套 IPC + preload 暴露 — 新建 `src/main/pty.ts`、改 `src/main/index.ts`、`src/preload/index.ts`
- [ ] T10: 终端 Tab 容器与 xterm 组件（挂载/fit/输入/resize/退出清理/Tab 标题）+ 构建配置
  （electron.vite.config externalize、asarUnpack node-pty）— 新建 `components/TerminalTabs.vue`、`XtermTab.vue`、`electron.vite.config.ts`、改 `package.json`
- [ ] T11: 三条启动路径打通（表格▶️ / Option+T / Cmd+N 角色选择弹窗）+ 未绑定模型报错
  — 新建 `composables/useSessions.ts`、`components/RolePickerModal.vue`、改 `RolesTable.vue`
- [ ] T12: Cmd+T 克隆当前 Tab（固化参数复用 + 副本编号标题）— 改 `XtermTab.vue`、`useSessions.ts`
- [ ] **T12a: rev8 external terminal 完全对齐 internal pty**（internal pty 行为保持 v5 之前不变）：
  - `launchExternalWithRole(roleId)` 改用**单 entry** 调用 `buildExternalSessionScript`
    ——每个 role 启动 external 只暴露该 role 的 `cc-<role>()`，与 internal `openRoleTab`
    完全对齐（修多 cc- role bug）。`launchExternalPlainShell(cwd)` 仍走无 role 路径
  - `buildExternalSessionScript` 改为**极简 ZDOTDIR 链兜底**（macOS Launch Services 不传
    shebang 的 `-i` flag，`#!/bin/zsh -i` 不可靠）：写 launch.sh 到
    `$HOME/.cc-mode-switcher/.launch-cache/launch.sh`（base64 解码，**用户能看到**）；
    写 zdot/.zshrc（source launch.sh + 末尾恢复 ZDOTDIR）；export ZDOTDIR_BACKUP；
    export ZDOTDIR=zdot；末尾 `exec /bin/zsh`。去掉 rev6 的 CC_MS_RECURSION_GUARD /
    trap EXIT / zdot/.zprofile / zdot/.zshenv —— 极简版足够
  - `.command` 文件 shebang 改回 `#!/bin/zsh`（rev7 的 `-i` 在 macOS 上实测无效）
  - main 进程启动时清理 `.launch-cache/` 内 mtime > 1 天的陈旧内容（`pruneLaunchCache`）
  - 三条外部路径（菜单 plain / 菜单 with role / 详情面板 🪟）确认均走同一份
    `buildExternalSessionScript`（已实现，验收）
  - `.command` 文件写到 `$HOME/.cc-mode-switcher/.launch-cache/cmds/`，规避 macOS
    Gatekeeper "Yes, I trust this folder" 对话框
  — 改 `src/renderer/src/App.vue`、`src/renderer/src/shared/launchCommand.ts`、
  `src/main/index.ts`、`src/main/pty.ts`（仅新增 `launchCacheDir` / `pruneLaunchCache`
  导出，**不改 `createSessionFiles` / `buildPtyEnv` / `cleanupSessionFiles`**）

### M4 Detach / Attach
- [ ] T13: Tab 右键分离为独立 BrowserWindow（buffer 重放、配置全继承、窗口标题）
  — 改 `src/main/index.ts`、`pty.ts`、`TerminalTabs.vue`
- [ ] T14: 分离窗口合并回主窗口 Tab 栏 — 同上

### M5 收尾
- [ ] T15: 内置提示词模板文案（plan.md/worker.md，含 `.cc-delivery` 契约与切换提示）— `src/main/config.ts`
- [ ] T16: i18n 全量补齐（en/zh）+ 主题适配 + Toast 反馈 + 删除旧 Switcher 残留
- [ ] T17: `pnpm dev` 端到端验证（双角色工作流/克隆/Detach/Reset/迁移）+ README 更新

## 5. 不做的事（Out of scope）

- 会话间任何进程通信（只靠 `.cc-delivery` 文件契约）
- models.yaml 的 YAML 手编界面（模型仍用表单；YAML 视图仅角色）
- Windows/Linux 快捷键适配（Cmd 系列 spec 明确“仅 Mac”；Ctrl 版后续）
- 角色模板库、配置导出/导入分享、token 消耗统计（需求第九节“后续可选”）
- 表格编辑保留 YAML 注释（v1 已知限制：表格保存会重写 YAML，注释丢失，UI 提示）

## 6. 验收标准

- [ ] roles.yaml 删除全部角色后 UI 表格为空、仍可新增自定义角色（如 `a1`、`test-c3`）；程序无角色硬编码
- [ ] 表格改“绑定模型/Thinking”即时生效于新建终端；已开 Tab 会话不受影响（参数固化）
- [ ] Tab 标题/分离窗口标题符合 `{项目目录名} | {角色label}({模型名称})`，克隆副本带 ` #n`
- [ ] 终端焦点下 Cmd+T 克隆、Cmd+N 弹角色选择；侧边栏/编辑器焦点下二者不响应；Option+T 保留
- [ ] Detach 出独立窗口可正常交互，Attach 合并回主窗口无死会话
- [ ] plan 会话实测无 Edit/Write 权限、Superpowers 被禁用；worker 可编辑并产出 `worker_report.md`
- [ ] Plan→Worker 完整跑通 `.cc-delivery/plan_output.md` → `worker_report.md` 工作流
- [ ] Reset 恢复默认 plan+worker，models.yaml 与用户改过的 prompts/*.md 原样保留
- [ ] YAML 视图改配置保存后表格同步；写坏 YAML 给出错误行提示且不落盘
- [ ] 旧版 localStorage 模型与绑定迁移成功；`~/.claude/settings.json` 全程零污染
- [ ] 复制角色完整命令可在系统终端直接粘贴运行，行为与内置终端一致
- [ ] ▶️ 外部终端打开：自动 cd 项目目录、落回交互 shell（用户自己的 rc 环境保留）且所有
      `cc-<role>` 以 **shell 函数**形式可用（`type cc-<role>` 显示 function，与内置终端一致，
      不自动启动 claude）；三路径行为一致；不再出现脚本即退 / `[Process Completed]`
      （v1 缺陷回归项，rev5 定稿语义）
- [ ] **rev8 external terminal 与 internal pty 完全对齐验收**：
  - external 启动**不再显示 `[Process completed]`**：exec `/bin/zsh` 替换 .command 进程为新
    zsh，新 zsh 通过临时 zdot/.zshrc source launch.sh（定义 cc-<role>()），shell 保持 interactive
  - external 启动后**只暴露当前 role 的 cc-<role>**（与 internal `openRoleTab` 对齐）：
    启动 Plan role → 看到 `cc-plan`，无 `cc-worker` 等其他 role；启动 Worker role → 只看到
    `cc-worker`
  - internal xterm 与 external Terminal.app/iTerm 在同一 cwd 下、同一 role 下：
    - `type cc-<role>` 均显示 function（功能对齐）
    - 敲 `cc-<role>` 后 `echo $ANTHROPIC_BASE_URL` / `$ANTHROPIC_AUTH_TOKEN` 输出完全一致
      （env 注入语义对齐）
  - 用户 prompt 与 home 环境下普通 Terminal.app 一致（zdot 临时 .zshrc 末尾恢复 ZDOTDIR，
    不污染用户后续 shell）
  - 三条路径（菜单 plain / 菜单 with role / 详情面板 🪟）实测均能 `cc-<role>` 启动 claude，
    不弹 [Process completed]，不闪退
  - 不弹 Gatekeeper "Yes, I trust this folder" 对话框（`.command` 文件位于
    `$HOME/.cc-mode-switcher/.launch-cache/cmds/`，被 macOS 识别为用户自己创建）

## 7. 风险与回滚

| 风险 | 缓解 |
| --- | --- |
| Detach 重放 ringBuffer 对 TUI 全屏界面（alternate screen）还原不完美 | v1 接受为已知限制；重放 ≤2MB 原始输出流 |
| node-pty 原生模块三平台构建失败 | 放 `dependencies` + electron-vite externalize + electron-builder asarUnpack；CI 三平台矩阵验证 |
| GUI 进程 PATH 找不到 claude | 登录 shell（`zsh -l`）执行；脚本找不到时终端内打印明确报错 |
| claude CLI 参数随版本变动 | 已锁 `--system-prompt-file` 等在 2.1.x 存在；启动失败时把完整命令回显到终端便于排查 |
| 手编 YAML 写坏 | 校验不通过不落盘；`.bak` 兜底 + 一键 Reset |
| 迁移/重构破坏 v1 用户数据 | localStorage 只读迁移不删除；models.yaml 首次生成前不覆盖任何磁盘文件 |
| **rev8** `.launch-cache/` 长期累积陈旧 launch.sh/settings.json/zdot/cmds/ 占用磁盘 | main 进程启动时清理 1 天前 mtime 的 `.launch-cache/` 内容（`pruneLaunchCache`，mtime 而非 atime — macOS 上 atime 不可靠） |
| **rev8** macOS Gatekeeper 把 `/tmp` 下的 `.command` 弹"信任此文件夹"对话框，选 "No" 会让 Terminal.app 退出所有 tab | `.command` 改写到 `$HOME/.cc-mode-switcher/.launch-cache/cmds/`（home 目录被识别为用户自己创建，首次信任后不再弹） |
| **rev8** `zdot/.zshrc` 末尾恢复 ZDOTDIR 后用户当前 shell 的 ZDOTDIR 已正确，但 `cc-<role>()` 函数定义保留（函数在 shell 内存中，不受 ZDOTDIR 影响） | 已实测 OK；用户开新 shell 时 ZDOTDIR 已恢复，行为正常 |
| **rev8** 用户 .zshrc 没自动 source（因为新 zsh 的 ZDOTDIR 指向 zdot，zdot 内只有 source launch.sh + 恢复 ZDOTDIR 两件事） | 用户可手动 `source ~/.zshrc` 加载 prompt/conda 等；或后续迭代把 user rc source 写入 zdot/.zshrc 末尾（ZDOTDIR 恢复之前，可选增强） |

回滚：v2 全部改动集中在 src/ 与构建配置，git revert 到 `2b5c847` 即恢复 v1 行为；用户侧 `~/.cc-mode-switcher/`
为新增目录，删除即完全回退。
