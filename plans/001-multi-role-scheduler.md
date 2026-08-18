# Plan: 多角色调度器重构（Multi-Role Scheduler, v2）

- Status: approved
- Author: leochan007 (glm-5.3) @ 2026-08-18
- Refs: 用户提供的《cc-mode-switcher 开发 Plan（完整修订版）》会话原文；替代开源项目 cc-switch 的定位

## 1. 背景与目标

旧版 cc-switch / 本项目 v1.x 硬编码仅 Plan/Worker 两个角色、固定双栏 UI，无法扩展。v2 将其重构为
**Claude-Code CLI 多角色调度器**：

- 多角色分层调度大模型：高价模型做规划，低成本模型做执行
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
- 启动方式：pty 起登录 shell（`/bin/zsh -l`）跑与详情面板**同一份**生成的脚本：
  `mktemp` 临时 settings JSON（env=模型绑定+thinking）→ `exec claude --system-prompt-file …
  --setting-sources "" --settings … --disallowed-plugins … --allowedTools … --disallowedTools …`
  （登录 shell 解决 GUI 进程 PATH 找不到 claude 的问题；脚本同源保证“复制出去外部终端”行为一致）
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
- [ ] T1: 计划文档落盘（本文件）— `plans/001-multi-role-scheduler.md`
- [ ] T2: main 配置服务：models/roles YAML 读写、默认角色+提示词模板落盘、reset、损坏兜底、迁移 IPC
  — 新建 `src/main/config.ts`、改 `src/main/index.ts`、`package.json`(+`yaml`)
- [ ] T3: renderer `useConfig`（models/roles 共享状态 + IPC 同步 + 旧 localStorage 迁移触发）
  — 新建 `composables/useConfig.ts`、改 `types.ts`（RoleConfig/ModelConfig）

### M2 角色管理 UI
- [ ] T4: 工作台新布局骨架（Toolbar + 左右分栏 + 弹窗容器）— `App.vue`、新建 `WorkspaceToolbar.vue`
- [ ] T5: 角色表格（搜索过滤/单元格编辑/拖拽排序/右键复制删除/新增/Reset 确认）
  — 新建 `components/RolesTable.vue`
- [ ] T6: 启动命令生成器共享化（从 SwitcherPanel 抽出，按 RoleConfig 生成命令/env/settings/alias）
  — 新建 `shared/launchCommand.ts`；新建 `components/RoleDetailPanel.vue`（预览/复制/独立弹窗）
- [ ] T7: YAML 源码编辑视图（校验/错误提示/保存同步/切换保护）— 新建 `components/RolesYamlEditor.vue`
- [ ] T8: 模型管理弹窗化 + 首次启动空态引导 — 改 `ModelsPanel.vue`、`App.vue`

### M3 内置终端
- [ ] T9: pty 会话管理器 + 全套 IPC + preload 暴露 — 新建 `src/main/pty.ts`、改 `src/main/index.ts`、`src/preload/index.ts`
- [ ] T10: 终端 Tab 容器与 xterm 组件（挂载/fit/输入/resize/退出清理/Tab 标题）+ 构建配置
  （electron.vite.config externalize、asarUnpack node-pty）— 新建 `components/TerminalTabs.vue`、`XtermTab.vue`、`electron.vite.config.ts`、改 `package.json`
- [ ] T11: 三条启动路径打通（表格▶️ / Option+T / Cmd+N 角色选择弹窗）+ 未绑定模型报错
  — 新建 `composables/useSessions.ts`、`components/RolePickerModal.vue`、改 `RolesTable.vue`
- [ ] T12: Cmd+T 克隆当前 Tab（固化参数复用 + 副本编号标题）— 改 `XtermTab.vue`、`useSessions.ts`

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

## 7. 风险与回滚

| 风险 | 缓解 |
| --- | --- |
| Detach 重放 ringBuffer 对 TUI 全屏界面（alternate screen）还原不完美 | v1 接受为已知限制；重放 ≤2MB 原始输出流 |
| node-pty 原生模块三平台构建失败 | 放 `dependencies` + electron-vite externalize + electron-builder asarUnpack；CI 三平台矩阵验证 |
| GUI 进程 PATH 找不到 claude | 登录 shell（`zsh -l`）执行；脚本找不到时终端内打印明确报错 |
| claude CLI 参数随版本变动 | 已锁 `--system-prompt-file` 等在 2.1.x 存在；启动失败时把完整命令回显到终端便于排查 |
| 手编 YAML 写坏 | 校验不通过不落盘；`.bak` 兜底 + 一键 Reset |
| 迁移/重构破坏 v1 用户数据 | localStorage 只读迁移不删除；models.yaml 首次生成前不覆盖任何磁盘文件 |

回滚：v2 全部改动集中在 src/ 与构建配置，git revert 到 `2b5c847` 即恢复 v1 行为；用户侧 `~/.cc-mode-switcher/`
为新增目录，删除即完全回退。
