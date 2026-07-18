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
