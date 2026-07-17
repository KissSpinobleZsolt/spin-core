/** A single watchable entity (e.g. a stock symbol) tracked by a bot. */
export interface BotEntity {
  id: string
  team_id: string
  team_name: string
  symbol: string
  entity_type: string
  display_name: string
  exchange: string
  active: boolean
}

/** A named group of entities that share the same trading role within a bot. */
export interface BotTeam {
  id: string
  name: string
  description: string
  role: string | null
}

/** Combined bot configuration — settings key-value map plus the team list. */
export interface BotConfig {
  config: Record<string, unknown>
  teams: BotTeam[]
}

/** Live runtime state for a bot: scheduler slots, recent signals, and entity counts. */
export interface BotProcesses {
  roles: string[]
  signals_today: number
  last_signal: { at: string; title: string; severity: string } | null
  pending_alerts: number
  active_entities: number
  scheduler: Record<string, { next_run: string | null; trigger: string }>
}

/** Payload for adding a new entity to a bot's watchlist team. */
export interface EntityAddPayload {
  team_id: string
  symbol: string
  display_name?: string
  exchange?: string
}

/** Partial update fields allowed when patching an existing entity. */
export interface EntityPatchPayload {
  display_name?: string
  exchange?: string
  active?: boolean
}
