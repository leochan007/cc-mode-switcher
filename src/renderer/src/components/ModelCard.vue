<template>
  <div class="model-card">
    <div class="body">
      <div class="model-name">{{ model.name }}</div>
      <div class="model-url">{{ model.baseUrl }}</div>
      <div class="model-tags">
        <span class="tag">{{ t('card.model') }}: {{ model.modelID }}</span>
      </div>
    </div>
    <div class="actions">
      <IconButton :icon="'✏️'" :tip="t('card.edit')" @confirm="$emit('edit')" />
      <IconButton :icon="'📋'" :tip="t('card.duplicate')" @confirm="$emit('copy')" />
      <IconButton
        :icon="testing ? '⏳' : '📡'"
        :tip="testing ? t('card.testing') : t('card.test')"
        :disabled="testing"
        @confirm="runTest"
      />
      <IconButton :icon="'🗑️'" :tip="t('card.delete')" variant="danger" @confirm="$emit('remove')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ModelConfig } from '../types'
import { useToast } from '../composables/useToast'
import { useI18n } from '../composables/useI18n'
import IconButton from './IconButton.vue'

const props = defineProps<{ model: ModelConfig }>()
const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'copy'): void
  (e: 'remove'): void
}>()

const toast = useToast()
const { t } = useI18n()

const testing = ref(false)

async function runTest(): Promise<void> {
  if (testing.value) return
  testing.value = true
  try {
    const r = await window.electronAPI.testConnection(
      props.model.baseUrl,
      props.model.apiKey,
      props.model.modelID
    )
    if (r.ok) {
      toast.success(t('toast.connected', { name: props.model.name, ms: r.ms, status: r.status ?? '' }))
    } else {
      // Build a more informative error message: prefer the actual POST error
      // (timeout / DNS / etc), then fall back to status codes from both probes.
      const bits: string[] = []
      if (r.postError) bits.push(`POST ${r.postError}`)
      else if (r.status) bits.push(`POST status ${r.status}`)
      if (r.fallbackStatus) bits.push(`GET /v1/models ${r.fallbackStatus}`)
      else if (r.fallbackStatus === 0) bits.push('GET failed')
      if (r.error && !bits.length) bits.push(r.error)
      toast.error(t('toast.unreachable', { name: props.model.name, error: bits.join(' · ') || 'unknown' }))
    }
  } catch {
    toast.error(t('toast.testFailed', { name: props.model.name }))
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.model-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
.body { flex: 1; min-width: 0; }
.model-name { font-weight: 600; font-size: 14px; color: var(--text-strong); margin-bottom: 2px; }
.model-url {
  font-size: 12px;
  color: var(--text-dim);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.model-tags { margin-top: 6px; }
.actions { display: flex; gap: 6px; align-items: center; }
</style>