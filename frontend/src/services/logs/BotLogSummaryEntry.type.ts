/** Aggregated bot activity summary keyed by time bucket and event type. */
export interface BotLogSummaryEntry {
  bucket: string
  event_type: string
  event_count: number
  unique_users: number
}
