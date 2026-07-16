"""
Chat streaming route.

Accepts a POST request with a conversation history and optional ``bot_id``,
resolves the bot's provider and model, delegates streaming to the matching
`LLMProvider` adapter, normalises each chunk to Ollama-compatible NDJSON, and
logs the completed exchange to ClickHouse.

The frontend parses ``{"message": {"content": "…"}}`` NDJSON lines — every
provider adapter outputs `NormalizedChunk` objects that this route serialises to
that exact shape, so the frontend requires no changes when a new provider is added.
"""

import json
import os
import time
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.database import get_ch, get_pg
from app.deps import token_dep, admin_dep
from app.events import BotEvent, LogLevel
from app.providers import get_provider

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Fallback Ollama model used when neither the bot record nor the request body
# specifies a model.  Cloud-provider bots always carry an explicit model string.
_OLLAMA_DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# ClickHouse scope key used for all chatbot log entries.
_CHATBOT_SCOPE = "chatbot"

# ---------------------------------------------------------------------------
# Platform-context navigation tables
# ---------------------------------------------------------------------------

# Public pages visible to all authenticated users.
_NAV_PUBLIC = [
    ("/",               "Dashboard",    "admin-editable welcome page"),
    ("/bots",           "Bots",         "browse and launch AI bots"),
]

# Admin-only pages appended when the requesting user has the ``admin`` role.
_NAV_ADMIN = [
    ("/logs",           "Logs",         "HTTP and chat log viewer"),
    ("/translations",   "Translations", "live i18n string editor"),
    ("/bots-admin",     "Bot Admin",    "create and manage bots"),
    ("/admin/llms",     "LLM Models",   "Ollama model management"),
    ("/admin/users",    "Users",        "user management"),
    ("/admin/modules",  "Modules",      "micro-frontend registration and logs"),
    ("/admin/status",   "Status",       "live health dashboard"),
]


def _build_system_message(pg, bot, user_roles: list[str], module: dict | None = None) -> str:
    """Compose the full system prompt for a bot.

    Concatenates (in order): the bot-type preprompt, a platform-context block
    describing available pages / modules / bots, and the bot's own system prompt.
    Empty sections are omitted so the final string has no stray blank lines.

    Args:
        pg: Active `PostgresAdapter` instance used to query modules and bots.
        bot: `BotRecord` whose type preprompt and system prompt are used.
        user_roles: Roles of the requesting user; determines which nav links
            and bots are surfaced in the context block.
        module: Optional module dict injected when the chat originates from a
            specific micro-frontend module.

    Returns:
        A single string suitable for use as the ``system`` role message.
    """
    is_admin = "admin" in user_roles

    # Look up the preprompt text defined on the bot's type.
    preprompt = ""
    for bt in pg.get_bot_types():
        if bt["name"] == bot.type:
            preprompt = bt.get("preprompt") or ""
            break

    modules = pg.get_modules(enabled_only=True, user_roles=user_roles)
    bots = pg.get_bots(admin=False, user_roles=user_roles)

    nav = _NAV_PUBLIC + (_NAV_ADMIN if is_admin else [])

    # Optional current-module context block appended when the request originates
    # from a specific module page.
    module_lines = []
    if module:
        module_lines = [
            "",
            "### Current Module",
            f"You are embedded in the '{module['name']}' module: {module['description']}",
            f"Module route: /modules/{module['route']}",
        ]

    ctx_lines = [
        "## PLATFORM CONTEXT (injected) ##",
        "",
        "You are running inside spin-core, a full-stack AI platform.",
        "",
        "### Pages",
        *[f"- [{name}]({route}): {desc}" for route, name, desc in nav],
        "",
        "### Installed Modules",
        *(
            [f"- {m['icon']} [{m['name']}](/modules/{m['route']}): {m['description']}" for m in modules]
            if modules else ["- (none installed)"]
        ),
        "",
        "### Available Bots",
        *(
            [f"- {b.icon} {b.name} [{b.type}]: {b.description}" for b in bots]
            if bots else ["- (none available)"]
        ),
        *module_lines,
        "",
        "## END PLATFORM CONTEXT ##",
    ]

    # Join non-empty sections with a blank line between them.
    parts = [p for p in [preprompt, "\n".join(ctx_lines), bot.system_prompt] if p]
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Streaming endpoint
# ---------------------------------------------------------------------------

