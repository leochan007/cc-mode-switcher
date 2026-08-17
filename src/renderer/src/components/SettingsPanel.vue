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

    <div class="card">
      <div class="card-title">{{ t('settings.about') }}</div>
      <div class="setting-row">
        <span class="setting-label">{{ t('settings.version') }}</span>
        <span class="version">v1.0.1</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'
import { useTerminal } from '../composables/useTerminal'

const { locale, t } = useI18n()
const { theme } = useTheme()
const { terminalPath, pickTerminal } = useTerminal()
</script>

<style scoped>
.setting-card { margin-bottom: 16px; }

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.setting-label { font-size: 13px; color: var(--text); }
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
