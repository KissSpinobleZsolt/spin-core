import { apiService } from './apiService'

/** Single HTTP/API request log entry from ClickHouse api_logs. */
export interface LogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  path: string
  method: string
  status_code: number
  duration_ms: number
  message: string
}

/** Paginated list of HTTP log entries. */
export interface LogsPage {
  items: LogEntry[]
  total: number
}

/** Aggregated log summary row keyed by time bucket, path, and status code. */
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

/** Paginated list of hourly summary entries. */
export interface SummaryPage {
  items: SummaryEntry[]
  total: number
}

/** Detailed payload of a single chat completion log event. */
export interface ChatLogDetails {
  model: string
  messages: { role: string; content: string }[]
  response: string
  prompt_tokens: number
  eval_tokens: number
  duration_ms: number
}

/** Single chat completion log entry stored in ClickHouse. */
export interface ChatLogEntry {
  event_time: string
  owner: string
  event_type: string
  details: string
}

/** Paginated list of chat log entries. */
export interface ChatLogsPage {
  items: ChatLogEntry[]
  total: number
}

/** Aggregated chat activity summary keyed by time bucket and event type. */
export interface ChatSummaryEntry {
  bucket: string
  event_type: string
  event_count: number
  unique_users: number
}

/** Paginated list of chat summary entries. */
export interface ChatSummaryPage {
  items: ChatSummaryEntry[]
  total: number
}

/** Single user lifecycle log entry from ClickHouse user_logs. */
export interface UserLogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  message: string
  name: string
  details: string
}

/** Paginated list of user log entries. */
export interface UserLogsPage {
  items: UserLogEntry[]
  total: number
}

/** Optional filter and pagination parameters for the API/HTTP logs endpoint. */
export interface LogsParams {
  limit?: number
  offset?: number
  event_type?: string
  owner?: string
  from?: string
  to?: string
}

/** Optional filter and pagination parameters for the log summary endpoint. */
export interface SummaryParams {
  from?: string
  to?: string
  event_type?: string
  path?: string
  limit?: number
  offset?: number
}

/** Optional filter and pagination parameters for the chat logs endpoint. */
export interface ChatLogsParams {
  from?: string
  to?: string
  owner?: string
  limit?: number
  offset?: number
}

/** Single event log entry emitted by a module. */
export interface ModuleLogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  message: string
  name: string
  details: string
}

/** Paginated list of module log entries. */
export interface ModuleLogsPage {
  items: ModuleLogEntry[]
  total: number
}

/** Aggregated module activity summary keyed by time bucket and event type. */
export interface ModuleLogSummaryEntry {
  bucket: string
  event_type: string
  event_count: number
  unique_users: number
}

/** Paginated list of module log summary entries. */
export interface ModuleLogSummaryPage {
  items: ModuleLogSummaryEntry[]
  total: number
}

/** Optional filter and pagination parameters for module log events. */
export interface ModuleLogsParams {
  from?: string
  to?: string
  event_type?: string
  limit?: number
  offset?: number
}

/** Single event log entry emitted by a bot. */
export interface BotLogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  message: string
  name: string
  details: string
}

/** Paginated list of bot log entries. */
export interface BotLogsPage {
  items: BotLogEntry[]
  total: number
}

/** Aggregated bot activity summary keyed by time bucket and event type. */
export interface BotLogSummaryEntry {
  bucket: string
  event_type: string
  event_count: number
  unique_users: number
}

/** Paginated list of bot log summary entries. */
export interface BotLogSummaryPage {
  items: BotLogSummaryEntry[]
  total: number
}

/** Optional filter and pagination parameters for bot log events. */
export interface BotLogsParams {
  from?: string
  to?: string
  event_type?: string
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

/** Retrieve, summarise, and purge ClickHouse log records across HTTP, chat, and module scopes. */
export const logsService = {
  async getLogs(params: LogsParams = {}): Promise<LogsPage> {
    const qs = buildQs({
      limit: params.limit,
      offset: params.offset,
      event_type: params.event_type,
      owner: params.owner,
      from: params.from,
      to: params.to,
    })
    return apiService.get(`/logs${qs}`)
  },

  async getUserLogs(params: LogsParams = {}): Promise<UserLogsPage> {
    const qs = buildQs({
      limit: params.limit,
      offset: params.offset,
      event_type: params.event_type,
      owner: params.owner,
      from: params.from,
      to: params.to,
    })
    return apiService.get(`/logs/user${qs}`)
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
      owner: params.owner,
      limit: params.limit,
      offset: params.offset,
    })
    return apiService.get(`/chat/logs${qs}`)
  },

  async getChatSummary(params: { from?: string; to?: string } = {}): Promise<ChatSummaryPage> {
    const qs = buildQs({ from: params.from, to: params.to })
    return apiService.get(`/chat/logs/summary${qs}`)
  },

  async getModuleLogs(moduleId: string, params: ModuleLogsParams = {}): Promise<ModuleLogsPage> {
    const qs = buildQs({
      from: params.from,
      to: params.to,
      event_type: params.event_type,
      limit: params.limit,
      offset: params.offset,
    })
    return apiService.get(`/module-logs/${moduleId}${qs}`)
  },

  async getModuleLogsSummary(moduleId: string, params: { from?: string; to?: string } = {}): Promise<ModuleLogSummaryPage> {
    const qs = buildQs({ from: params.from, to: params.to })
    return apiService.get(`/module-logs/${moduleId}/summary${qs}`)
  },

  async getBotLogs(botId: string, params: BotLogsParams = {}): Promise<BotLogsPage> {
    const qs = buildQs({
      from: params.from,
      to: params.to,
      event_type: params.event_type,
      limit: params.limit,
      offset: params.offset,
    })
    return apiService.get(`/bot-logs/${botId}${qs}`)
  },

  async getBotLogsSummary(botId: string, params: { from?: string; to?: string } = {}): Promise<BotLogSummaryPage> {
    const qs = buildQs({ from: params.from, to: params.to })
    return apiService.get(`/bot-logs/${botId}/summary${qs}`)
  },

  async purgeExpiredLogs(): Promise<{ purged: string[]; errors: string[] }> {
    return apiService.post('/logs/purge')
  },
}
