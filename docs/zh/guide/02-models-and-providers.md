# 02 · 模型与 Provider 配置

## 模型字段说明

| 字段 | 说明 | 示例 |
| --- | --- | --- |
| Display Name | 展示名，随意起 | `GLM-5.3` |
| Base URL | Anthropic 兼容端点 | `https://open.bigmodel.cn/api/anthropic` |
| API Key | 对应平台的密钥 | `sk-...` |
| Model ID | 实际请求的模型标识 | `glm-5.3` |

## 内置 Provider 预设

| Provider | Base URL | 常用模型 |
| --- | --- | --- |
| GLM（智谱） | `https://open.bigmodel.cn/api/anthropic` | glm-5.3 / glm-5.3-air / glm-4.6 / glm-4.5 |
| MiniMax | `https://api.minimaxi.com/anthropic` | MiniMax-M3 / MiniMax-M2.1 / MiniMax-M2 |
| DeepSeek | `https://api.deepseek.com/anthropic` | deepseek-chat / deepseek-reasoner |
| Kimi（月之暗面） | `https://api.moonshot.cn/anthropic` | kimi-k2-0905-preview / kimi-k2-turbo-preview |
| Z.ai（GLM 国际版） | `https://api.z.ai/api/anthropic` | glm-5.3 / glm-5.2 / glm-4.6 |
| 通义千问（DashScope） | `https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy` | qwen3-coder-plus / qwen3-max |

### 扩展预设

编辑 `src/renderer/src/data/providers.ts`，加一条即可自动生效（自动补全、关键词填 URL、模型 chips）：

```ts
{
  id: 'myprovider',
  name: 'My Provider',
  baseUrl: 'https://api.example.com/anthropic',
  keywords: ['myprov', 'example'],   // 用于名称/Model ID 关键词匹配
  models: ['my-model-v1']
}
```

## 模型分工建议

| 模式 | 诉求 | 推荐类型 | 示例 |
| --- | --- | --- | --- |
| Plan | 深度推理、架构权衡、长上下文理解 | 旗舰推理模型 | glm-5.3、MiniMax-M3、deepseek-reasoner |
| Work | 稳定编码、工具调用、性价比 | 代码/执行向模型 | qwen3-coder-plus、kimi-k2、MiniMax-M2.1 |

原则：**贵模型只花在思考上，执行交给便宜模型**。一次 Plan 产出的文档可以让 Work 模式反复消费，成本结构远优于"一个模型包打天下"。

## 注入的环境变量

打开终端时（或复制的命令块），片段**始终跟随上方 Plan / Work 卡片的选择**。保留 `export KEY="VALUE"` 形式，在 `$CC_MODE_DIR/<ModelName>.json`（每次点击通过 `mktemp -d` 新建）写一个临时 JSON，并定义对应的 alias。下面所有变量都指向当前选中模式绑定的模型：

| 变量 | 作用 |
| --- | --- |
| `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` | 端点与鉴权 |
| `ANTHROPIC_DEFAULT_OPUS/SONNET/HAIKU/FABLE_MODEL` | 把 Claude Code 的三档角色（+Fable）全部映射到你的模型 |
| `ANTHROPIC_DEFAULT_*_MODEL_NAME` | 显示名（banner 里看到的模型名） |
| `ANTHROPIC_MODEL` | 默认主模型 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 子代理（Task 工具）用的模型 |
| `MAX_THINKING_TOKENS`（仅 Plan） | 开启 extended thinking |

临时文件以绑定模型的**显示名**（做了文件系统安全化处理）命名，所以进 `$CC_MODE_DIR` 一眼能找到——比如 Plan 绑了「GLM-5.3」就是 `GLM-5.3.json`，Work 绑了「MiniMax-M3」就是 `MiniMax-M3.json`。alias 通过 `--settings "$CC_MODE_DIR/<ModelName>.json"` 加载——其优先级**高于任何其他来源**，包括 `~/.claude/settings.json`。

切换模式：点另一张卡片。textarea 和下一次 ▶️ 启动都会用另一种模式的绑定（和对应的文件名）重新生成。

## 为什么本应用不读写 `~/.claude/settings.json`

Claude Code 的 `~/.claude/settings.json` 中 `env` 块**优先级高于终端环境变量**。要在完全不读不写该文件的前提下绕开它，每个 alias 都带两个 flag 启动 Claude Code：

```
claude --setting-sources "" --settings "$CC_MODE_DIR/<ModelName>.json"
```

- `--setting-sources ""` 让 Claude Code 完全跳过所有默认 settings 文件（user / project / local）
- `--settings <file>` 再以**最高优先级**加载对应模式的临时 JSON——同时压过 shell env 和任何默认 settings 源

效果：app 从不打开、写入或备份 `~/.claude/settings.json`。和 cc-switch（或任何写入该文件的工具）结构性无冲突——app 的配置只活在 `$CC_MODE_DIR` 里，每次启动重新生成，绝不碰用户的 home 目录。

副作用：通过 `cc-p` / `cc-w` 启动的 session 是一个**干净配置**——你写在 `settings.json` 里的 permissions 白名单、MCP server、自定义 slash command、hook 脚本在该 session 内**也会被跳过**。如果依赖这些，请另外直接跑 `claude`。
