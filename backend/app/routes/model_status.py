import asyncio
import json
import os

import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/model-status", tags=["model-status"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")


def _required_models() -> list[str]:
    return [
        m for m in [
            os.getenv("OLLAMA_MODEL", "qwen2.5:7b"),
            os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text:latest"),
        ]
        if m
    ]


async def _check_status() -> dict:
    required = _required_models()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return {
            "ollama": "unreachable",
            "all_ready": False,
            "models": [{"model": m, "status": "unknown", "size_bytes": None} for m in required],
        }

    available: dict[str, dict] = {m["name"]: m for m in data.get("models", [])}

    models = []
    for name in required:
        info = available.get(name)
        if info is None:
            base = name.split(":")[0]
            info = next(
                (v for k, v in available.items() if k == base or k.startswith(base + ":")),
                None,
            )
        models.append({
            "model": name,
            "status": "ready" if info else "pending",
            "size_bytes": info.get("size") if info else None,
        })

    return {
        "ollama": "ok",
        "all_ready": all(m["status"] == "ready" for m in models),
        "models": models,
    }


@router.get("")
async def model_status():
    return await _check_status()


@router.get("/stream")
async def model_status_stream():
    async def generate():
        # max 30 minutes; client closes EventSource when all_ready
        for _ in range(600):
            payload = await _check_status()
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
