<template>
  <div
    :class="['model-card', { dragging, 'drag-over-before': over === 'before', 'drag-over-after': over === 'after' }]"
    :draggable="draggable"
    @dragstart="$emit('drag-start', $event)"
    @dragover.prevent="$emit('drag-over', $event)"
    @drop.prevent="$emit('drop', $event)"
    @dragend="onDragEnd"
  >
    <div class="grip" title="Drag to reorder" @mousedown="draggable = true" @mouseup="draggable = false">
      ⠿
    </div>
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

const props = defineProps<{
  model: ModelConfig
  dragging?: boolean
  /** Where the drop indicator should show on this card */
  over?: 'before' | 'after' | null
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'copy'): void
  (e: 'remove'): void
  (e: 'drag-start', ev: DragEvent): void
  (e: 'drag-over', ev: DragEvent): void
  (e: 'drop', ev: DragEvent): void
  (e: 'drag-end'): void
}>()

const toast = useToast()
const { t } = useI18n()

// Dragging only starts from the grip handle, so text/buttons stay clickable
const draggable = ref(false)

function onDragEnd(): void {
  // mouseup never fires after a drag, so reset here too
  draggable.value = false
  emit('drag-end')
}

// ----- connection test -----
const testing = ref(false)

async function runTest(): Promise<void> {
  if (testing.value) return
  testing.value = true
  try {
    const r = await window.electronAPI.testConnection(props.model.baseUrl)
    if (r.ok) {
      toast.success(t('toast.connected', { name: props.model.name, ms: r.ms, status: r.status ?? '' }))
    } else {
      toast.error(t('toast.unreachable', { name: props.model.name, error: r.error ?? '' }))
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
.model-card.dragging { opacity: 0.4; }

/* drop indicators */
.model-card.drag-over-before::before,
.model-card.drag-over-after::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: #3b82f6;
  border-radius: 1px;
}
.model-card.drag-over-before::before { top: -6px; }
.model-card.drag-over-after::after { bottom: -6px; }

.grip {
  cursor: grab;
  color: var(--text-faint);
  font-size: 16px;
  user-select: none;
  padding: 4px 2px;
}
.grip:hover { color: var(--text-muted); }
.grip:active { cursor: grabbing; }

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
