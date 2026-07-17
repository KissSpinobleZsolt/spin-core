import type { ProgressInfo } from './ProgressInfo.type'

/** Status and pull progress for a single Ollama model. */
export type ModelInfo = {
  model: string
  status: 'ready' | 'pending' | 'unknown' | 'pulling' | 'verifying' | 'writing' | 'error'
  size_bytes: number | null
  progress: ProgressInfo | null
}
