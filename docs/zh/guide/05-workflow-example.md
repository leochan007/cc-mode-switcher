# 05 · 端到端示例 —— 从需求到交付

一个功能,从头到尾走一遍:用户需求 → `cc-plan` 会话 → 人审 → `cc-worker` 会话 → 交付,加上过程中用到的 Tab / Detach / Clone 快捷键。

## 场景

给 CC Mode Switcher 加**角色配置导出 / 导入**功能 —— 一个按钮把当前 `roles.yaml` + `models.yaml`(密钥脱敏)合并导出为一份 JSON,另一个按钮导入同样 JSON,覆盖前先问确认。

## 第 0 步 · 工作台就绪

1. 打开项目目录:Toolbar 的 **📂** → 选你的 `cc-mode-switcher/` checkout。(被记住,下次自动。)
2. 切到 **Switcher** Tab。你应该在角色表格里看到 `Plan` 和 `Worker`,每个都绑了模型。

## 第 1 步 · Plan 会话 —— 写 `plan_output.md`

### 1.1 开 Plan Tab

- 点 `Plan` 行选中。
- 点 toolbar 的 **▶ 启动选中角色**。

右栏新开一个**内部 xterm Tab**。bootstrap 自动 source;看到 `✓ available: cc-plan` 横幅。

### 1.2 敲 `cc-plan`

shell 函数跑起来,export env,`exec` claude。几秒后你在 Claude Code REPL 里,Plan prompt 已生效。

### 1.3 发规划 prompt

输入(或粘贴):

```text
You are this project's architect, in Plan mode. Your only output is a plan
document — do not write implementation code.

Requirement: add Export / Import for role configurations. The user wants to
share a role setup with a teammate (or back it up before editing), without
leaking API keys.

Constraints:
- Export = both ~/.cc-mode-switcher/models.yaml and ~/.cc-mode-switcher/roles.yaml
  combined into a single JSON file.
- API keys in models.yaml must be redacted in the export.
- Import = read the JSON, show a diff against the current state, ask for
  confirmation before overwriting any role / model.
- The UI goes in the Settings panel.

First read the relevant code ( src/..., configs, package.json ), then write
the plan to .cc-delivery/plan_output.md using this project's standard plan
template (background / current state / approach incl. rejected alternatives /
task breakdown with files / out of scope / acceptance criteria / risks).
Anything uncertain becomes an OPEN QUESTION — don't guess.
```

Plan 会话读代码,需要的话问你澄清,最后写 `.cc-delivery/plan_output.md`,以 `PLANNER_READY: <一句话摘要>` 结尾。它退出时还会把 `.cc-delivery/status.md.lock.owner` 设成 `"planner"`,告诉 Worker plan 是新鲜的。

### 1.4 人审

在编辑器里打开 `.cc-delivery/plan_output.md`(或另一个终端 `cat`)。检查:

- 任务拆解合理吗?文件清单准确吗?
- `OPEN QUESTION` 合理吗?挨个做决定。
- `Out of scope` 是不是你真想推迟的?
- `Acceptance criteria` 可测吗?

OK:把 `Status:` 行翻成 `approved`。不行:在 Plan 会话里发追问,它保持 `draft` 直到你批。

## 第 2 步 · 克隆 Plan Tab 留作对照

你想在 Worker 跑的时候留 Plan Tab 不关,方便对照。**克隆**它:

- 把焦点切到 Plan Tab(在 xterm 里点一下)。
- 按 **`Cmd+T`** → 新开 Tab,同样的 cwd、同样的角色、同样的快照设置。现在你有两个 Plan Tab。

> `Cmd+T` 克隆的是**当前** Tab,复用快照的 cwd / 角色 / 设置。之后改角色配置不影响已克隆的 —— 它们在创建那一刻就冻结了。

关掉原 Plan Tab(右键 → Close,或 ✕)。现在你留一个 Plan Tab,plan 文件在另一个终端打开。

## 第 3 步 · 分离窗口

右键 Plan Tab → **Detach**。Tab 分离成独立 BrowserWindow,标题 `cc-mode-switcher | 🧠 Plan(GLM-5.3)`。可以拖到第二屏、随便调大小;detach 后到达的输出从 ring buffer 重放。

