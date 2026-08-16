// Mirror of the API exposed by src/preload/index.ts via contextBridge
export interface ConnectionTestResult {
  ok: boolean
  ms: number
  status?: number
  error?: string
}

export interface ElectronAPI {
  copyToClipboard: (text: string) => Promise<boolean>
  testConnection: (url: string) => Promise<ConnectionTestResult>
  selectTerminal: () => Promise<string | null>
  launchTerminal: (payload: { terminalPath: string; command: string }) => Promise<{ ok: boolean; error?: string }>
  getClaudeEnvOverrides: () => Promise<{ file: string; keys: string[] }[]>
  clearClaudeEnvOverrides: () => Promise<{ ok: boolean; count?: number; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
