# `plans/` directory — plan 库(契约 v2)

> Project-level planning documents for cc-mode-switcher. Plans describe **what we want to build and why**; they are *not* runtime instructions (those live in `roles.yaml` as inline prompts — see [`docs/guide/08-role-prompt-template.md`](../docs/guide/08-role-prompt-template.md)).
>
> **契约 v2(2026-08-19 生效)**:本目录升级为受管理的 plan 库,由 Planner 会话按 §"库管理规则"维护;当期执行工单在仓库外 `.cc-delivery/plan_output.md`,运行回执在 `.cc-delivery/worker_output.md`(均不进 git)。详见 [`plans/archive/005-delivery-contract-v2.md`](./archive/005-delivery-contract-v2.md)。

## 滚动索引

| # | 文件 | 状态 | 一句话 |
| --- | --- | --- | --- |
| 001 | [`archive/001-multi-role-switcher.md`](./archive/001-multi-role-switcher.md) | **archived** @ 2026-08-19 | v2 多角色切换器全栈;17 任务全绿 |
| 002 | [`archive/002-logo-replacement.md`](./archive/002-logo-replacement.md) | **archived** @ 2026-08-19 | 全栈 logo 替换(PNG-only);SVG 方案回滚后交付 |
| 003 | — | **done** @ 2026-08-20(随 005 落地) | src/main/config.ts 反引号转义;落进 005 T1/T2/T8 重写一并处理。**源文件未进入 git 历史(本地 untracked → 旧惯例 git rm 后无法恢复);仅索引留痕** |
| 004 | — | **done** @ 2026-08-20 | `cc_default_cwd` localStorage 单源 + `selectDirectory({purpose,defaultCwd})` IPC + 4 步决策链(explicit > defaultCwd > history > first-run)+ 设置页卡片;验证留待 e2e。**源文件未进入 git 历史(本地 untracked → 旧惯例 git rm 后无法恢复);仅索引留痕** |
| 005 | [`archive/005-delivery-contract-v2.md`](./archive/005-delivery-contract-v2.md) | **archived** @ 2026-08-20 | .cc-delivery 契约 v2 落地:plans/ 库 + 当期工单 + status.md 协议锁 + worker_output.md 结构化回执 + planner 路径限定写权限;T5–T7 演练留给用户端 e2e |
| — | [`archive/feedbacks/001-implementation-notes.md`](./archive/feedbacks/001-implementation-notes.md) | **archived** @ 2026-08-19 | 001 实现笔记随 001 同步退役 |

排序规则:索引序号 = `plans/archive/005-delivery-contract-v2.md §3.4` 中的"优先级 = 索引排序,不加字段"。新增 plan 永远取下一个未占用 NNN(无补号、无重排)。

## 命名约定

- **Active plan**(`active` / `in_progress` / `pending`)直接放在 `plans/` 根:`plans/NNN-<kebab-topic>.md`
- **Archived plan**(完成 / 取消 / 过期)移入 **`plans/archive/` 目录**,**保留文件本体**:
  - `plans/archive/NNN-<kebab-topic>.md` —— 与原文件名相同,移入子目录
  - `plans/archive/feedbacks/<file>.md` —— 历史实现笔记也归档
  - **用户手工决定是否最终 `rm`**(本仓库不主动删除;UI 不弹提示)
  - 历史上曾用 `plans/retired/` 作别名(2026-08-20 用户接受两种命名);本 README 以 `archive/` 为规范名
- 临时 backlog 不物化为 plan 文件;直接进 Planner 当前会话的 `plan_output.md`

## Plan 文件骨架

```markdown
# Plan: <title>

- Status: <approved | pending | in-progress>          ← 完工后整文件移入 plans/archive/,状态头保留原文
- Author: <who wrote it, what model>
- Refs: <相关 plan 编号、合入来源、外部 ticket>

## 1. 背景与目标

## 2. 现状

## 3. 方案

## 4. 任务拆解                  ← 完工后任务条目保持原文(已完成划 [x] 由 worker 决定,本库不强制)

## 5. 不做的事 (Out of scope)

## 6. 验收 (Acceptance)

## 7. 风险与回滚
```

完工后整文件 `git mv plans/NNN-*.md plans/archive/NNN-*.md`,commit path-scoped 到 `plans/`;§0 Outcome (TL;DR) 不再写回旧文件,而是作为**索引一行**留在本 README。

## 库管理规则(Planner 会话专属)

来源:`plans/archive/005-delivery-contract-v2.md §3.4`,原文照录 + 修订:

- **合并**:相关 plan 合成新 NNN,旧文件**移入 `plans/archive/`**(`git mv`,Refs 注明,**不删文件**)
- **简化**:
  - 完成 → 移入 `plans/archive/`,本 README 索引记一行(2026-08-20 用户决定:**不主动 git rm**,留用户手工 `rm`)
  - 过期 / 重复 → 移入 `plans/archive/` 或直接删除(同 2026-08-20 决定:用户决定是否删)
  - 再版 → 压缩进新 NNN
- **收录**:backlog 物化为 `plan_output.md`(当期工单),小任务 inline 进当前 plan 的 §4
- **优先级** = 索引序号排序,**不引入 priority 字段**

## Workflow for new plans

1. **Plan session** 写 `plans/NNN-<topic>.md`,头部 `Status: approved` 即完成交付
2. **Work session** 按 `.cc-delivery/plan_output.md §4` 执行,每大步在 `.cc-delivery/worker_output.md` 追加结构化回执(替代 v1 的 `worker_report.md` 流水账)
3. **Plan session**(或下一个落地 plan 的 T9)在 plan 完工后:
   - 更新本 README 索引行(状态:`done` / `cancelled`,加一句话结果)
   - `git mv plans/NNN-*.md plans/archive/NNN-*.md`(**2026-08-20 起不主动 git rm**),commit path-scoped 到 `plans/`
   - 留给用户手工 `rm plans/archive/NNN-*.md` 决定是否最终清理
4. 锁协议见 [`plans/archive/005-delivery-contract-v2.md §3.2`](./archive/005-delivery-contract-v2.md) 与 `roles.yaml` 两段 prompt(由 005 T1/T2 落地)

## See also

- [`plans/archive/005-delivery-contract-v2.md`](./archive/005-delivery-contract-v2.md) — 契约 v2 主文档
- [`docs/guide/08-role-prompt-template.md`](../docs/guide/08-role-prompt-template.md) — 7 段 role prompt 模板(运行时,非 plan)
- [`docs/guide/03-roles-playbook.md`](../docs/guide/03-roles-playbook.md) — UI 角色玩法
- [`docs/guide/05-workflow-example.md`](../docs/guide/05-workflow-example.md) — Plan → Worker 端到端流程(契约 v2 适配中,见 T4)