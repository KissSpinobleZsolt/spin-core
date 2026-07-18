import type { BotConfigSchemaField } from './BotConfigSchemaField.type'

/**
 * Declarative UI schema for a custom bot's configuration page.
 * Stored from the module manifest at bot-seeding time.
 *
 * - `principals`: which Principals component to render
 *   (`"watchlist"`, `"teams"`, `"risk_profiles"`, or absent/empty for none)
 * - `configurations`: fields shown in the Configurations section
 * - `scheduler`: fields shown in the Scheduler section
 */
export interface BotConfigSchema {
  principals?: 'watchlist' | 'teams' | 'risk_profiles'
  configurations?: BotConfigSchemaField[]
  scheduler?: BotConfigSchemaField[]
  risk_levels?: string[]
}
