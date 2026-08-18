<template>
  <div class="yaml-card">
    <div class="yaml-header">
      <span class="yaml-label">roles.yaml</span>
      <span v-if="error" class="yaml-error">⚠️ {{ error }}</span>
      <div class="yaml-actions">
        <button class="btn-ghost compact" @click="reload">{{ t('yaml.reload') }}</button>
        <button class="btn-success compact" :disabled="!!error || dirty === false" @click="save">
          {{ t('yaml.save') }}
        </button>
      </div>
    </div>
    <textarea
      v-model="text"
      class="yaml-textarea"
      spellcheck="false"
      @input="onInput"
    />
    <div v-if="dirty" class="yaml-tip">{{ t('yaml.unsaved') }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import YAML from 'yaml'
import { useI18n } from '../composables/useI18n'
import { useToast } from '../composables/useToast'

const props = defineProps<{
  initial: string
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { t } = useI18n()
const toast = useToast()

const text = ref<string>(props.initial)
const original = ref<string>(props.initial)
const error = ref<string>('')
const dirty = ref<boolean>(false)

watch(() => props.initial, (v) => {
  // external change (e.g. Reset) — refresh
  if (v !== text.value) {
    text.value = v
    original.value = v
    dirty.value = false
    validate()
  }
})

function validate(): void {
  try {
    YAML.parse(text.value)
    error.value = ''
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    const lineMatch = msg.match(/at line (\d+)/i)
    error.value = lineMatch ? `${msg} (${t('yaml.line')} ${lineMatch[1]})` : msg
  }
}

function onInput(): void {
  dirty.value = text.value !== original.value
  validate()
}

async function reload(): Promise<void> {
  if (dirty.value) {
    const ok = window.confirm(t('yaml.confirmReload'))
    if (!ok) return
  }
  text.value = original.value
  dirty.value = false
  validate()
}

async function save(): Promise<void> {
  if (error.value) return
  const r = await window.electronAPI.writeRolesYaml(text.value)
  if (r.ok) {
    original.value = text.value
    dirty.value = false
    toast.success(t('yaml.saved'))
    emit('saved')
  } else {
    error.value = r.error ?? 'unknown error'
    toast.error(t('yaml.saveFail', { error: r.error ?? '' }))
  }
}

onMounted(() => {
  text.value = props.initial
  original.value = props.initial
  validate()
})
</script>

<style scoped>
.yaml-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.yaml-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}

.yaml-label {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.yaml-error {
  flex: 1;
  font-size: 11px;
  color: #ef4444;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.yaml-actions { display: flex; gap: 6px; }

button.compact { padding: 5px 10px; font-size: 12px; }

.yaml-textarea {
  flex: 1;
  background: var(--bg);
  color: var(--code-green);
  border: none;
  padding: 14px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  line-height: 1.7;
  outline: none;
  resize: none;
  white-space: pre;
  tab-size: 2;
}

.yaml-tip {
  padding: 6px 12px;
  font-size: 11px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.05);
  border-top: 1px solid var(--border);
}
</style>