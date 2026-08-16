import { contextBridge, ipcRenderer } from 'electron'

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  testConnection: (url: string) => ipcRenderer.invoke('test-connection', url),
  selectTerminal: () => ipcRenderer.invoke('select-terminal'),
  launchTerminal: (payload: { terminalPath: string; command: string }) =>
    ipcRenderer.invoke('launch-terminal', payload)
})