/**
 * Preset list of Anthropic-compatible API providers for Claude Code.
 * Extend freely — just append a new entry, the form autocomplete picks it up.
 */
export interface ProviderPreset {
  /** short id, also used as a keyword for auto-match */
  id: string
  /** display name shown in suggestions */
  name: string
  /** Anthropic-compatible base URL */
  baseUrl: string
  /** lowercase keywords matched against the Display Name / Model ID inputs */
  keywords: string[]
  /** common model ids, shown as quick-fill chips */
  models: string[]
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'glm',
    name: 'GLM (Zhipu)',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    keywords: ['glm', 'bigmodel', 'zhipu', '智谱'],
    models: ['glm-5.3', 'glm-5.3-air', 'glm-4.6', 'glm-4.5']
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    keywords: ['minimax'],
    models: ['MiniMax-M3', 'MiniMax-M2.1', 'MiniMax-M2']
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/anthropic',
    keywords: ['deepseek', 'dsk'],
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/anthropic',
    keywords: ['kimi', 'moonshot'],
    models: ['kimi-k2-0905-preview', 'kimi-k2-turbo-preview', 'kimi-latest']
  },
  {
    id: 'zai',
    name: 'Z.ai (GLM global)',
    baseUrl: 'https://api.z.ai/api/anthropic',
    keywords: ['z.ai', 'zai'],
    models: ['glm-5.3', 'glm-5.2', 'glm-4.6']
  },
  {
    id: 'qwen',
    name: 'Qwen (DashScope)',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy',
    keywords: ['qwen', 'dashscope', 'tongyi', '通义'],
    models: ['qwen3-coder-plus', 'qwen3-max', 'qwen-max']
  }
]
