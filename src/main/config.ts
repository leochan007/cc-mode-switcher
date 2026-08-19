import { app } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import YAML from 'yaml'

// -----------------------------------------------------------------------------
// Types (mirrored on the renderer side; main is the source of truth)
// -----------------------------------------------------------------------------

export interface ModelConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelID: string
}

export interface RoleConfig {
  /**
   * Single name field — used as both the YAML top-level key and the user-facing
   * display name (the older `label` field is gone). Must be unique among roles.
   */
  id: string
  /** references ModelConfig.id; '' = unbound */
  model: string
  thinking: boolean
  /** Inline system prompt content (no longer a file path). */
  systemPrompt: string
  disallowedPlugins: string[]
  allowedTools: string[]
  disallowedTools: string[]
  /** accent color for the role, used by the table row + terminal tab header */
  color: string
}

export interface ConfigBundle {
  models: ModelConfig[]
  roles: RoleConfig[]
  /** absolute directory where models.yaml + roles.yaml live */
  configDir: string
}

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

function configDir(): string {
  // app may be undefined in unit-style scripts; fall back to ~/.cc-mode-switcher
  const home = app?.getPath?.('home') ?? os.homedir()
  return path.join(home, '.cc-mode-switcher')
}

const MODELS_FILE = 'models.yaml'
const ROLES_FILE = 'roles.yaml'

function modelsPath(dir: string): string {
  return path.join(dir, MODELS_FILE)
}
function rolesPath(dir: string): string {
  return path.join(dir, ROLES_FILE)
}

// -----------------------------------------------------------------------------
// Built-in defaults — written on first run or after a Reset
// -----------------------------------------------------------------------------