@router.post("")
async def chat(payload: ChatRequest, user_email: str = Depends(token_dep)):
    """Stream a chat completion, dispatching to the bot's configured LLM provider.

    Loads the bot record (when ``bot_id`` is set) to determine the provider and
    model, injects the platform-context system prompt, and delegates streaming to
    the matching `LLMProvider` adapter.  Each `NormalizedChunk` is serialised to
    the Ollama NDJSON shape ``{"message": {"content": "…"}}`` so the frontend
    requires no changes.  On stream completion a ClickHouse log entry is written.

    Args:
        payload: Chat request body (messages, optional bot_id / module_id).
        user_email: JWT-verified email of the requesting user.

    Returns:
        A ``StreamingResponse`` with ``Content-Type: application/x-ndjson``.
    """
    # Resolve bot configuration from Postgres when a bot_id is provided.
    bot_name: Optional[str] = None
    effective_provider = "ollama"
    effective_model = payload.model
    messages_to_send = list(payload.messages)

    if payload.bot_id:
        pg = get_pg()
        bot = pg.get_bot_by_id(payload.bot_id)
        if not bot or not bot.active:
            raise HTTPException(status_code=404, detail="Bot not found")

        user = pg.get_user_by_email(user_email)
        user_roles = user.roles if user else []

        # Non-admins cannot access inactive or admin-restricted bots.
        if "admin" not in user_roles:
            if not bot.active:
                raise HTTPException(status_code=404, detail="Bot not found")
            if bot.restricted == "admin":
                raise HTTPException(status_code=403, detail="Access denied")

        bot_name = bot.name
        # The bot's stored provider beats the default; its model beats the request model.
        effective_provider = bot.provider or "ollama"
        if bot.model:
            effective_model = bot.model

        module = pg.get_module(payload.module_id) if payload.module_id else None
        system_content = _build_system_message(pg, bot, user_roles, module=module)
        # Prepend the assembled system message so the provider always receives it first.
        messages_to_send = [Message(role="system", content=system_content)] + messages_to_send

    async def stream():
        """Yield NDJSON lines from the selected provider and log the exchange on completion."""
        start = time.time()
        response_parts: list[str] = []
        prompt_tokens = 0
        eval_tokens = 0

        provider = get_provider(effective_provider)

        try:
            async for chunk in provider.stream(
                model=effective_model,
                messages=[m.model_dump() for m in messages_to_send],
            ):
                # Accumulate text for the ClickHouse log written after the stream ends.
                if chunk.content:
                    response_parts.append(chunk.content)

                # Capture token counts from the final sentinel chunk.
                if chunk.done:
                    prompt_tokens = chunk.prompt_tokens
                    eval_tokens = chunk.completion_tokens

                # Serialise to the Ollama NDJSON shape the frontend already parses.
                # Cloud providers emit empty content on the terminal chunk; the frontend
                # uses the ``done`` flag to stop the streaming cursor.
                yield json.dumps({
                    "message": {"role": "assistant", "content": chunk.content},
                    "done": chunk.done,
                }) + "\n"

        except RuntimeError as exc:
            # Surface provider-level errors (missing key, unreachable service) as a
            # JSON error chunk so the frontend can display a human-readable message.
            yield json.dumps({"error": str(exc)}) + "\n"
            if bot_name:
                try:
                    get_ch().write_bot_log(
                        bot_name, user_email, BotEvent.ERROR,
                        {"bot_id": payload.bot_id, "error": str(exc), "provider": effective_provider, "model": effective_model},
                        level=LogLevel.ERROR, name=bot_name,
                        message=str(exc),
                    )
                except Exception:
                    pass
            return
        except Exception as exc:
            yield json.dumps({"error": f"Unexpected error: {exc}"}) + "\n"
            if bot_name:
                try:
                    get_ch().write_bot_log(
                        bot_name, user_email, BotEvent.ERROR,
                        {"bot_id": payload.bot_id, "error": str(exc), "provider": effective_provider, "model": effective_model},
                        level=LogLevel.ERROR, name=bot_name,
                        message=f"Unexpected error: {exc}",
                    )
                except Exception:
                    pass
            return

        # Write the completion log to ClickHouse after the stream is fully consumed.
        # Failures here are silent so a logging outage never breaks the chat.
        try:
            duration_ms = round((time.time() - start) * 1000, 2)
            log_details = {
                "provider": effective_provider,
                "model": effective_model,
                "messages": [m.model_dump() for m in payload.messages],
                "response": "".join(response_parts),
                "prompt_tokens": prompt_tokens,
                "eval_tokens": eval_tokens,
                "duration_ms": duration_ms,
            }
            if payload.bot_id:
                log_details["bot_id"] = payload.bot_id
                log_details["bot_name"] = bot_name
            if payload.module_id:
                log_details["module_id"] = payload.module_id
            ch = get_ch()
            ch.write_module_log(
                _CHATBOT_SCOPE,
                user_email,
                "chat.completion",
                log_details,
            )
            if bot_name:
                ch.write_bot_log(
                    bot_name, user_email, BotEvent.INFO,
                    {"bot_id": payload.bot_id, "provider": effective_provider, "model": effective_model, "prompt_tokens": prompt_tokens, "eval_tokens": eval_tokens, "duration_ms": duration_ms},
                    level=LogLevel.INFO, name=bot_name,
                    message=f"Chat completed. {eval_tokens} tokens, {duration_ms}ms.",
                )
        except Exception:
            # ClickHouse logging must never surface errors to the chat stream.
            pass

    return StreamingResponse(stream(), media_type="application/x-ndjson")


