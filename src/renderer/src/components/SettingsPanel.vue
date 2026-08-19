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
      <div class="card-title">{{ t('settings.defaultCwd.title') }}</div>
      <div class="setting-row">
        <div class="terminal-info">
          <span class="setting-label">{{ t('settings.defaultCwd.current') }}: <span class="default-cwd-path" :title="defaultCwdDisplay || undefined">{{ defaultCwdDisplay || '~' }}</span></span>
          <div class="setting-hint">{{ t('settings.defaultCwd.description') }}</div>
        </div>
        <div class="default-cwd-actions">
          <button class="btn-ghost" @click="changeDefaultCwd">{{ t('settings.defaultCwd.change') }}</button>
          <button class="btn-ghost" @click="resetDefaultCwd">{{ t('settings.defaultCwd.resetToHome') }}</button>
        </div>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'
import {
  getDefaultCwd,
  setDefaultCwd,
  resetDefaultCwdToHome
} from '../composables/useDefaultCwd'

const emit = defineEmits<{
  (e: 'reset-roles'): void
  (e: 'default-cwd-changed', path: string): void
}>()

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

// ---- Default Working Directory (plans/004 §3.4) ----
const homeDir = ref<string>('')
const defaultCwdRaw = ref<string | null>(getDefaultCwd())

const defaultCwdDisplay = computed<string>(() => {
  if (defaultCwdRaw.value && defaultCwdRaw.value.length > 0) return defaultCwdRaw.value
  return homeDir.value
})

watch(defaultCwdRaw, (v) => {
  emit('default-cwd-changed', v ?? '')
})

onMounted(async () => {
  homeDir.value = await window.electronAPI.homeDir()
})

async function changeDefaultCwd(): Promise<void> {
  const start = (defaultCwdRaw.value && defaultCwdRaw.value.length > 0)
    ? defaultCwdRaw.value
    : ''
  const picked = await window.electronAPI.selectDirectory({
    purpose: 'default',
    defaultCwd: start
  })
  if (!picked) return
  setDefaultCwd(picked)
  defaultCwdRaw.value = picked
}

function resetDefaultCwd(): void {
  if (!homeDir.value) return
  resetDefaultCwdToHome(homeDir.value)
  defaultCwdRaw.value = homeDir.value
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
.default-cwd-path {
  font-size: 12px;
  color: var(--text-dim);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 360px;
  display: inline-block;
  vertical-align: bottom;
}
.default-cwd-actions { display: flex; gap: 8px; flex-shrink: 0; }
</style>