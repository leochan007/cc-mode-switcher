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
>    user: `NO_PLAN: please run the Planner role first.`
> 2. Implement the plan, file by file.
> 3. After each meaningful milestone, append a short note to
>    `.cc-delivery/worker_report.md` (what changed, what blockers arose).
> 4. When the plan is complete, end your response with the exact line:
>    `WORK_DONE: all plan items implemented.`

## 纪律

| 规则 | 为什么 |
| --- | --- |
| **先读 `plan_output.md`。永远。** | 不读就是即兴发挥,分工的意义就丢了 |
| **实现,不是重做** | 计划有 gap 就停下告警人,不要默默"自己搞定" |
| **别动 `plan_output.md`** | 那是 Planner 的文件;有问题追加到 `worker_report.md` |
| **每完成一段就追加 `worker_report.md`** | 一眼看到进度;中途挂了能续上 |
| **以 `WORK_DONE:` 结尾** | 字面信号,grep 一下就知道"这个会话交付完了" |
| **别开 Superpowers** | 它被 `--disallowed-plugins` 关了。试图绕过 = 纪律失败 |

## 处理 plan 缺口

plan 偶尔有缺口。Plan 角色对没把握的事写 `OPEN QUESTION` 块 —— 你的工作是暴露这些,不是解决。

撞到 `OPEN QUESTION`:

1. **停**当前任务。
2. 追加到 `.cc-delivery/worker_report.md`:
   ```
   ## Blockers

   - T3(重构 auth helper):plan 说"把 `verify_token` 抽到 helper 模块",
     但没说同步还是异步。当前调用点是同步的;改成异步会扩散。
   ```
3. 在聊天里告诉人 —— 把 `plan_output.md` 里的相关 `OPEN QUESTION` 块粘过去。
4. **等**。人要么改 plan(status 翻回 `draft`,再 `approved`),要么直接给决定。
5. 不要脑补解法,不要"先这样能跑就过"。

## 中途续接

Worker 会话崩了或者你关了 tab,下次会话全新启动。状态在 `.cc-delivery/plan_output.md`(契约)和 `.cc-delivery/worker_report.md`(你的进度笔记)里。

续接步骤:

1. 开新 Worker 会话。
2. 读两个文件。
3. 从 `worker_report.md` 的里程碑列表里最后完成的那个接着干。
4. 继续。

plan / report 文件是**唯一**跨会话的状态。聊天记录跟会话一起没了 —— 这是设计如此。

## `WORK_DONE` 之后

1. 自己读 `.cc-delivery/worker_report.md` 验完整性。
2. 跑项目的测试 / 构建(plan 里要求的那套)。
3. 交接给下一步(PR? 部署? 新的 plan 轮次?)。这个角色的事完了。

`WORK_DONE` 后发现漏了边缘 case 或回归 —— 这是**新一轮** planning。开 Plan 会话,指向 `plan_output.md` + 实际代码状态,出修订版。别在 Worker 角色里越界打补丁。

下一步:[05 · 端到端示例](05-workflow-example.md) 走一遍。