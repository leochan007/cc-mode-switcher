<template>
  <div class="roles-card">
    <div class="roles-header">
      <input
        v-model="filter"
        class="filter"
        :placeholder="t('roles.filterPh')"
        type="text"
      />
      <div class="header-actions">
        <button class="add-btn" :title="t('roles.add')" @click="$emit('add-role')">➕</button>
        <div class="view-toggle">
          <button :class="{ active: view === 'table' }" @click="$emit('change-view', 'table')">
            {{ t('roles.table') }}
          </button>
          <button :class="{ active: view === 'yaml' }" @click="$emit('change-view', 'yaml')">
            YAML
          </button>
        </div>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="empty">
      {{ t('roles.empty') }}
    </div>

    <div v-else class="table-body">
      <div class="col-heads">
        <div class="grip head" />
        <div class="head color" />
        <div class="head id">{{ t('roles.colId') }}</div>
        <div class="head model">{{ t('roles.colModel') }}</div>
        <div class="head thinking">{{ t('roles.colThinking') }}</div>
        <div class="head actions">{{ t('roles.colOps') }}</div>
      </div>

      <div class="rows">
        <div
          v-for="r in filtered"
          :key="r.id"
          :class="['row', { active: selectedId === r.id, dragging: dragId === r.id, 'drag-over-before': overId === r.id && overPos === 'before', 'drag-over-after': overId === r.id && overPos === 'after' }]"
          :style="{ '--row-color': r.color }"
          draggable="true"
          @click="$emit('select', r.id)"
          @contextmenu.prevent="onContextMenu($event, r.id)"
          @dragstart="onDragStart($event, r.id)"
          @dragover.prevent="onDragOver($event, r.id)"
          @drop.prevent="onDrop(r.id)"
          @dragend="resetDrag"
        >
          <div class="grip" :title="t('roles.dragTip')">⠿</div>
          <div class="col color">
            <input
              type="color"
              :value="r.color"
              class="color-input"
              @input="patch(r.id, { color: ($event.target as HTMLInputElement).value })"
              @click.stop
            />
          </div>
          <div class="col id">
            <input
              v-model="r.id"
              class="cell-input mono"
              @change="onRoleIdChanged(r.id, ($event.target as HTMLInputElement).value)"
              @click.stop
            />
          </div>
          <div class="col model">
            <select v-model="r.model" @change="onModelChange(r.id, r.model)" @click.stop>
              <option value="">{{ t('roles.unbound') }}</option>
              <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
              <option value="__manage__">⚙️ {{ t('roles.manageModels') }}</option>
            </select>
          </div>
          <div class="col thinking">
            <label class="switch">
              <input
                type="checkbox"
                :checked="r.thinking"
                @change="patch(r.id, { thinking: ($event.target as HTMLInputElement).checked })"
                @click.stop
              />
              <span class="slider" />
            </label>
          </div>
          <div class="col actions">
            <button class="icon-btn" :title="t('roles.edit')" @click.stop="$emit('edit', r.id)">✏️</button>
            <button class="icon-btn danger" :title="t('roles.delete')" @click.stop="$emit('delete', r.id)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="contextMenu.open" class="ctx-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" @click.stop>
        <button class="danger" @click="emit('delete', contextMenu.roleId); closeContext()">{{ t('roles.delete') }}</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { ModelConfig, RoleConfig } from '../types'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{
  roles: RoleConfig[]
  models: ModelConfig[]
  selectedId: string
  view: 'table' | 'yaml'
  editing?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'patch', id: string, patch: Partial<RoleConfig>): void
  (e: 'reorder', from: string, to: string, pos: 'before' | 'after'): void
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'change-view', view: 'table' | 'yaml'): void
  (e: 'open-models'): void
  (e: 'add-role'): void
}>()

const { t } = useI18n()

const filter = ref('')

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return props.roles
  return props.roles.filter(
    (r) =>
      r.id.toLowerCase().includes(q) ||
      r.label.toLowerCase().includes(q) ||
      (props.models.find((m) => m.id === r.model)?.name ?? '').toLowerCase().includes(q)
  )
})

function patch(id: string, p: Partial<RoleConfig>): void {
  emit('patch', id, p)
}

function onRoleIdChanged(oldId: string, newId: string): void {
  if (oldId === newId) return
  emit('patch', oldId, { id: newId })
}

function onModelChange(id: string, value: string): void {
  if (value === '__manage__') {
    emit('open-models')
    return
  }
  emit('patch', id, { model: value })
}

