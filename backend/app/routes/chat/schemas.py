from typing import List, Optional

from pydantic import BaseModel

from app.routes.chat.constants import _OLLAMA_DEFAULT_MODEL


class Message(BaseModel):
    """A single chat message with a role (``user``, ``assistant``, or ``system``) and text content."""

    role: str
    content: str


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

    messages: List[Message]
    model: str = _OLLAMA_DEFAULT_MODEL
    bot_id: Optional[str] = None
    module_id: Optional[str] = None


class AbortPayload(BaseModel):
    """Request body for reporting a user-initiated stream abort."""

    bot_id: str
    module_id: Optional[str] = None
