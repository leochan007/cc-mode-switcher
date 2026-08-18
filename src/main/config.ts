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
  id: string
  label: string
  model: string // references ModelConfig.id; '' = unbound
  thinking: boolean
  systemPrompt: string // absolute path to the prompt file
  disallowedPlugins: string[]
  allowedTools: string[]
  disallowedTools: string[]
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
const PROMPTS_DIR = 'prompts'

function modelsPath(dir: string): string {
  return path.join(dir, MODELS_FILE)
}
function rolesPath(dir: string): string {
  return path.join(dir, ROLES_FILE)
}
function promptsDir(dir: string): string {
  return path.join(dir, PROMPTS_DIR)
}

// -----------------------------------------------------------------------------
// Built-in defaults — written on first run or after a Reset
// -----------------------------------------------------------------------------

const DEFAULT_ROLES_YAML = `Plan:
  label: 🧠 Plan
  model: ''
  thinking: true
  systemPrompt: ~/.cc-mode-switcher/prompts/Plan.md
  disallowedPlugins: [superpowers]
  allowedTools: [Read, LS, Glob, Grep]
  disallowedTools: [Edit, Write, NotebookEdit, Bash]
  color: '#3b82f6'
Worker:
  label: ⚙️ Worker
  model: ''
  thinking: false
  systemPrompt: ~/.cc-mode-switcher/prompts/Worker.md
  disallowedPlugins: [superpowers]
  allowedTools: []
  disallowedTools: [WebSearch]
  color: '#a855f7'
`

const PLAN_PROMPT_MD = `# Plan Role

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
`

const WORKER_PROMPT_MD = `# Worker Role

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
`

// -----------------------------------------------------------------------------
// YAML <-> typed object helpers
// -----------------------------------------------------------------------------

interface ModelsYaml {
  [id: string]: Omit<ModelConfig, 'id'>
}
interface RolesYaml {
  [id: string]: Omit<RoleConfig, 'id' | 'systemPrompt' | 'color'> & {
    systemPrompt?: string
    color?: string
  }
}

function defaultSystemPromptPath(roleId: string): string {
  return path.join(promptsDir(configDir()), `${roleId}.md`)
}

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
  return Object.entries(doc).map(([id, r]) => ({
    id,
    label: String(r.label ?? id),
    model: String(r.model ?? ''),
    thinking: Boolean(r.thinking),
    systemPrompt: expandHome(String(r.systemPrompt ?? defaultSystemPromptPath(id))),
    disallowedPlugins: Array.isArray(r.disallowedPlugins) ? r.disallowedPlugins.map(String) : [],
    allowedTools: Array.isArray(r.allowedTools) ? r.allowedTools.map(String) : [],
    disallowedTools: Array.isArray(r.disallowedTools) ? r.disallowedTools.map(String) : [],
    color: String(r.color ?? pickNextColor(doc))
  }))
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
      label: r.label,
      model: r.model,
      thinking: r.thinking,
      systemPrompt: r.systemPrompt,
      disallowedPlugins: r.disallowedPlugins,
      allowedTools: r.allowedTools,
      disallowedTools: r.disallowedTools,
      color: r.color
    }
  }
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

function writePromptIfMissing(filePath: string, content: string): void {
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

/** Write the built-in prompt templates; only creates files that don't exist */
function seedPrompts(dir: string): void {
  ensureDir(promptsDir(dir))
  writePromptIfMissing(path.join(promptsDir(dir), 'Plan.md'), PLAN_PROMPT_MD)
  writePromptIfMissing(path.join(promptsDir(dir), 'Worker.md'), WORKER_PROMPT_MD)
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
    seedPrompts(dir)
  }
  let roles: RoleConfig[] = []
  try {
    roles = rolesFromYaml(fs.readFileSync(rolesPath(dir), 'utf8'))
  } catch (err) {
    console.error('[config] roles.yaml unreadable, rebuilding defaults:', err)
    backupAndRebuild(rolesPath(dir), DEFAULT_ROLES_YAML)
    seedPrompts(dir)
    roles = rolesFromYaml(DEFAULT_ROLES_YAML)
  }

  // Migration: existing v2.0 users still have lowercase `plan` / `worker`
  // ids from the earlier default. Capitalize them in-place so the rest of
  // the app can rely on the canonical `Plan` / `Worker` names.
  const migrated = roles.map((r) => {
    if (r.id === 'plan') return { ...r, id: 'Plan', label: r.label || '🧠 Plan' }
    if (r.id === 'worker') return { ...r, id: 'Worker', label: r.label || '⚙️ Worker' }
    return r
  })
  if (migrated.some((r, i) => r.id !== roles[i].id)) {
    try {
      fs.writeFileSync(rolesPath(dir), rolesToYaml(migrated), 'utf8')
      roles = migrated
      console.log('[config] Migrated role ids plan→Plan, worker→Worker')
    } catch (err) {
      console.error('[config] role id migration write failed:', err)
    }
  }

  // Make sure the prompts directory exists even if the user supplied roles.yaml manually
  seedPrompts(dir)

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
 * Replace roles.yaml with the built-in defaults. Prompts and models are left
 * untouched so user edits survive a Reset.
 */
export function resetRoles(): ConfigBundle {
  const dir = configDir()
  ensureDir(dir)
  fs.writeFileSync(rolesPath(dir), DEFAULT_ROLES_YAML, 'utf8')
  seedPrompts(dir)
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