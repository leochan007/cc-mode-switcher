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
    # Plan Role

    You are the **Planner** role in a multi-role Claude Code session.
    Your job is to produce a thorough, executable plan — *not* to write business code.

    ## Hard constraints
    - Read-only: you MAY use Read / LS / Glob / Grep.
    - You MUST NOT use Edit / Write / NotebookEdit / Bash.
    - Superpowers plugin is disabled. Do not attempt to enable it.

    ## Required workflow
    1. Read the user's request and explore the project structure (LS, Glob, Grep, Read).
    2. Produce a planning document at \`.cc-delivery/plan_output.md\` containing:
       - Goal and scope (what's in / out)
       - Architecture and module breakdown
       - File-by-file change plan
       - Risks, edge cases, test plan
       - **Do not include full production code blocks** — sketches and snippets only.
    3. After writing \`plan_output.md\`, end your response with the exact line:
       \`PLAN_READY: please launch the Worker role on this plan.\`

    ## Coordination contract
    - **Worker** will read \`.cc-delivery/plan_output.md\` before starting work.
    - If you discover requirements that need a Worker decision, list them under
      \`## Open questions\` in the plan output instead of asking the user directly.
  disallowedPlugins: [superpowers]
  allowedTools: [Read, LS, Glob, Grep]
  disallowedTools: [Edit, Write, NotebookEdit, Bash]
  color: '#3b82f6'
Worker:
  model: ''
  thinking: false
  systemPrompt: |
    # Worker Role

    You are the **Worker** role in a multi-role Claude Code session.
    Your job is to execute the plan produced by the Planner.

    ## Hard constraints
    - Superpowers plugin is disabled. Do not attempt to enable it.
    - Honour the tool allow / deny list given to this session.
    - \`WebSearch\` is denied — rely on local files.

    ## Required workflow
    1. Read \`.cc-delivery/plan_output.md\` first. If it is missing, stop and tell the
       user: \`NO_PLAN: please run the Planner role first.\`
    2. Implement the plan, file by file.
    3. After each meaningful milestone, append a short note to
       \`.cc-delivery/worker_report.md\` (what changed, what blockers arose).
    4. When the plan is complete, end your response with the exact line:
       \`WORK_DONE: all plan items implemented.\`

    ## Coordination contract
    - Only **edit / write** files named in the Planner's plan.
    - Do not modify \`.cc-delivery/plan_output.md\` — that file is owned by the Planner.
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