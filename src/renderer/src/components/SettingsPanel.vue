<template>
  <section>
    <div class="section-header">
      <h2>{{ t('settings.title') }}</h2>
    </div>

    <div class="card setting-card">
      <div class="card-title">{{ t('settings.appearance') }}</div>
      <div class="setting-row">
        <span class="setting-label">{{ t('settings.theme') }}</span>
        <div class="segmented">
          <button :class="{ active: theme === 'dark' }" @click="theme = 'dark'">
            🌙 {{ t('settings.dark') }}
          </button>
          <button :class="{ active: theme === 'light' }" @click="theme = 'light'">
            ☀️ {{ t('settings.light') }}
          </button>
        </div>
      </div>
    </div>

    <div class="card setting-card">
      <div class="card-title">{{ t('settings.language') }}</div>
      <div class="setting-row">
        <span class="setting-label">{{ t('settings.language') }}</span>
        <div class="segmented">
          <button :class="{ active: locale === 'en' }" @click="locale = 'en'">
            {{ t('settings.langEn') }}
          </button>
          <button :class="{ active: locale === 'zh' }" @click="locale = 'zh'">
            {{ t('settings.langZh') }}
          </button>
        </div>
      </div>
    </div>

    <div class="card setting-card">
      <div class="card-title">{{ t('settings.terminal') }}</div>
      <div class="setting-row">
        <div class="terminal-info">
          <span class="setting-label">{{ t('settings.terminalHint') }}</span>
          <span class="terminal-path" :title="terminalPath || undefined">
            {{ terminalPath || t('settings.notSet') }}
          </span>
        </div>
        <button class="btn-ghost" @click="pickTerminal">{{ t('settings.choose') }}</button>
      </div>
    </div>

    <div class="card setting-card">
      <div class="card-title">{{ t('settings.roles') }}</div>
      <div class="setting-row">
        <div>
          <div class="setting-label">{{ t('settings.resetRoles') }}</div>
          <div class="setting-hint">{{ t('settings.resetTip') }}</div>
        </div>
        <button class="btn-ghost" @click="emit('reset-roles')">♻️ {{ t('settings.resetRoles') }}</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">{{ t('settings.about') }}</div>
      <div class="setting-row">
        <span class="setting-label">{{ t('settings.version') }}</span>
        <span class="version">v2.0.0</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'

const emit = defineEmits<{ (e: 'reset-roles'): void }>()

const { locale, t } = useI18n()
const { theme } = useTheme()

const TERMINAL_KEY = 'cc_terminal'
const terminalPath = ref<string>(localStorage.getItem(TERMINAL_KEY) ?? '')

watch(terminalPath, (v) => {
  try {
    localStorage.setItem(TERMINAL_KEY, v)
  } catch {
    /* best effort */
  }
})

async function pickTerminal(): Promise<void> {
  const picked = await window.electronAPI.selectTerminal()
  if (picked) terminalPath.value = picked
}
</script>

<style scoped>
.setting-card { margin-bottom: 16px; }
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.setting-label { font-size: 13px; color: var(--text); }
.setting-hint { font-size: 11px; color: var(--text-dim); margin-top: 4px; max-width: 360px; }
.version { font-size: 13px; color: var(--text-dim); font-family: monospace; }

.terminal-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.terminal-path {
  font-size: 12px;
  color: var(--text-dim);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 360px;
}
</style>