const DEFAULT_ROLES_YAML = `Plan:
  model: ''
  thinking: true
  systemPrompt: |
    # Role: Planner

    ## 1. Identity
    You are the **Planner** role in a multi-role Claude Code session. Your job is to produce a thorough, executable implementation plan. You do NOT write business code — your output is the design, and the Worker role will execute it.

    ## 2. Inputs
    - The user's request (this conversation).
    - The project source tree — explore via Read / LS / Glob / Grep (read-only).

    ## 3. Outputs (Deliverables)

    You OWN and write the following files in your project cwd:

    - \`.cc-delivery/plan_output.md\` — the plan itself (schema in §5).
    - \`.cc-delivery/status.md\` — current handoff state (schema in §5).

    End every response with exactly one termination signal (see §7).

    ## 4. Tools / Constraints

    Hard rules (cannot be violated):
    - ALLOWED: \`Read\`, \`LS\`, \`Glob\`, \`Grep\`.
    - DENIED: \`Edit\`, \`Write\`, \`NotebookEdit\`, \`Bash\`, \`WebSearch\`.
    - Plugin \`superpowers\` is disabled — do not attempt to enable it.
    - Do not run shell commands; do not modify source files.

    ## 5. Workflow

    1. Read the user's request carefully. If critical info is missing, ask 1–2 clarifying questions.
    2. Explore the project (LS, Glob, Read) to confirm scope and existing patterns.
    3. Compose \`plan_output.md\` following the schema below.
    4. Update \`status.md\` JSON block (schema below).
    5. End your response with \`PLANNER_READY: <one-line summary>\`.

    ### \`plan_output.md\` schema (sections marked optional may be omitted)

    \`\`\`yaml
    # Plan: <title>

    ## 1. Goal
    <one-line description of what this plan achieves>

    ## 2. Scope
    ### In
    - <what this plan covers>
    ### Out
    - <what this plan explicitly does NOT touch>

    ## 3. Architecture
    <overview, ≤10 lines — components, data flow, key decisions>

    ## 4. File changes
    - \`<path/to/file>\`: <what changes>
    - \`<path/to/another>\`: <what changes>
    (this is the section Worker will mechanically execute — every entry must be unambiguous: exact path, exact change)

    ## 5. Risks / Edge cases  (optional)
    - <risk>: <mitigation>

    ## 6. Open questions  (optional)
    - <question> — flag for Worker to surface, do NOT ask the user directly
    \`\`\`

    ### \`status.md\` schema (replace the whole JSON block)

    \`\`\`json
    {
      "current_role": "planner",
      "phase": "completed",
      "last_signal": "PLANNER_READY",
      "plan_path": ".cc-delivery/plan_output.md",
      "updated_at": "<ISO 8601 timestamp>"
    }
    \`\`\`

    ## 6. Coordination contract

    - You OWN \`.cc-delivery/plan_output.md\`. Only you may write to it; Worker reads but never edits.
    - \`status.md\` is shared — any role may overwrite the JSON block.
    - Worker executes §4 line-by-line. Anything not in §4 is out-of-scope for Worker.
    - If scope changes mid-plan: REWRITE \`plan_output.md\` and re-emit \`PLANNER_READY\`.
    - Open questions go in §6 (Worker surfaces them, not you).

    ## 7. Termination

    Always end your response with exactly ONE of these lines (no markdown, no prefix):

    - \`PLANNER_READY: <one-line summary>\` — normal completion, Worker may start
    - \`PLANNER_BLOCKED: <reason>\` — need user input to proceed
    - \`PLANNER_NO_INPUT: <reason>\` — request is malformed, cannot proceed

    The app greps your final line for the signal — non-conforming responses will be treated as no-signal.
  disallowedPlugins: [superpowers]
  allowedTools: [Read, LS, Glob, Grep]
  disallowedTools: [Edit, Write, NotebookEdit, Bash, WebSearch]
  color: '#3b82f6'
Worker:
  model: ''
  thinking: false
  systemPrompt: |
    # Role: Worker

    ## 1. Identity
    You are the **Worker** role in a multi-role Claude Code session. Your job is to execute the plan that Planner produced. You write code; you do NOT re-plan.

    ## 2. Inputs
    - \`.cc-delivery/plan_output.md\` — Planner's plan (REQUIRED; if missing or malformed, see §7).
    - \`.cc-delivery/worker_report.md\` — your previous milestone notes (if any).
    - \`.cc-delivery/status.md\` — current handoff state.

    ## 3. Outputs (Deliverables)

    You OWN and write:
    - Source files listed in \`plan_output.md\` §4.
    - \`.cc-delivery/worker_report.md\` — append milestone notes (you own this file, append-only).
    - \`.cc-delivery/status.md\` — update JSON block on each milestone.

    End every response with exactly one termination signal (see §7).

    ## 4. Tools / Constraints

    Hard rules (cannot be violated):
    - Plugin \`superpowers\` is disabled — do not attempt to enable it.
    - \`WebSearch\` is denied — rely on local files.
    - Honor the per-session tool allow / deny list given at launch.
    - Do NOT modify \`.cc-delivery/plan_output.md\` — that is Planner's file.
    - Do NOT modify files NOT listed in \`plan_output.md\` §4 (out-of-scope).

    ## 5. Workflow

    1. Read \`.cc-delivery/plan_output.md\`. If missing or §4 is absent, emit \`WORKER_NO_PLAN\` and STOP.
    2. Update \`status.md\`:
       \`\`\`json
       {
         "current_role": "worker",
         "phase": "implementing",
         "last_signal": "WORKER_RUNNING",
         "plan_path": ".cc-delivery/plan_output.md",
         "milestones_done": 0,
         "milestones_total": <count of §4 entries>,
         "updated_at": "<ISO 8601 timestamp>"
       }
       \`\`\`
    3. For each entry in §4, in order:
       a. Implement the change.
       b. Append a milestone note to \`worker_report.md\` (schema below).
       c. Update \`status.md\` \`milestones_done\`.
    4. After all §4 entries complete, emit \`WORKER_DONE\` (see §7).

    ### \`worker_report.md\` append schema

    \`\`\`yaml

    ## <ISO 8601 timestamp> — <one-line milestone summary>
    - Changed: \`<file1>\`, \`<file2>\`
    - Blockers: <none / "needs Planner review: <reason>">
    \`\`\`

    Append, never overwrite — this is a log.

    ## 6. Coordination contract

    - You OWN \`worker_report.md\` (append-only).
    - Planner OWNS \`plan_output.md\` — read but never write.
    - If a §4 entry is wrong or under-specified, append a "Needs Planner review" note to \`worker_report.md\`; do NOT rewrite the plan.
    - If the entire plan is wrong (scope mismatch), append a "Plan invalid: <reason>" note and emit \`WORKER_BLOCKED\`.

    ## 7. Termination

    Always end your response with exactly ONE of these lines (no markdown, no prefix):

    - \`WORKER_DONE: <one-line summary of what shipped>\` — all §4 items complete
    - \`WORKER_BLOCKED: <reason>\` — cannot proceed, needs Planner or user
    - \`WORKER_NO_PLAN: <reason>\` — \`plan_output.md\` missing or §4 absent

    The app greps your final line for the signal — non-conforming responses will be treated as no-signal.
  disallowedPlugins: [superpowers]
  allowedTools: []
  disallowedTools: [WebSearch]
  color: '#a855f7'
`

