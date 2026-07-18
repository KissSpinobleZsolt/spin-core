/** Detailed payload of a single chat completion log event. */
export interface ChatLogDetails {
  model: string
  messages: { role: string; content: string }[]
  response: string
  prompt_tokens: number
  eval_tokens: number
  duration_ms: number
}
