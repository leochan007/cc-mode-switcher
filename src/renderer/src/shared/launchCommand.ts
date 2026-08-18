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
  if (systemPromptContent.trim()) {
    args.push(`--system-prompt '${sqShellSafe(systemPromptContent)}'`)
  }
  if (role.allowedTools.length) {
    args.push(`--allowedTools ${role.allowedTools.join(',')}`)
  }
  if (role.disallowedTools.length) {
    args.push(`--disallowedTools ${role.disallowedTools.join(',')}`)
  }
  return args
}

/**
 * One entry in the bootstrap script — corresponds to a bound role + its model.
 * Each entry becomes one shell function `cc-<roleId>` plus the env vars it
 * needs, so the user can switch between roles without re-sourcing.
 */
export interface LaunchScriptEntry {
  role: RoleConfig
  model: ModelConfig
  systemPromptContent: string
}

/**
 * Backwards-compatible single-role entry point. Internally delegates to
 * `buildLaunchScript` with a one-element `entries` array.
 */
export function buildLaunchScript(opts: {
  role: RoleConfig
  model: ModelConfig | null
  systemPromptContent: string
  description?: string
}): string {
  if (!opts.model) {
    // No model bound — emit a minimal script that just defines an empty
    // (no-op) cc-<id> function so the user can re-source later once a
    // model is bound.
    const fnName = `cc-${opts.role.id.toLowerCase()}`
    return [
      `# cc-mode-switcher · ${opts.role.id} (unbound)`,
      `# (role unbound — no model env exports, ${fnName} is a no-op)`,
      '',
      `${fnName}() {`,
      `  echo "${fnName}: role '${opts.role.id}' has no model. Bind one in the role table."`,
      `}`
    ].join('\n')
  }
  return buildLaunchScripts({
    entries: [
      {
        role: opts.role,
        model: opts.model,
        systemPromptContent: opts.systemPromptContent
      }
    ],
    description: opts.description
  })
}

/**
 * Build a single self-contained shell script that wires up ONE shell function
 * per bound role. Each function re-exports its own ANTHROPIC_* env vars
 * before exec'ing claude, so the user can call any role function from the
 * same shell without re-sourcing.
 *
 * Example with two roles:
 *   cc-plan()  { export ANTHROPIC_BASE_URL="..." ...; exec claude ... }
 *   cc-worker(){ export ANTHROPIC_BASE_URL="..." ...; exec claude ... }
 *
 * The settings file path is derived from the role id; each role writes its
 * own `~/.cc-mode-switcher/.launch-cache/<RoleId>.json`.
 *
 * Unbound roles (no model) are silently skipped — caller should filter them.
 */
export function buildLaunchScripts(opts: {
  entries: LaunchScriptEntry[]
  description?: string
}): string {
  const lines: string[] = []
  const desc = opts.description ?? 'cc-mode-switcher bootstrap'
  lines.push(`# ${desc}`)

  // Per-role: settings file + claude flags.
  for (const entry of opts.entries) {
    const { role, model, systemPromptContent } = entry
    const json = settingsJsonFor(model, role.thinking)
    const shellSafe = json.replace(/'/g, `'\\''`)
    const settingsPath = `$HOME/.cc-mode-switcher/.launch-cache/${role.id}.json`
    lines.push(`# ── ${role.label} (${role.id}) ──`)
    lines.push(`CC_MS_SETTINGS_FILE_${role.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}="${settingsPath}"`)
    lines.push(`mkdir -p "$(dirname "${settingsPath}")"`)
    lines.push(`printf '%s' '${shellSafe}' > "${settingsPath}"`)
    lines.push('')
  }

  // Per-role: cc-<id>() function. Each function re-exports its env then execs.
  for (const entry of opts.entries) {
    const { role, model, systemPromptContent } = entry
    const fnName = `cc-${role.id.toLowerCase()}`
    const settingsVar = `CC_MS_SETTINGS_FILE_${role.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
    const envLines = envExports(model, role.thinking).map((l) => '  ' + l)
    const argsLine = claudeArgs(role, systemPromptContent)
      .map((a) => a.replace(/\$CC_MS_SETTINGS_FILE/g, `$${settingsVar}`))
      .join(' ')
    lines.push(`${fnName}() {`)
    lines.push(...envLines)
    lines.push(`  exec claude ${argsLine}`)
    lines.push(`}`)
    lines.push('')
  }

  // Echo a friendly reminder of what's available
  const names = opts.entries.map((e) => `cc-${e.role.id.toLowerCase()}`).join(', ')
  lines.push(`# Available role launchers: ${names}`)
  return lines.join('\n')
}