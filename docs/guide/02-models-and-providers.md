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

When opening a terminal (or copying the command block), the snippet **always reflects the currently selected mode card** (Plan or Work). It keeps the original `export KEY="VALUE"` form, drops one temp JSON file at `$CC_MODE_DIR/<ModelName>.json` (created on each click via `mktemp -d`), and defines the corresponding alias. Every variable below points at that mode's bound model:

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` | Endpoint & auth |
| `ANTHROPIC_DEFAULT_OPUS/SONNET/HAIKU/FABLE_MODEL` | Maps all Claude Code tiers (+Fable) to your model |
| `ANTHROPIC_DEFAULT_*_MODEL_NAME` | Display name (what the banner shows) |
| `ANTHROPIC_MODEL` | Default main model |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model used by subagents (Task tool) |
| `MAX_THINKING_TOKENS` (Plan only) | Enables extended thinking |

The temp file is named after the bound model's **display name** (sanitized for the filesystem), so it's instantly findable in `$CC_MODE_DIR` — e.g. `GLM-5.3.json` for the Plan binding of "GLM-5.3", `MiniMax-M3.json` for the Work binding of "MiniMax-M3". The alias loads it via `--settings "$CC_MODE_DIR/<ModelName>.json"` — which has **higher priority than any other source**, including `~/.claude/settings.json`.

Switching modes: click the other card. The textarea and the next ▶️ launch both regenerate with the other mode's bindings (and a different filename, reflecting the other bound model).

## Why this never touches `~/.claude/settings.json`

The `env` block in Claude Code's `~/.claude/settings.json` takes **precedence over terminal environment variables**. To bypass it without ever reading or modifying that file, every alias invokes Claude Code with two flags:

```
claude --setting-sources "" --settings "$CC_MODE_DIR/<ModelName>.json"
```

- `--setting-sources ""` tells Claude Code to skip **all** default settings files (user / project / local).
- `--settings <file>` then loads the per-mode temp JSON at **highest priority** — it overrides both shell env and any default settings source.

Net effect: the app never opens, writes, or backs up `~/.claude/settings.json`. Conflict with cc-switch (or any other tool that writes that file) is structurally impossible — the app's settings live in `$CC_MODE_DIR`, generated fresh on every launch, and never touch the user's home directory.

Consequence: a session launched via `cc-p` / `cc-w` runs with a clean default config — your permissions allow-list, MCP servers, custom slash commands, and hooks defined in `~/.claude/settings.json` are **also** skipped for that session. If you depend on those, run plain `claude` separately.
