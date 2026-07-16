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

/**
 * LLM provider identifier stored on a bot record.
 *
 * - `"ollama"` — self-hosted Ollama instance; no API key required.
 * - `"anthropic"` — Anthropic Claude API; requires `ANTHROPIC_API_KEY` on the backend.
 * - `"openai"` — OpenAI or any OpenAI-compatible endpoint; requires `OPENAI_API_KEY`.
 */
export type LLMProvider = 'ollama' | 'anthropic' | 'openai'

/** Human-readable label shown in the provider selector drop-down. */
export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  ollama: 'Ollama (self-hosted)',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI / compatible',
}

/**
 * Suggested model identifiers shown as autocomplete hints per provider.
 * Users can type any valid model string; these are just starting points.
 */
export const PROVIDER_MODEL_HINTS: Record<LLMProvider, string[]> = {
  ollama: [],  // populated at runtime from /api/model-status/installed
  anthropic: [
    'claude-sonnet-5',
    'claude-opus-4-8',
    'claude-haiku-4-5-20251001',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    // Groq — set OPENAI_BASE_URL=https://api.groq.com/openai/v1
    'llama-3.3-70b-versatile',
    'mixtral-8x7b-32768',
  ],
}

/** A single field in a bot's declarative config schema, sourced from the module manifest. */
export interface BotConfigSchemaField {
  key: string
  label: string
  type: 'number' | 'boolean' | 'text' | 'password' | 'select'
  default: unknown
  min?: number
  max?: number
  step?: number
  options?: string[]
}

/**
 * Declarative UI schema for a custom bot's configuration page.
 * Stored from the module manifest at bot-seeding time.
 *
 * - `principals`: which Principals component to render
 *   (`"watchlist"`, `"teams"`, `"risk_profiles"`, or absent/empty for none)
 * - `configurations`: fields shown in the Configurations section
 * - `scheduler`: fields shown in the Scheduler section
 */
export interface BotConfigSchema {
  principals?: 'watchlist' | 'teams' | 'risk_profiles'
  configurations?: BotConfigSchemaField[]
  scheduler?: BotConfigSchemaField[]
}

/** Persisted bot configuration record including model, system prompt, and RBAC settings. */
export interface Bot {
  id: string
  name: string
  description: string
  type: string
  /** LLM backend this bot uses; defaults to `"ollama"` for existing bots. */
  provider: LLMProvider
  model: string
  system_prompt: string
  icon: string
  active: boolean
  /** Role required to use this bot; empty string means unrestricted. */
  restricted: string
  /** IDs of the modules this bot is scoped to; empty means globally available. */
  modules: string[]
  created_by: string
  /** Declarative config page schema from the module manifest; empty object for non-custom bots. */
  config_schema: BotConfigSchema
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
