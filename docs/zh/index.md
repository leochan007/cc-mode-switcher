# 📚 CC Mode Switcher 使用文档

[English](/) | **简体中文**

## ⬇️ 下载

macOS / Windows / Linux 安装包发布在 **[GitHub Releases → 最新版](https://github.com/leochan007/cc-mode-switcher/releases/latest)** —— 各系统对应文件与安装说明见[下载页](/zh/download)。

## 📑 文档索引

| 章节 | 内容 | 适合谁 |
| --- | --- | --- |
| [01 · 快速上手](/zh/guide/01-getting-started) | 安装后 5 分钟完成首次配置并启动第一次会话 | 新用户 |
| [02 · 模型与 Provider 配置](/zh/guide/02-models-and-providers) | 预设、自动补全、连接测试、环境变量清单、覆盖防护 | 所有用户 |
| [03 · Plan 模式实战](/zh/guide/03-plan-mode-playbook) | 用 Plan 模式生成 plan 文档（中间产物），不动代码 | 核心工作流 |
| [04 · Work 模式实战](/zh/guide/04-work-mode-playbook) | 严格按 plan 文档执行，**绝不另起 plan** | 核心工作流 |
| [05 · 端到端示例](/zh/guide/05-workflow-example) | 一个完整功能从 Plan 到 Work 落地的全过程 | 想看真实用法的人 |
| [06 · 本地构建](/zh/guide/06-local-build) | 清除 node_modules、pnpm store、electron / electron-builder 缓存后重新安装 | `pnpm run dev` 或 `pnpm run dist` 出问题时 |
| [07 · 发布与版本管理](/zh/guide/07-release-versioning) | GitHub Actions 工作流：云端构建、升级 / 降级、发布 GitHub Release —— 全手动，零本地命令 | 维护者 |

## 核心理念

```
        ┌──────────────┐   plan 文档    ┌──────────────┐
需求 ──▶│  Plan 模式   │ ────────────▶ │  Work 模式   │ ──▶ 交付
        │ （推理模型）  │  （唯一事实源） │ （执行模型）  │
        └──────────────┘               └──────────────┘
              ▲                               │
              └──── plan 有缺口时回来修订 ──────┘
```

- **严格分工**：Plan 模式负责思考与设计（产出 plan 文档），Work 模式负责实现（消费 plan 文档）。两者绝不混用。
- **plan 文档是唯一事实来源**：Work 模式发现 plan 有问题时不许现场发挥，必须停下来回到 Plan 模式修订。
- **人是审批者**：plan 文档生成后由你 review，通过后才交给 Work 模式执行。
