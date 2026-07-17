import type { ModelPhase } from './ModelPhase.type'

/** Progress details for an active model pull, including speed and ETA. */
export type ProgressInfo = {
  phase: ModelPhase
  total_bytes: number
  completed_bytes: number
  percent: number
  speed_bps: number
  speed_str: string
  eta_str: string | null
}
