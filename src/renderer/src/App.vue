<template>
  <div id="app">
    <AppHeader v-model="activeTab" />

    <main class="content">
      <!-- Switcher tab: workspace layout (left pane = roles, right pane = terminals) -->
      <div v-if="activeTab === 'switcher'" class="switcher-pane">
        <div class="workspace">
          <section class="left-pane">
            <RolesTable
              :roles="roles"
              :models="models"
              :selected-id="selectedRoleId"
              :view="view"
              @select="onSelectRole"
              @patch="onPatchRole"
              @reorder="onReorderRole"
              @edit="onEditRole"
              @delete="onDeleteRole"
              @change-view="view = $event"
              @add-role="onAddRole"
              @open-models="activeTab = 'models'"
            />

            <RoleDetailPanel
              v-if="view === 'table'"
              :role="selectedRole"
              :model="selectedModel"
              :cwd="cwd || '~'"
              @open-window="onOpenInExternalTerminal"
              @open-shell="onOpenShell"
            />

            <RolesYamlEditor
              v-else
              :initial="rolesYamlRaw"
              @saved="onYamlSaved"
            />
          </section>

          <section class="right-pane">
            <TerminalTabs
              :tabs="tabs"
              :active-tab-id="activeTabId"
              @focus="focusTab"
              @close="closeTab"
              @clone-tab="onCloneTab"
            />
          </section>
        </div>
      </div>

      <!-- Models tab: same UX as v1 (form + card list) -->
      <ModelsPanel v-else-if="activeTab === 'models'" />

      <!-- Settings tab: theme + language + reset roles -->
      <SettingsPanel v-else @reset-roles="onResetRoles" />
    </main>

    <!-- Modals (Switcher-only) -->
    <RoleEditModal
      v-if="editingRole && editingRoleId"
      :role="editingRole"
      :models="models"
      @close="editingRoleId = null"
      @save="onSaveRoleEdit"
    />

    <RolePickerModal
      v-if="pickerOpen"
      :roles="roles"
      :models="models"
      @select="onPickerSelect"
      @cancel="pickerOpen = false"
    />

    <ConfirmModal
      v-if="resetConfirm"
      :title="t('confirm.resetTitle')"
      :message="t('confirm.resetMessage')"
      :confirm-text="t('confirm.reset')"
      danger
      @confirm="doResetRoles"
      @cancel="resetConfirm = false"
    />

    <ConfirmModal
      v-if="deletingRole && deletingRoleFor"
      :title="t('confirm.deleteRoleTitle')"
      :message="t('confirm.deleteRoleMessage', { id: deletingRoleFor.id })"
      :confirm-text="t('confirm.delete')"
      danger
      @confirm="confirmDeleteRole"
      @cancel="deletingRole = null"
    />

    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { ModelConfig, RoleConfig, Tab } from './types'
import { useConfig } from './composables/useConfig'
import { useSessions } from './composables/useSessions'
import { useI18n } from './composables/useI18n'
import { useToast } from './composables/useToast'
import { buildLaunchScript, buildLaunchScripts, buildExternalSessionScript, LaunchScriptEntry } from './shared/launchCommand'

import AppHeader from './components/AppHeader.vue'
import RolesTable from './components/RolesTable.vue'
import RoleDetailPanel from './components/RoleDetailPanel.vue'
import RolesYamlEditor from './components/RolesYamlEditor.vue'
import TerminalTabs from './components/TerminalTabs.vue'
import RoleEditModal from './components/RoleEditModal.vue'
import RolePickerModal from './components/RolePickerModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import ToastHost from './components/ToastHost.vue'
import ModelsPanel from './components/ModelsPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { getDefaultCwd, setDefaultCwd } from './composables/useDefaultCwd'

const { t } = useI18n()
const toast = useToast()

const {
  models,
  roles,
  loaded,
  addRole,
  updateRole,
  removeRole,
  resetRoles,
  readRolesYaml,
  load
} = useConfig()

const sessions = useSessions()
const {
  tabs,
  activeTabId,
  focusTab,
  closeTab,
  openShellTab,
  openRoleTab,
  cloneTab
} = sessions

