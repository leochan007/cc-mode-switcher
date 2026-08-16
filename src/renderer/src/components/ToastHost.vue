<template>
  <TransitionGroup name="toast" tag="div" class="toast-host">
    <div v-for="t in toasts" :key="t.id" :class="['toast', t.type]" @click="dismiss(t.id)">
      {{ t.message }}
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: 60px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  cursor: pointer;
  max-width: 360px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: #fafafa;
  background: #18181b;
  border: 1px solid #3f3f46;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  word-break: break-all;
}
.toast.success { border-color: #22c55e; }
.toast.error { border-color: #ef4444; }
.toast.info { border-color: #3b82f6; }

/* enter / leave / move animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
.toast-move { transition: transform 0.25s ease; }
</style>
