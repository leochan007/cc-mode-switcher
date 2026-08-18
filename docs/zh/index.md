# 📚 CC Mode Switcher 使用文档

[English](/) | **简体中文**

## ⬇️ 下载

macOS / Windows / Linux 安装包发布在 **[GitHub Releases → 最新版](https://github.com/leochan007/cc-mode-switcher/releases/latest)** —— 各系统对应文件与安装说明见[下载页](/zh/download)。

## 📑 文档索引

| 章节 | 内容 | 适合谁 |
| --- | --- | --- |
| [00 · 产品介绍](/zh/guide/00-introduction) | 多角色切换器定位、解决什么问题、设计理念(角色一等公民 / 物理隔离 / `.cc-delivery` 契约)、功能总览 | 所有人 —— 从这里开始 |
| [01 · 快速上手](/zh/guide/01-getting-started) | 工作台布局、5 步首次配置(模型/角色/终端/启动) | 新用户 |
| [02 · 模型与 Provider 配置](/zh/guide/02-models-and-providers) | `~/.cc-mode-switcher/models.yaml` + `roles.yaml` 格式、Provider 预设、连接测试、`--setting-sources ""` 覆盖防护 | 所有用户 |
| [03 · 角色 Playbook](/zh/guide/03-roles-playbook) | 设计你的角色阵容:四层隔离、`OPEN QUESTION` 纪律、`.cc-delivery` 契约、`cc-<角色>` alias | 核心工作流 |
| [04 · Worker 角色 Playbook](/zh/guide/04-worker-mode-playbook) | 严格按 `plan_output.md` 执行、中途缺口的处理、中途续接 | 核心工作流 |
| [05 · 端到端示例](/zh/guide/05-workflow-example) | 一个完整功能从需求 → Plan → 人工审批 → Worker → 交付 + 快捷键演示 | 想看真实用法的人 |
| [06 · 本地构建](/zh/guide/06-local-build) | 清除 node_modules、pnpm store、electron / electron-builder 缓存后重新安装 | `pnpm run dev` 或 `pnpm run dist` 出问题时 |
| [07 · 发布与版本管理](/zh/guide/07-release-versioning) | GitHub Actions 工作流:云端构建、升级 / 降级、发布 GitHub Release —— 全手动,零本地命令 | 维护者 |

## 核心理念

```
                ┌──────────────┐  plan_output.md  ┌──────────────┐
   需求 ────▶   │  Plan 角色   │ ───────────────▶ │ Worker 角色  │ ──▶ 交付
                │ (推理,只读) │  (.cc-delivery/    │ (执行,      │
                │              │   单一事实源)      │  写+测试)   │
                └──────────────┘                   └──────────────┘
                      ▲                                  │
                      └──── 发现 plan 缺口回来修订 ──────┘
```

- **角色一等公民**:不是 Plan/Work 二选一,而是任意多角色(出厂预置 Plan + Worker,你可任意增删改),每个有自己的模型、提示词、thinking、工具黑白名单。
- **一个会话 = 一个角色**:会话创建时把角色参数快照进 pty,改配置不影响已开 Tab。
- **`.cc-delivery/plan_output.md` 是跨角色边界的唯一事实源**:Plan 写、Worker 读;没有 IPC,没有共享上下文,只是一个磁盘文件。
- **人是审批者**:plan 文档生成后由你 review,通过后才交给 Worker 执行。
- **对你的环境零侵入**:`~/.claude/settings.json` 不碰、`~/.zshrc` 不碰,所有配置在 `~/.cc-mode-switcher/` 下。