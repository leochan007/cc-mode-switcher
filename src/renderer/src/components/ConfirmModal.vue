<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-title">{{ title }}</div>
        <div class="modal-message">{{ message }}</div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="$emit('cancel')">Cancel</button>
          <button :class="danger ? 'btn-danger-solid' : 'btn-primary'" ref="confirmBtn" @click="$emit('confirm')">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

withDefaults(
  defineProps<{
    title: string
    message: string
    confirmText?: string
    danger?: boolean
  }>(),
  { confirmText: 'Confirm', danger: false }
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const confirmBtn = ref<HTMLButtonElement | null>(null)

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  confirmBtn.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
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
  width: 360px;
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: #fafafa;
  margin-bottom: 8px;
}

.modal-message {
  font-size: 13px;
  color: #a1a1aa;
  line-height: 1.5;
  margin-bottom: 18px;
  word-break: break-all;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-danger-solid {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-danger-solid:hover { background: #dc2626; }
</style>
