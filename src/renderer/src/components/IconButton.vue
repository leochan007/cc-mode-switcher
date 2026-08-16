<template>
  <button :class="['icon-btn', variant]" :data-tip="tip" :disabled="disabled" @click="$emit('confirm')">
    {{ icon }}
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string
    tip: string
    variant?: 'default' | 'primary' | 'danger'
    disabled?: boolean
  }>(),
  { variant: 'default', disabled: false }
)

defineEmits<{ (e: 'confirm'): void }>()
</script>

<style scoped>
.icon-btn {
  position: relative;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #a1a1aa;
  border: 1px solid #27272a;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.icon-btn:hover { border-color: #3f3f46; color: #e4e4e7; }
.icon-btn:disabled { opacity: 0.5; cursor: default; }

.icon-btn.primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  font-size: 15px;
}
.icon-btn.primary:hover { background: #2563eb; }

.icon-btn.danger { border-color: transparent; }
.icon-btn.danger:hover { border-color: #ef4444; color: #ef4444; }

/* tooltip */
.icon-btn::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #27272a;
  color: #fafafa;
  border: 1px solid #3f3f46;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease 0.3s;
  z-index: 30;
}
.icon-btn:hover::after { opacity: 1; }
</style>