// ---------- Tab + local UI state ----------
const activeTab = ref<Tab>('switcher')
const view = ref<'table' | 'yaml'>('table')
const selectedRoleId = ref<string>('')
const editingRoleId = ref<string | null>(null)
const pickerOpen = ref(false)
const deletingRole = ref<string | null>(null)
const resetConfirm = ref(false)
const rolesYamlRaw = ref<string>('')

const selectedRole = computed<RoleConfig | null>(() => roles.value.find((r) => r.id === selectedRoleId.value) ?? null)
const selectedModel = computed<ModelConfig | null>(() => (selectedRole.value ? models.value.find((m) => m.id === selectedRole.value!.model) ?? null : null))
const editingRole = computed<RoleConfig | null>(() => roles.value.find((r) => r.id === editingRoleId.value) ?? null)
const deletingRoleFor = computed<RoleConfig | null>(() => roles.value.find((r) => r.id === deletingRole.value) ?? null)

// Auto-pick first role on load
watch(roles, (v) => {
  if (!selectedRoleId.value && v.length) selectedRoleId.value = v[0].id
  if (selectedRoleId.value && !v.some((r) => r.id === selectedRoleId.value)) {
    selectedRoleId.value = v[0]?.id ?? ''
  }
}, { immediate: true })

// ---------- CWD history (recent project paths) ----------
const CWD_HISTORY_KEY = 'cc_workspace_cwd_history'
const cwd = ref<string>('')
const cwdHistory = ref<string[]>(loadCwdHistory())
const homeDir = ref<string>('')

