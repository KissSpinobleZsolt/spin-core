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
