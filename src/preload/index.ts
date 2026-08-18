import { contextBridge, ipcRenderer } from 'electron'

// -----------------------------------------------------------------------------
// Types — duplicated to keep preload self-contained (no shared TS imports).
// -----------------------------------------------------------------------------

export interface ConnectionTestResult {
  ok: boolean
  ms: number
  status?: number
  error?: string
}

export interface ModelConfigDTO {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelID: string
}

export interface RoleConfigDTO {
  id: string
  label: string
  model: string
  thinking: boolean
  systemPrompt: string
  disallowedPlugins: string[]
  allowedTools: string[]
  disallowedTools: string[]
  color: string
}

export interface ConfigBundleDTO {
  models: ModelConfigDTO[]
  roles: RoleConfigDTO[]
  configDir: string
}

export interface SessionMetaDTO {
  id: string
  label: string
  cwd: string
  systemPrompt: string
  roleId: string
  ownerId: number
  titleHint: string
}

export interface ElectronAPI {
  copyToClipboard: (text: string) => Promise<boolean>
  testConnection: (url: string) => Promise<ConnectionTestResult>
  selectTerminal: () => Promise<string | null>
  selectPromptFile: () => Promise<string | null>
  selectDirectory: () => Promise<string | null>
  readTextFile: (path: string) => Promise<string>
  launchTerminal: (payload: { terminalPath: string; command: string }) => Promise<{ ok: boolean; error?: string }>

  // Menu commands from the native menu
  setRecentCwds: (paths: string[]) => Promise<boolean>

  // Menu commands from the native menu
  onMenuCommand: (cb: (cmd: MenuCommand, payload?: unknown) => void) => () => void
}

export type MenuCommand =
  | 'menu:new-session-internal'
  | 'menu:new-session-external'
  | 'menu:new-session-with-role-internal'
  | 'menu:new-session-with-role-external'
  | 'menu:open-folder'
  | 'menu:open-recent-path'

export interface ElectronAPI {
  copyToClipboard: (text: string) => Promise<boolean>
  testConnection: (url: string) => Promise<ConnectionTestResult>
  selectTerminal: () => Promise<string | null>
  selectPromptFile: () => Promise<string | null>
  selectDirectory: () => Promise<string | null>
  readTextFile: (path: string) => Promise<string>
  launchTerminal: (payload: { terminalPath: string; command: string }) => Promise<{ ok: boolean; error?: string }>

  // Config
  loadConfig: () => Promise<ConfigBundleDTO>
  saveModels: (models: ModelConfigDTO[]) => Promise<ConfigBundleDTO>
  saveRoles: (roles: RoleConfigDTO[]) => Promise<ConfigBundleDTO>
  resetRoles: () => Promise<ConfigBundleDTO>
  readRolesYaml: () => Promise<string>
  writeRolesYaml: (raw: string) => Promise<{ ok: true; bundle: ConfigBundleDTO } | { ok: false; error: string }>
  configDir: () => Promise<string>

  // Sessions
  createSession: (payload: {
    cwd: string
    command?: string
    label: string
    roleId: string
    systemPrompt: string
    cols?: number
    rows?: number
    settingsJson?: string
  }) => Promise<{ id: string; meta: SessionMetaDTO }>
  writeSession: (id: string, data: string) => Promise<boolean>
  resizeSession: (id: string, cols: number, rows: number) => Promise<boolean>
  killSession: (id: string) => Promise<boolean>
  listSessions: () => Promise<SessionMetaDTO[]>
  replaySession: (id: string) => Promise<string | null>

  // Subscriptions (returns an unsubscribe fn)
  onSessionData: (cb: (payload: { id: string; data: string }) => void) => () => void
  onSessionExit: (cb: (payload: { id: string; exitCode: number; signal?: number }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// -----------------------------------------------------------------------------
// Exposed API
// -----------------------------------------------------------------------------

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  testConnection: (url: string) => ipcRenderer.invoke('test-connection', url),
  selectTerminal: () => ipcRenderer.invoke('select-terminal'),
  selectPromptFile: () => ipcRenderer.invoke('select-prompt-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readTextFile: (path) => ipcRenderer.invoke('read-text-file', path),
  launchTerminal: (payload) => ipcRenderer.invoke('launch-terminal', payload),

  onMenuCommand: (cb) => {
    const channels: MenuCommand[] = [
      'menu:new-session-internal',
      'menu:new-session-external',
      'menu:new-session-with-role-internal',
      'menu:new-session-with-role-external',
      'menu:open-folder',
      'menu:open-recent-path'
    ]
    const handler = (_: unknown, payload?: unknown) => {
      // Forward whichever channel the IPC event came in on
      cb(_.channel?.replace('ipc:', '') as MenuCommand, payload)
    }
    // Each IPC channel delivers a generic event with the channel name in sender
    // — instead we listen per-channel and call cb with the channel name.
    const listeners: Array<[string, (...args: unknown[]) => void]> = []
    for (const ch of channels) {
      const l = (_e: unknown, payload?: unknown) => cb(ch, payload)
      ipcRenderer.on(ch, l)
      listeners.push([ch, l])
    }
    return () => {
      for (const [ch, l] of listeners) ipcRenderer.removeListener(ch, l)
    }
  },
  setRecentCwds: (paths) => ipcRenderer.invoke('set-recent-cwds', paths),

  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveModels: (models) => ipcRenderer.invoke('config:save-models', models),
  saveRoles: (roles) => ipcRenderer.invoke('config:save-roles', roles),
  resetRoles: () => ipcRenderer.invoke('config:reset-roles'),
  readRolesYaml: () => ipcRenderer.invoke('config:read-roles-yaml'),
  writeRolesYaml: (raw) => ipcRenderer.invoke('config:write-roles-yaml', raw),
  configDir: () => ipcRenderer.invoke('config:dir'),

  createSession: (payload) => ipcRenderer.invoke('session:create', payload),
  writeSession: (id, data) => ipcRenderer.invoke('session:input', { id, data }),
  resizeSession: (id, cols, rows) => ipcRenderer.invoke('session:resize', { id, cols, rows }),
  killSession: (id) => ipcRenderer.invoke('session:kill', { id }),
  listSessions: () => ipcRenderer.invoke('session:list'),
  replaySession: (id) => ipcRenderer.invoke('session:replay', { id }),

  onSessionData: (cb) => {
    const listener = (_: unknown, payload: { id: string; data: string }) => cb(payload)
    ipcRenderer.on('session:data', listener)
    return () => ipcRenderer.removeListener('session:data', listener)
  },
  onSessionExit: (cb) => {
    const listener = (_: unknown, payload: { id: string; exitCode: number; signal?: number }) => cb(payload)
    ipcRenderer.on('session:exit', listener)
    return () => ipcRenderer.removeListener('session:exit', listener)
  }
})