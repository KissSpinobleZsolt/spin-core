import { apiService } from './apiService'

export interface Bot {
  id: string
  name: string
  description: string
  type: string
  model: string
  system_prompt: string
  icon: string
  enabled: boolean
  roles: string[]
}

export type BotPayload = Omit<Bot, 'id'>

export const botsService = {
  async getBots(): Promise<Bot[]> {
    return apiService.get('/bots')
  },

  async getBot(id: string): Promise<Bot> {
    return apiService.get(`/bots/${id}`)
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
}
