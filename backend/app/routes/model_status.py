import asyncio
import json
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.model_tracker import get_model_progress

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
        last_payload_str: str | None = None
        tags_cache: dict | None = None

        for iteration in range(1800):  # 30 min at 1 s interval
            if iteration % 3 == 0:
                tags_cache = await _check_status()

            base = tags_cache or await _check_status()
            progress_map = get_model_progress()

            enriched_models = []
            for m in base["models"]:
                entry = dict(m)
                mp = progress_map.get(m["model"])

                if m["status"] == "ready" or mp is None:
                    entry["progress"] = None
                else:
                    entry["progress"] = mp.as_progress_dict()
                    if mp.phase in ("pulling", "verifying", "writing", "error"):
                        entry["status"] = mp.phase

                enriched_models.append(entry)

            payload = {
                **base,
                "models": enriched_models,
                "server_time": datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3] + "Z",
            }
            payload_str = json.dumps(payload)

            if payload_str != last_payload_str:
                last_payload_str = payload_str
                yield f"data: {payload_str}\n\n"

            if base["all_ready"]:
                return

            await asyncio.sleep(1)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
