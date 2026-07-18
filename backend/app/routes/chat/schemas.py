from typing import List, Optional

from pydantic import BaseModel

from app.routes.chat.constants import _OLLAMA_DEFAULT_MODEL


class Message(BaseModel):
    """A single chat message with a role (``user``, ``assistant``, or ``system``) and text content."""

    role: str     # conversation participant role: "user", "assistant", or "system"
    content: str  # text body of the message


class ChatRequest(BaseModel):
    """Request body for a streaming chat completion.

    Attributes:
        messages: Ordered conversation history; the route prepends a system message
            when ``bot_id`` is supplied.
        model: Explicit model override used only in free mode (no ``bot_id``).
            Ignored when a bot is selected — the bot's stored model takes precedence.
        bot_id: Optional UUID of the bot to use.  When supplied the bot's
            ``provider``, ``model``, and system prompt are loaded from Postgres.
        module_id: Optional UUID of the module the chat originated from; used to
            inject module-specific context into the system prompt.
    """

    messages: List[Message]               # ordered conversation history sent to the LLM
    model: str = _OLLAMA_DEFAULT_MODEL    # Ollama model name used when no bot_id is provided (free-form mode)
    bot_id: Optional[str] = None          # UUID of the bot; when set, overrides model and system prompt with the bot's stored values
    module_id: Optional[str] = None       # UUID of the originating module; used to inject module context into the system prompt


class AbortPayload(BaseModel):
    """Request body for reporting a user-initiated stream abort."""

    bot_id: str                       # UUID of the bot whose stream was aborted; used to write a bot.abort log entry
    module_id: Optional[str] = None   # UUID of the originating module; included in the abort log details when present
