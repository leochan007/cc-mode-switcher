import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  copyToClipboard: (text: string) => Promise<boolean>
  installCLI: () => Promise<{ success: boolean; path?: string; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  installCLI: () => ipcRenderer.invoke('install-cli')
})