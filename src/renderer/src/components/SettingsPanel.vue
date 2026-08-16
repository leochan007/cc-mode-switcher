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
      <div class="card-title">{{ t('settings.claudeOverrides') }}</div>
      <div class="setting-row">
        <span :class="['setting-label', { warn: overrideCount > 0 }]">
          {{
            overrideCount > 0
              ? t('settings.overrideFound', { count: overrideCount })
              : t('settings.overrideNone')
          }}
        </span>
        <button v-if="overrideCount > 0" class="btn-ghost" @click="cleanOverrides">
          {{ t('settings.clean') }}
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">{{ t('settings.about') }}</div>
      <div class="setting-row">
        <span class="setting-label">{{ t('settings.version') }}</span>
        <span class="version">v1.0.0</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'
import { useTerminal } from '../composables/useTerminal'
import { useToast } from '../composables/useToast'

const { locale, t } = useI18n()
const { theme } = useTheme()
const { terminalPath, pickTerminal } = useTerminal()
const toast = useToast()

// Claude Code settings.json env that would override terminal env
const overrideCount = ref(0)

async function refreshOverrides(): Promise<void> {
  const overrides = await window.electronAPI.getClaudeEnvOverrides()
  overrideCount.value = overrides.reduce((n, e) => n + e.keys.length, 0)
}

async function cleanOverrides(): Promise<void> {
  const r = await window.electronAPI.clearClaudeEnvOverrides()
  if (r.ok) {
    toast.success(t('switcher.overrideCleaned', { count: r.count ?? 0 }))
    await refreshOverrides()
  } else {
    toast.error(t('switcher.overrideCleanFail', { error: r.error ?? '' }))
  }
}

onMounted(refreshOverrides)
</script>

<style scoped>
.setting-card { margin-bottom: 16px; }

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.setting-label { font-size: 13px; color: var(--text); }
.setting-label.warn { color: #f59e0b; }
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
