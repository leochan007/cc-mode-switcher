<template>
  <div class="terminal-area">
    <div v-if="!tabs.length" class="terminal-empty">
      <div class="empty-emoji">⌨️</div>
      <div class="empty-text">{{ t('terminal.emptyTitle') }}</div>
      <div class="empty-hint">{{ t('terminal.emptyHint') }}</div>
    </div>

    <template v-else>
      <div class="tabbar">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: tab.id === activeTabId }]"
          :style="{ '--tab-color': tab.color }"
          @click="focusTab(tab.id)"
          @contextmenu.prevent="onContext($event, tab.id)"
          @mousedown.middle="closeTab(tab.id)"
        >
          <span class="tab-dot" />
          <span class="tab-title">{{ tab.title }}</span>
          <button class="tab-close" :title="t('terminal.close')" @click.stop="closeTab(tab.id)">×</button>
        </div>
      </div>

      <div class="tabbar-divider" />

      <div class="tab-body">
        <XtermTab
          v-for="tab in tabs"
          v-show="tab.id === activeTabId"
          :key="tab.id"
          :session-id="tab.sessionId"
          :is-active="tab.id === activeTabId"
        />
      </div>
    </template>

    <Teleport to="body">
      <div v-if="ctxMenu.open" class="ctx-menu" :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }" @click.stop>
        <button @click="emit('clone-tab', ctxMenu.tabId); closeCtx()">{{ t('terminal.clone') }}</button>
        <button @click="emit('detach-tab', ctxMenu.tabId); closeCtx()">{{ t('terminal.detach') }}</button>
        <button class="danger" @click="closeTab(ctxMenu.tabId); closeCtx()">{{ t('terminal.close') }}</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { TabState } from '../composables/useSessions'
import { useI18n } from '../composables/useI18n'
import XtermTab from './XtermTab.vue'

const props = defineProps<{
  tabs: TabState[]
  activeTabId: string
}>()

const emit = defineEmits<{
  (e: 'focus', tabId: string): void
  (e: 'close', tabId: string): void
  (e: 'clone-tab', tabId: string): void
  (e: 'detach-tab', tabId: string): void
}>()

const { t } = useI18n()

function focusTab(id: string): void {
  emit('focus', id)
}
function closeTab(id: string): void {
  emit('close', id)
}

interface CtxMenu { open: boolean; x: number; y: number; tabId: string }
const ctxMenu = ref<CtxMenu>({ open: false, x: 0, y: 0, tabId: '' })
function onContext(ev: MouseEvent, id: string): void {
  ctxMenu.value = { open: true, x: ev.clientX, y: ev.clientY, tabId: id }
}
function closeCtx(): void {
  ctxMenu.value.open = false
}
function onDocClick(): void {
  if (ctxMenu.value.open) closeCtx()
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
.terminal-area {
  display: flex;
  flex-direction: column;
  background: var(--bg);
  height: 100%;
  min-height: 0;
}

.tabbar {
  display: flex;
  align-items: center;
  overflow-x: auto;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  scrollbar-width: thin;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-right: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  max-width: 280px;
}
.tab:hover { background: var(--bg-hover); }
.tab.active {
  background: var(--bg);
  color: var(--text-strong);
  border-bottom: 2px solid var(--tab-color, #3b82f6);
  margin-bottom: -1px;
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tab-color, #71717a);
  flex-shrink: 0;
}

.tab-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.tab-close {
  background: transparent;
  border: none;
  color: var(--text-faint);
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
}
.tab-close:hover { color: var(--text); background: var(--border); }

.tabbar-divider {
  height: 0;
}

.tab-body {
  flex: 1;
  position: relative;
  background: #09090b;
  min-height: 0;
}
.tab-body > * {
  position: absolute;
  inset: 0;
}

.terminal-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-dim);
}
.empty-emoji { font-size: 48px; opacity: 0.5; }
.empty-text { font-size: 14px; }
.empty-hint { font-size: 12px; color: var(--text-faint); }

.ctx-menu {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  z-index: 1500;
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.ctx-menu button {
  background: transparent;
  color: var(--text);
  border: none;
  padding: 8px 12px;
  text-align: left;
  font-size: 12px;
  cursor: pointer;
}
.ctx-menu button:hover { background: var(--bg-hover); }
.ctx-menu button.danger { color: #ef4444; }
</style>