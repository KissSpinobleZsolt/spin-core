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
from app.providers.anthropic_provider.constants import _DEFAULT_MODEL, _MAX_TOKENS

# Lazy-import so the anthropic package is optional; an ImportError at call time
# surfaces a clear RuntimeError message rather than crashing the entire backend.
try:
    import anthropic as _anthropic
    _ANTHROPIC_AVAILABLE = True  # SDK is installed; provider can be used
except ImportError:
    _ANTHROPIC_AVAILABLE = False  # SDK missing; stream() will raise RuntimeError with install instructions


class AnthropicProvider(LLMProvider):
    """LLM provider adapter for the Anthropic Claude API."""

    def __init__(self) -> None:
        """Initialise the Anthropic async client from the environment."""
        self._api_key = os.getenv("ANTHROPIC_API_KEY", "")  # read the key once at construction; empty string means unconfigured

    async def stream(
        self,
        model: str,
        messages: list[dict],
        timeout: float = 120.0,
    ) -> AsyncIterator[NormalizedChunk]:
        """Stream a chat completion from the Anthropic Messages API."""
        if not _ANTHROPIC_AVAILABLE:  # guard: SDK not installed
            raise RuntimeError(
                "The 'anthropic' package is not installed. "
                "Add it to requirements.txt and rebuild the Docker image."
            )
        if not self._api_key:  # guard: key not configured in the environment
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. "
                "Add it to the environment or docker-compose.yml."
            )

        effective_model = model or _DEFAULT_MODEL  # fall back to the module default when the bot row has an empty model string

        # Separate the system message from the conversation turns.
        # The Anthropic API requires the system prompt as a top-level parameter,
        # not as a message with role="system".
        system_text = ""  # accumulates system message content; empty means no system param is sent
        conversation: list[dict] = []  # holds the user/assistant turns in Anthropic's required format
        for msg in messages:
            if msg["role"] == "system":
                # Accumulate system messages in case there are multiple;
                # join them so none is silently dropped.
                system_text = (system_text + "\n\n" + msg["content"]).strip()
            else:
                conversation.append({"role": msg["role"], "content": msg["content"]})  # pass non-system turns through unchanged

        # The Anthropic API rejects an empty messages list.
        if not conversation:  # guard: no user/assistant turns after filtering out system messages
            raise RuntimeError("No user/assistant messages to send to Anthropic API.")

        client = _anthropic.AsyncAnthropic(
            api_key=self._api_key,
            timeout=timeout,  # applies to the initial connection and each chunk; not the total stream duration
        )

        prompt_tokens = 0      # populated from final message usage stats after the stream closes
        completion_tokens = 0  # populated from final message usage stats after the stream closes

        async with client.messages.stream(
            model=effective_model,
            max_tokens=_MAX_TOKENS,
            system=system_text or _anthropic.NOT_GIVEN,  # omit the system param entirely when no system message was provided
            messages=conversation,
        ) as stream_ctx:
            # ``text_stream`` yields incremental text deltas as plain strings.
            async for text_delta in stream_ctx.text_stream:
                yield NormalizedChunk(content=text_delta, done=False)  # emit each delta as a non-terminal chunk

            # The final message carries usage statistics; retrieve it after the
            # stream is exhausted so we can attach counts to the terminal chunk.
            final_msg = await stream_ctx.get_final_message()
            prompt_tokens = final_msg.usage.input_tokens    # total tokens consumed by the input messages
            completion_tokens = final_msg.usage.output_tokens  # total tokens generated in the response

        # Emit the sentinel chunk so the chat route knows the stream ended.
        yield NormalizedChunk(
            content="",
            done=True,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )
