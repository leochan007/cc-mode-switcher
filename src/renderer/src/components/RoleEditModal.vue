<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="modal-title">⚙️ {{ t('roleEdit.title', { name: role?.id ?? '' }) }}</div>
          <button class="close-x" @click="emit('close')">×</button>
        </div>

        <div v-if="role" class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>{{ t('roleEdit.model') }}</label>
              <select v-model="draft.model">
                <option value="">{{ t('roles.unbound') }}</option>
                <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            <div class="form-group full">
              <label>
                <input type="checkbox" v-model="draft.thinking" />
                {{ t('roleEdit.thinking') }}
              </label>
            </div>
            <div class="form-group full">
              <label>{{ t('roleEdit.systemPrompt') }}</label>
              <textarea
                v-model="draft.systemPrompt"
                class="prompt-textarea"
                spellcheck="false"
                :placeholder="t('roleEdit.systemPromptPh')"
                rows="10"
              />
            </div>
            <div class="form-group">
              <label>{{ t('roleEdit.allowedTools') }}</label>
              <TagListInput v-model="draft.allowedTools" />
            </div>
            <div class="form-group">
              <label>{{ t('roleEdit.disallowedTools') }}</label>
              <TagListInput v-model="draft.disallowedTools" />
            </div>
            <div class="form-group full">
              <label>{{ t('roleEdit.disallowedPlugins') }}</label>
              <TagListInput v-model="draft.disallowedPlugins" />
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" @click="emit('close')">{{ t('roleEdit.cancel') }}</button>
          <button class="btn-success" :disabled="!dirty" @click="save">{{ t('roleEdit.save') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import type { ModelConfig, RoleConfig } from '../types'
import { useI18n } from '../composables/useI18n'
import TagListInput from './TagListInput.vue'

const props = defineProps<{
  role: RoleConfig | null
  models: ModelConfig[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', id: string, patch: Partial<RoleConfig>): void
}>()

const { t } = useI18n()

const draft = reactive<RoleConfig>({
  id: '',
  model: '',
  thinking: false,
  systemPrompt: '',
  disallowedPlugins: [],
  allowedTools: [],
  disallowedTools: [],
  color: '#3b82f6'
})

// declare dirty BEFORE the immediate watch (TDZ otherwise)
const dirty = ref(false)

watch(
  () => props.role,
  (r) => {
    if (!r) return
    draft.id = r.id
    draft.model = r.model
    draft.thinking = r.thinking
    draft.systemPrompt = r.systemPrompt
    draft.disallowedPlugins = [...r.disallowedPlugins]
    draft.allowedTools = [...r.allowedTools]
    draft.disallowedTools = [...r.disallowedTools]
    // initial sync — the second watch below will mark dirty on subsequent edits
    dirty.value = false
  },
  { immediate: true }
)

// re-set dirty on user input
watch(
  () => [
    draft.model,
    draft.thinking,
    draft.systemPrompt,
    draft.disallowedPlugins.join(','),
    draft.allowedTools.join(','),
    draft.disallowedTools.join(',')
  ],
  () => {
    if (!props.role) return
    dirty.value =
      props.role.model !== draft.model ||
      props.role.thinking !== draft.thinking ||
      props.role.systemPrompt !== draft.systemPrompt ||
      props.role.disallowedPlugins.join(',') !== draft.disallowedPlugins.join(',') ||
      props.role.allowedTools.join(',') !== draft.allowedTools.join(',') ||
      props.role.disallowedTools.join(',') !== draft.disallowedTools.join(',')
  }
)

function save(): void {
  if (!props.role) return
  emit('save', props.role.id, {
    model: draft.model,
    thinking: draft.thinking,
    systemPrompt: draft.systemPrompt,
    disallowedPlugins: [...draft.disallowedPlugins],
    allowedTools: [...draft.allowedTools],
    disallowedTools: [...draft.disallowedTools]
  })
  dirty.value = false
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  width: 540px;
  max-height: 85vh;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.modal-title { font-size: 16px; font-weight: 600; color: var(--text-strong); }

.close-x {
  background: transparent;
  color: var(--text-muted);
  border: none;
  font-size: 22px;
  cursor: pointer;
  padding: 0 6px;
}
.close-x:hover { color: var(--text); }

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
}
.modal-body .form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.modal-body .form-group { display: flex; flex-direction: column; gap: 4px; }
.modal-body .form-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.modal-body .form-group input[type='text'],
.modal-body .form-group input:not([type]),
.modal-body .form-group select {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}
.modal-body .form-group input:focus,
.modal-body .form-group select:focus { border-color: #3b82f6; }
.modal-body .form-group.full { grid-column: 1 / -1; }

.input-with-btn {
  display: flex;
  gap: 6px;
}
.input-with-btn input { flex: 1; }
.input-with-btn button { flex: 0 0 auto; padding: 4px 10px; }

.prompt-textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, monospace;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  min-height: 200px;
}
.prompt-textarea:focus { border-color: #3b82f6; }

.modal-actions {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>