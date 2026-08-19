# 03 · 角色 Playbook —— 设计你的角色阵容

角色在 v2 是一等公民。出厂的 `Plan` 和 `Worker` 是合理的默认;留着、改名、加更多、整体替换都是你的事。本章讲设计哲学、让角色边界真正生效的纪律,以及跨角色边界用的 `.cc-delivery` 契约的约定。

## 为什么角色是一等公民

v1 时代只有 Plan / Worker —— 两个角色、固定双栏 UI。v2 翻转这个:**角色**是你想要的任意东西,在 YAML 里定义,通过简单遍历生成到表格 / 下拉 / `cc-<角色>` alias。代码里**完全没有角色名**。

常见角色形态(超出两个出厂):

| 角色 | 用途 | 工具 | 提示词 |
| --- | --- | --- | --- |
| `Plan`(出厂) | 架构 / 设计 / 评审 | 只读、无 Bash | "出 plan 文档,不写代码" |
| `Worker`(出厂) | 实现 plan | write / edit / Bash / test | "读 plan_output.md,然后实现" |
| `doc-writer` | 文档维护 | read + Write(只 Markdown) | "review 代码 → 更新用户文档" |
| `security-audit` | 威胁建模评审 | read + Glob + Grep | "审 auth surface,列问题,不修" |
| `refactor` | 机械重构 | read + Edit + Bash(只跑测试) | "机械重构,测试保持绿" |
| `upgrade` | 依赖升级 | Bash + Edit(只 deps 文件) | "升 deps,修 break change" |

每个角色有自己的模型、prompt、工具策略 —— 表格就是事实源。

## 角色隔离的四层

角色"边界"由**四层独立的机制**保障,每层各自补上其他层漏的:

| # | 层 | 作用 | 用户能绕开吗? |
| --- | --- | --- | --- |
| 1 | **System prompt** | 告诉模型它的工作 + 硬规则("Plan 模式别写代码") | 不能 —— 是模型的指令 |
| 2 | **物理隔离** | 新 pty 会话创建时把角色设置快照进去 | 不能 —— 参数在创建时已快照 |
| 3 | **工具黑白名单** | `--allowedTools` / `--disallowedTools` 传给 claude | 不能 —— claude 拒绝调禁掉的工具 |
| 4 | **UI 标识** | Tab 标题 + 表格行展示角色 + 模型 + thinking 状态 | 只是视觉 |

第 3 层是硬约束。如果 Plan 角色的 `disallowedTools: [Edit, Write, NotebookEdit, Bash]`,那**无论模型怎么说**,claude 都会拒绝调。模型可以脑补"想编辑文件"想得天花乱坠 —— 但工具不在。

第 4 层是软约束。瞟一眼 Tab 标题(`Plan | 🧠 Plan(GLM-5.3)`)就知道你在哪个模式,即使 prompt 和工具让它走偏。

## 每个角色的纪律

不管你定义什么角色,同一套纪律适用:**让角色的产出位置显式,跨角色边界只通过磁盘文件**。

### `.cc-delivery` 契约(v2 — 2026-08-19 生效)

针对标准 Plan ↔ Worker 流程,两边 prompt 都写到项目里的固定位置。契约 v2 引入了协议锁,并把 worker 日志文件改名:

```
<你的项目>/.cc-delivery/
├── plan_output.md     ← Plan 写这里(活跃 plan)
├── status.md          ← 协议锁(owner + heartbeat)—— 两边角色都更新 JSON 块
└── worker_output.md   ← Worker 追加结构化回执(原:worker_report.md)
```

