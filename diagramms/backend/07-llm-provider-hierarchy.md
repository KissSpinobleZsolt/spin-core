# LLM Provider Class Hierarchy

The `LLMProvider` abstract base class and its three concrete implementations. The `get_provider()` factory dispatches at runtime based on the bot's `provider` field. Defined in `backend/app/providers/`.

```mermaid
classDiagram
    class LLMProvider {
        <<abstract>>
        +stream(model, messages, timeout) AsyncIterator~NormalizedChunk~
    }
    class NormalizedChunk {
        +content: str
        +done: bool
        +prompt_tokens: int
        +completion_tokens: int
    }
    class OllamaProvider {
        +OLLAMA_URL: str
        +stream() httpx async NDJSON
        +token counts from final chunk eval_count
    }
    class AnthropicProvider {
        +ANTHROPIC_API_KEY: str
        +default_model: claude-sonnet-5
        +max_tokens: 8192
        +stream() anthropic.AsyncAnthropic.messages.stream()
        +separates system messages automatically
    }
    class OpenAICompatProvider {
        +OPENAI_API_KEY: str
        +OPENAI_BASE_URL: str optional
        +default_model: gpt-4o
        +stream() openai.AsyncOpenAI chat.completions.create(stream=True)
        +works with Azure, Groq, Mistral, vLLM
    }
    class get_provider {
        <<factory>>
        +"ollama" → OllamaProvider
        +"anthropic" → AnthropicProvider
        +anything else → OpenAICompatProvider
    }

    LLMProvider <|-- OllamaProvider
    LLMProvider <|-- AnthropicProvider
    LLMProvider <|-- OpenAICompatProvider
    LLMProvider ..> NormalizedChunk
    get_provider --> OllamaProvider
    get_provider --> AnthropicProvider
    get_provider --> OpenAICompatProvider
```
