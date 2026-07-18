/**
 * LLM provider identifier stored on a bot record.
 *
 * - `"ollama"` — self-hosted Ollama instance; no API key required.
 * - `"anthropic"` — Anthropic Claude API; requires `ANTHROPIC_API_KEY` on the backend.
 * - `"openai"` — OpenAI or any OpenAI-compatible endpoint; requires `OPENAI_API_KEY`.
 */
export type LLMProvider = 'ollama' | 'anthropic' | 'openai'
