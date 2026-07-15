import { apiService } from './apiService'

export interface BotType {
  id: string
  name: string
  icon: string
  description: string
  preprompt: string
  skills: string[]
  tools: string[]
  output_format: string
  default_model: string
  context_strategy: string
}

export interface Bot {
  id: string
  name: string
  description: string
  type: string
  model: string
  system_prompt: string
  icon: string
  active: boolean
  restricted: string
  modules: string[]
  created_by: string
  created_at: string | null
}

export type BotPayload = Omit<Bot, 'id' | 'created_by' | 'created_at'>

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
