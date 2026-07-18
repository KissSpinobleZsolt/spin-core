import asyncio
import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.config import OLLAMA_URL
from app.deps import admin_dep
from app.model_tracker import get_model_progress, start_pull
from app.routes.model_status.schemas import PullPayload
from app.routes.model_status.utils import _check_status

router = APIRouter(prefix="/api/model-status", tags=["model-status"])  # mounts Ollama model management endpoints


@router.get("")
async def model_status():
    """Return the current ready or pending status for all required Ollama models."""
    return await _check_status()  # probe Ollama's /api/tags and map results to ready/pending


@router.get("/installed")
async def installed_models():
    """Return the full list of Ollama models currently installed, with size, family, and quantization metadata."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")  # list all locally installed Ollama models
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return {"ollama": "unreachable", "models": []}  # Ollama is not available; return an empty model list

    models = []
    for m in data.get("models", []):
        details = m.get("details", {})  # details block carries family, parameter size, and quantization info
        models.append({
            "name": m.get("name"),
            "size_bytes": m.get("size"),
            "modified_at": m.get("modified_at"),
            "family": details.get("family"),
            "parameter_size": details.get("parameter_size"),
            "quantization": details.get("quantization_level"),
            "format": details.get("format"),
        })

    return {"ollama": "ok", "models": models}  # return the enriched model list


@router.post("/pull")
async def pull_model(payload: PullPayload, _: str = Depends(admin_dep)):
    """Start a background pull of the named Ollama model (admin only)."""
    name = payload.name.strip()  # trim whitespace from user input
    if not name:
        raise HTTPException(status_code=400, detail="model name is required")  # guard against blank submissions
    start_pull(name)  # fire-and-forget; progress is visible via the /stream SSE endpoint
    return {"status": "started", "model": name}


@router.delete("/{model_name:path}")
async def delete_model(model_name: str, _: str = Depends(admin_dep)):
    """Delete a named model from the local Ollama instance (admin only)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(
                "DELETE",
                f"{OLLAMA_URL}/api/delete",
                json={"name": model_name},
            )
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail="model not found")  # surface Ollama's 404 to the caller
            resp.raise_for_status()  # propagate other non-2xx statuses as 502
    except HTTPException:
        raise  # re-raise 404; do not wrap it in the 502 handler below
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc}") from exc  # wrap unexpected errors as bad gateway
    return {"status": "deleted", "model": model_name}


@router.get("/stream")
async def model_status_stream():
    """Stream real-time model status as Server-Sent Events until all required models are ready."""
    async def generate():
        """Yield SSE payloads with model status and pull progress at one-second intervals."""
        last_payload_str: str | None = None  # tracks the last emitted payload to suppress duplicate frames
        tags_cache: dict | None = None       # caches the Ollama /api/tags response; refreshed every 3 iterations

        for iteration in range(1800):  # 30 min at 1 s interval; exits early when all models are ready
            if iteration % 3 == 0:  # refresh the Ollama tag list every 3 seconds to detect completed pulls
                tags_cache = await _check_status()

            base = tags_cache or await _check_status()  # use cached result; fall back to a fresh call on the first iteration
            progress_map = get_model_progress()          # shared dict of live ModelProgress entries

            enriched_models = []
            for m in base["models"]:
                entry = dict(m)                     # copy the base model dict before adding progress fields
                mp = progress_map.get(m["model"])   # look up any active pull progress for this model

                if m["status"] == "ready" or mp is None:
                    entry["progress"] = None  # no progress to report; model is ready or no pull is active
                else:
                    entry["progress"] = mp.as_progress_dict()  # attach the live progress snapshot
                    if mp.phase in ("pulling", "verifying", "writing", "error"):
                        entry["status"] = mp.phase  # override status with the finer-grained pull phase

                enriched_models.append(entry)

            payload = {
                **base,
                "models": enriched_models,
                "server_time": datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3] + "Z",  # millisecond-precision UTC timestamp for client sync
            }
            payload_str = json.dumps(payload)

            if payload_str != last_payload_str:  # only emit when the payload has changed to reduce bandwidth
                last_payload_str = payload_str
                yield f"data: {payload_str}\n\n"  # SSE format: "data: <json>\n\n"

            if base["all_ready"]:
                return  # all models are ready; close the stream so the client stops polling

            await asyncio.sleep(1)  # wait one second before the next status check

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},  # disable buffering at the nginx/proxy layer
    )
