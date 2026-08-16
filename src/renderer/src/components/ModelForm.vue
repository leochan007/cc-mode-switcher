<template>
  <div class="card form-card">
    <div class="card-title">{{ title }}</div>
    <div class="form-grid">
      <div class="form-group">
        <label>Display Name</label>
        <input v-model="draft.name" placeholder="e.g. GLM-5.2" />
      </div>

      <div class="form-group url-group">
        <label>Base URL</label>
        <input
          v-model="draft.baseUrl"
          placeholder="https://… (type or pick a preset)"
          @focus="urlFocused = true"
          @blur="urlFocused = false"
        />
        <ul v-if="urlFocused && suggestions.length" class="suggest">
          <li v-for="p in suggestions" :key="p.id" @mousedown.prevent="applyProvider(p)">
            <span class="p-name">{{ p.name }}</span>
            <span class="p-url">{{ p.baseUrl }}</span>
          </li>
        </ul>
      </div>

      <div class="form-group full">
        <label>API Key</label>
        <input v-model="draft.apiKey" type="password" placeholder="sk-..." />
      </div>

      <div class="form-group">
        <label>Model ID</label>
        <input v-model="draft.modelID" placeholder="glm-5.2" />
        <div v-if="matchedProvider" class="chips">
          <button
            v-for="mid in matchedProvider.models"
            :key="mid"
            type="button"
            :class="['chip', { active: draft.modelID === mid }]"
            @click="draft.modelID = mid"
          >
            {{ mid }}
          </button>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn-ghost" @click="$emit('cancel')">Cancel</button>
      <button class="btn-success" @click="submit">{{ submitText }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { emptyModel } from '../types'
import type { ModelConfig } from '../types'
import { PROVIDER_PRESETS } from '../data/providers'
import type { ProviderPreset } from '../data/providers'

const props = defineProps<{
  title: string
  submitText: string
  /** Model to prefill when editing; omitted for add */
  initial?: ModelConfig | null
}>()

const emit = defineEmits<{
  (e: 'save', model: ModelConfig): void
  (e: 'cancel'): void
}>()

// Local copy so editing never mutates the stored model before Save
const draft = ref<ModelConfig>({ ...(props.initial ?? emptyModel()) })

// ----- provider matching -----
/** Provider whose baseUrl is currently in the input (drives the model chips) */
const matchedProvider = computed(() =>
  PROVIDER_PRESETS.find((p) => p.baseUrl === draft.value.baseUrl.trim())
)

/** Auto-fill URL from Display Name / Model ID keywords while the URL box is empty */
watch(
  () => [draft.value.name, draft.value.modelID],
  ([name, mid]) => {
    if (draft.value.baseUrl.trim()) return
    const q = `${name} ${mid}`.toLowerCase()
    const hit = PROVIDER_PRESETS.find((p) => p.keywords.some((k) => q.includes(k)))
    if (hit) draft.value.baseUrl = hit.baseUrl
  }
)

// ----- URL autocomplete dropdown -----
const urlFocused = ref(false)

const suggestions = computed<ProviderPreset[]>(() => {
  const q = draft.value.baseUrl.trim().toLowerCase()
  if (!q) return PROVIDER_PRESETS
  return PROVIDER_PRESETS.filter((p) => {
    const hay = [p.name, p.baseUrl, ...p.keywords, ...p.models].join(' ').toLowerCase()
    return hay.includes(q)
  })
})

function applyProvider(p: ProviderPreset): void {
  draft.value.baseUrl = p.baseUrl
  urlFocused.value = false
}

// ----- submit -----
function submit(): void {
  const m = draft.value
  if (!m.name || !m.baseUrl || !m.apiKey) {
    alert('Please fill in Name, Base URL and API Key')
    return
  }
  emit('save', { ...m })
}
</script>

<style scoped>
.form-card { margin-bottom: 16px; }

.url-group { position: relative; }

.suggest {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  margin-top: 4px;
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}
.suggest li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  cursor: pointer;
}
.suggest li + li { border-top: 1px solid #27272a; }
.suggest li:hover { background: #27272a; }
.p-name { font-size: 13px; color: #e4e4e7; font-weight: 500; }
.p-url { font-size: 11px; color: #71717a; font-family: monospace; }

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.chip {
  background: #27272a;
  border: 1px solid transparent;
  color: #a1a1aa;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
}
.chip:hover { color: #e4e4e7; border-color: #3f3f46; }
.chip.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #93c5fd;
}
</style>