// -----------------------------------------------------------------------------
// YAML <-> typed object helpers
// -----------------------------------------------------------------------------

interface ModelsYaml {
  [id: string]: Omit<ModelConfig, 'id'>
}
interface RolesYaml {
  [id: string]: Omit<RoleConfig, 'id'> & {
    /** legacy field — ignored on read, stripped on write */
    label?: string
  }
}

/** True iff `s` looks like a filesystem path rather than inline content. */
function looksLikePromptPath(s: string): boolean {
  if (!s) return false
  if (s.startsWith('/') || s.startsWith('~')) return true
  // bare filename ending in .md, no newlines (inline content rarely matches this)
  if (/^[^\\n\\r]+\\.md$/.test(s.trim())) return true
  return false
}

/** Expand a leading `~` to the user's home directory. */
function expandHome(p: string): string {
  if (!p) return p
  if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1))
  return p
}

function modelsFromYaml(text: string): ModelConfig[] {
  const doc = (YAML.parse(text) ?? {}) as ModelsYaml
  return Object.entries(doc).map(([id, m]) => ({
    id,
    name: String(m.name ?? ''),
    baseUrl: String(m.baseUrl ?? ''),
    apiKey: String(m.apiKey ?? ''),
    modelID: String(m.modelID ?? '')
  }))
}

function modelsToYaml(models: ModelConfig[]): string {
  const obj: ModelsYaml = {}
  for (const m of models) {
    obj[m.id] = {
      name: m.name,
      baseUrl: m.baseUrl,
      apiKey: m.apiKey,
      modelID: m.modelID
    }
  }
  return YAML.stringify(obj, { indent: 2, lineWidth: 120 })
}

function rolesFromYaml(text: string): RoleConfig[] {
  const doc = (YAML.parse(text) ?? {}) as RolesYaml
  return Object.entries(doc).map(([id, r]) => {
    // Migration: legacy format had systemPrompt pointing at ~/.cc-mode-switcher/prompts/<id>.md.
    // In the new format it's inline YAML block-scalar content. If we see a
    // path-like value, read the file (best-effort; missing file → empty).
    let systemPrompt = String(r.systemPrompt ?? '')
    if (looksLikePromptPath(systemPrompt)) {
      const abs = expandHome(systemPrompt)
      try {
        systemPrompt = fs.readFileSync(abs, 'utf8')
      } catch {
        systemPrompt = ''
      }
    }
    return {
      id,
      model: String(r.model ?? ''),
      thinking: Boolean(r.thinking),
      systemPrompt,
      disallowedPlugins: Array.isArray(r.disallowedPlugins) ? r.disallowedPlugins.map(String) : [],
      allowedTools: Array.isArray(r.allowedTools) ? r.allowedTools.map(String) : [],
      disallowedTools: Array.isArray(r.disallowedTools) ? r.disallowedTools.map(String) : [],
      color: String(r.color ?? pickNextColor(doc))
    }
  })
}

/** Pick the next color that hasn't been used by another role in this YAML */
function pickNextColor(doc: RolesYaml): string {
  const palette = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#84cc16', '#ec4899', '#14b8a6']
  const used = new Set(
    Object.values(doc)
      .map((r) => (r as any).color)
      .filter((c) => typeof c === 'string')
  )
  return palette.find((c) => !used.has(c)) ?? palette[0]
}

function rolesToYaml(roles: RoleConfig[]): string {
  const obj: RolesYaml = {}
  for (const r of roles) {
    obj[r.id] = {
      model: r.model,
      thinking: r.thinking,
      systemPrompt: r.systemPrompt,
      disallowedPlugins: r.disallowedPlugins,
      allowedTools: r.allowedTools,
      disallowedTools: r.disallowedTools,
      color: r.color
    }
  }
  // lineWidth: 120 keeps the JSON-ish fields compact, but YAML.stringify
  // respects block scalars (`|`) for systemPrompt regardless of lineWidth.
  return YAML.stringify(obj, { indent: 2, lineWidth: 120 })
}

// -----------------------------------------------------------------------------
// Filesystem operations (idempotent / tolerant of corruption)
// -----------------------------------------------------------------------------

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function writeIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8')
  }
}

function backupAndRebuild(brokenPath: string, fresh: string): void {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    fs.renameSync(brokenPath, `${brokenPath}.${stamp}.bak`)
  } catch {
    /* best effort */
  }
  fs.writeFileSync(brokenPath, fresh, 'utf8')
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

let cached: ConfigBundle | null = null

