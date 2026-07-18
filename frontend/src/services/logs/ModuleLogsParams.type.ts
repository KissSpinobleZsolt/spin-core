/** Optional filter and pagination parameters for module log events. */
export interface ModuleLogsParams {
  from?: string
  to?: string
  event_type?: string
  limit?: number
  offset?: number
}
