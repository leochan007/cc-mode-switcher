<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('cancel')" @keydown.esc="emit('cancel')">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-title">{{ t('picker.title') }}</div>
        <div class="modal-subtitle">{{ t('picker.subtitle') }}</div>

        <div v-if="roles.length === 0" class="empty">{{ t('picker.empty') }}</div>

        <div v-else class="list">
          <button
            v-for="r in roles"
            :key="r.id"
            class="picker-row"
            :disabled="!r.model"
            @click="onSelect(r.id)"
          >
            <span class="row-label">{{ r.label }}</span>
            <span class="row-id">({{ r.id }})</span>
            <span v-if="!r.model" class="row-warn">{{ t('picker.noModel') }}</span>
            <span v-else class="row-model">{{ modelName(r.model) }}</span>
          </button>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" @click="emit('cancel')">{{ t('picker.cancel') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ModelConfig, RoleConfig } from '../types'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{
  roles: RoleConfig[]
  models: ModelConfig[]
}>()

const emit = defineEmits<{
  (e: 'select', roleId: string): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

function modelName(id: string): string {
  return props.models.find((m) => m.id === id)?.name ?? '?'
}

function onSelect(id: string): void {
  emit('select', id)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-strong);
  margin-bottom: 4px;
}
.modal-subtitle {
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 14px;
}

.empty {
  text-align: center;
  padding: 24px;
  color: var(--text-dim);
  font-size: 13px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.picker-row:hover:not(:disabled) { border-color: #3b82f6; background: var(--bg-hover); }
.picker-row:disabled { opacity: 0.5; cursor: not-allowed; }

.row-label { font-weight: 500; color: var(--text-strong); }
.row-id { font-family: monospace; font-size: 11px; color: var(--text-dim); }
.row-warn { color: #fbbf24; font-size: 11px; margin-left: auto; }
.row-model { color: var(--text-muted); font-size: 12px; margin-left: auto; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>