/**
 * Read the full config bundle from disk. On first run, creates the directory
 * with default roles and empty models. Corrupt files are quarantined + rebuilt.
 */
export function loadConfig(): ConfigBundle {
  const dir = configDir()
  ensureDir(dir)

  // ----- models.yaml -----
  if (!fs.existsSync(modelsPath(dir))) {
    fs.writeFileSync(modelsPath(dir), YAML.stringify({}, { indent: 2 }), 'utf8')
  }
  let models: ModelConfig[] = []
  try {
    models = modelsFromYaml(fs.readFileSync(modelsPath(dir), 'utf8'))
  } catch (err) {
    console.error('[config] models.yaml unreadable, rebuilding empty:', err)
    backupAndRebuild(modelsPath(dir), YAML.stringify({}, { indent: 2 }))
  }

  // ----- roles.yaml -----
  if (!fs.existsSync(rolesPath(dir))) {
    fs.writeFileSync(rolesPath(dir), DEFAULT_ROLES_YAML, 'utf8')
  }
  let roles: RoleConfig[] = []
  try {
    roles = rolesFromYaml(fs.readFileSync(rolesPath(dir), 'utf8'))
  } catch (err) {
    console.error('[config] roles.yaml unreadable, rebuilding defaults:', err)
    backupAndRebuild(rolesPath(dir), DEFAULT_ROLES_YAML)
    roles = rolesFromYaml(DEFAULT_ROLES_YAML)
  }

  // Migration: if any role still has a `label` field (the old `id + label`
  // dual-name schema) or a path-style `systemPrompt`, the round-trip above
  // already inlined the prompt content. We just need to write back so the
  // YAML on disk reflects the new schema (single `name` field, inline
  // systemPrompt). Idempotent — safe to run every startup.
  const yamlOnDisk = fs.readFileSync(rolesPath(dir), 'utf8')
  const doc = (YAML.parse(yamlOnDisk) ?? {}) as RolesYaml
  let dirty = false
  for (const id of Object.keys(doc)) {
    const entry = doc[id] as Record<string, unknown>
    if ('label' in entry) { delete (entry as any).label; dirty = true }
    if (typeof entry.systemPrompt === 'string' && looksLikePromptPath(entry.systemPrompt)) {
      // Re-derive from the in-memory `roles` (which already ran rolesFromYaml,
      // so the inlined content is in there). Write back as block scalar via
      // rolesToYaml.
      dirty = true
    }
  }
  if (dirty) {
    try {
      fs.writeFileSync(rolesPath(dir), rolesToYaml(roles), 'utf8')
      console.log('[config] Migrated roles.yaml → single-name schema, inline systemPrompt')
    } catch (err) {
      console.error('[config] role schema migration write failed:', err)
    }
  }

  cached = { models, roles, configDir: dir }
  return cached
}

function invalidate(): void {
  cached = null
}

export function saveModels(models: ModelConfig[]): void {
  const dir = configDir()
  ensureDir(dir)
  fs.writeFileSync(modelsPath(dir), modelsToYaml(models), 'utf8')
  invalidate()
}

export function saveRoles(roles: RoleConfig[]): void {
  const dir = configDir()
  ensureDir(dir)
  fs.writeFileSync(rolesPath(dir), rolesToYaml(roles), 'utf8')
  invalidate()
}

/**
 * Replace roles.yaml with the built-in defaults. Models are left untouched so
 * user edits to API keys / base URLs survive a Reset.
 */
export function resetRoles(): ConfigBundle {
  const dir = configDir()
  ensureDir(dir)
  fs.writeFileSync(rolesPath(dir), DEFAULT_ROLES_YAML, 'utf8')
  invalidate()
  return loadConfig()
}

/**
 * Write roles.yaml from a raw string (used by the YAML editor). Returns either
 * the parsed bundle or an error message; never throws.
 */
export function writeRolesYaml(raw: string): { ok: true; bundle: ConfigBundle } | { ok: false; error: string } {
  try {
    // validate by attempting to parse
    rolesFromYaml(raw)
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) }
  }
  const dir = configDir()
  ensureDir(dir)
  fs.writeFileSync(rolesPath(dir), raw, 'utf8')
  invalidate()
  return { ok: true, bundle: loadConfig() }
}

export function readRolesYamlRaw(): string {
  const dir = configDir()
  if (!fs.existsSync(rolesPath(dir))) return DEFAULT_ROLES_YAML
  return fs.readFileSync(rolesPath(dir), 'utf8')
}

export function configDirPath(): string {
  return configDir()
}