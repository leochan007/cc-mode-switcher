<template>
  <div :class="['mode-card', mode, { active }]" @click="$emit('select')">
    <div class="emoji">{{ meta.emoji }}</div>
    <div class="title">{{ meta.title }}</div>
    <div class="desc">{{ meta.desc }}</div>
    <div v-if="model" class="badge">{{ model.name }} · {{ model.modelID }}</div>
    <div v-else class="warning">⚠️ No model bound</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Mode, ModelConfig } from '../types'

const props = defineProps<{
  mode: Mode
  active?: boolean
  model: ModelConfig | null
}>()

defineEmits<{ (e: 'select'): void }>()

const meta = computed(
  () =>
    ({
      plan: { emoji: '🧠', title: 'Plan Mode', desc: 'Architecture analysis / Design / Code review' },
      work: { emoji: '⚡', title: 'Work Mode', desc: 'Implementation / Debug / File operations' }
    })[props.mode]
)
</script>

<style scoped>
.mode-card {
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid #27272a;
  background: #18181b;
}
.mode-card:hover { border-color: #3f3f46; }
.mode-card.active.plan {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  border-color: #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}
.mode-card.active.work {
  background: linear-gradient(135deg, #3f1e5f 0%, #0f172a 100%);
  border-color: #a855f7;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
}
.emoji { font-size: 32px; margin-bottom: 10px; }
.title { font-weight: 700; font-size: 16px; margin-bottom: 4px; color: #fafafa; }
.desc { font-size: 12px; color: #a1a1aa; }
.badge {
  margin-top: 10px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  display: inline-block;
  color: #e4e4e7;
}
.warning { margin-top: 10px; font-size: 12px; color: #fbbf24; }
</style>
