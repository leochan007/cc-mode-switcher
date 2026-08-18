// Renderer-side mirror of the data shapes used in main/src/config.ts.
// The main process is the source of truth; these are re-declared here to keep
// the renderer module self-contained.

export interface ModelConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelID: string
}

export interface RoleConfig {
  id: string
  label: string
  /** references ModelConfig.id; '' = unbound */
  model: string
  thinking: boolean
  /** absolute path of the prompt file */
  systemPrompt: string
  disallowedPlugins: string[]
  allowedTools: string[]
  disallowedTools: string[]
  /** accent color for the role, used by the table row + terminal tab header */
  color: string
}

export interface ConfigBundle {
  models: ModelConfig[]
  roles: RoleConfig[]
  configDir: string
}

export interface SessionMeta {
  id: string
  label: string
  cwd: string
  systemPrompt: string
  roleId: string
  ownerId: number
  titleHint: string
}

export type Tab = 'switcher' | 'models' | 'settings'

/** Blank model template used by the add form */
export function emptyModel(): ModelConfig {
  return { id: '', name: '', baseUrl: '', apiKey: '', modelID: '' }
}