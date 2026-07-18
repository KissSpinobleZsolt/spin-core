"""
Base protocol and shared types for the LLM provider abstraction layer.

All providers implement `LLMProvider` so the chat route can dispatch to any backend
without knowing which SDK or wire format that backend uses. The chat route always
receives `NormalizedChunk` objects and serialises them to the Ollama NDJSON shape
the frontend already expects — the frontend therefore needs zero changes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator


@dataclass
class NormalizedChunk:
    """A single streaming token yielded by any provider, normalised to a common shape.

    Attributes:
        content: The text fragment for this chunk; may be empty for the final chunk.
        done: ``True`` when the provider signals end-of-stream.
        prompt_tokens: Total input tokens, populated only on the final chunk.
        completion_tokens: Total output tokens, populated only on the final chunk.
    """

    content: str              # text delta for this chunk; empty string on the terminal sentinel chunk
    done: bool = False        # True only on the last chunk; signals the chat route to close the SSE stream
    prompt_tokens: int = 0    # input token count reported by the provider; set on the final chunk only
    completion_tokens: int = 0  # output token count reported by the provider; set on the final chunk only


class LLMProvider(ABC):
    """Abstract base class for all LLM provider adapters.

    Subclasses implement `stream` to translate provider-specific wire formats into
    an async generator of `NormalizedChunk` objects.  The chat route owns error
    handling and ClickHouse logging; providers are responsible only for streaming.
    """

    @abstractmethod
    async def stream(
        self,
        model: str,
        messages: list[dict],
        timeout: float = 120.0,
    ) -> AsyncIterator[NormalizedChunk]:
        """Stream a chat completion from the underlying LLM API.

        Args:
            model: The provider-specific model identifier (e.g. ``"qwen2.5:7b"``
                for Ollama or ``"claude-opus-4-8"`` for Anthropic).
            messages: List of ``{"role": str, "content": str}`` dicts in
                the conversation history, including the injected system message.
            timeout: Maximum seconds to wait for the first token before raising.

        Yields:
            `NormalizedChunk` instances; the last one has ``done=True`` and carries
            the token-count fields.

        Raises:
            RuntimeError: When the provider API is unreachable or returns an error.
        """
        ...  # pragma: no cover
