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
