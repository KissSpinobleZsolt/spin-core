import { apiService } from './apiService'

export interface LogEntry {
  event_time: string
  level: string
  event_type: string
  user_email: string
  path: string
  method: string
  status_code: number
  duration_ms: number
  details: string
}

export interface LogsParams {
  limit?: number
  offset?: number
  event_type?: string
  user_email?: string
}

export const logsService = {
  async getLogs(params: LogsParams = {}): Promise<LogEntry[]> {
    const query = new URLSearchParams()
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    if (params.offset !== undefined) query.set('offset', String(params.offset))
    if (params.event_type) query.set('event_type', params.event_type)
    if (params.user_email) query.set('user_email', params.user_email)
    const qs = query.toString()
    return apiService.get(`/logs${qs ? '?' + qs : ''}`)
  },
}
