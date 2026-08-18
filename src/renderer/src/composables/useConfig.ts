import { ref, computed, watch, toRaw } from 'vue'
import type { ModelConfig, RoleConfig, ConfigBundle } from '../types'

/**
 * Deep-clone a value so we can hand it to Electron's IPC.
 * Electron uses the structured clone algorithm which can't serialize Vue's
 * reactive Proxy objects — `toRaw` strips the proxy but the array itself
 * is still a Proxy, so we go JSON-roundtrip for safety.
 */
function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(toRaw(v)))
}

// -----------------------------------------------------------------------------
// Config state — single source of truth across renderer components.
// Backed by the main process YAML files; every mutation round-trips through IPC.
// -----------------------------------------------------------------------------

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const configDir = ref<string>('')
const models = ref<ModelConfig[]>([])
const roles = ref<RoleConfig[]>([])
const loaded = ref(false)

/**
 * Migrate v1 localStorage into the new world. Called once on first IPC load
 * when there are no models yet. The localStorage entries are NOT deleted —
 * they're left as a backup the user can inspect or wipe by hand.
 */
function loadLegacyModels(): ModelConfig[] {
  try {
    const raw = localStorage.getItem('cc_models')
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<ModelConfig>[]
    return parsed.map((m) => ({ ...m, id: m.id || genId() }) as ModelConfig)
  } catch {
    return []
  }
}

function loadLegacyRoleBinding(roleId: 'plan' | 'worker'): string {
  const idKey = roleId === 'plan' ? 'cc_plan_id' : 'cc_work_id'
  const legacyKey = roleId === 'plan' ? 'cc_plan' : 'cc_work'
  try {
    const all = loadLegacyModels()
    const saved = localStorage.getItem(idKey)
    if (saved && all.some((m) => m.id === saved)) return saved
    const legacy = localStorage.getItem(legacyKey)
    if (legacy !== null && legacy !== '') {
      const idx = parseInt(legacy)
      if (!Number.isNaN(idx) && all[idx]) return all[idx].id
    }
  } catch {
    /* fall through */
  }
  return ''
}

async function load(): Promise<void> {
  if (loaded.value) return
  const bundle = await window.electronAPI.loadConfig()
  configDir.value = bundle.configDir
  let m = bundle.models
  let r = bundle.roles

  // First-run migration from v1 localStorage
  if (m.length === 0) {
    const legacy = loadLegacyModels()
    if (legacy.length > 0) {
      m = legacy
      const planId = loadLegacyRoleBinding('plan')
      const workId = loadLegacyRoleBinding('worker')
      // Match the default planner/worker role regardless of id casing —
      // v2 defaults are 'Plan' / 'Worker', v1 was 'plan' / 'worker'.
      const plan = r.find((x) => x.id.toLowerCase() === 'plan')
      const worker = r.find((x) => x.id.toLowerCase() === 'worker')
      if (plan && planId) plan.model = planId
      if (worker && workId) worker.model = workId
      try {
        await window.electronAPI.saveModels(m)
        await window.electronAPI.saveRoles(r)
      } catch (err) {
        console.error('[useConfig] legacy migration save failed', err)
      }
    }
  }

  models.value = m
  roles.value = r
  loaded.value = true
}

// keep local refs in sync if any other window (e.g. detached) mutates the bundle
watch(loaded, async (v) => {
  if (!v) return
  // nothing — initial load is enough
})

