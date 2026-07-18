/** Optional filter and pagination parameters for the API/HTTP logs endpoint. */
export interface LogsParams {
  limit?: number
  offset?: number
  event_type?: string
  owner?: string
  from?: string
  to?: string
}
