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

export interface LogsPage {
  items: LogEntry[]
  total: number
}

export interface SummaryEntry {
  bucket: string
  event_type: string
  path: string
  status_code: number
  request_count: number
  avg_duration_ms: number
  max_duration_ms: number
  error_count: number
}

export interface SummaryPage {
  items: SummaryEntry[]
  total: number
}

export interface ChatLogDetails {
  model: string
  messages: { role: string; content: string }[]
  response: string
  prompt_tokens: number
  eval_tokens: number
  duration_ms: number
}

export interface ChatLogEntry {
  event_time: string
  user_email: string
  event_type: string
  details: string        // JSON-encoded ChatLogDetails
}

export interface ChatLogsPage {
  items: ChatLogEntry[]
  total: number
}

export interface ChatSummaryEntry {
  bucket: string
  event_type: string
  event_count: number
  unique_users: number
}

export interface ChatSummaryPage {
  items: ChatSummaryEntry[]
  total: number
}

export interface LogsParams {
  limit?: number
  offset?: number
  event_type?: string
  user_email?: string
  from?: string
  to?: string
}

export interface SummaryParams {
  from?: string
  to?: string
  event_type?: string
  path?: string
  limit?: number
  offset?: number
}

export interface ChatLogsParams {
  from?: string
  to?: string
  user_email?: string
  limit?: number
  offset?: number
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? '?' + s : ''
}

export const logsService = {
  async getLogs(params: LogsParams = {}): Promise<LogsPage> {
    const qs = buildQs({
      limit: params.limit,
      offset: params.offset,
      event_type: params.event_type,
      user_email: params.user_email,
      from: params.from,
      to: params.to,
    })
    return apiService.get(`/logs${qs}`)
  },

  async getSummary(params: SummaryParams = {}): Promise<SummaryPage> {
    const qs = buildQs({
      from: params.from,
      to: params.to,
      event_type: params.event_type,
      path: params.path,
      limit: params.limit,
      offset: params.offset,
    })
    return apiService.get(`/logs/summary${qs}`)
  },

  async getChatLogs(params: ChatLogsParams = {}): Promise<ChatLogsPage> {
    const qs = buildQs({
      from: params.from,
      to: params.to,
      user_email: params.user_email,
      limit: params.limit,
      offset: params.offset,
    })
    return apiService.get(`/chat/logs${qs}`)
  },

  async getChatSummary(params: { from?: string; to?: string } = {}): Promise<ChatSummaryPage> {
    const qs = buildQs({ from: params.from, to: params.to })
    return apiService.get(`/chat/logs/summary${qs}`)
  },
}
