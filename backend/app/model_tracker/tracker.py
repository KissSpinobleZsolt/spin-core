import asyncio
import json

import httpx

from app.model_tracker.constants import OLLAMA_URL, _model_progress
from app.model_tracker.types import ModelProgress
from app.model_tracker.utils import _process_pull_line


def get_model_progress() -> dict[str, ModelProgress]:  # returns the shared registry for all route and SSE consumers
    return _model_progress


async def _track_model(model: str) -> None:
    """Stream an Ollama model pull and update the shared ModelProgress entry until done."""
    mp = ModelProgress(model=model)
    _model_progress[model] = mp

    while True:
        try:
            timeout = httpx.Timeout(connect=10.0, read=None, write=10.0, pool=10.0)
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/pull",
                    json={"name": model, "stream": True},
                    timeout=timeout,
                ) as resp:
                    resp.raise_for_status()
                    async for raw_line in resp.aiter_lines():
                        if not raw_line.strip():
                            continue
                        try:
                            line = json.loads(raw_line)
                        except json.JSONDecodeError:
                            continue
                        _process_pull_line(mp, line)
                        if mp.phase == "done":
                            return
        except asyncio.CancelledError:
            return
        except httpx.ConnectError:
            mp.error = "ollama unreachable — retrying"
            await asyncio.sleep(5)
        except Exception as exc:
            mp.error = str(exc)
            await asyncio.sleep(5)


async def run_sequential_trackers(models: list[str]) -> None:
    """Pull a list of Ollama models one after another, waiting for each to complete."""
    for model in models:
        await _track_model(model)


def start_pull(model: str) -> None:
    """Fire-and-forget pull for an arbitrary model name."""
    existing = _model_progress.get(model)
    if existing and existing.phase in ("pending", "pulling", "verifying", "writing"):
        return
    asyncio.create_task(_track_model(model))
