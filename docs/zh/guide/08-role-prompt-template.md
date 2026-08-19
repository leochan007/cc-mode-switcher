# 08 · 角色 Prompt 模板

> 本应用里添加的任何角色，都应该遵循统一的 prompt 结构、信号词表、文件所有权规则。这样角色之间的 handoff 就跟公司里部门之间的文档交接一样可预测。

## 1. 为什么需要模板

角色 prompt 是 ad-hoc 自由形式时，会很快出现三个问题：

1. **Handoff 不一致** — 角色 A 输出的东西，角色 B 没法可靠解析
2. **所有权不清晰** — 两个角色编辑同一个文件，相互覆盖
3. **状态不可见** — 你从外部看不出哪个角色在做什么

本文给每个角色一个**统一模板**、一个**标准信号词表**、一份**文件所有权映射**。不按模板写的角色也不是错的——只是互操作性差。

---

## 2. 七段式 Prompt 模板

每个角色的 `systemPrompt` 都应按以下顺序包含这些段落：

```markdown
# Role: <name>

## 1. Identity
<一段话：你是谁，做什么类型的工作>

## 2. Inputs
<你做工作需要读什么 — 文件、环境变量、对话>

## 3. Outputs (Deliverables)
<你写哪些文件，发什么信号，写到哪里>

## 4. Tools / Constraints
<硬规则 — 允许的工具、禁止的工具、插件限制>

## 5. Workflow
<编号步骤，不能含糊>

## 6. Coordination contract
<你拥有哪些文件、只读哪些、依赖上游哪些>

## 7. Termination
<每种可能结局对应的精确最后一行信号>
```

### 各段落规则

| 段落 | 规则 |
| --- | --- |
| **1. Identity** | 一段话。讲角色的*工作*，不讲*人格*。不要写"你是一个乐于助人的助手"这种废话。 |
| **2. Inputs** | 列出角色依赖的所有文件路径、环境变量、对话元素。如果开始工作是必需的，标 REQUIRED。 |
| **3. Outputs** | 列出角色写的所有文件。明确声明文件所有权（见下文 §4）。 |
| **4. Tools / Constraints** | 只列硬规则——*绝对不能*发生的事。避免软语气（"尽量"、"最好"）。 |
| **5. Workflow** | 编号、顺序步骤。如果条件分支，写清楚（"if X, do A; else do B"）。 |
| **6. Coordination contract** | "我拥有 X。我只读 Y。我依赖上游的 Z。"明确谁写什么。 |
| **7. Termination** | 每个角色发出一个最后一行信号。词表见 §3。 |

---

## 3. 标准信号词表

每个角色响应都以**正好一个**信号结尾，写在**最后一行**（无 markdown、无代码块、无前缀）：

| 信号 | 含义 | 谁用 |
| --- | --- | --- |
| `<ROLE>_READY` | 工作完成，可 handoff 给下游 | 任何产出可交付物的角色 |
| `<ROLE>_DONE` | 整个任务终态完成 | 链路的最后一个角色 |
| `<ROLE>_BLOCKED` | 无法继续，需要上游或用户介入 | 任何角色 |
| `<ROLE>_NO_INPUT` | 缺少关键输入（例如没有 plan 可执行） | 任何角色 |
| `<ROLE>_NEEDS_INPUT` | 必须问用户一个问题 | 任何角色 |
| `<ROLE>_RUNNING` | 进行中状态（只用在 `status.md`，不当最后一行） | 任何角色，只在 `status.md` |

`<ROLE>` 是小写角色名，把 `-` 换成 `_`（例如 `worker`、`planner`、`code-reviewer`）。

### 示例

```
PLANNER_READY: 为 Settings 面板重构列出了 7 个文件改动
WORKER_DONE: 已实现 plan 中全部 7 个文件改动，测试通过
WORKER_NO_PLAN: .cc-delivery/plan_output.md 缺失 — 请先运行 Planner 角色
WORKER_BLOCKED: §4 第 3 项引用了一个已删除文件，需要 Planner 复核
```

应用从每个角色响应的**最后一行** grep 这些信号来跟踪 handoff 状态。

---

## 4. `.cc-delivery/` 文件所有权映射

项目 cwd 下的 `.cc-delivery/` 目录是多角色会话的**共享工作区**。其中文件遵循严格的所有权规则：

| 文件 | Owner | 其他角色 |
| --- | --- | --- |
| `plan_output.md` | **Planner** | 其他人只读 |
| `worker_report.md` | **Worker**（append-only） | 其他人只读 |
| `decisions.md` | 任何角色（append-only） | 其他人只读 |
| `status.md` | 任何角色（替换 JSON 块） | 其他人只读 |

### 所有权规则

- **写**一个文件，只有你是它的 owner（`status.md` / `decisions.md` 除外，这两个是共享的）。
- **Append** 到 `worker_report.md` / `decisions.md` —— 永远不覆盖。
- **Replace** `status.md` 中的整个 JSON 块 —— 永远不部分编辑它。
- **永远不要**写 `plan_output.md`，除非你是 Planner。如果 plan 需要修改，通过 `worker_report.md` 提出，并发出 `WORKER_BLOCKED`。

### 不对称 territory 规则（用于 Plan ↔ Worker handoff）

当两个角色是 **生产者/消费者**关系时，把文件空间看成**两个 territory**：

|  | plan-class 文件（`.cc-delivery/*`） | 非 plan 文件（项目源码） |
| --- | --- | --- |
| **Planner** | 完全控制（读 / 写 / retire） | **只读** |
| **Worker** | **只读**（自己拥有的几个除外） | 完全控制（按 plan §4） |

