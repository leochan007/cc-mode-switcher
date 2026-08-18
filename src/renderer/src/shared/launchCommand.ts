import type { ModelConfig, RoleConfig } from '../types'

// -----------------------------------------------------------------------------
// Shared launch-script generator
// -----------------------------------------------------------------------------
//
// Used by:
//   - RoleDetailPanel (preview + copy)
//   - External terminal launcher ("Open external terminal" button)
//   - XtermTab session creation (the pty sources this exact script)
//
// The settings JSON is written to disk by the main process and its path is
// passed via env `CC_MS_SETTINGS_FILE`. This script does NOT use a heredoc —
// those occasionally fail to close in interactive zsh depending on PS2 /
// timing / terminal state, which left users stuck at a `heredoc>` prompt.
// -----------------------------------------------------------------------------

/** Escape a value for inclusion inside `export KEY="..."` */
function dq(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
}

/** Quote a value as a single safe shell argument */
function sq(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/**
 * Wrap a value in double quotes for the shell — used for arguments that
 * intentionally reference shell variables (e.g. `--settings "$CC_MS_SETTINGS_FILE"`
 * must expand `$CC_MS_SETTINGS_FILE` at runtime, so we do NOT escape `$`).
 */
function dqArg(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`')}"`
}

/** Env block that mirrors what lives in the settings.json */
function envExports(m: ModelConfig, thinking: boolean): string[] {
  return [
    `export ANTHROPIC_BASE_URL="${dq(m.baseUrl)}"`,
    `export ANTHROPIC_AUTH_TOKEN="${dq(m.apiKey)}"`,
    `export ANTHROPIC_DEFAULT_OPUS_MODEL="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_SONNET_MODEL="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_HAIKU_MODEL="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_FABLE_MODEL="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_SONNET_MODEL_NAME="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_FABLE_MODEL_NAME="${dq(m.modelID)}"`,
    `export ANTHROPIC_MODEL="${dq(m.modelID)}"`,
    `export CLAUDE_CODE_SUBAGENT_MODEL="${dq(m.modelID)}"`,
    ...(thinking ? [`export MAX_THINKING_TOKENS=16000`] : [])
  ]
}

/**
 * The exact JSON payload that will live in the per-session settings file.
 * When `m` is null (unbound role), returns an empty object — caller should
 * still gate on `if (model)` before invoking claude with this role.
 */
export function settingsJsonFor(m: ModelConfig | null, thinking: boolean): string {
  if (!m) return '{}'
  const env: Record<string, string> = {
    ANTHROPIC_BASE_URL: m.baseUrl,
    ANTHROPIC_AUTH_TOKEN: m.apiKey,
    ANTHROPIC_DEFAULT_OPUS_MODEL: m.modelID,
    ANTHROPIC_DEFAULT_SONNET_MODEL: m.modelID,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: m.modelID,
    ANTHROPIC_DEFAULT_FABLE_MODEL: m.modelID,
    ANTHROPIC_DEFAULT_OPUS_MODEL_NAME: m.modelID,
    ANTHROPIC_DEFAULT_SONNET_MODEL_NAME: m.modelID,
    ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME: m.modelID,
    ANTHROPIC_DEFAULT_FABLE_MODEL_NAME: m.modelID,
    ANTHROPIC_MODEL: m.modelID,
    CLAUDE_CODE_SUBAGENT_MODEL: m.modelID
  }
  if (thinking) env.MAX_THINKING_TOKENS = '16000'
  return JSON.stringify({ env }, null, 2)
}

/**
 * Escape a string for inclusion inside single quotes (the only escape needed
 * is the single quote itself: `'` → `'\''`).
 *
 * The launch script embeds the system prompt as `--system-prompt '<content>'`,
 * so we use single quotes around the value. Backslashes, $, backticks are
 * inert inside single quotes, so we don't need to escape them.
 */
function sqShellSafe(s: string): string {
  return s.replace(/'/g, `'\\''`)
}

/** Build the array of `claude` flag arguments (already shell-safe quoted) */
function claudeArgs(role: RoleConfig, systemPromptContent: string): string[] {
  const args: string[] = []
  args.push(`--setting-sources ${sq('')}`) // disable default settings sources
  args.push(`--settings ${dqArg('$CC_MS_SETTINGS_FILE')}`)
  // claude doesn't accept --system-prompt-file; inline the content instead.
  if (systemPromptContent.trim()) {
    args.push(`--system-prompt '${sqShellSafe(systemPromptContent)}'`)
  }
  // No --disallowed-plugins flag in claude; system prompt handles superpowers.
  if (role.allowedTools.length) {
    args.push(`--allowedTools ${role.allowedTools.join(',')}`)
  }
  if (role.disallowedTools.length) {
    args.push(`--disallowedTools ${role.disallowedTools.join(',')}`)
  }
  return args
}

export interface LaunchScriptOptions {
  role: RoleConfig
  /** Null when the role is unbound — script still emits, but without env exports */
  model: ModelConfig | null
  systemPromptContent: string
  description?: string
}

/**
 * Build a self-contained shell script that:
 *   - exports the model env vars (or omits them if the role is unbound)
 *   - writes the settings JSON via `printf` (no heredoc — heredocs occasionally
 *     fail to close in interactive zsh and trap users at `heredoc>`)
 *   - defines a shell function `cc-<roleId>` that invokes claude with the
 *     role's flags. The user runs the function name in their terminal.
 *
 * No `exec claude` — the script never takes over the shell. After sourcing
 * it, the user just types `cc-plan` (or whatever the role id is) to launch.
 *
 * When `model` is null, the function body uses whatever ANTHROPIC_* env vars
 * happen to be in scope; the env exports step is replaced with a comment.
 */
export function buildLaunchScript(opts: LaunchScriptOptions): string {
  const { role, model, systemPromptContent } = opts
  const json = settingsJsonFor(model, role.thinking)
  const shellSafe = json.replace(/'/g, `'\\''`)
  const desc = opts.description ?? `cc-mode-switcher · ${role.id}`
  const fnName = `cc-${role.id.toLowerCase()}`
  const argsLine = claudeArgs(role, systemPromptContent).join(' ')
  return [
    `# ${desc}`,
    ...(model ? envExports(model, role.thinking) : ['# (role unbound — no model env exports)']),
    '',
    `# Per-role settings file (priority > ~/.claude/settings.json).`,
    `# Written via printf to avoid interactive-zsh heredoc edge cases.`,
    `CC_MS_SETTINGS_FILE="$HOME/.cc-mode-switcher/.launch-cache/${role.id}.json"`,
    `mkdir -p "$(dirname "$CC_MS_SETTINGS_FILE")"`,
    `printf '%s' '${shellSafe}' > "$CC_MS_SETTINGS_FILE"`,
    '',
    `# Type \`${fnName}\` to launch Claude with this role's config.`,
    `${fnName}() {`,
    `  exec claude ${argsLine}`,
    `}`
  ].join('\n')
}