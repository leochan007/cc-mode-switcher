# 02 · Models & Providers

## Model fields

| Field | Description | Example |
| --- | --- | --- |
| Display Name | Free-form label | `GLM-5.3` |
| Base URL | Anthropic-compatible endpoint | `https://open.bigmodel.cn/api/anthropic` |
| API Key | Key from that provider | `sk-...` |
| Model ID | Model identifier actually requested | `glm-5.3` |

## Built-in provider presets

| Provider | Base URL | Common models |
| --- | --- | --- |
| GLM (Zhipu) | `https://open.bigmodel.cn/api/anthropic` | glm-5.3 / glm-5.3-air / glm-4.6 / glm-4.5 |
| MiniMax | `https://api.minimaxi.com/anthropic` | MiniMax-M3 / MiniMax-M2.1 / MiniMax-M2 |
| DeepSeek | `https://api.deepseek.com/anthropic` | deepseek-chat / deepseek-reasoner |
| Kimi (Moonshot) | `https://api.moonshot.cn/anthropic` | kimi-k2-0905-preview / kimi-k2-turbo-preview |
| Z.ai (GLM global) | `https://api.z.ai/api/anthropic` | glm-5.3 / glm-5.2 / glm-4.6 |
| Qwen (DashScope) | `https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy` | qwen3-coder-plus / qwen3-max |

### Extending presets

Edit `src/renderer/src/data/providers.ts` — one entry lights up autocomplete, keyword URL fill and model chips automatically:

```ts
{
  id: 'myprovider',
  name: 'My Provider',
  baseUrl: 'https://api.example.com/anthropic',
  keywords: ['myprov', 'example'],   // matched against names / model IDs
  models: ['my-model-v1']
}
```

## Model pairing

| Mode | Need | Recommended type | Examples |
| --- | --- | --- | --- |
| Plan | Deep reasoning, architecture trade-offs, long-context understanding | Flagship reasoning models | glm-5.3, MiniMax-M3, deepseek-reasoner |
| Work | Reliable coding, tool calling, cost efficiency | Code/execution models | qwen3-coder-plus, kimi-k2, MiniMax-M2.1 |

Principle: **spend expensive tokens only on thinking; leave execution to cheap models**. One plan document can be consumed by Work mode repeatedly — far better economics than one model doing everything.

## Injected environment variables

When opening a terminal (or copying the command block), these vars are injected, all pointing at the currently selected mode's bound model:

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` | Endpoint & auth |
| `ANTHROPIC_DEFAULT_OPUS/SONNET/HAIKU/FABLE_MODEL` | Maps all Claude Code tiers (+Fable) to your model |
| `ANTHROPIC_DEFAULT_*_MODEL_NAME` | Display name (what the banner shows) |
| `ANTHROPIC_MODEL` | Default main model |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model used by subagents (Task tool) |
| `MAX_THINKING_TOKENS` (Plan only) | Enables extended thinking |

## Env override guard (important)

The `env` block in Claude Code's `~/.claude/settings.json` takes **precedence over terminal environment variables**. If it contains `ANTHROPIC_*` keys (commonly written by other switching tools), your terminal exports are silently overridden — the banner keeps showing the old model.

How this app handles it:
- Checks automatically before ▶️ opens a terminal; prompts when conflicts are found
- Cleaning **backs up first** (`settings.json.cc-backup-<timestamp>`) and removes only `ANTHROPIC_*` / `CLAUDE_CODE_SUBAGENT_MODEL` / `MAX_THINKING_TOKENS` — everything else (permissions, model, …) stays intact
- ⚙️ Settings shows the override status permanently, cleanable anytime
