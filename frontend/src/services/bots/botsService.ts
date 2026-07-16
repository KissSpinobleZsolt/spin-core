import { apiService } from '../api'
import type { Bot, BotPayload, BotType } from './types'

/** CRUD and query operations for bots and bot types. */
export const botsService = {
  async getBots(): Promise<Bot[]> {
    return apiService.get('/bots')
  },

  async getBot(id: string): Promise<Bot> {
    return apiService.get(`/bots/${id}`)
  },

  async getBotTypes(): Promise<BotType[]> {
    return apiService.get('/bots/types')
  },

  async createBot(payload: BotPayload): Promise<Bot> {
    return apiService.post('/bots', payload)
  },

  async updateBot(id: string, payload: BotPayload): Promise<Bot> {
    return apiService.put(`/bots/${id}`, payload)
  },

  async deleteBot(id: string): Promise<void> {
    await apiService.delete(`/bots/${id}`)
  },

  async getBotsForModule(moduleId: string): Promise<Bot[]> {
    return apiService.get(`/bots?module_id=${encodeURIComponent(moduleId)}`)
  },
}
