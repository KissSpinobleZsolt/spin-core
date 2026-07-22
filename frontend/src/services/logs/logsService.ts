import { apiService } from '../api'
import { buildQs } from './buildQs'
import { LOGS, CHAT_LOGS, MODULE_LOGS, BOT_LOGS } from './logs.constant'
import type { LogsParams } from './LogsParams.type'
import type { LogsPage } from './LogsPage.type'
import type { SummaryParams } from './SummaryParams.type'
import type { SummaryPage } from './SummaryPage.type'
import type { ChatLogsParams } from './ChatLogsParams.type'
import type { ChatLogsPage } from './ChatLogsPage.type'
import type { ChatSummaryPage } from './ChatSummaryPage.type'
import type { UserLogsPage } from './UserLogsPage.type'
import type { ModuleLogsParams } from './ModuleLogsParams.type'
import type { ModuleLogsPage } from './ModuleLogsPage.type'
import type { ModuleLogSummaryPage } from './ModuleLogSummaryPage.type'
import type { BotLogsParams } from './BotLogsParams.type'
import type { BotLogsPage } from './BotLogsPage.type'
import type { BotLogSummaryPage } from './BotLogSummaryPage.type'

/** Retrieve, summarise, and purge ClickHouse log records across HTTP, chat, user, bot, and module scopes. */
export const logsService = {
  async getLogs(params: LogsParams = {}): Promise<LogsPage> {
    const qs = buildQs({
      limit: params.limit,
      offset: params.offset,
      event_type: params.event_type,
      owner: params.owner,
      level: params.level,
      from: params.from,
      to: params.to,
    })
    return apiService.get(`/${LOGS}${qs}`)
  },

  async getUserLogs(params: LogsParams = {}): Promise<UserLogsPage> {
    const qs = buildQs({
      limit: params.limit,
      offset: params.offset,
      event_type: params.event_type,
      owner: params.owner,
      level: params.level,
      from: params.from,
      to: params.to,
    })
    return apiService.get(`/${LOGS}/user${qs}`)
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
    return apiService.get(`/${LOGS}/summary${qs}`)
  },

  async getChatLogs(params: ChatLogsParams = {}): Promise<ChatLogsPage> {
    const qs = buildQs({
      from: params.from,
      to: params.to,
      owner: params.owner,
      limit: params.limit,
      offset: params.offset,
    })
    return apiService.get(`/${CHAT_LOGS}${qs}`)
  },

  async getChatSummary(params: { from?: string; to?: string } = {}): Promise<ChatSummaryPage> {
    const qs = buildQs({ from: params.from, to: params.to })
    return apiService.get(`/${CHAT_LOGS}/summary${qs}`)
  },

  async getModuleLogs(moduleId: string, params: ModuleLogsParams = {}): Promise<ModuleLogsPage> {
    const qs = buildQs({
      from: params.from,
      to: params.to,
      event_type: params.event_type,
      limit: params.limit,
      offset: params.offset,
    })
    return apiService.get(`/${MODULE_LOGS}/${moduleId}${qs}`)
  },

  async getModuleLogsSummary(moduleId: string, params: { from?: string; to?: string } = {}): Promise<ModuleLogSummaryPage> {
    const qs = buildQs({ from: params.from, to: params.to })
    return apiService.get(`/${MODULE_LOGS}/${moduleId}/summary${qs}`)
  },

  async getBotLogs(botId: string, params: BotLogsParams = {}): Promise<BotLogsPage> {
    const qs = buildQs({
      from: params.from,
      to: params.to,
      event_type: params.event_type,
      limit: params.limit,
      offset: params.offset,
    })
    return apiService.get(`/${BOT_LOGS}/${botId}${qs}`)
  },

  async getBotLogsSummary(botId: string, params: { from?: string; to?: string } = {}): Promise<BotLogSummaryPage> {
    const qs = buildQs({ from: params.from, to: params.to })
    return apiService.get(`/${BOT_LOGS}/${botId}/summary${qs}`)
  },

  async purgeExpiredLogs(): Promise<{ purged: string[]; errors: string[] }> {
    return apiService.post(`/${LOGS}/purge`)
  },
}
