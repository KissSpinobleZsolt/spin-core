"""
Anthropic (Claude) provider adapter.

Streams completions from the Anthropic Messages API using the official
``anthropic`` Python SDK.  Requires the ``ANTHROPIC_API_KEY`` environment
variable to be set.

Supported models (as of 2025-07):
    - ``claude-opus-4-8``   — highest capability
    - ``claude-sonnet-5``   — best balance of speed and intelligence
    - ``claude-haiku-4-5-20251001`` — fastest / lowest cost

The Anthropic API separates the system message from the conversation history,
so this adapter extracts the first ``system`` role message and passes it as the
``system`` parameter, converting the remainder to Anthropic's ``user``/``assistant``
alternating format.
"""

import os
from typing import AsyncIterator

from app.providers.base import LLMProvider, NormalizedChunk

# Lazy-import so the anthropic package is optional; an ImportError at call time
# surfaces a clear RuntimeError message rather than crashing the entire backend.
try:
    import anthropic as _anthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

# Default Claude model used when the bot record has an empty model string.
_DEFAULT_MODEL = "claude-sonnet-5"

# Maximum output tokens to request; Anthropic requires an explicit limit.
_MAX_TOKENS = 8192


class AnthropicProvider(LLMProvider):
    """LLM provider adapter for the Anthropic Claude API.

    Reads ``ANTHROPIC_API_KEY`` from the environment on each instantiation and
    constructs an ``anthropic.AsyncAnthropic`` client.  If the key is absent or
    the SDK is not installed the ``stream`` method raises ``RuntimeError`` with a
    descriptive message so the error surfaces cleanly in the chat stream.

    Note:
        The Anthropic API does not use a flat ``messages`` list with a ``system``
        role.  The system prompt must be provided as a top-level ``system``
        parameter.  This adapter handles the extraction transparently so callers
        can pass the same ``messages`` format used by Ollama and OpenAI.
    """

    def __init__(self) -> None:
        """Initialise the Anthropic async client from the environment."""
        self._api_key = os.getenv("ANTHROPIC_API_KEY", "")

    async def stream(
        self,
        model: str,
        messages: list[dict],
        timeout: float = 120.0,
    ) -> AsyncIterator[NormalizedChunk]:
        """Stream a chat completion from the Anthropic Messages API.

        Args:
            model: Anthropic model identifier, e.g. ``"claude-sonnet-5"``.
                Defaults to ``claude-sonnet-5`` when the bot record's model
                field is empty.
            messages: Conversation history as ``{"role": str, "content": str}``
                dicts.  A leading ``system`` message is extracted and passed as
                the ``system`` API parameter; remaining ``system`` messages are
                folded into the user turn that follows them.
            timeout: Request timeout in seconds passed to the SDK's HTTP client.

        Yields:
            One `NormalizedChunk` per text delta; the final chunk has ``done=True``
            and carries ``input_tokens`` / ``output_tokens`` from the usage block.

        Raises:
            RuntimeError: When the ``anthropic`` package is not installed, the API
                key is missing, or the API returns an error response.
        """
        if not _ANTHROPIC_AVAILABLE:
            raise RuntimeError(
                "The 'anthropic' package is not installed. "
                "Add it to requirements.txt and rebuild the Docker image."
            )
        if not self._api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. "
                "Add it to the environment or docker-compose.yml."
            )

        # Resolve the effective model; fall back to the sensible default.
        effective_model = model or _DEFAULT_MODEL

        # Separate the system message from the conversation turns.
        # The Anthropic API requires the system prompt as a top-level parameter,
        # not as a message with role="system".
        system_text = ""
        conversation: list[dict] = []
        for msg in messages:
            if msg["role"] == "system":
                # Accumulate system messages in case there are multiple;
                # join them so none is silently dropped.
                system_text = (system_text + "\n\n" + msg["content"]).strip()
            else:
                conversation.append({"role": msg["role"], "content": msg["content"]})

        # The Anthropic API rejects an empty messages list.
        if not conversation:
            raise RuntimeError("No user/assistant messages to send to Anthropic API.")

        client = _anthropic.AsyncAnthropic(
            api_key=self._api_key,
            timeout=timeout,
        )

        prompt_tokens = 0
        completion_tokens = 0

        async with client.messages.stream(
            model=effective_model,
            max_tokens=_MAX_TOKENS,
            system=system_text or _anthropic.NOT_GIVEN,
            messages=conversation,
        ) as stream_ctx:
            # ``text_stream`` yields incremental text deltas as plain strings.
            async for text_delta in stream_ctx.text_stream:
                yield NormalizedChunk(content=text_delta, done=False)

            # The final message carries usage statistics; retrieve it after the
            # stream is exhausted so we can attach counts to the terminal chunk.
            final_msg = await stream_ctx.get_final_message()
            prompt_tokens = final_msg.usage.input_tokens
            completion_tokens = final_msg.usage.output_tokens

        # Emit the sentinel chunk so the chat route knows the stream ended.
        yield NormalizedChunk(
            content="",
            done=True,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )
