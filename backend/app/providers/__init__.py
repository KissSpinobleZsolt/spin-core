"""
Provider abstraction layer for multi-LLM support.

Exports the factory function `get_provider` and the base `LLMProvider` protocol.
Each concrete provider (Ollama, Anthropic, OpenAI-compatible) implements the same
`stream` coroutine so the chat route never touches provider-specific SDKs directly.

Supported provider identifiers:
    - ``"ollama"`` — self-hosted Ollama (default, no API key required)
    - ``"anthropic"`` — Anthropic Claude API (requires ``ANTHROPIC_API_KEY``)
    - ``"openai"`` — OpenAI or any OpenAI-compatible endpoint (requires ``OPENAI_API_KEY``)
"""

from app.providers.base import LLMProvider, NormalizedChunk
from app.providers.ollama import OllamaProvider
from app.providers.anthropic_provider import AnthropicProvider
from app.providers.openai_compat import OpenAICompatProvider


def get_provider(provider_id: str) -> LLMProvider:
    """Return the concrete `LLMProvider` instance for the given provider identifier.

    Args:
        provider_id: One of ``"ollama"``, ``"anthropic"``, or ``"openai"``.
            Any unknown value falls back to ``"ollama"``.

    Returns:
        A ready-to-use `LLMProvider` instance.
    """
    match provider_id:
        case "anthropic":
            return AnthropicProvider()
        case "openai":
            return OpenAICompatProvider()
        case _:
            # "ollama" is the default; unknown strings also fall back to Ollama
            # so existing bots without an explicit provider keep working.
            return OllamaProvider()


__all__ = ["get_provider", "LLMProvider", "NormalizedChunk"]
