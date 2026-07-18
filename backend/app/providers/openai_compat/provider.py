"""
OpenAI-compatible provider adapter.

Works with any API that speaks the OpenAI Chat Completions protocol, including:

- **OpenAI** (``api.openai.com``) — set ``OPENAI_API_KEY``
- **Azure OpenAI** — set ``OPENAI_API_KEY`` + ``OPENAI_BASE_URL``
- **Groq** — set ``OPENAI_API_KEY=gsk_...`` + ``OPENAI_BASE_URL=https://api.groq.com/openai/v1``
- **Mistral** — set ``OPENAI_API_KEY=...`` + ``OPENAI_BASE_URL=https://api.mistral.ai/v1``
- **Local vLLM / llama.cpp** — set ``OPENAI_BASE_URL=http://localhost:8080/v1``; key can be any non-empty string

Requires the ``openai`` Python SDK (``pip install openai``).
"""

import os
from typing import AsyncIterator

from app.providers.base import LLMProvider, NormalizedChunk
from app.providers.openai_compat.constants import _DEFAULT_MODEL

# Lazy-import so the openai package is optional; error surfaces at call time
# with a clear RuntimeError rather than crashing the backend on startup.
try:
    import openai as _openai
    _OPENAI_AVAILABLE = True  # SDK is installed; provider can be used
except ImportError:
    _OPENAI_AVAILABLE = False  # SDK missing; stream() will raise RuntimeError with install instructions


class OpenAICompatProvider(LLMProvider):
    """LLM provider adapter for OpenAI and any OpenAI-compatible API."""

    def __init__(self) -> None:
        """Read connection settings from the environment."""
        self._api_key = os.getenv("OPENAI_API_KEY", "")  # read the key once at construction; empty string means unconfigured
        # OPENAI_BASE_URL is optional; if absent the SDK uses the official endpoint.
        self._base_url = os.getenv("OPENAI_BASE_URL") or None  # None tells the SDK to use the default api.openai.com base URL

    async def stream(
        self,
        model: str,
        messages: list[dict],
        timeout: float = 120.0,
    ) -> AsyncIterator[NormalizedChunk]:
        """Stream a chat completion from an OpenAI-compatible endpoint."""
        if not _OPENAI_AVAILABLE:  # guard: SDK not installed
            raise RuntimeError(
                "The 'openai' package is not installed. "
                "Add it to requirements.txt and rebuild the Docker image."
            )
        if not self._api_key:  # guard: key not configured in the environment
            raise RuntimeError(
                "OPENAI_API_KEY is not set. "
                "Add it to the environment or docker-compose.yml."
            )

        effective_model = model or _DEFAULT_MODEL  # fall back to the module default when the bot row has an empty model string

        client = _openai.AsyncOpenAI(
            api_key=self._api_key,
            base_url=self._base_url,  # None keeps the official OpenAI endpoint; non-None routes to any compatible service
            timeout=timeout,
        )

        prompt_tokens = 0      # populated from usage block in the final chunk
        completion_tokens = 0  # populated from usage block in the final chunk

        # ``stream_options`` makes the server include a usage summary in the final
        # chunk of the SSE stream (OpenAI added this in late 2023; most compatible
        # endpoints honour it too).
        async with client.chat.completions.stream(
            model=effective_model,
            messages=messages,
            stream_options={"include_usage": True},  # request token counts in the terminal SSE event
        ) as stream_ctx:
            async for event in stream_ctx:
                # The stream emits various event types; we only care about deltas.
                if event.type == "content.delta":  # text fragment ready to forward to the client
                    yield NormalizedChunk(content=event.delta, done=False)

                elif event.type == "chunk":
                    # The final chunk may carry a usage block; extract it if present.
                    usage = getattr(event.chunk, "usage", None)  # usage is absent on intermediate chunks
                    if usage:
                        prompt_tokens = usage.prompt_tokens or 0        # total input tokens billed
                        completion_tokens = usage.completion_tokens or 0  # total output tokens generated

        # Emit the terminal sentinel chunk so the chat route knows the stream ended.
        yield NormalizedChunk(
            content="",
            done=True,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )
