<template>
  <div class="card form-card">
    <div class="card-title">{{ title }}</div>
    <div class="form-grid">
      <div class="form-group">
        <label>{{ t('form.displayName') }}</label>
        <input v-model="draft.name" :placeholder="t('form.displayNamePh')" />
      </div>

      <div class="form-group url-group">
        <label>{{ t('form.baseUrl') }}</label>
        <input
          v-model="draft.baseUrl"
          :placeholder="t('form.baseUrlPh')"
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
        <label>{{ t('form.apiKey') }}</label>
        <input v-model="draft.apiKey" type="password" :placeholder="t('form.apiKeyPh')" />
      </div>

      <div class="form-group">
        <label>{{ t('form.modelId') }}</label>
        <input v-model="draft.modelID" :placeholder="t('form.modelIdPh')" />
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
      <button class="btn-ghost" @click="$emit('cancel')">{{ t('form.cancel') }}</button>
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
import { useI18n } from '../composables/useI18n'

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

const { t } = useI18n()

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
    alert(t('form.validation'))
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
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
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
.suggest li + li { border-top: 1px solid var(--border); }
.suggest li:hover { background: var(--bg-hover); }
.p-name { font-size: 13px; color: var(--text); font-weight: 500; }
.p-url { font-size: 11px; color: var(--text-dim); font-family: monospace; }

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.chip {
  background: var(--bg-hover);
  border: 1px solid transparent;
  color: var(--text-muted);
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
}
.chip:hover { color: var(--text); border-color: var(--border-strong); }
.chip.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #93c5fd;
}
[data-theme='light'] .chip.active { color: #1d4ed8; }
</style>
