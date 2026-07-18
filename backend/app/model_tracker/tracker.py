import asyncio
import json

import httpx

from app.model_tracker.constants import OLLAMA_URL, _model_progress
from app.model_tracker.types import ModelProgress
from app.model_tracker.utils import _process_pull_line


def get_model_progress() -> dict[str, ModelProgress]:  # returns the shared registry for all route and SSE consumers
    return _model_progress  # direct reference; callers receive the live mutable dict


async def _track_model(model: str) -> None:
    """Stream an Ollama model pull and update the shared ModelProgress entry until done."""
    mp = ModelProgress(model=model)  # create a fresh progress entry in the pending phase
    _model_progress[model] = mp      # register it immediately so SSE consumers see it right away

    while True:  # retry loop; resumes on transient network errors until the pull succeeds or is cancelled
        try:
            timeout = httpx.Timeout(connect=10.0, read=None, write=10.0, pool=10.0)  # unlimited read timeout so long-running pulls never time out mid-stream
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/pull",
                    json={"name": model, "stream": True},  # stream=True makes Ollama emit NDJSON progress lines
                    timeout=timeout,
                ) as resp:
                    resp.raise_for_status()  # surface 4xx/5xx from Ollama before reading the body
                    async for raw_line in resp.aiter_lines():  # consume NDJSON stream one line at a time
                        if not raw_line.strip():  # skip blank keep-alive lines
                            continue
                        try:
                            line = json.loads(raw_line)  # parse each NDJSON object
                        except json.JSONDecodeError:
                            continue  # ignore malformed lines rather than crashing the tracker
                        _process_pull_line(mp, line)  # update ModelProgress from the parsed Ollama line
                        if mp.phase == "done":  # Ollama confirmed the pull is complete
                            return
        except asyncio.CancelledError:
            return  # honour cancellation and exit cleanly without logging
        except httpx.ConnectError:
            mp.error = "ollama unreachable — retrying"  # surface connectivity failure in the SSE feed
            await asyncio.sleep(5)  # back off before retrying to avoid hammering an unavailable service
        except Exception as exc:
            mp.error = str(exc)  # surface unexpected errors without losing the progress entry
            await asyncio.sleep(5)  # brief delay before retrying to avoid a tight error loop


async def run_sequential_trackers(models: list[str]) -> None:
    """Pull a list of Ollama models one after another, waiting for each to complete."""
    for model in models:  # sequential pull; each model must finish before the next starts
        await _track_model(model)  # await ensures we block until this pull reaches phase="done"


def start_pull(model: str) -> None:
    """Fire-and-forget pull for an arbitrary model name."""
    existing = _model_progress.get(model)  # check if a pull is already registered for this model
    if existing and existing.phase in ("pending", "pulling", "verifying", "writing"):
        return  # a pull is already in flight; do not start a duplicate task
    asyncio.create_task(_track_model(model))  # schedule the pull coroutine on the running event loop