// ----- drag & drop reordering -----
const dragId = ref<string | null>(null)
const overId = ref<string | null>(null)
const overPos = ref<'before' | 'after' | null>(null)

function onDragStart(ev: DragEvent, id: string): void {
  dragId.value = id
  ev.dataTransfer?.setData('text/plain', id)
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'
}

function onDragOver(ev: DragEvent, id: string): void {
  if (!dragId.value || dragId.value === id) return
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const before = ev.clientY < rect.top + rect.height / 2
  overId.value = id
  overPos.value = before ? 'before' : 'after'
}

function onDrop(id: string): void {
  if (!dragId.value || !overPos.value || dragId.value === id) {
    resetDrag()
    return
  }
  emit('reorder', dragId.value, id, overPos.value)
  resetDrag()
}

function resetDrag(): void {
  dragId.value = null
  overId.value = null
  overPos.value = null
}

// ----- right-click menu -----
interface CtxMenu { open: boolean; x: number; y: number; roleId: string }
const contextMenu = ref<CtxMenu>({ open: false, x: 0, y: 0, roleId: '' })
function onContextMenu(ev: MouseEvent, id: string): void {
  contextMenu.value = { open: true, x: ev.clientX, y: ev.clientY, roleId: id }
}
function closeContext(): void {
  contextMenu.value.open = false
}
function onDocClick(): void {
  if (contextMenu.value.open) closeContext()
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
.roles-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.roles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}

.filter {
  flex: 1;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
}
.filter:focus { border-color: #3b82f6; }

.header-actions { display: flex; align-items: center; gap: 8px; }

.add-btn {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 30px;
  height: 28px;
  font-size: 14px;
  cursor: pointer;
}
.add-btn:hover { color: var(--text); border-color: var(--border-strong); }

.view-toggle {
  display: inline-flex;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px;
}
.view-toggle button {
  background: transparent;
  color: var(--text-muted);
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.view-toggle button.active {
  background: #3b82f6;
  color: white;
  font-weight: 500;
}

.rows {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.table-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.col-heads {
  display: grid;
  grid-template-columns: 22px 28px 1.4fr 1.6fr 50px 90px;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
  font-size: 11px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.col-heads .head { padding: 4px 6px; }
.col-heads .grip.head { cursor: default; }
.col-heads .head.actions { text-align: right; }

.row {
  display: grid;
  grid-template-columns: 22px 28px 1.4fr 1.6fr 50px 90px;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  font-size: 13px;
}
.row:last-child { border-bottom: none; }
.row:hover { background: var(--bg-hover); }
.row.active {
  background: color-mix(in srgb, var(--row-color) 12%, transparent);
  box-shadow: inset 3px 0 0 var(--row-color);
}
.row.dragging { opacity: 0.4; }

/* drop indicators */
.row.drag-over-before::before,
.row.drag-over-after::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: #3b82f6;
  border-radius: 1px;
}
.row { position: relative; }
.row.drag-over-before::before { top: -1px; }
.row.drag-over-after::after { bottom: -1px; }

.grip {
  color: var(--text-faint);
  font-size: 14px;
  cursor: grab;
  user-select: none;
  text-align: center;
}
.grip:active { cursor: grabbing; }

.cell-input {
  width: 100%;
  background: transparent;
  color: var(--text);
  border: 1px solid transparent;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}
.cell-input:hover { border-color: var(--border); }
.cell-input:focus { border-color: #3b82f6; background: var(--bg); }
.cell-input.mono { font-family: monospace; }

.col select {
  width: 100%;
  background: transparent;
  color: var(--text);
  border: 1px solid transparent;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}
.col select:hover { border-color: var(--border); }
.col select:focus { border-color: #3b82f6; background: var(--bg); }

.col.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.icon-btn {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  width: 28px;
  height: 26px;
  font-size: 12px;
  cursor: pointer;
}
.icon-btn:hover { color: var(--text); border-color: var(--border-strong); }
.icon-btn.danger:hover { border-color: #ef4444; color: #ef4444; }

.color-input {
  width: 28px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.color-input::-webkit-color-swatch-wrapper { padding: 0; }
.color-input::-webkit-color-swatch { border: 0; border-radius: 3px; }

.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  transition: 0.2s;
}
.slider::before {
  content: '';
  position: absolute;
  height: 14px;
  width: 14px;
  left: 2px;
  top: 2px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: 0.2s;
}
.switch input:checked + .slider { background: #3b82f6; border-color: #3b82f6; }
.switch input:checked + .slider::before { transform: translateX(16px); background: white; }

.empty {
  padding: 40px;
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
}

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