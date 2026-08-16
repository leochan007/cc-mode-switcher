export interface ModelConfig {
  name: string
  baseUrl: string
  apiKey: string
  planModel: string
  workModel: string
}

export type Mode = 'plan' | 'work'

export interface CLIResult {
  success: boolean
  path?: string
  error?: string
}