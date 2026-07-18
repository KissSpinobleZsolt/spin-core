import type { LLMProvider } from './LLMProvider.type'
import type { BotConfigSchema } from './BotConfigSchema.type'

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
