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

打开终端时（或复制的命令块）会注入以下变量，全部指向当前选中模式绑定的模型：

| 变量 | 作用 |
| --- | --- |
| `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` | 端点与鉴权 |
| `ANTHROPIC_DEFAULT_OPUS/SONNET/HAIKU/FABLE_MODEL` | 把 Claude Code 的三档角色（+Fable）全部映射到你的模型 |
| `ANTHROPIC_DEFAULT_*_MODEL_NAME` | 显示名（banner 里看到的模型名） |
| `ANTHROPIC_MODEL` | 默认主模型 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 子代理（Task 工具）用的模型 |
| `MAX_THINKING_TOKENS`（仅 Plan） | 开启 extended thinking |

## 环境覆盖防护（重要）

Claude Code 的 `~/.claude/settings.json` 中 `env` 块**优先级高于终端环境变量**。如果里面有 `ANTHROPIC_*` 等配置（常见于其他切换工具写入），你在终端 export 的配置会被静默覆盖——表现为 banner 显示的还是旧模型。

本应用的处理：
- ▶️ 打开终端前自动检测，发现冲突弹窗提示
- 清除时**先备份**（`settings.json.cc-backup-<时间戳>`），只删 `ANTHROPIC_*` / `CLAUDE_CODE_SUBAGENT_MODEL` / `MAX_THINKING_TOKENS`，其余配置（permissions、model 等）原样保留
- ⚙️ Settings 页常驻显示覆盖状态，可随时清除
