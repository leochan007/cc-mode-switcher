// Mirror of the API exposed by src/preload/index.ts via contextBridge
export interface ConnectionTestResult {
  ok: boolean
  ms: number
  status?: number
  error?: string
}

export interface ElectronAPI {
  copyToClipboard: (text: string) => Promise<boolean>
  installCLI: () => Promise<{ success: boolean; path?: string; error?: string }>
  testConnection: (url: string) => Promise<ConnectionTestResult>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
