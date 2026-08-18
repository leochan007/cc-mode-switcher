<template>
  <div class="detail-card">
    <div class="detail-header">
      <div>
        <div class="detail-label">{{ t('detail.title') }}</div>
        <div class="detail-name">{{ role?.label || t('detail.noneSelected') }}</div>
      </div>
      <div class="detail-actions">
        <IconButton
          v-if="role"
          :icon="'▶️'"
          :tip="t('detail.openShell')"
          variant="primary"
          @confirm="emit('open-shell', { cwd, bootstrap: script, color: role.color })"
        />
        <IconButton :icon="'📋'" :tip="copied ? t('detail.copied') : t('detail.copy')" @confirm="copyCommand" />
        <IconButton :icon="'🪟'" :tip="t('detail.openWindow')" @confirm="openInWindow" />
      </div>
    </div>

    <pre
      v-if="role"
      ref="scriptEl"
      class="detail-script"
      spellcheck="false"
      @contextmenu.prevent="openScriptMenu"
      @dblclick="selectScriptText"
    >{{ script }}</pre>
    <div v-else class="empty">{{ t('detail.empty') }}</div>

    <Teleport to="body">
      <div
        v-if="scriptMenu.open"
        class="script-menu"
        :style="{ top: scriptMenu.y + 'px', left: scriptMenu.x + 'px' }"
        @click.stop="closeScriptMenu"
      >
        <button @click="copyAllScript">📋 {{ t('detail.menuCopyAll') }}</button>
        <button :disabled="!hasScriptSelection" @click="copyScriptSelection">
          ✂️ {{ t('detail.menuCopySelection') }}
        </button>
        <button @click="selectScriptText">{{ t('detail.menuSelectAll') }}</button>
      </div>
    </Teleport>

    <div v-if="role" class="detail-meta">
      <span class="meta-pill">
        {{ t('detail.model') }}: <strong>{{ model?.name ?? t('detail.unbound') }}</strong>
      </span>
      <span class="meta-pill">
        {{ t('detail.thinking') }}: <strong>{{ role.thinking ? t('detail.on') : t('detail.off') }}</strong>
      </span>
      <span class="meta-pill">
        {{ t('detail.allow') }}: <strong>{{ role.allowedTools.length || '—' }}</strong>
      </span>
      <span class="meta-pill">
        {{ t('detail.deny') }}: <strong>{{ role.disallowedTools.length || '—' }}</strong>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import type { ModelConfig, RoleConfig } from '../types'
import { buildLaunchScript } from '../shared/launchCommand'
import { copyText } from '../utils/clipboard'
import { useI18n } from '../composables/useI18n'
import { useToast } from '../composables/useToast'
import IconButton from './IconButton.vue'

const props = defineProps<{
  role: RoleConfig | null
  model: ModelConfig | null
  cwd: string
}>()

const emit = defineEmits<{
  (e: 'open-window', payload: { roleId: string; command: string }): void
  (e: 'open-shell', payload: { cwd: string; bootstrap?: string; color?: string }): void
}>()

const { t } = useI18n()
const toast = useToast()

const canStart = computed(() => !!props.role && !!props.model)

const scriptEl = ref<HTMLElement | null>(null)
const scriptMenu = reactive({ open: false, x: 0, y: 0 })
const hasScriptSelection = ref(false)

function updateSelectionState(): void {
  const sel = window.getSelection()?.toString() ?? ''
  hasScriptSelection.value = sel.length > 0 && sel !== script.value
}

function openScriptMenu(ev: MouseEvent): void {
  ev.preventDefault()
  scriptMenu.open = true
  scriptMenu.x = ev.clientX
  scriptMenu.y = ev.clientY
  updateSelectionState()
}

function closeScriptMenu(): void {
  scriptMenu.open = false
}

async function copyAllScript(): Promise<void> {
  await copyCommand()
  closeScriptMenu()
}

async function copyScriptSelection(): Promise<void> {
  const sel = window.getSelection()?.toString() ?? ''
  if (!sel) return
  const ok = await copyText(sel)
  if (ok) {
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
    closeScriptMenu()
    toast.success(t('toast.scriptCopied'))
  } else {
    toast.error(t('toast.copyFail'))
    closeScriptMenu()
  }
}

function selectScriptText(): void {
  const el = scriptEl.value
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
  hasScriptSelection.value = false
  closeScriptMenu()
}

onMounted(() => {
  // Click outside the menu closes it; selection-change keeps the menu's
  // "Copy selection" item in sync.
  document.addEventListener('mousedown', closeScriptMenu)
  document.addEventListener('selectionchange', updateSelectionState)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', closeScriptMenu)
  document.removeEventListener('selectionchange', updateSelectionState)
})

const script = ref<string>('')
watch(
  () => [props.role, props.model],
  async () => {
    // Snapshot the props at watch-fire time so the async IPC read can't race
    // with the user clearing the model binding mid-await.
    const role = props.role
    const model = props.model
    if (!role || !model) {
      script.value = ''
      return
    }
    // Read the system prompt file via IPC so we can inline its content
    // into the launch script (claude CLI doesn't support --system-prompt-file).
    const prompt = role.systemPrompt
      ? await window.electronAPI.readTextFile(role.systemPrompt)
      : ''
    script.value = buildLaunchScript({
      role,
      model,
      systemPromptContent: prompt
    })
  },
  { immediate: true }
)

const copied = ref(false)

async function copyCommand(): Promise<void> {
  if (!script.value) return
  const ok = await copyText(script.value)
  if (ok) {
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
    toast.success(t('toast.scriptCopied'))
  } else {
    toast.error(t('toast.copyFail'))
  }
}

function openInWindow(): void {
  if (!props.role || !props.model) return
  emit('open-window', { roleId: props.role.id, command: script.value })
}
</script>

<style scoped>
.detail-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.detail-label {
  font-size: 11px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.detail-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-strong);
}
.detail-actions { display: flex; gap: 6px; }

.detail-script {
  flex: 1;
  min-height: 140px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--code-green);
  padding: 10px;
  border-radius: 6px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  line-height: 1.6;
  outline: none;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: auto;
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
}
.detail-script::selection {
  background: rgba(59, 130, 246, 0.4);
}

.script-menu {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  z-index: 2500;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: 4px;
}
.script-menu button {
  background: transparent;
  color: var(--text);
  border: none;
  padding: 6px 10px;
  text-align: left;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
}
.script-menu button:hover:not(:disabled) {
  background: var(--bg-hover);
}
.script-menu button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty {
  text-align: center;
  padding: 24px;
  color: var(--text-dim);
  font-size: 13px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.meta-pill {
  font-size: 11px;
  background: var(--bg-hover);
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--text-muted);
}
.meta-pill strong { color: var(--text); margin-left: 2px; }
</style>