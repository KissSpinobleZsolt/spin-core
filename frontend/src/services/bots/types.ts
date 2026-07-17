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
  risk_levels?: string[]
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
