# 02 · 模型与 Provider 配置

模型配置如何在磁盘上存储、Provider 预设如何自动填 Base URL、连接测试怎么工作、settings 文件如何生成并传给 Claude。

## 磁盘上的 models & roles 配置

应用配置存在 **`~/.cc-mode-switcher/`**。两个 YAML 文件驱动一切:

```
~/.cc-mode-switcher/
├── models.yaml     ← 模型资源池
├── roles.yaml      ← 角色绑定(label, model, thinking, prompt, tools)
├── prompts/
│   ├── Plan.md
│   └── Worker.md
└── .launch-cache/  ← 每会话的 launch.sh + settings.json(自动清理)
```

### `models.yaml`

每个模型一条。**顶层 key** 是模型的 **id**(slug,被 `roles.yaml` 引用);body 是连接信息。

```yaml
# ~/.cc-mode-switcher/models.yaml
GLM-5.3:
  name: GLM-5.3
  baseUrl: https://open.bigmodel.cn/api/anthropic
  apiKey: sk-...
  modelID: GLM-5.3
Claude-Opus-4.8:
  name: Claude Opus 4.8
  baseUrl: https://api.anthropic.com
  apiKey: sk-ant-...
  modelID: claude-opus-4-8
GLM-4.5-Air:
  name: GLM-4.5 Air(便宜快速)
  baseUrl: https://open.bigmodel.cn/api/anthropic
  apiKey: sk-...
  modelID: GLM-4.5-Air
```

第一次启动应用时,如果 `models.yaml` 不存在会自动创建。v1 在 `localStorage`(`cc_models`)里配过的模型会在首次运行时**一次性迁移**进去 —— 你的数据保留,旧存储之后只读。

### `roles.yaml`

每个角色一条。**顶层 key** 是角色的 **id**;body 是完整角色配置。代码里**完全没有角色列表硬编码** —— 应用启动时遍历文件。

```yaml
# ~/.cc-mode-switcher/roles.yaml
Plan:
  label: 🧠 Plan
  model: GLM-5.3                # ← models.yaml 的 id;'' = 未绑定
  thinking: true                # ← MAX_THINKING_TOKENS=16000
  systemPrompt: ~/.cc-mode-switcher/prompts/Plan.md
  disallowedPlugins: [superpowers]   # 应用始终追加,即使你省略
  allowedTools:   [Read, LS, Glob, Grep]
  disallowedTools: [Edit, Write, NotebookEdit, Bash]
  color: '#3b82f6'
Worker:
  label: ⚙️ Worker
  model: GLM-4.5-Air
  thinking: false
  systemPrompt: ~/.cc-mode-switcher/prompts/Worker.md
  disallowedPlugins: [superpowers]
  allowedTools: []
  disallowedTools: [WebSearch]
  color: '#a855f7'
```

- **`label`** —— 表格和 Tab 标题里显示的名字。
- **`model`** —— `models.yaml` 的 slug 引用。空字符串 = 未绑定(此时 Tab 起不来,需要先绑模型)。
- **`thinking`** —— true 时,在该角色 settings 里设 `MAX_THINKING_TOKENS=16000`(claude 自动识别)。
- **`systemPrompt`** —— `.md` 文件的绝对路径。可以直接编辑或指向磁盘上任意路径(比如每个项目单独的 prompt)。
- **`disallowedPlugins`** —— 通过 `--disallowed-plugins` 传给 claude。无论你写啥,应用都会追加 `superpowers`。
- **`allowedTools` / `disallowedTools`** —— 通过 `--allowedTools` / `--disallowedTools` 传给 claude。Plan 默认的(只读 + 无 Bash)就是物理上保证 Plan 会话碰不到项目 —— 即使它想碰。
- **`color`** —— Tab 和表格行的强调色。行的颜色选择器可改。

### 文件解析与损坏恢复

- **首次运行**:缺 `models.yaml` → 写空文件;缺 `roles.yaml` → 写默认 Plan + Worker。
- **YAML 损坏**:坏文件改名为 `roles.yaml.<时间戳>.bak`,写一份新的默认。UI 显示提示,你的数据保留在磁盘上。
- **迁移**:v1 用小写 `plan` / `worker` id;首次 v2 运行会被原地改名为 `Plan` / `Worker`(规范大小写),让应用其他地方依赖稳定的 id。
- **重置角色**:重写 `roles.yaml` 为默认;**绝不**碰 `models.yaml` 或你改过的 `prompts/*.md`。

