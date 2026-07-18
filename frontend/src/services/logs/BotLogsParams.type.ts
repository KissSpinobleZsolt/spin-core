/** Optional filter and pagination parameters for bot log events. */
export interface BotLogsParams {
  from?: string
  to?: string
  event_type?: string
  limit?: number
  offset?: number
}