用人话说：

- **Planner 只能在 `.cc-delivery/` 内写**。不能碰项目源码 —— 那是 Worker 的 territory。
- **Worker 只能写 `plan_output.md` §4 列出来的文件**。不能碰其他 plan-class 文件（`plan_output.md` 本身、其他人的报告、`retired/*` 等）。

这种**不对称就是契约**。每个角色对自己的 deliverable 有完全控制权，对方的只有只读权限。即使技术上能"方便地"越界，越界就是违约。每个角色 prompt 的 `## 4 Tools / Constraints` 里都要明确写自己的 territory 表。

**Retire 模式**（Planner 侧）：Planner 没有 `Bash`，所以"删除"旧 plan = 把它的内容写到 `.cc-delivery/retired/plan-<ISO>.md`（首行 `RETIRED: <原因>`），然后覆盖 active 文件。App 永远不物理删除；`.cc-delivery/retired/*` 留给人（或未来的 cleanup 工具）处理。

### `status.md` schema

`status.md` 顶部有一个 JSON 块（带 `json` 语言提示）。每次更新替换整个块：

```json
{
  "current_role": "<最后行动的角色>",
  "phase": "<completed | implementing | blocked | …>",
  "last_signal": "<ROLE>_<STATE>",
  "plan_path": "<plan_output.md 路径（如 Planner 已跑）>",
  "milestones_done": 0,
  "milestones_total": 0,
  "updated_at": "<ISO 8601 时间戳>"
}
```

字段含义：
- `current_role` — 产生此状态的角色
- `phase` — 粗粒度状态（`completed` / `implementing` / `blocked`），允许角色特定 phase
- `last_signal` — 最近一次响应的终止信号
- `milestones_done` / `milestones_total` — 仅 Worker 进度；其他角色省略
- `updated_at` — ISO 8601 UTC，例如 `2026-08-19T16:45:00Z`

---

## 5. 完整示例：Plan + Worker contract

这是本应用两个角色之间的标准 handoff。它们被设计为**互相自洽** —— Planner 写的每个字段，Worker 都读得到。

### Planner 输出（写 `plan_output.md`）

```markdown
# Plan: 给 Settings 面板加 CSV 导出

## 1. Goal
让用户能把所有配置的角色导出为 CSV。

## 2. Scope
### In
- Settings 面板加一个"导出 CSV"按钮。
- CSV 下载内容包括：角色 id、label、model、thinking 标志、prompt 摘要。

### Out
- 从 CSV 导入（未来再做）。
- Excel / xlsx 格式。

## 3. Architecture
- 在 `useConfig.ts` 加 `exportRolesCsv()`。
- 通过 `SettingsPanel.vue` 新按钮触发。
- 浏览器侧下载，不走 IPC。

## 4. File changes
- `src/renderer/src/composables/useConfig.ts`: 加 `exportRolesCsv()` 函数
- `src/renderer/src/components/SettingsPanel.vue`: 加"导出 CSV"按钮 + 点击处理
- `docs/guide/02-models-and-providers.md`: 记录新的导出格式

## 5. Risks
- 角色列表很大（≥100）可能产生大 CSV — 用流式？— 暂缓。

## 6. Open questions
- CSV 是否包含 role 的 `color` 字段？— 留给 Worker 提出。
```

### Worker 输入（读 `plan_output.md`）

Worker 的 prompt 明确告诉它：
- 读 `plan_output.md`
- 如果缺失或缺 §4 → emit `WORKER_NO_PLAN`
- 逐条执行 §4
- 每个里程碑 append 到 `worker_report.md`
- 结尾 emit `WORKER_DONE`

两个 prompt 引用**相同的文件路径**、**相同的 schema**、**相同的信号** —— 这就是 contract。

---

## 6. 新角色 prompt 检查清单

添加新角色时，保存前走一遍这份清单：

- [ ] **Identity** 一段话，无废话
- [ ] **Inputs** 列出角色依赖的每个文件 / env / 对话元素
- [ ] **Outputs** 声明角色写的每个文件；所有权明确
- [ ] **Tools / Constraints** 硬清单，无软语气
- [ ] **Workflow** 编号、条件分支写明
- [ ] **Coordination contract** 列出拥有 vs 只读的每个文件
- [ ] **Termination** 列出每个可能结局的最后一行信号
- [ ] 信号使用**标准词表**（§3），前缀是该角色自己的 `<ROLE>_`
- [ ] 如果新角色 handoff 给已有角色，**同时编辑已有角色 prompt 的 Inputs section** 让它匹配新角色的交付

---

## 7. 编辑内置 prompt

两个内置角色（Planner、Worker）的 prompt 首次运行后会内联进 `roles.yaml`。编辑方法：

1. 在应用里点 role 表的 **YAML** 视图
2. 直接改 `systemPrompt`
3. 保存 —— 应用校验 YAML 并重新加载角色

想**重置成默认**（比如改坏了），用 Settings 面板 → "Reset roles" 按钮。会还原成本指南展示的规范版 Planner + Worker prompt。

---

## 另见

- [00 · 产品介绍](00-introduction.md) — 这个应用做什么
- [02 · 模型与 Provider 配置](02-models-and-providers.md) — 模型配置
- [03 · 角色 Playbook](03-roles-playbook.md) — 在 UI 里运行角色
- [05 · 端到端示例](05-workflow-example.md) — 从 plan 到交付的完整流程