## Provider 预设

Base URL 字段按关键字自动填,还有一个预设下拉:

| Provider | 触发关键字 | Base URL |
| --- | --- | --- |
| GLM (智谱) | `glm`, `zhipu`, `bigmodel` | `https://open.bigmodel.cn/api/anthropic` |
| Claude (Anthropic) | `claude`, `anthropic`, `sonnet`, `opus`, `haiku` | `https://api.anthropic.com` |
| DeepSeek | `deepseek` | `https://api.deepseek.com/anthropic` |
| Kimi (月之暗面) | `kimi`, `moonshot` | `https://api.moonshot.cn/anthropic` |
| Z.ai | `z.ai`, `zai` | `https://api.z.ai/api/anthropic` |
| Qwen (阿里) | `qwen`, `dashscope`, `tongyi` | `https://dashscope.aliyuncs.com/api/anthropic` |

provider 匹配后,**model ID chips** 出现供一键填充(比如 GLM 有 `GLM-4.6`、`GLM-4.5`、`GLM-4.5-Air`、`GLM-Z1`)。

## 连接测试

每张模型卡上的 📡 按钮对配置的 `baseUrl` 跑一次 GET,带 `redirect: 'manual'` 和 8s 超时。结果 toast:

- 🟢 `connected in 143ms (HTTP 200)` —— DNS + TLS + 链路都没问题
- 🟢 `connected in 89ms (HTTP 401)` —— 也算"可达";真正的鉴权发生在 POST 时
- 🔴 `unreachable (ENOTFOUND api.example.com)` —— DNS / 网络问题
- 🔴 `unreachable (timeout)` —— 8s 内服务器没响应

目的是在真正起会话前抓明显的"URL 写错了" —— **不是**鉴权检查。

## 传给 claude 的 settings 文件

每次 `cc-<角色>` 调用往如下位置写一份该角色的 JSON:

```
~/.cc-mode-switcher/.launch-cache/<RoleId>.json
```

这份文件通过 `--settings "<path>"` 加 `--setting-sources ""`(关掉项目和用户级 settings,我们的赢)传给 claude。内容像这样:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "GLM-5.3",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "GLM-5.3",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "GLM-5.3",
    "ANTHROPIC_DEFAULT_FABLE_MODEL": "GLM-5.3",
    "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME": "GLM-5.3",
    "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME": "GLM-5.3",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME": "GLM-5.3",
    "ANTHROPIC_DEFAULT_FABLE_MODEL_NAME": "GLM-5.3",
    "ANTHROPIC_MODEL": "GLM-5.3",
    "CLAUDE_CODE_SUBAGENT_MODEL": "GLM-5.3",
    "MAX_THINKING_TOKENS": "16000"
  }
}
```

`MAX_THINKING_TOKENS` 仅在该角色 `thinking: true` 时出现。

启动脚本(`~/.cc-mode-switcher/.launch-cache/launch.sh`)是单一事实源 —— 既写这个文件,又定义 `cc-<角色>()` 函数(在 launch claude 之前 source 它)。内置 xterm 和外部 Terminal.app 都走同一个生成器(`src/renderer/src/shared/launchCommand.ts` 里的 `buildLaunchScripts` / `buildExternalSessionScript`)。

## 覆盖守卫

整个 `--setting-sources ""` + 每会话临时文件这套机制的核心,就是**完全不碰**你真实的 `~/.claude/settings.json`。我们从不读不写它 —— 既不是项目级也不是用户级。临时文件只在该会话生命周期内生效,pty 退出时(或外部 `.command` 启动器 60 秒后)就死。你的配置留在 `~/.cc-mode-switcher/`,你能看见也能改。

这意味着:

- **没有意外**:claude 不会悄悄从你的 shell rc 拿到一个过期的 `ANTHROPIC_API_KEY`,不会 fallback 到你忘了 unset 的 `CLAUDE_CODE_SUBAGENT_MODEL`,不会读到你没意识到的项目级 override 文件。
- **没有备份、没有迁移**:删 `~/.cc-mode-switcher/` 等于完全卸载。
- **多个并行会话**:在同一项目开一个 Plan Tab 和一个 Worker Tab —— 各自一份 settings,无交叉污染。