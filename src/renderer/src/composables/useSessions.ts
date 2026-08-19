import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { SessionMeta } from '../types'
import { useConfig } from './useConfig'
import { buildLaunchScript, buildLaunchScripts, settingsJsonFor, LaunchScriptEntry } from '../shared/launchCommand'

// -----------------------------------------------------------------------------
// Tab state (renderer side). The actual pty lives in the main process; tabs
// are just renderer UI containers pointing at session ids.
// -----------------------------------------------------------------------------

export interface TabState {
  id: string // local UI id (e.g. tab1)
  sessionId: string | null
  title: string
  roleId: string
  /** Accent color from the role, defaults to a neutral grey when no role */
  color: string
  cwd: string
  isPlaceholder: boolean // created before the pty ack came back
  active?: boolean
}

const tabs = ref<TabState[]>([])
const activeTabId = ref<string>('')
const sessionMeta = ref<Record<string, SessionMeta>>({})

let dataUnsub: (() => void) | null = null
let exitUnsub: (() => void) | null = null
let localSeq = 0

function genTabId(): string {
  return `tab${++localSeq}`
}

/** Title formula: `{project}` (just the project cwd) */
function tabTitleFor(cwd: string): string {
  const project = cwd.split(/[/\\]/).filter(Boolean).pop() || '~'
  return project
}

/** Neutral accent when a tab has no role */
const NEUTRAL_COLOR = '#71717a'

export function useSessions() {
  const { roleById, modelById } = useConfig()

  // ----- attach global IPC listeners (once per session lifetime) -----
  onMounted(() => {
    if (!dataUnsub) {
      dataUnsub = window.electronAPI.onSessionData((p) => {
        // payload handled inside XtermTab component via direct subscription
        // (we just store metadata for tab restoration)
      })
    }
    if (!exitUnsub) {
      exitUnsub = window.electronAPI.onSessionExit((p) => {
        const tab = tabs.value.find((t) => t.sessionId === p.id)
        if (tab) {
          // mark as exited; UI can show a hint and offer restart
          tab.title = `${tab.title} (exited)`
        }
      })
    }
  })
  onBeforeUnmount(() => {
    dataUnsub?.()
    dataUnsub = null
    exitUnsub?.()
    exitUnsub = null
  })

  // ----- helpers -----
  function activeTab(): TabState | undefined {
    return tabs.value.find((t) => t.id === activeTabId.value)
  }

  function focusTab(id: string): void {
    activeTabId.value = id
  }

  function closeTab(id: string): void {
    const i = tabs.value.findIndex((t) => t.id === id)
    if (i === -1) return
    const t = tabs.value[i]
    if (t.sessionId) {
      window.electronAPI.killSession(t.sessionId).catch(() => undefined)
    }
    tabs.value.splice(i, 1)
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[Math.min(i, tabs.value.length - 1)]?.id ?? ''
    }
  }

  function killSession(sessionId: string): void {
    window.electronAPI.killSession(sessionId).catch(() => undefined)
  }

  /**
   * Open a plain shell tab in `cwd`. Optionally source a bootstrap script
   * after the shell starts — used by the launch panel's ▶️ button to inject
   * the role's env vars and define the `cc-<roleId>` shell function in
   * the new session, without auto-launching claude.
   */
  async function openShellTab(opts: {
    cwd?: string
    cols?: number
    rows?: number
    /** Launch script content to write to a temp file + source on shell start */
    bootstrap?: string
    /** Color to use for the tab accent (defaults to neutral) */
    color?: string
  }): Promise<string | null> {
    const cwd = opts.cwd || '~'
    const title = tabTitleFor(cwd)

    const tabId = genTabId()
    tabs.value.push({
      id: tabId,
      sessionId: null,
      title,
      roleId: '',
      color: opts.color ?? NEUTRAL_COLOR,
      cwd,
      isPlaceholder: true
    })
    activeTabId.value = tabId

    const result = await window.electronAPI.createSession({
      cwd,
      label: title,
      roleId: '',
      systemPrompt: '',
      cols: opts.cols,
      rows: opts.rows,
      command: opts.bootstrap
    })
    sessionMeta.value[result.id] = result.meta
    const tab = tabs.value.find((t) => t.id === tabId)
    if (tab) {
      tab.sessionId = result.id
      tab.isPlaceholder = false
    }
    return tabId
  }

  /**
   * Open a shell tab AND run the role's launch script in it (exec claude
   * with the role's model / tools / system prompt). Used by the detail
   * panel's "Launch with Claude" button.
   */
  async function openRoleTab(opts: { roleId: string; cwd?: string; cols?: number; rows?: number }): Promise<string | null> {
    const role = roleById(opts.roleId)
    if (!role) return null
    if (!role.model) return null
    const model = modelById(role.model)
    if (!model) return null

    const cwd = opts.cwd || '~'
    const title = tabTitleFor(cwd)

    // systemPrompt is inline content now — no file I/O needed.
    const promptContent = role.systemPrompt ?? ''

    const tabId = genTabId()
    tabs.value.push({
      id: tabId,
      sessionId: null,
      title,
      roleId: role.id,
      color: role.color,
      cwd,
      isPlaceholder: true
    })
    activeTabId.value = tabId

    const command = buildLaunchScript({ role, model, systemPromptContent: promptContent })
    const settingsJson = settingsJsonFor(model, role.thinking)
    const result = await window.electronAPI.createSession({
      cwd,
      command,
      label: title,
      roleId: role.id,
      systemPrompt: role.systemPrompt,
      cols: opts.cols,
      rows: opts.rows,
      settingsJson
    })
    sessionMeta.value[result.id] = result.meta
    const tab = tabs.value.find((t) => t.id === tabId)
    if (tab) {
      tab.sessionId = result.id
      tab.isPlaceholder = false
    }
    return tabId
  }

  /** Clone an existing tab — same role + cwd as the source. */
  async function cloneTab(id: string, opts?: { cols?: number; rows?: number }): Promise<string | null> {
    const src = tabs.value.find((t) => t.id === id)
    if (!src) return null
    if (src.roleId) {
      return openRoleTab({ roleId: src.roleId, cwd: src.cwd, cols: opts?.cols, rows: opts?.rows })
    }
    return openShellTab({ cwd: src.cwd, cols: opts?.cols, rows: opts?.rows })
  }

  /** Open a new tab based on the currently-focused tab (used by Cmd+N) */
  async function openNewTabFromActive(): Promise<string | null> {
    const src = activeTab()
    if (!src) return null
    return cloneTab(src.id)
  }

  const hasTabs = computed(() => tabs.value.length > 0)

  return {
    tabs,
    activeTabId,
    hasTabs,
    activeTab,
    focusTab,
    closeTab,
    killSession,
    openShellTab,
    openRoleTab,
    cloneTab,
    openNewTabFromActive
  }
}