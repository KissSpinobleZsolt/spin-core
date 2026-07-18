import type { LLMProvider } from './LLMProvider.type'

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
