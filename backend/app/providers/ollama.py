"""
Ollama provider adapter.

Streams completions from a self-hosted Ollama instance using its native
``/api/chat`` NDJSON endpoint.  No API key is required; the base URL is
read from the ``OLLAMA_URL`` environment variable (default: ``http://localhost:11434``).
"""

import json
from typing import AsyncIterator

import httpx

from app.config import OLLAMA_URL
from app.providers.base import LLMProvider, NormalizedChunk


class OllamaProvider(LLMProvider):
    """LLM provider adapter for a self-hosted Ollama instance.

    Translates the Ollama ``/api/chat`` NDJSON stream into `NormalizedChunk`
    objects.  Token counts come from the final ``done=true`` message fields
    ``prompt_eval_count`` and ``eval_count``.
    """

    async def stream(
        self,
        model: str,
        messages: list[dict],
        timeout: float = 120.0,
    ) -> AsyncIterator[NormalizedChunk]:
        """Stream a chat completion from Ollama.

        Args:
            model: Ollama model tag, e.g. ``"qwen2.5:7b"`` or ``"llama3.2:3b"``.
            messages: Conversation history as ``{"role", "content"}`` dicts.
            timeout: Seconds before abandoning the request.

        Yields:
            One `NormalizedChunk` per NDJSON line; the final chunk has ``done=True``
            and carries ``prompt_eval_count`` / ``eval_count`` from Ollama's summary.

        Raises:
            RuntimeError: When Ollama is unreachable or returns a non-200 status.
        """
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    # Request server-sent streaming so we get incremental tokens.
                    "stream": True,
                },
            ) as resp:
                if resp.status_code != 200:
                    raise RuntimeError(f"Ollama returned HTTP {resp.status_code}")

                async for line in resp.aiter_lines():
                    if not line:
                        # Ollama occasionally sends blank keep-alive lines; skip them.
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        # Malformed line from the server; ignore and continue.
                        continue

                    content = data.get("message", {}).get("content", "")
                    done = bool(data.get("done", False))

                    # Token counts are only present on the final summary message.
                    prompt_tokens = data.get("prompt_eval_count", 0) if done else 0
                    completion_tokens = data.get("eval_count", 0) if done else 0

                    yield NormalizedChunk(
                        content=content,
                        done=done,
                        prompt_tokens=prompt_tokens,
                        completion_tokens=completion_tokens,
                    )
