/** Optional filter and pagination parameters for the log summary endpoint. */
export interface SummaryParams {
  from?: string
  to?: string
  event_type?: string
  path?: string
  limit?: number
  offset?: number
}
