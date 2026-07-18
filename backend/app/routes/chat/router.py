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
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.database import get_ch, get_pg
from app.deps import token_dep, admin_dep
from app.events import BotEvent, LogLevel
from app.providers import get_provider
from app.routes.chat.constants import _CHATBOT_SCOPE
from app.routes.chat.schemas import Message, ChatRequest, AbortPayload
from app.routes.chat.utils import _build_system_message

router = APIRouter(prefix="/api/chat", tags=["chat"])


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


# Separate endpoint because the frontend detects the abort (AbortError); the backend cannot reliably observe stream disconnects
@router.post("/abort", status_code=204)
async def abort_chat(payload: AbortPayload, user_email: str = Depends(token_dep)):
    """Record a user-initiated stream abort in bot_logs and the chatbot module log."""
    try:
        bot = get_pg().get_bot_by_id(payload.bot_id)
        if not bot:
            return
        ch = get_ch()
        from app.events import lifecycle_message
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