export function useConfig() {
  const modelById = (id: string) => models.value.find((m) => m.id === id) ?? null
  const roleById = (id: string) => roles.value.find((r) => r.id === id) ?? null

  // ----- models -----
  async function addModel(m: ModelConfig): Promise<void> {
    const next: ModelConfig = { ...m, id: m.id || genId() }
    models.value = [...models.value, next]
    const bundle = await window.electronAPI.saveModels(plain(models.value))
    models.value = bundle.models
  }

  async function updateModel(id: string, patch: ModelConfig): Promise<void> {
    models.value = models.value.map((m) => (m.id === id ? { ...patch, id } : m))
    const bundle = await window.electronAPI.saveModels(plain(models.value))
    models.value = bundle.models
  }

  async function removeModel(id: string): Promise<void> {
    models.value = models.value.filter((m) => m.id !== id)
    // unbind any role that referenced this model
    const affected = roles.value.filter((r) => r.model === id).map((r) => ({ ...r, model: '' }))
    if (affected.length) {
      roles.value = roles.value.map((r) => affected.find((a) => a.id === r.id) ?? r)
      const bundle = await window.electronAPI.saveRoles(plain(roles.value))
      roles.value = bundle.roles
    }
    const bundle = await window.electronAPI.saveModels(plain(models.value))
    models.value = bundle.models
  }

  async function moveModel(from: number, to: number): Promise<void> {
    if (from === to || from < 0 || to < 0 || from >= models.value.length || to >= models.value.length) return
    const arr = [...models.value]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    models.value = arr
    const bundle = await window.electronAPI.saveModels(plain(models.value))
    models.value = bundle.models
  }

  async function duplicateModel(id: string): Promise<ModelConfig | null> {
    const i = models.value.findIndex((m) => m.id === id)
    if (i === -1) return null
    const src = models.value[i]
    const copy: ModelConfig = { ...src, id: genId(), name: uniqueCopyName(src.name) }
    const arr = [...models.value]
    arr.splice(i + 1, 0, copy)
    models.value = arr
    const bundle = await window.electronAPI.saveModels(plain(models.value))
    models.value = bundle.models
    return copy
  }

  function uniqueCopyName(source: string): string {
    const base = source.replace(/\s*copy(\s*\(\d+\))?$/i, '').trim() || source
    const taken = (name: string) => models.value.some((m) => m.name === name)
    if (!taken(`${base} copy`)) return `${base} copy`
    let n = 1
    while (taken(`${base} copy (${n})`)) n++
    return `${base} copy (${n})`
  }

  const ROLE_COLOR_PALETTE = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#84cc16', '#ec4899', '#14b8a6']

function nextRoleColor(existing: RoleConfig[]): string {
  const used = new Set(existing.map((r) => r.color))
  return ROLE_COLOR_PALETTE.find((c) => !used.has(c)) ?? ROLE_COLOR_PALETTE[0]
}

// ----- roles -----
  async function addRole(partial?: Partial<RoleConfig>): Promise<RoleConfig> {
    const id = partial?.id?.trim() || `role-${genId().slice(0, 8)}`
    const role: RoleConfig = {
      id,
      label: partial?.label ?? id,
      model: partial?.model ?? '',
      thinking: partial?.thinking ?? false,
      systemPrompt: partial?.systemPrompt ?? `~/.cc-mode-switcher/prompts/${id}.md`,
      disallowedPlugins: partial?.disallowedPlugins ?? ['superpowers'],
      allowedTools: partial?.allowedTools ?? [],
      disallowedTools: partial?.disallowedTools ?? [],
      color: partial?.color ?? nextRoleColor(roles.value)
    }
    roles.value = [...roles.value, role]
    const bundle = await window.electronAPI.saveRoles(plain(roles.value))
    roles.value = bundle.roles
    return role
  }

  async function updateRole(id: string, patch: Partial<RoleConfig>): Promise<void> {
    roles.value = roles.value.map((r) => (r.id === id ? { ...r, ...patch, id } : r))
    const bundle = await window.electronAPI.saveRoles(plain(roles.value))
    roles.value = bundle.roles
  }

  async function removeRole(id: string): Promise<void> {
    roles.value = roles.value.filter((r) => r.id !== id)
    const bundle = await window.electronAPI.saveRoles(plain(roles.value))
    roles.value = bundle.roles
  }

  async function resetRoles(): Promise<void> {
    const bundle = await window.electronAPI.resetRoles()
    roles.value = bundle.roles
  }

  async function moveRole(from: number, to: number): Promise<void> {
    if (from === to || from < 0 || to < 0 || from >= roles.value.length || to >= roles.value.length) return
    const arr = [...roles.value]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    roles.value = arr
    const bundle = await window.electronAPI.saveRoles(plain(roles.value))
    roles.value = bundle.roles
  }

  async function duplicateRole(id: string): Promise<RoleConfig | null> {
    const i = roles.value.findIndex((r) => r.id === id)
    if (i === -1) return null
    const src = roles.value[i]
    const copy: RoleConfig = {
      ...src,
      id: `${src.id}-copy`,
      label: `${src.label} copy`,
      systemPrompt: src.systemPrompt.replace(/\/([^/]+)\.md$/, `/$1-copy.md`),
      color: nextRoleColor([...roles.value])
    }
    const arr = [...roles.value]
    arr.splice(i + 1, 0, copy)
    roles.value = arr
    const bundle = await window.electronAPI.saveRoles(plain(roles.value))
    roles.value = bundle.roles
    return copy
  }

  // ----- yaml view -----
  async function readRolesYaml(): Promise<string> {
    return window.electronAPI.readRolesYaml()
  }

  async function writeRolesYaml(raw: string): Promise<{ ok: boolean; error?: string }> {
    const result = await window.electronAPI.writeRolesYaml(raw)
    if (result.ok) {
      roles.value = result.bundle.roles
      return { ok: true }
    }
    return { ok: false, error: result.error }
  }

  return {
    // state
    configDir,
    models,
    roles,
    loaded,
    // computed helpers
    modelById,
    roleById,
    // models
    addModel,
    updateModel,
    removeModel,
    moveModel,
    duplicateModel,
    // roles
    addRole,
    updateRole,
    removeRole,
    resetRoles,
    moveRole,
    duplicateRole,
    // yaml
    readRolesYaml,
    writeRolesYaml,
    // boot
    load
  }
}