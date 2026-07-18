import { apiService } from '../api'
import type { Bot } from './Bot.type'
import type { BotPayload } from './BotPayload.type'
import type { BotType } from './BotType.type'
import { BASE_PATH } from './bots.constant'

/** CRUD and query operations for bots and bot types. */
export const botsService = {
  async getBots(): Promise<Bot[]> {
    return apiService.get(`/${BASE_PATH}`)
  },

  async getBot(id: string): Promise<Bot> {
    return apiService.get(`/${BASE_PATH}/${id}`)
  },

  async getBotTypes(): Promise<BotType[]> {
    return apiService.get(`/${BASE_PATH}/types`)
  },

  async createBot(payload: BotPayload): Promise<Bot> {
    return apiService.post(`/${BASE_PATH}`, payload)
  },

  async updateBot(id: string, payload: BotPayload): Promise<Bot> {
    return apiService.put(`/${BASE_PATH}/${id}`, payload)
  },

  async deleteBot(id: string): Promise<void> {
    await apiService.delete(`/${BASE_PATH}/${id}`)
  },

  async getBotsForModule(moduleId: string): Promise<Bot[]> {
    return apiService.get(`/${BASE_PATH}?module_id=${encodeURIComponent(moduleId)}`)
  },
}
