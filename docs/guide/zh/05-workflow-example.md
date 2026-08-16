# 05 · 端到端示例 —— 从需求到交付

场景：为 cc-mode-switcher 增加**模型配置导出/导入**功能。完整走一遍 Plan → 人工审批 → Work 的全过程。

## Step 0 · 准备

| 终端 | 模式 | 绑定模型（示例） |
| --- | --- | --- |
| 终端 A（Plan） | `claude-plan` | glm-5.3（推理） |
| 终端 B（Work） | `claude` | qwen3-coder-plus（执行） |

两个终端由应用分别注入对应模型的环境变量，互不干扰，可同时开着。

## Step 1 · Plan 会话（终端 A）

开场提示词（来自 [03 章](03-plan-mode-playbook.md)）：

```text
你是本项目的架构师，现在是 Plan 模式，唯一产出是 plan 文档，不要写实现代码。

需求：支持把已配置的模型列表导出为文件、再从文件导入（方便换机/备份）。
注意 API Key 是敏感信息，方案里必须考虑。

请阅读 src/renderer/src/composables/useModels.ts 和相关组件后，
按标准结构输出 plan 文档到 docs/plans/001-export-import-models.md …
```

Plan 模式产出的文档（节选）：

```markdown
# Plan: 模型配置导出/导入

- 状态: draft
- 作者: claude-plan (glm-5.3) @ 2026-08-16

## 1. 背景与目标
换机/备份时需要迁移模型配置；目标：一键导出 JSON 文件、一键导入并合并。

## 3. 方案
导出：Models 面板新增导出按钮，经 IPC 由主进程写文件（renderer 无 fs 权限），
文件内容 = JSON.stringify(models)，API Key 默认打码，可选"包含密钥"。
被否方案：直接用 localStorage 文件拷贝——依赖浏览器存储路径，不可移植。

## 4. 任务拆解
- [ ] T1: useModels 增加 exportModels(includeSecrets) / importModels(json) — src/renderer/src/composables/useModels.ts
- [ ] T2: IPC export-models / import-models（dialog.showSaveDialog/showOpenDialog + fs）— src/main/index.ts, src/preload/index.ts
- [ ] T3: Models 面板导出/导入按钮 + 导入冲突合并策略（按 id 覆盖，新增追加）— src/renderer/src/components/ModelsPanel.vue
- [ ] T4: 中英文 i18n 文案 — src/renderer/src/i18n/{en,zh}.ts

## 5. 明确不做的事
不做加密导出、不做自动云同步、不做选择性勾选导出。

## 6. 验收标准
- [ ] 导出的 JSON 可在全新 localStorage 导入后完整还原列表
- [ ] 默认导出不包含明文 API Key
- [ ] 导入重复 id 的模型时旧配置被更新而非重复插入
```

## Step 2 · 人工审批（关键，别跳过）

读一遍文档，重点检查：
- 任务粒度是否可独立验证（T2 太大？拆成 save/open 两个？）
- Out of Scope 是否符合预期
- 有无 OPEN QUESTION

确认后把 `- 状态: draft` 改为 `approved`。

## Step 3 · Work 会话（终端 B）

开场提示词（来自 [04 章](04-work-mode-playbook.md)）：

```text
你是本项目的执行工程师，现在是 Work 模式。
严格按 docs/plans/001-export-import-models.md（状态: approved）执行。
铁律：只做任务清单里的事；不新增任务不改方案；发现 plan 缺口立即停止并报告，
绝不现场自行设计；每完成一个任务勾选文档对应项；最后逐条核对验收标准。
现在从 T1 开始。
```

执行过程示例：

```
Work: T1 完成 → 勾选 [x] T1
Work: T2 完成导出 IPC → 发现导入需要"合并策略"细节，但 plan T3 已写明（按 id 覆盖）→ 继续
Work: T3 完成 → [x] T3
Work: T4 完成 → [x] T4
Work: 核对验收标准：3/3 通过 → 汇报，文档状态改为 done
```

对比：如果没有 plan 文档，Work 模型大概率会"顺手"加上导出加密、勾选式导出、甚至自动同步——恰好全是本例 Out of Scope 明确排除的东西。

## Step 4 · 收尾

- Work 汇报验收结果，人抽查关键路径（导出→清空→导入→测试连接）
- plan 文档状态 → `done`，作为项目决策记录留档
- 代码提交（commit message 可引用 plan：`implements docs/plans/001-…`）

## 全流程时间线

```
需求 ──▶ Plan 终端：生成 plan ──▶ 人工 review/approve ──▶ Work 终端：按清单执行
                                                                   │
              ┌──────────── 发现缺口：停下报告 ◀────────────────────┤
              ▼                                                    │
        Plan 终端：修订 plan ──▶ re-approve ─────────────────────────┤
                                                                   ▼
                                            验收通过 ──▶ done ──▶ 提交
```

成本结构：深度思考只发生在 Plan（贵模型），机械执行全部在 Work（便宜模型）——这就是双模式分工的全部意义。
