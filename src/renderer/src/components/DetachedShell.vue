<template>
  <div class="detached-shell">
    <div class="detached-header">
      <span>{{ label || sessionId }}</span>
      <button class="btn-ghost" @click="onAttach">↩ {{ t('terminal.attach') }}</button>
    </div>
    <XtermTab :session-id="sessionId" :is-active="true" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../composables/useI18n'
import XtermTab from './XtermTab.vue'

const props = defineProps<{ sessionId: string | null; label: string; cwd: string }>()
const { t } = useI18n()

async function onAttach(): Promise<void> {
  if (!props.sessionId) return
  await window.electronAPI.attachSession(props.sessionId)
  // give the main window time to register attach; then close this detached window
  setTimeout(() => {
    window.close()
  }, 120)
}
</script>

<style scoped>
.detached-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.detached-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
  -webkit-app-region: drag;
}

.detached-header button {
  -webkit-app-region: no-drag;
}
</style>