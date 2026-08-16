<template>
  <header class="header">
    <div>
      <h1>🎯 CC Mode Switcher</h1>
      <p>Plan / Work Dual-mode environment switcher for Claude Code</p>
    </div>
    <nav class="tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="['tab', { active: modelValue === t.value }]"
        @click="$emit('update:modelValue', t.value)"
      >
        {{ t.label }}
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import type { Tab } from '../types'

defineProps<{ modelValue: Tab }>()
defineEmits<{ (e: 'update:modelValue', tab: Tab): void }>()

const tabs: { value: Tab; label: string }[] = [
  { value: 'models', label: 'Models' },
  { value: 'switcher', label: 'Switcher' }
]
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #27272a;
  -webkit-app-region: drag;
  flex-shrink: 0;
}
.header h1 { font-size: 18px; font-weight: 600; color: #fafafa; }
.header p { font-size: 12px; color: #71717a; margin-top: 2px; }

.tabs {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}
.tab {
  background: transparent;
  color: #a1a1aa;
  border: 1px solid transparent;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab.active {
  background: #27272a;
  color: #fafafa;
  border-color: #3f3f46;
  font-weight: 500;
}
</style>
