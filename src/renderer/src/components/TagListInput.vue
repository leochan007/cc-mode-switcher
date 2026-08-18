<template>
  <div class="tag-input">
    <span v-for="(t, i) in modelValue" :key="t" class="chip">
      {{ t }}
      <button class="chip-x" @click="remove(i)" type="button">×</button>
    </span>
    <input
      v-model="text"
      :placeholder="placeholder"
      @keydown.enter.prevent="add"
      @keydown="onKey"
      @blur="add"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void
}>()

const text = ref('')

function commit(): void {
  const parts = text.value
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (!parts.length) return
  const next = [...props.modelValue]
  for (const p of parts) {
    if (!next.includes(p)) next.push(p)
  }
  emit('update:modelValue', next)
  text.value = ''
}

function add(): void {
  commit()
}

function remove(i: number): void {
  const next = [...props.modelValue]
  next.splice(i, 1)
  emit('update:modelValue', next)
}

function onKey(ev: KeyboardEvent): void {
  if (ev.key === ',' || ev.key === ' ') {
    ev.preventDefault()
    commit()
  } else if (ev.key === 'Backspace' && !text.value && props.modelValue.length) {
    remove(props.modelValue.length - 1)
  }
}
</script>

<style scoped>
.tag-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 6px;
  min-height: 32px;
}
.tag-input:focus-within { border-color: #3b82f6; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-hover);
  font-size: 11px;
  font-family: monospace;
  color: var(--text);
}
.chip-x {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}
.chip-x:hover { color: var(--text); }

input {
  flex: 1;
  min-width: 100px;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 12px;
  outline: none;
  padding: 2px;
}
</style>