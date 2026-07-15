import { apiService } from './apiService'

/** Static capability profile that classifies a bot's behaviour, skills, and output style. */
export interface BotType {
  id: string
  name: string
  icon: string
  description: string
  /** System prompt prefix injected before every conversation. */
  preprompt: string
  skills: string[]
  tools: string[]
  output_format: string
  default_model: string
  /** Strategy used to trim or compress conversation context when it exceeds model limits. */
  context_strategy: string
}

/** Persisted bot configuration record including model, system prompt, and RBAC settings. */
export interface Bot {
  id: string
  name: string
  description: string
  type: string
  model: string
  system_prompt: string
  icon: string
  active: boolean
  /** Role required to use this bot; empty string means unrestricted. */
  restricted: string
  /** IDs of the modules this bot is scoped to; empty means globally available. */
  modules: string[]
  created_by: string
  created_at: string | null
}

/** Fields required to create or update a bot, excluding server-generated metadata. */
export type BotPayload = Omit<Bot, 'id' | 'created_by' | 'created_at'>

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
