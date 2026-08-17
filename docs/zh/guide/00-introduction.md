# 00 · 产品介绍

CC Mode Switcher 是什么、为什么做它、背后的设计理念。5 分钟读完,后续章节都默认你了解本章内容。

## 它解决什么问题

[Claude Code](https://claude.com/product/claude-code) 是一个工具,但你用它做的事其实是**两种完全不同的工作**:

- **思考** —— 架构设计、方案评审、把模糊需求拆解成可执行的 plan
- **执行** —— 把 plan 落成代码、跑测试、处理机械性细节

这两种工作需要的**模型不一样**:强推理模型让 plan 更好;快而便宜的模型执行起来绰绰有余。但 Claude Code 的模型选择藏在环境变量 / 配置文件里,手动切换意味着改 `~/.claude/settings.json`(它会悄悄覆盖其他一切配置)、每个终端重新 export 一遍环境变量,还得时刻提防昂贵模型被绑在机械任务上浪费 token。

**CC Mode Switcher 把这一切变成两次点击**:给 **Plan** 绑一个推理模型、给 **Work** 绑一个快模型,然后按当前任务需要打开对应模式的终端。

```
        ┌──────────────┐   plan 文档    ┌──────────────┐
需求 ──▶│  Plan 模式   │ ────────────▶ │  Work 模式   │ ──▶ 交付
        │ （推理模型）  │  （唯一事实源） │ （执行模型）  │
        └──────────────┘               └──────────────┘
              ▲                               │
              └──── plan 有缺口时回来修订 ──────┘
```

## 设计理念

### Plan 与其余一切

思路来自公司里的分工:做计划的人和执行计划的人从来不是同一批人,成本也完全不同。这个工具只画一条最简单的线 —— **Plan 与其余一切** —— 路由决策交给人的约定:*你*决定哪个模型思考(Plan)、哪个模型执行(Work)。昂贵的推理 token 只花在刀刃上。

### plan 文档是唯一事实来源

Work 模式消费 plan 文档,绝不现场发挥。执行中发现 plan 有缺口时,停下来回到 Plan 模式修订 —— 见 [03 · Plan 模式实战](03-plan-mode-playbook.md)和 [04 · Work 模式实战](04-work-mode-playbook.md)。

### 人是审批者

应用绝不会自己启动会话。你 review plan、标记 `approved` 之后,Work 模式才被允许动手。

### 对你的环境零侵入

- **从不读写 `~/.claude/settings.json`** —— 也包括任何项目级 / 用户级配置文件。没有备份,没有意外。
- **从不写 `~/.zshrc`** —— 别名只对打开的那个终端会话生效。
- 应用配置存在 `localStorage`;每次会话的模型配置存在 `mktemp` 目录里,随会话一起消失。

技术上这靠每个别名都带 `--setting-sources ""`(跳过所有默认配置文件)加 `--settings "$CC_MODE_DIR/<ModelName>.json"`(临时文件,优先级高于一切其他来源)实现。细节见 [02 · 模型与 Provider 配置](02-models-and-providers.md)。

### 显式优先于自动

没有后台守护进程,没有自动改配置,没有自动发布 —— 发布是设计好的手动两步 GitHub Actions 工作流。工具只做你点过的事,绝不多做。

## 功能总览

| 功能 | 你得到什么 |
| --- | --- |
| 🤖 模型管理 | 增 / 改 / 复制 / 删配置,拖拽排序,逐模型连接测试(带延迟) |
| 🏷️ Provider 预设 | GLM、MiniMax、DeepSeek、Kimi、Z.ai、Qwen —— 按关键词自动填 Base URL,模型 ID 快选 |
| 🔄 模式绑定 | 每个模式(Plan / Work)各绑一个模型,模式卡片上显示徽标 |
| ▶️ 在终端中打开 | 新终端窗口,当前模式的别名(`cc-p` / `cc-w`)直接可用 |
| ⚙️ 设置 | 深色 / 浅色主题,English / 简体中文,全部存 `localStorage` |

![Plan/Work 切换器](/images/switcher_main.png)

## 平台支持

| 系统 | UI | 在终端中打开 |
| --- | --- | --- |
| macOS 12+ | ✅ | ✅(Terminal.app / iTerm / 其他走 `.command`) |
| Windows 10/11 | ✅ | ➖ 后续支持 |
| Linux | ✅ | ➖ 后续支持 |

「在终端中打开」通过 AppleScript 驱动 Terminal.app / iTerm,目前仅支持 macOS。

---

准备上手?→ [01 · 快速上手](01-getting-started.md)