function loadCwdHistory(): string[] {
  try {
    const raw = localStorage.getItem(CWD_HISTORY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Safely quote a path for inclusion in a shell command (single-quote wrap) */
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/**
 * Build a bootstrap script that wires up cc-<id>() shell functions for
 * every bound role. systemPrompt is now inline content (no file I/O needed),
 * so this is just a straight projection.
 */
async function buildBoundEntries(): Promise<LaunchScriptEntry[]> {
  const bound = roles.value.filter((r) => r.model)
  const entries: LaunchScriptEntry[] = []
  for (const role of bound) {
    const model = models.value.find((m) => m.id === role.model)
    if (!model) continue
    entries.push({ role, model, systemPromptContent: role.systemPrompt ?? '' })
  }
  return entries
}

async function buildMultiRoleBootstrap(): Promise<string | null> {
  const entries = await buildBoundEntries()
  if (entries.length === 0) return null
  return buildLaunchScripts({ entries, description: 'cc-mode-switcher · all roles' })
}

function pushCwd(dir: string): void {
  if (!dir) return
  const next = [dir, ...cwdHistory.value.filter((d) => d !== dir)].slice(0, 10)
  cwdHistory.value = next
  try {
    localStorage.setItem(CWD_HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* best effort */
  }
  // Sync the menu's Open Recent submenu
  window.electronAPI.setRecentCwds(next).catch(() => undefined)
}

/**
 * Resolve a working directory for a new shell session.
 *
 * Per plans/004 §3.2 — 4-step decision:
 *   1. explicit arg (cmdline / current selection)        — unchanged
 *   2. defaultCwd (user explicitly set in Settings)      — NEW
 *   3. cwdHistory[0] (legacy: old users without an        — kept for compat
 *      explicit default; will not be reached on a fresh install)
 *   4. first-run prompt: native dialog with `purpose:'default'`;
 *      user picks → write defaultCwd; user cancels → write defaultCwd=homedir
 *      (so the dialog is never shown twice — once prompted, always set)
 */
async function resolveCwdForNewShell(explicit?: string): Promise<string> {
  if (explicit) return explicit

  const def = getDefaultCwd()
  if (def && def.length > 0) return def

  // Legacy: history-only path (no explicit default yet — old users)
  if (cwdHistory.value.length > 0) return cwdHistory.value[0]

  // First-run / never-set: trigger the dedicated dialog
  const picked = await window.electronAPI.selectDirectory({
    purpose: 'default',
    defaultCwd: ''
  })
  const resolved = picked ?? homeDir.value
  if (resolved) setDefaultCwd(resolved)
  return resolved
}

onMounted(async () => {
  await load()
  rolesYamlRaw.value = await readRolesYaml()
  homeDir.value = await window.electronAPI.homeDir()

  // Sync header display when SettingsPanel flips defaultCwd
  watch(getDefaultCwd, (v) => {
    if (v && v.length > 0) cwd.value = v
  }, { immediate: true })

  // Wire native menu commands
  window.electronAPI.onMenuCommand((cmd, payload) => {
    switch (cmd) {
      case 'menu:new-session-internal':
        onMenuNewShellInternal().catch(() => undefined)
        break
      case 'menu:new-session-external':
        onMenuNewShellExternal().catch(() => undefined)
        break
      case 'menu:new-session-with-role-internal':
        onMenuNewShellWithRoleInternal().catch(() => undefined)
        break
      case 'menu:new-session-with-role-external':
        onMenuNewShellWithRoleExternal().catch(() => undefined)
        break
      case 'menu:open-folder':
        onMenuOpenFolder().catch(() => undefined)
        break
      case 'menu:open-recent-path':
        if (typeof payload === 'string') {
          onMenuOpenRecentPath(payload)
        }
        break
    }
  })
})

// ---------- Handlers ----------
async function onAddRole(): Promise<void> {
  // Roles now require an explicit name (no more auto-generated `role-XXX`).
  // We use window.prompt() here for the simplest UX; a dedicated inline-input
  // modal can replace it later without touching the composable.
  const name = window.prompt(t('roleEdit.namePrompt'))?.trim()
  if (!name) return
  try {
    const role = await addRole(name)
    selectedRoleId.value = role.id
    toast.success(t('toast.roleAdded', { id: role.id }))
  } catch (err: any) {
    toast.error(err?.message ?? String(err))
  }
}

async function onPatchRole(id: string, patch: Partial<RoleConfig>): Promise<void> {
  await updateRole(id, patch)
}

async function onReorderRole(from: string, to: string, pos: 'before' | 'after'): Promise<void> {
  const arr = [...roles.value]
  const fromIdx = arr.findIndex((r) => r.id === from)
  if (fromIdx === -1 || from === to) return
  const [item] = arr.splice(fromIdx, 1)
  let insertAt = arr.findIndex((r) => r.id === to)
  if (insertAt === -1) {
    arr.push(item)
  } else {
    arr.splice(pos === 'after' ? insertAt + 1 : insertAt, 0, item)
  }
  // round-trip through main so YAML reflects the new order
  const bundle = await window.electronAPI.saveRoles(JSON.parse(JSON.stringify(arr)))
  roles.value = bundle.roles
}

function onEditRole(id: string): void {
  // defer to next tick so the click that triggered us finishes its patch
  // cycle before the modal mounts
  nextTick(() => {
    editingRoleId.value = id
  })
}

async function onSaveRoleEdit(id: string, patch: Partial<RoleConfig>): Promise<void> {
  await updateRole(id, patch)
  toast.success(t('toast.roleSaved'))
  editingRoleId.value = null
}

function onDeleteRole(id: string): void {
  // set on next tick so the click that emitted from the row finishes its
  // patch cycle before we mount the confirm modal — avoids Vue's
  // "Cannot read properties of null (reading 'nextSibling')" race
  nextTick(() => {
    deletingRole.value = id
  })
}
async function confirmDeleteRole(): Promise<void> {
  if (!deletingRole.value) return
  const id = deletingRole.value
  deletingRole.value = null
  // close any open edit modal pointing at the deleted role
  if (editingRoleId.value === id) editingRoleId.value = null
  await nextTick()
  await removeRole(id)
  toast.success(t('toast.roleDeleted'))
}

function onSelectRole(id: string): void {
  selectedRoleId.value = id
}

function onResetRoles(): void {
  resetConfirm.value = true
}
async function doResetRoles(): Promise<void> {
  resetConfirm.value = false
  await resetRoles()
  rolesYamlRaw.value = await readRolesYaml()
  toast.success(t('toast.roleReset'))
}

async function onYamlSaved(): Promise<void> {
  rolesYamlRaw.value = await readRolesYaml()
}

async function onStartSelected(): Promise<void> {
  const cwd = await resolveCwdForNewShell()
  if (!cwd) return
  await onOpenShell({ cwd })
}

async function onOpenShell(payload: { cwd: string; bootstrap?: string; color?: string }): Promise<void> {
  const tabId = await openShellTab({
    cwd: payload.cwd,
    bootstrap: payload.bootstrap,
    color: payload.color
  })
  if (!tabId) {
    toast.error(t('toast.tabOpenFail'))
    return
  }
  pushCwd(payload.cwd)
}

async function onLaunchRoleFromDetail(roleId: string): Promise<void> {
  const role = roles.value.find((r) => r.id === roleId)
  if (!role) {
    toast.error(t('toast.noRole'))
    return
  }
  if (!role.model) {
    toast.error(t('toast.noModel'))
    return
  }
  const cwd = await resolveCwdForNewShell()
  if (!cwd) return
  const tabId = await openRoleTab({ roleId, cwd })
  if (!tabId) {
    toast.error(t('toast.tabOpenFail'))
    return
  }
  pushCwd(cwd)
}

// ---------- Native menu handlers ----------
/** Open internal xterm in current cwd (no role) */
async function onMenuNewShellInternal(): Promise<void> {
  await onStartSelected()
}

/** Open external Terminal.app in current cwd (no role) */
async function onMenuNewShellExternal(): Promise<void> {
  const cwd = await resolveCwdForNewShell()
  if (!cwd) return
  await launchExternalPlainShell(cwd)
}

/** Internal terminal — pick a role, source its launch script */
async function onMenuNewShellWithRoleInternal(): Promise<void> {
  // If exactly one role is bound, just use it; otherwise prompt.
  const bound = roles.value.filter((r) => r.model)
  if (bound.length === 1) {
    await launchInternalWithRole(bound[0].id)
    return
  }
  if (bound.length === 0) {
    toast.info(t('toast.noBoundRole'))
    return
  }
  pickerOpen.value = true
}

/** External terminal — pick a role, run its launch script in Terminal.app */
async function onMenuNewShellWithRoleExternal(): Promise<void> {
  const bound = roles.value.filter((r) => r.model)
  if (bound.length === 1) {
    await launchExternalWithRole(bound[0].id)
    return
  }
  if (bound.length === 0) {
    toast.info(t('toast.noBoundRole'))
    return
  }
  pickerOpen.value = true
}

/** Folder picker → opens that dir in internal terminal (with multi-role bootstrap).
 *  Per plans/004 §3.5: dialog starts at defaultCwd if set, otherwise homedir. */
async function onMenuOpenFolder(): Promise<void> {
  const def = getDefaultCwd()
  const picked = await window.electronAPI.selectDirectory({
    purpose: 'oneoff',
    defaultCwd: def && def.length > 0 ? def : ''
  })
  if (!picked) return
  cwd.value = picked
  pushCwd(picked)
  const bootstrap = await buildMultiRoleBootstrap()
  await openShellTab({ cwd: picked, bootstrap: bootstrap ?? undefined })
}

/** Open a path from the Open Recent submenu (with multi-role bootstrap) */
async function onMenuOpenRecentPath(path: string): Promise<void> {
  if (!path) return
  cwd.value = path
  pushCwd(path)
  const bootstrap = await buildMultiRoleBootstrap()
  await openShellTab({ cwd: path, bootstrap: bootstrap ?? undefined })
}

/** Open an external Terminal.app plain shell at `cwd` (no role script) */
async function launchExternalPlainShell(cwd: string): Promise<void> {
  const command = `cd ${shellQuote(cwd)} && clear`
  const ok = await window.electronAPI.launchTerminal({
    terminalPath: localStorage.getItem('cc_terminal') ?? '',
    command
  })
  if (!ok.ok && ok.error !== 'cancelled') {
    toast.error(t('toast.launchFail', { error: ok.error ?? '' }))
  }
}

/** Run the role's launch script in external Terminal.app — single entry,
 *  matching internal `openRoleTab`'s behaviour: only this role's
 *  `cc-<role>()` function is defined in the external shell. */
async function launchExternalWithRole(roleId: string, terminalPath?: string): Promise<void> {
  const role = roles.value.find((r) => r.id === roleId)
  const model = role?.model ? models.value.find((m) => m.id === role.model) : null
  if (!role || !model) {
    toast.error(t('toast.noModel'))
    return
  }
  const cwd = await resolveCwdForNewShell()
  if (!cwd) return
  const script = buildExternalSessionScript({
    entries: [{ role, model, systemPromptContent: role.systemPrompt ?? '' }],
    cwd
  })
  const ok = await window.electronAPI.launchTerminal({
    terminalPath: terminalPath ?? localStorage.getItem('cc_terminal') ?? '',
    command: script
  })
  if (!ok.ok && ok.error !== 'cancelled') {
    toast.error(t('toast.launchFail', { error: ok.error ?? '' }))
  }
  pushCwd(cwd)
}

/** Open internal terminal and source the role's launch script */
async function launchInternalWithRole(roleId: string): Promise<void> {
  const role = roles.value.find((r) => r.id === roleId)
  if (!role) {
    toast.error(t('toast.noRole'))
    return
  }
  if (!role.model) {
    toast.error(t('toast.noModel'))
    return
  }
  const model = models.value.find((m) => m.id === role.model)
  if (!model) {
    toast.error(t('toast.noModel'))
    return
  }
  const cwd = await resolveCwdForNewShell()
  if (!cwd) return
  const script = buildLaunchScript({ role, model, systemPromptContent: role.systemPrompt ?? '' })
  const tabId = await openShellTab({ cwd, bootstrap: script, color: role.color })
  if (!tabId) {
    toast.error(t('toast.tabOpenFail'))
    return
  }
  pushCwd(cwd)
}

async function onCloneTab(tabId: string): Promise<void> {
  const id = await cloneTab(tabId)
  if (!id) toast.error(t('toast.tabOpenFail'))
}

async function onOpenInExternalTerminal(payload: { roleId: string; command: string }): Promise<void> {
  // `payload.command` is the panel's preview bootstrap — deliberately ignored:
  // the external window must run the full session script (cd + env + claude)
  // to behave like the internal terminal. Rebuild it via launchExternalWithRole.
  let final = localStorage.getItem('cc_terminal')
  if (!final) {
    const picked = await window.electronAPI.selectTerminal()
    if (!picked) return
    localStorage.setItem('cc_terminal', picked)
    final = picked
  }
  await launchExternalWithRole(payload.roleId, final)
}

// ---------- Cmd+T / Cmd+N handling ----------
function isTerminalFocus(): boolean {
  const ae = document.activeElement as HTMLElement | null
  if (!ae) return false
  return ae.classList?.contains('xterm') || ae.closest?.('.xterm') != null || ae.tagName === 'CANVAS'
}

function onKey(ev: KeyboardEvent): void {
  // Hard early-return: if focus is on any editable text element, hand the
  // event to the browser entirely. Cmd+A / Cmd+C / Cmd+V / Cmd+X must work
  // in inputs even if other handlers exist on window.
  const ae = document.activeElement as HTMLElement | null
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
    return
  }

  const isMac = navigator.platform.toLowerCase().includes('mac')
  const cmdT = isMac ? ev.metaKey && ev.key === 't' : ev.ctrlKey && ev.key === 't'
  const cmdN = isMac ? ev.metaKey && ev.key === 'n' : ev.ctrlKey && ev.key === 'n'
  const optT = isMac ? ev.altKey && ev.key === 't' : ev.altKey && ev.key === 't'

  if (!isTerminalFocus() && !optT) return

  if (cmdT) {
    ev.preventDefault()
    const active = tabs.value.find((tb) => tb.id === activeTabId.value)
    if (active) cloneTab(active.id)
  } else if (cmdN) {
    ev.preventDefault()
    pickerOpen.value = true
  } else if (optT) {
    ev.preventDefault()
    onStartSelected()
  }
}

function onPickerSelect(roleId: string): void {
  pickerOpen.value = false
  onLaunchRoleFromDetail(roleId)
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style>
html, body { height: 100%; }
body { margin: 0; }

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.switcher-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(360px, 0.8fr) 1fr;
  gap: 0;
  min-height: 0;
  overflow: hidden;
}

.left-pane {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  padding: 12px;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--bg);
}

.left-pane > :first-child {
  flex: 0 0 auto;
  max-height: 55%;
  min-height: 120px;
}

.left-pane > :last-child {
  flex: 1 1 auto;
  min-height: 160px;
}

.right-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg);
  overflow: hidden;
}
</style>