# ---------------------------------------------------------------------------
# Abort endpoint
# ---------------------------------------------------------------------------

# Separate endpoint because the frontend detects the abort (AbortError); the backend cannot reliably observe stream disconnects
@router.post("/abort", status_code=204)
async def abort_chat(payload: AbortPayload, user_email: str = Depends(token_dep)):
    """Record a user-initiated stream abort in bot_logs and the chatbot module log."""
    try:
        bot = get_pg().get_bot_by_id(payload.bot_id)
        if not bot:
            return
        ch = get_ch()
        ch.write_bot_log(
            bot.name, user_email, BotEvent.ABORT,
            {"bot_id": payload.bot_id, **({"module_id": payload.module_id} if payload.module_id else {})},
            level=LogLevel.WARN, name=bot.name,
            message=lifecycle_message(BotEvent.ABORT, bot.name),
        )
        ch.write_module_log(
            _CHATBOT_SCOPE, user_email, "chat.abort",
            {"bot_id": payload.bot_id, "bot_name": bot.name,
             **({"module_id": payload.module_id} if payload.module_id else {})},
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Log query endpoints
# ---------------------------------------------------------------------------

@router.get("/logs")
async def get_chat_logs(
    _: str = Depends(admin_dep),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    user_email: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Return paginated chatbot completion logs from ClickHouse.

    Optionally filters by time range and user email.  Admin-only endpoint.

    Args:
        from_dt: Inclusive start of the time window (UTC).
        to_dt: Inclusive end of the time window (UTC).
        user_email: When supplied, only entries for this email are returned.
        limit: Maximum number of rows to return (capped at 200).
        offset: Row offset for pagination.

    Returns:
        Dict with ``items`` list and ``total`` count from ClickHouse.
    """
    result = get_ch().query_module_logs(
        _CHATBOT_SCOPE,
        limit=limit,
        offset=offset,
        from_dt=from_dt,
        to_dt=to_dt,
    )
    if user_email:
        result["items"] = [r for r in result["items"] if r["owner"] == user_email]
    return result


@router.get("/logs/summary")
async def get_chat_logs_summary(
    _: str = Depends(admin_dep),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    limit: int = Query(default=500, le=2000),
    offset: int = Query(default=0, ge=0),
):
    """Return hourly aggregated chatbot log summaries from the materialized view.

    Uses the pre-computed ``module_chatbot_logs_mv`` ClickHouse view refreshed every
    10 minutes.  Admin-only endpoint.

    Args:
        from_dt: Inclusive start of the aggregation window (UTC).
        to_dt: Inclusive end of the aggregation window (UTC).
        limit: Maximum number of hourly buckets to return (capped at 2000).
        offset: Bucket offset for pagination.

    Returns:
        Dict with ``items`` list and ``total`` count from the materialized view.
    """
    return get_ch().query_module_logs_summary(
        _CHATBOT_SCOPE,
        from_dt=from_dt,
        to_dt=to_dt,
        limit=limit,
        offset=offset,
    )
