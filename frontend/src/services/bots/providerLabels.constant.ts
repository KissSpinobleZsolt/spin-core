import type { LLMProvider } from './LLMProvider.type'

/** Human-readable label shown in the provider selector drop-down. */
export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  ollama: 'Ollama (self-hosted)',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI / compatible',
}
