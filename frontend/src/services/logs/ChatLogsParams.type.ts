/** Optional filter and pagination parameters for the chat logs endpoint. */
export interface ChatLogsParams {
  from?: string
  to?: string
  owner?: string
  limit?: number
  offset?: number
}