- **Plan 唯一产出**:`.cc-delivery/plan_output.md` —— 架构 / 每个文件改动清单 / 风险 / 验收标准。**不含完整业务代码块**。
- **Plan 退出信号**:回复末尾写 `PLANNER_READY: <一句话摘要>`。
- **Worker 第一动作**:读 `.cc-delivery/plan_output.md`。如果不存在,停下来告警 `WORKER_NO_PLAN: 请先跑 Planner 角色。`。
- **Worker 第二动作**:检查 `.cc-delivery/status.md` 的 `lock.owner` —— 如果非空且不是 `"worker"`,输出 `WORKER_BLOCKED: 锁被 <owner> 持有` 并停下来。否则获取锁(`"worker"` + `heartbeat_at`)。
- **Worker 里程碑**:每完成一段就追加一行回执到 `.cc-delivery/worker_output.md`(格式:`## <task-id> — done|in_progress|blocked @ <ISO>`)。
- **Worker 退出信号**:回复末尾写 `WORKER_DONE: <一句话摘要>` **并释放锁**(`status.md.lock.owner: ""`)。

字面退出信号方便人(和其他工具)判断何时切角色 —— 在会话记录里搜 `PLANNER_READY:` / `WORKER_DONE:` 即可。

**锁语义(协议锁,非硬互斥):** 这是一个荣誉系统协议 —— 两边角色进入时都检查锁,写入前刷新 `heartbeat_at`。陈旧锁(>30 分钟没有心跳)可由 Planner 强制释放,并在下一条 `worker_output.md` 回执中留痕。

### 跨角色纪律

| 规则 | 为什么 |
| --- | --- |
| 角色之间只通过磁盘文件通信(`.cc-delivery/`) | 无 IPC,无共享上下文;会话崩了 plan 还在,角色切换零损失 |
| 一个会话 = 一个角色(创建时快照) | 改配置不会惊到已经在跑的会话 |
| 角色的 prompt 必须写明输出位置 | 否则模型默认"在聊天里说" —— 跟会话一起没了 |
| Tab 标题展示角色 + 模型 | 视觉确认模式 |
| 角色之间不要共享 env | 每个会话 export 自己的 `ANTHROPIC_*` 块,不从父 shell 继承 |

## 配置角色

两种方式:

### 通过 UI

1. **单元格编辑**表格:点 Model 列 → 下拉(数据源是 `models.yaml`);点 Thinking 列 → 切换。
2. **✏️ Edit** 看完整表单:弹窗里有 Display label、绑定模型、Thinking 开关、System prompt 文件(带 📁 浏览)、Allowed tools、Denied tools、Denied plugins。保存 → `roles.yaml` 更新。

### 手编

直接改 `~/.cc-mode-switcher/roles.yaml`。下次开会话时应用读新版 —— 表格头的 YAML 视图带行内语法校验。

> **已知限制**:从表格视图保存会**丢 YAML 注释**(它重序列化结构)。如果你写注释,通过 YAML 视图编辑来保留。

## 启动角色会话

1. 在表格里选中角色行(左栏)。
2. 下方的启动面板展示该角色完整的 `cc-<角色>()` 命令 —— 顶部 Copy 按钮,或 ▶ Open / ▶ Start 按钮。
4. 点 ▶ 后:
   - **内部 xterm**:右栏新开 Tab。bootstrap 自动 source;你看到:
     ```
     ✓ launch.sh:  /Users/<你>/.cc-mode-switcher/.launch-cache/launch.sh
     ✓ available:  cc-plan
     ```
     敲 `cc-plan`(或该角色 id)启动 Claude。
   - **外部终端**:新开 Terminal.app / iTerm 窗口,跑相同的 setup。bootstrap source `launch.sh`,落进交互 shell,`cc-plan` 可用。

两条路径产出的终态完全一致 —— 一个 shell 会话,`cc-<角色>` 已定义,每角色 settings 已写好,model env 在函数作用域里待命。

## 完成的标志

角色会话"完成"以它的 prompt 退出信号为准:

- Plan:`PLANNER_READY: <一句话摘要>`(且 `plan_output.md` 完整无 `OPEN QUESTION`)
- Worker:`WORKER_DONE: <一句话摘要>`(且 `status.md` 锁已释放)
- 自定义角色:在自己的 prompt 里定义;人审。

下一步:读 [04 · Worker 角色 Playbook](04-worker-mode-playbook.md) 看执行侧,或者跳到 [05 · 端到端示例](05-workflow-example.md) 看实际跑通。