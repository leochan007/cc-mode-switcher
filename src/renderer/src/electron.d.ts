// Mirror of the API exposed by src/preload/index.ts via contextBridge

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

  setRecentCwds: (paths: string[]) => Promise<boolean>

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

  loadConfig: () => Promise<ConfigBundleDTO>
  saveModels: (models: ModelConfigDTO[]) => Promise<ConfigBundleDTO>
  saveRoles: (roles: RoleConfigDTO[]) => Promise<ConfigBundleDTO>
  resetRoles: () => Promise<ConfigBundleDTO>
  readRolesYaml: () => Promise<string>
  writeRolesYaml: (raw: string) => Promise<{ ok: true; bundle: ConfigBundleDTO } | { ok: false; error: string }>
  configDir: () => Promise<string>

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

  onSessionData: (cb: (payload: { id: string; data: string }) => void) => () => void
  onSessionExit: (cb: (payload: { id: string; exitCode: number; signal?: number }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}