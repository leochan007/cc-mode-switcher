import { ref, computed, watch } from 'vue'
import type { ModelConfig } from '../types'

const STORAGE = {
  models: 'cc_models',
  planId: 'cc_plan_id',
  workId: 'cc_work_id',
  // legacy keys from the pre-refactor version (stored raw array indexes)
  legacyPlan: 'cc_plan',
  legacyWork: 'cc_work'
} as const

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function loadModels(): ModelConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE.models)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<ModelConfig>[]
    return parsed.map((m) => ({ ...m, id: m.id || genId() }) as ModelConfig)
  } catch {
    return []
  }
}

/** Resolve a binding: prefer the id key, fall back to legacy index storage */
function loadBinding(idKey: string, legacyKey: string, models: ModelConfig[]): string {
  const saved = localStorage.getItem(idKey)
  if (saved && models.some((m) => m.id === saved)) return saved

  const legacy = localStorage.getItem(legacyKey)
  if (legacy !== null && legacy !== '') {
    const idx = parseInt(legacy)
    if (!Number.isNaN(idx) && models[idx]) return models[idx].id
  }
  return ''
}

// Module-level singleton so every panel shares the same state
const models = ref<ModelConfig[]>(loadModels())
const planModelId = ref(loadBinding(STORAGE.planId, STORAGE.legacyPlan, models.value))
const workModelId = ref(loadBinding(STORAGE.workId, STORAGE.legacyWork, models.value))

// Clean up legacy keys once migrated
localStorage.removeItem(STORAGE.legacyPlan)
localStorage.removeItem(STORAGE.legacyWork)

watch(models, (v) => localStorage.setItem(STORAGE.models, JSON.stringify(v)), { deep: true })
watch(planModelId, (v) => localStorage.setItem(STORAGE.planId, v))
watch(workModelId, (v) => localStorage.setItem(STORAGE.workId, v))

export function useModels() {
  const planModel = computed(() => models.value.find((m) => m.id === planModelId.value) ?? null)
  const workModel = computed(() => models.value.find((m) => m.id === workModelId.value) ?? null)

  function addModel(m: ModelConfig): void {
    models.value.push({ ...m, id: m.id || genId() })
  }

  function updateModel(id: string, patch: ModelConfig): void {
    const i = models.value.findIndex((m) => m.id === id)
    if (i !== -1) models.value[i] = { ...patch, id }
  }

  function removeModel(id: string): void {
    models.value = models.value.filter((m) => m.id !== id)
    if (planModelId.value === id) planModelId.value = ''
    if (workModelId.value === id) workModelId.value = ''
  }

  /** Reorder by moving the item at `from` to `to` (drag & drop sorting) */
  function moveModel(from: number, to: number): void {
    if (from === to || from < 0 || to < 0 || from >= models.value.length || to >= models.value.length)
      return
    const [item] = models.value.splice(from, 1)
    models.value.splice(to, 0, item)
  }

  /**
   * Duplicate a model: identical config inserted right below the source,
   * named "X copy", or "X copy (1)", "X copy (2)"… when taken.
   */
  function duplicateModel(id: string): ModelConfig | null {
    const i = models.value.findIndex((m) => m.id === id)
    if (i === -1) return null
    const copy: ModelConfig = { ...models.value[i], id: genId(), name: uniqueCopyName(models.value[i].name) }
    models.value.splice(i + 1, 0, copy)
    return copy
  }

  function uniqueCopyName(source: string): string {
    // strip a previous "copy" suffix so duplicating a duplicate doesn't nest
    const base = source.replace(/\s*copy(\s*\(\d+\))?$/i, '').trim() || source
    const taken = (name: string) => models.value.some((m) => m.name === name)
    if (!taken(`${base} copy`)) return `${base} copy`
    let n = 1
    while (taken(`${base} copy (${n})`)) n++
    return `${base} copy (${n})`
  }

  return {
    models,
    planModelId,
    workModelId,
    planModel,
    workModel,
    addModel,
    updateModel,
    removeModel,
    moveModel,
    duplicateModel
  }
}
