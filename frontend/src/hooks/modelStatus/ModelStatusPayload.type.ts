import type { ModelInfo } from './ModelInfo.type'

/** Top-level Ollama status payload listing all required models and their readiness. */
export type ModelStatusPayload = {
  ollama: 'ok' | 'unreachable'
  all_ready: boolean
  models: ModelInfo[]
}
