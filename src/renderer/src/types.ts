export interface ModelConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelID: string
}

export type Mode = 'plan' | 'work'
export type Tab = 'models' | 'switcher' | 'settings'

export interface CLIResult {
  success: boolean
  path?: string
  error?: string
}

/** Blank model template used by the add form */
export function emptyModel(): ModelConfig {
  return { id: '', name: '', baseUrl: '', apiKey: '', modelID: '' }
}
