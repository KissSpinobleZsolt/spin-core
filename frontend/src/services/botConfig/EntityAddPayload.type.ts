/** Payload for adding a new entity to a bot's watchlist team. */
export interface EntityAddPayload {
  team_id: string
  symbol: string
  display_name?: string
  exchange?: string
}
