# 04 · Worker 角色 Playbook —— 执行,不重做

Worker 是 Plan ↔ Worker 流程里的执行者。它的唯一输入是上一次 Plan 会话的 `.cc-delivery/plan_output.md`。严格按 plan 落地,不在中途重做。

## 为什么单独的 Worker 角色

出 plan 用的模型(慢、仔细、贵的推理)不适合机械执行(写文件、跑测试、改 typo)。合在一个会话里,便宜的模型过度谨慎,贵的模型在机械编辑上浪费 token。

分开两个角色两边都解决:

- **绑定便宜快速模型** —— 通常 `GLM-4.5-Air`、`Claude Haiku`、`DeepSeek` 等。
- **默认 thinking 关** —— 没有 `MAX_THINKING_TOKENS`。
- **允许的工具** —— `Edit`、`Write`、`NotebookEdit`、`Bash` 等。
- **禁用的工具** —— 通常只有你想保持关掉的(比如出厂默认禁 `WebSearch` 强制本地作业)。

## 启动 Worker 角色

1. 确认 `.cc-delivery/plan_output.md` 存在,`Status:` 行为 `approved`(你审过后翻的)。
2. 在角色表格里选 `Worker` 行。
3. 点 ▶(或 `Option+T`,或 `Cmd+N` 后选 Worker)。
4. 在新终端 Tab 里敲 `cc-worker`。

出厂 Worker 提示词开头是:

> You are the **Worker** role in a multi-role Claude Code session.
> Your job is to execute the plan produced by the Planner.
>
> ## Hard constraints
> - Superpowers plugin is disabled. Do not attempt to enable it.
> - Honour the tool allow / deny list given to this session.
> - `WebSearch` is denied — rely on local files.
>
> ## Required workflow
> 1. Read `.cc-delivery/plan_output.md` first. If it is missing, stop and tell the
>    user: `WORKER_NO_PLAN: 请先跑 Planner 角色。`
> 2. 检查 `.cc-delivery/status.md` 的 `lock.owner`。如果非空且不是 `"worker"`,
>    输出 `WORKER_BLOCKED: 锁被 <owner> 持有` 并停下来。否则获取锁
>    (写 `"worker"` + `heartbeat_at`)。
> 3. 实施 plan,逐文件来。任何耗时 >5 分钟的写入前刷新 `status.md` 的 `heartbeat_at`。
> 4. After each meaningful milestone, append a one-line receipt to
>    `.cc-delivery/worker_output.md` (格式:`## <task-id> — done|in_progress|blocked @ <ISO>`)。
> 5. plan 全部完成时,**释放锁**(`status.md.lock.owner: ""`)
>    并在回复末尾写 `WORKER_DONE: <一句话摘要>`。

## 纪律

| 规则 | 为什么 |
| --- | --- |
| **先读 `plan_output.md`。永远。** | 不读就是即兴发挥,分工的意义就丢了 |
| **实现,不是重做** | 计划有 gap 就停下告警人,不要默默"自己搞定" |
| **别动 `plan_output.md`** | 那是 Planner 的文件;有问题追加到 `worker_output.md` |
| **写入前先获取 status.md 锁** | 两个并行 Worker 会互相覆盖 —— 锁就是(协议级)互斥信号 |
| **每完成一段就追加 `worker_output.md`** | 一行一回执(v2 格式);一眼看到进度;中途挂了能续上 |
| **长写入前刷新 `heartbeat_at`** | 陈旧锁(>30 分钟)可被 Planner 强制释放;刷新避免被强释 |
| **以 `WORKER_DONE:` 结尾并释放锁** | 字面信号可 grep;释放锁才能安全交接 |
| **别开 Superpowers** | 它被 `--disallowed-plugins` 关了。试图绕过 = 纪律失败 |

## 处理 plan 缺口

plan 偶尔有缺口。Plan 角色对没把握的事写 `OPEN QUESTION` 块 —— 你的工作是暴露这些,不是解决。

撞到 `OPEN QUESTION`:

1. **停**当前任务。
2. 追加 `blocked` 回执到 `.cc-delivery/worker_output.md`:
   ```
   ## T3 — blocked @ 2026-08-20T11:00:00+08:00

   - T3(重构 auth helper):plan 说"把 `verify_token` 抽到 helper 模块",
     但没说同步还是异步。当前调用点是同步的;改成异步会扩散。
   ```
3. 在聊天里告诉人 —— 把 `plan_output.md` 里的相关 `OPEN QUESTION` 块粘过去。
4. **等**。人要么改 plan(status 翻回 `draft`,再 `approved`),要么直接给决定。
5. 不要脑补解法,不要"先这样能跑就过"。

## 中途续接

Worker 会话崩了或者你关了 tab,下次会话全新启动。状态在 `.cc-delivery/plan_output.md`(契约)、`.cc-delivery/status.md`(锁 + 交接状态)、`.cc-delivery/worker_output.md`(你的回执)里。

续接步骤:

1. 开新 Worker 会话。
2. 三个文件都读一遍。注意:如果 `status.md.lock.owner` 还是上次的 `"worker"`,说明上次崩了没释放 —— 强制释放(写 `lock.owner: ""`),并在第一条回执里留痕。
3. 从 `worker_output.md` 的 task 列表里最后完成的那个接着干。
4. 继续。

plan / report 文件是**唯一**跨会话的状态。聊天记录跟会话一起没了 —— 这是设计如此。

## `WORKER_DONE` 之后

1. 自己读 `.cc-delivery/worker_output.md` 验完整性。
2. 确认 `.cc-delivery/status.md.lock.owner === ""`(你在退出时已释放锁)。
3. 跑项目的测试 / 构建(plan 里要求的那套)。
4. 交接给下一步(PR? 部署? 新的 plan 轮次?)。这个角色的事完了。

`WORKER_DONE` 后发现漏了边缘 case 或回归 —— 这是**新一轮** planning。开 Plan 会话,指向 `plan_output.md` + 实际代码状态,出修订版。别在 Worker 角色里越界打补丁。

下一步:[05 · 端到端示例](05-workflow-example.md) 走一遍。