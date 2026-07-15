import json
import os
import time
from datetime import datetime
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import OLLAMA_URL
from app.database import get_ch, get_pg
from app.deps import token_dep, admin_dep

router = APIRouter(prefix="/api/chat", tags=["chat"])

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
_CHATBOT_SCOPE = "chatbot"


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = OLLAMA_MODEL
    bot_id: Optional[str] = None


@router.post("")
async def chat(payload: ChatRequest, user_email: str = Depends(token_dep)):

    # Resolve bot config if bot_id provided
    bot_name: Optional[str] = None
    effective_model = payload.model
    messages_to_send = list(payload.messages)

    if payload.bot_id:
        bot = get_pg().get_bot_by_id(payload.bot_id)
        if not bot or not bot.enabled:
            raise HTTPException(status_code=404, detail="Bot not found")
        bot_name = bot.name
        if bot.model:
            effective_model = bot.model
        if bot.system_prompt:
            messages_to_send = [Message(role="system", content=bot.system_prompt)] + messages_to_send

    async def stream():
        start = time.time()
        response_parts: list[str] = []
        prompt_tokens = 0
        eval_tokens = 0

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": effective_model,
                        "messages": [m.model_dump() for m in messages_to_send],
                        "stream": True,
                    },
                ) as resp:
                    if resp.status_code != 200:
                        yield f'{{"error": "Ollama returned {resp.status_code}"}}\n'
                        return
                    async for chunk in resp.aiter_text():
                        yield chunk
                        try:
                            data = json.loads(chunk.strip())
                            content = data.get("message", {}).get("content", "")
                            if content:
                                response_parts.append(content)
                            if data.get("done"):
                                prompt_tokens = data.get("prompt_eval_count", 0)
                                eval_tokens = data.get("eval_count", 0)
                        except Exception:
                            pass
        except httpx.ConnectError:
            yield '{"error": "Ollama service unreachable"}\n'
            return
        except Exception as e:
            yield f'{{"error": "{str(e)}"}}\n'
            return

        try:
            log_details = {
                "model": effective_model,
                "messages": [m.model_dump() for m in payload.messages],
                "response": "".join(response_parts),
                "prompt_tokens": prompt_tokens,
                "eval_tokens": eval_tokens,
                "duration_ms": round((time.time() - start) * 1000, 2),
            }
            if payload.bot_id:
                log_details["bot_id"] = payload.bot_id
                log_details["bot_name"] = bot_name
            get_ch().write_module_log(
                scope=_CHATBOT_SCOPE,
                user_email=user_email,
                event_type="chat.completion",
                details=log_details,
            )
        except Exception:
            pass

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@router.get("/logs")
async def get_chat_logs(
    _: str = Depends(admin_dep),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    user_email: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    result = get_ch().query_module_logs(
        _CHATBOT_SCOPE,
        limit=limit,
        offset=offset,
        from_dt=from_dt,
        to_dt=to_dt,
    )
    if user_email:
        result["items"] = [r for r in result["items"] if r["user_email"] == user_email]
    return result


@router.get("/logs/summary")
async def get_chat_logs_summary(
    _: str = Depends(admin_dep),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    limit: int = Query(default=500, le=2000),
    offset: int = Query(default=0, ge=0),
):
    return get_ch().query_module_logs_mv(
        _CHATBOT_SCOPE,
        from_dt=from_dt,
        to_dt=to_dt,
        limit=limit,
        offset=offset,
    )
