<template>
  <header class="header">
    <div class="header-brand">
      <img class="brand-mark" :src="logoUrl" alt="CC Mode Switcher" />
      <div>
        <h1>{{ t('app.title') }}</h1>
        <p>{{ t('app.subtitle') }}</p>
      </div>
    </div>
    <div class="header-right">
      <nav class="tabs">
        <button
          v-for="tb in tabs"
          :key="tb.value"
          :class="['tab', { active: modelValue === tb.value }]"
          @click="$emit('update:modelValue', tb.value)"
        >
          <span class="tab-icon">{{ tb.icon }}</span>{{ t(tb.key) }}
        </button>
      </nav>
      <div class="quick-controls">
        <IconButton
          :icon="locale === 'en' ? 'EN' : '中'"
          :tip="locale === 'en' ? t('header.toZh') : t('header.toEn')"
          @confirm="toggleLocale"
        />
        <IconButton
          :icon="theme === 'dark' ? '🌙' : '☀️'"
          :tip="theme === 'dark' ? t('header.toLight') : t('header.toDark')"
          @confirm="toggleTheme"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { Tab } from '../types'
import { useI18n } from '../composables/useI18n'
import { useTheme } from '../composables/useTheme'
import IconButton from './IconButton.vue'
import logoUrl from '../assets/logo.png'

defineProps<{ modelValue: Tab }>()
defineEmits<{ (e: 'update:modelValue', tab: Tab): void }>()

const { locale, t, toggleLocale } = useI18n()
const { theme, toggleTheme } = useTheme()

const tabs: { value: Tab; key: string; icon: string }[] = [
  { value: 'switcher', key: 'tabs.switcher', icon: '🔄' },
  { value: 'models', key: 'tabs.models', icon: '🤖' },
  { value: 'settings', key: 'tabs.settings', icon: '⚙️' }
]
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
  flex-shrink: 0;
}
.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-mark {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 6px;
}
.header h1 { font-size: 18px; font-weight: 600; color: var(--text-strong); }
.header p { font-size: 12px; color: var(--text-dim); margin-top: 2px; }

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.tabs { display: flex; gap: 8px; }
.tab {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-icon {
  margin-right: 6px;
  font-size: 13px;
}
.tab.active {
  background: var(--bg-hover);
  color: var(--text-strong);
  border-color: var(--border-strong);
  font-weight: 500;
}

.quick-controls { display: flex; gap: 6px; }
</style>