<template>
  <TransitionGroup name="toast" tag="div" class="toast-host">
    <div v-for="to in toasts" :key="to.id" :class="['toast', to.type]" @click="dismiss(to.id)">
      {{ to.message }}
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
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  cursor: pointer;
  max-width: 420px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-strong);
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  word-break: break-all;
}
.toast.success { border-color: #22c55e; }
.toast.error { border-color: #ef4444; }
.toast.info { border-color: #3b82f6; }

/* enter / leave / move animations (slide down from center-top) */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.toast-move { transition: transform 0.25s ease; }
</style>
