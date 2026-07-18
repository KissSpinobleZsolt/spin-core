import type { BotTeam } from './BotTeam.type'

/** Combined bot configuration — settings key-value map plus the team list. */
export interface BotConfig {
  config: Record<string, unknown>
  teams: BotTeam[]
}
