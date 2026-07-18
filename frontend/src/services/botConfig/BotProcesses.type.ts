/** Live runtime state for a bot: scheduler slots, recent signals, and entity counts. */
export interface BotProcesses {
  roles: string[]
  signals_today: number
  last_signal: { at: string; title: string; severity: string } | null
  pending_alerts: number
  active_entities: number
  scheduler: Record<string, { next_run: string | null; trigger: string }>
}
