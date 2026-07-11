import os
from typing import List

import httpx
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.deps import require_token

router = APIRouter(prefix="/api/chat", tags=["chat"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = OLLAMA_MODEL


@router.post("")
async def chat(payload: ChatRequest, authorization: str = Header(default="")):
    require_token(authorization)

    async def stream():
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": payload.model,
                        "messages": [m.model_dump() for m in payload.messages],
                        "stream": True,
                    },
                ) as resp:
                    if resp.status_code != 200:
                        yield f'{{"error": "Ollama returned {resp.status_code}"}}\n'
                        return
                    async for chunk in resp.aiter_text():
                        yield chunk
        except httpx.ConnectError:
            yield '{"error": "Ollama service unreachable"}\n'
        except Exception as e:
            yield f'{{"error": "{str(e)}"}}\n'

    return StreamingResponse(stream(), media_type="application/x-ndjson")
