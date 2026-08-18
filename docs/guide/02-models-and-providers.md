# 02 · Models & Providers

How model configs are stored on disk, how provider presets fill in the Base URL, how the connection test works, and how the settings file is generated and passed to Claude at runtime.

## Models & roles config on disk

App config lives in **`~/.cc-mode-switcher/`**. Two YAML files drive everything:

```
~/.cc-mode-switcher/
├── models.yaml     ← model resource pool
├── roles.yaml      ← role bindings (label, model, thinking, prompt, tools)
├── prompts/
│   ├── Plan.md
│   └── Worker.md
└── .launch-cache/  ← per-session launch.sh + settings.json (auto-cleaned)
```

### `models.yaml`

One entry per model. The **top-level key** is the model's **id** (slug — referenced from `roles.yaml`); the body is connection info.

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
  name: GLM-4.5 Air (fast)
  baseUrl: https://open.bigmodel.cn/api/anthropic
  apiKey: sk-...
  modelID: GLM-4.5-Air
```

The first time you launch the app, `models.yaml` is created if missing. Models you've already configured in v1's `localStorage` (`cc_models`) are migrated into it once on first run — your data is preserved, the legacy storage is left in place (read-only afterwards).

### `roles.yaml`

One entry per role. The **top-level key** is the role's **id**; the body is the full role config. There is no hard-coded role list — the app iterates the file at startup.

```yaml
# ~/.cc-mode-switcher/roles.yaml
Plan:
  label: 🧠 Plan
  model: GLM-5.3                # ← models.yaml id; '' means unbound
  thinking: true                # ← MAX_THINKING_TOKENS=16000
  systemPrompt: ~/.cc-mode-switcher/prompts/Plan.md
  disallowedPlugins: [superpowers]   # always added by the app, even if you omit it
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

- **`label`** — display name shown in the table and Tab titles.
- **`model`** — slug reference into `models.yaml`. Empty string = unbound (the tab won't start until you bind a model).
- **`thinking`** — when true, sets `MAX_THINKING_TOKENS=16000` in the per-role settings file (claude picks it up automatically).
- **`systemPrompt`** — absolute path to a `.md` file. Inline-edit or point at any path on disk (e.g. per-project prompts).
- **`disallowedPlugins`** — passed to claude via `--disallowed-plugins`. The app always appends `superpowers` regardless of what you write here.
- **`allowedTools` / `disallowedTools`** — passed as `--allowedTools` / `--disallowedTools` to claude. The Plan default (read-only + no Bash) is what makes a Plan session physically unable to touch the project even if the model tried.
- **`color`** — accent color for the tab and table row. Edit via the row's color picker.

### File resolution & corruption recovery

- **First run**: missing `models.yaml` → empty file written; missing `roles.yaml` → default Plan + Worker written.
- **Corrupt YAML**: the broken file is renamed to `roles.yaml.<timestamp>.bak` and a fresh default is written. The UI shows a hint, your data is preserved on disk.
- **Migration**: v1 used lowercase `plan` / `worker` ids; on first v2 run these are renamed in-place to `Plan` / `Worker` (the canonical capitalized form) so the rest of the app can rely on stable ids.
- **Reset roles**: rewrites `roles.yaml` to defaults; **never** touches `models.yaml` or your edited `prompts/*.md`.

## Provider presets

The Base URL field auto-fills when you type a keyword, and there's a preset dropdown:

| Provider | Trigger keyword | Base URL |
| --- | --- | --- |
| GLM (Zhipu) | `glm`, `zhipu`, `bigmodel` | `https://open.bigmodel.cn/api/anthropic` |
| Claude (Anthropic) | `claude`, `anthropic`, `sonnet`, `opus`, `haiku` | `https://api.anthropic.com` |
| DeepSeek | `deepseek` | `https://api.deepseek.com/anthropic` |
| Kimi (Moonshot) | `kimi`, `moonshot` | `https://api.moonshot.cn/anthropic` |
| Z.ai | `z.ai`, `zai` | `https://api.z.ai/api/anthropic` |
| Qwen (Alibaba) | `qwen`, `dashscope`, `tongyi` | `https://dashscope.aliyuncs.com/api/anthropic` |

Once a provider is matched, **model ID chips** appear for one-click population (e.g. for GLM: `GLM-4.6`, `GLM-4.5`, `GLM-4.5-Air`, `GLM-Z1`).

## Connection test

The 📡 button on each model card runs a GET to the configured `baseUrl` with `redirect: 'manual'` and a 8s timeout. The result toast:

- 🟢 `connected in 143ms (HTTP 200)` — DNS + TLS + link all fine
- 🟢 `connected in 89ms (HTTP 401)` — still "reachable"; credentials are checked on the actual POST
- 🔴 `unreachable (ENOTFOUND api.example.com)` — DNS / network issue
- 🔴 `unreachable (timeout)` — server didn't respond in 8s

The point is to catch obvious "wrong URL" mistakes before you launch a real session — the test is **not** an auth check.

## The settings file passed to claude

Every `cc-<role>` invocation writes a per-role JSON to:

```
~/.cc-mode-switcher/.launch-cache/<RoleId>.json
```

This is the file passed to claude via `--settings "<path>"` plus `--setting-sources ""` (which disables project and user settings so ours wins). It looks like:

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

`MAX_THINKING_TOKENS` is included only when the role has `thinking: true`.

The launch script (`~/.cc-mode-switcher/.launch-cache/launch.sh`) is the single source of truth that writes this file AND defines the `cc-<role>()` shell function that sources it before launching claude. Both internal xterm and external Terminal.app go through the same generator (`buildLaunchScripts` / `buildExternalSessionScript` in `src/renderer/src/shared/launchCommand.ts`).

## Override guard

The whole point of the `--setting-sources ""` + per-session temp file dance is to keep your real `~/.claude/settings.json` **completely untouched**. We never read or write it — neither project level nor user level. The temp file wins for the lifetime of that one session, then dies when the pty exits (or 60 seconds later for the external `.command` launcher). Your config remains in `~/.cc-mode-switcher/`, where you can see and edit it.

This means:

- **No surprises**: claude never silently picks up a stale `ANTHROPIC_API_KEY` from your shell rc, never falls back to a `CLAUDE_CODE_SUBAGENT_MODEL` you forgot to unset, never reads a project-level override file you didn't realize existed.
- **No backups, no migrations**: removing `~/.cc-mode-switcher/` is a complete uninstall.
- **Multiple parallel sessions**: open a Plan tab and a Worker tab in the same project — each has its own settings file, no cross-contamination.