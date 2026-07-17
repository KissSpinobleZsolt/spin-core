import { apiService } from '../api'
import { buildQs } from './buildQs'
import type { LogsParams, LogsPage, SummaryParams, SummaryPage } from './api.types'
import type { ChatLogsParams, ChatLogsPage, ChatSummaryPage } from './chat.types'
import type { UserLogsPage } from './user.types'
import type { ModuleLogsParams, ModuleLogsPage, ModuleLogSummaryPage } from './module.types'
import type { BotLogsParams, BotLogsPage, BotLogSummaryPage } from './bot.types'

/** Retrieve, summarise, and purge ClickHouse log records across HTTP, chat, user, bot, and module scopes. */
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
