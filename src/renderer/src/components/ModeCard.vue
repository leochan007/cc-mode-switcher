<template>
  <div :class="['mode-card', mode, { active }]" @click="$emit('select')">
    <div class="emoji">{{ meta.emoji }}</div>
    <div class="title">{{ t(`switcher.${mode}Title`) }}</div>
    <div class="desc">{{ t(`switcher.${mode}Desc`) }}</div>
    <div v-if="model" class="badge">{{ model.name }} · {{ model.modelID }}</div>
    <div v-else class="warning">{{ t('switcher.noModel') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Mode, ModelConfig } from '../types'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{
  mode: Mode
  active?: boolean
  model: ModelConfig | null
}>()

defineEmits<{ (e: 'select'): void }>()

const { t } = useI18n()

const meta = computed(
  () =>
    ({
      plan: { emoji: '🧠' },
      work: { emoji: '⚡' }
    })[props.mode]
)
</script>

<style scoped>
.mode-card {
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid var(--border);
  background: var(--bg-card);
}
.mode-card:hover { border-color: var(--border-strong); }
.mode-card.active.plan {
  background: var(--plan-grad);
  border-color: #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}
.mode-card.active.work {
  background: var(--work-grad);
  border-color: #a855f7;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
}
.emoji { font-size: 32px; margin-bottom: 10px; }
.title { font-weight: 700; font-size: 16px; margin-bottom: 4px; color: var(--text-strong); }
.desc { font-size: 12px; color: var(--text-muted); }
.badge {
  margin-top: 10px;
  font-size: 12px;
  background: var(--badge-bg);
  padding: 4px 10px;
  border-radius: 6px;
  display: inline-block;
  color: var(--badge-text);
}
.warning { margin-top: 10px; font-size: 12px; color: #fbbf24; }
</style>