## 第 4 步 · Worker 会话 —— 实现

### 4.1 开 Worker Tab

- 在角色表格里点 `Worker` 行。
- 按 **`Cmd+N`** → 角色选择器 → 选 `Worker`(或 `Option+T` 如果 `Worker` 已选)。

新内部 xterm Tab,Worker bootstrap。敲 `cc-worker`。

### 4.2 Worker 读 plan,开干

Worker prompt 强制:

1. **读 `.cc-delivery/plan_output.md`** —— 不存在就 `WORKER_NO_PLAN:` 退出。
2. **检查 `.cc-delivery/status.md.lock.owner`** —— 如果非空且不是 `"worker"`,输出 `WORKER_BLOCKED: 锁被 <owner> 持有` 退出。否则获取锁。
3. 逐项实现,长写入前刷新 `status.md.lock.heartbeat_at`。
4. 每完成一段追加一行回执到 `.cc-delivery/worker_output.md`(格式:`## <task-id> — done|in_progress|blocked @ <ISO>`)。
5. **释放锁**(`status.md.lock.owner: ""`),末尾 `WORKER_DONE:`。

不用盯着 —— 四层隔离保证它改不了 plan 文件、开不了 Superpowers、它被允许的工具只限于 plan 涉及的范围。

### 4.3 中途缺口

Worker 撞上 plan 里的一个 `OPEN QUESTION`(比如"脱敏格式:`***` vs `<REDACTED>` vs 完全省略?")。它:

1. 停当前任务。
2. 追加 `blocked` 回执到 `.cc-delivery/worker_output.md`:
   ```
   ## T2 — blocked @ 2026-08-20T11:00:00+08:00

   T2(脱敏):plan 问 export 时 apiKey 怎么脱敏。建议 `***REDACTED***`(匹配同类工具的惯例)。等拍板。
   ```
3. 在聊天里告诉你。
4. 等。

你回复:"用 `***REDACTED***`,继续。" Worker 接着干。

## 第 5 步 · 验收

Worker 说 `WORKER_DONE: 导出/导入上线,锁已释放。` 你验收:

- Settings → Export / Import 出现新按钮。
- Export → 生成 JSON,每个模型的 `apiKey` 是 `***REDACTED***`。
- Import → 拿队友的 export 进来 → 显示 diff,覆盖前弹确认。
- 取消 import 后原有角色 / 模型完好。
- `.cc-delivery/status.md.lock.owner === ""`(Worker 已释放锁)。

## 第 6 步 · 收尾

- 关 Worker Tab(右键 → Close)。
- 分离的 Plan Tab 留着参考 —— 啥时候关都行。
- `~/.cc-delivery/plan_output.md` + `status.md` + `worker_output.md` 留在磁盘上,作为本次交付的审计轨迹。

## 使用的快捷键

| 快捷键 | 时机 | 作用 |
| --- | --- | --- |
| `▶ 启动选中角色` | toolbar | 用左栏选中角色启动 |
| `Option+T` | 工作区任意位置 | 同上 —— 用选中角色新开内部 Tab |
| `Cmd+T` | xterm 焦点 | 克隆当前 Tab(同 cwd + 角色快照) |
| `Cmd+N` | xterm 焦点 | 开角色选择器 |
| 右键 Tab → Detach | Tab UI | 把 Tab 弹成独立窗口 |
| `⚙️ 设置 → 重置角色` | settings | 恢复默认 Plan + Worker(保留模型 + 提示词文件) |

## 变体

- **外部终端**:同样的流程,但用启动面板里的 `▶ Open in Terminal` 开 Terminal.app 而不是内部 Tab。`cc-<角色>` alias 行为一致。
- **多个并行 Worker**:开任意多 Worker Tab —— 它们看同一份 `plan_output.md`,每个各追加 `worker_output.md` 自己的 task-id 前缀。`status.md` 锁是协议锁(荣誉系统互斥) —— 同一时间只让一个 Worker 持有。不要让它们同时动重叠的文件。
- **自定义角色**:加 `test-runner` 角色(只读 + Bash + 限定测试路径)、`security-audit` 角色(只读 + Grep + Glob)等。每个就是表格里的又一行。