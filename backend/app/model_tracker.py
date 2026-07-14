import asyncio
import json
import os
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Literal

import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
ModelPhase = Literal["pending", "pulling", "verifying", "writing", "done", "error"]

_model_progress: dict[str, "ModelProgress"] = {}


@dataclass
class ModelProgress:
    model: str
    phase: ModelPhase = "pending"
    layers: dict[str, dict] = field(default_factory=dict)
    speed_samples: deque = field(default_factory=lambda: deque(maxlen=300))
    speed_bps: float = 0.0
    total_bytes: int = 0
    completed_bytes: int = 0
    eta_str: str | None = None
    error: str | None = None

    def as_progress_dict(self) -> dict:
        pct = (self.completed_bytes / self.total_bytes * 100.0) if self.total_bytes else 0.0
        # Round speed to nearest KB/s — sub-kilobyte noise causes constant SSE frames
        # even when nothing meaningful has changed, defeating the dedup check.
        speed = round(self.speed_bps, -3)
        return {
            "phase": self.phase,
            "total_bytes": self.total_bytes,
            "completed_bytes": self.completed_bytes,
            "percent": round(pct, 1),
            "speed_bps": speed,
            "speed_str": _fmt_speed(speed),
            "eta_str": self.eta_str,
        }


def get_model_progress() -> dict[str, ModelProgress]:
    return _model_progress


def _fmt_speed(bps: float) -> str:
    if bps >= 1e9:
        return f"{bps / 1e9:.1f} GB/s"
    if bps >= 1e6:
        return f"{bps / 1e6:.1f} MB/s"
    if bps >= 1e3:
        return f"{bps / 1e3:.0f} KB/s"
    return f"{bps:.0f} B/s"


def _fmt_eta(seconds: float) -> str:
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    m, s = divmod(s, 60)
    if m < 60:
        return f"{m}m {s}s"
    h, m = divmod(m, 60)
    return f"{h}h {m}m"


_SPEED_WINDOW = 30.0  # seconds — wider window gives smoother ETA


def _update_speed_and_eta(mp: ModelProgress) -> None:
    now = time.monotonic()

    # Only add a sample when bytes actually advanced.
    # Duplicate-bytes samples (stall) would corrupt the rolling average as
    # old high-byte samples age out, making speed appear to crash.
    last_bytes = mp.speed_samples[-1][1] if mp.speed_samples else -1
    if mp.completed_bytes > last_bytes:
        mp.speed_samples.append((now, mp.completed_bytes))

    cutoff = now - _SPEED_WINDOW
    while mp.speed_samples and mp.speed_samples[0][0] < cutoff:
        mp.speed_samples.popleft()

    if len(mp.speed_samples) < 2:
        mp.speed_bps = 0.0
        mp.eta_str = None
        return

    t0, b0 = mp.speed_samples[0]
    t1, b1 = mp.speed_samples[-1]
    dt = t1 - t0
    if dt <= 0:
        mp.speed_bps = 0.0
        mp.eta_str = None
        return

    # Clamp to zero — negative values signal a reconnect artifact, not real data.
    mp.speed_bps = max(0.0, (b1 - b0) / dt)
    remaining = mp.total_bytes - mp.completed_bytes
    mp.eta_str = _fmt_eta(remaining / mp.speed_bps) if mp.speed_bps > 0 and remaining > 0 else None


def _process_pull_line(mp: ModelProgress, line: dict) -> None:
    status = line.get("status", "")

    if status == "success":
        mp.phase = "done"
        mp.completed_bytes = mp.total_bytes
        mp.speed_bps = 0.0
        mp.eta_str = None
        return

    if "verifying sha256" in status:
        mp.phase = "verifying"
        return

    if "writing manifest" in status:
        mp.phase = "writing"
        return

    digest = line.get("digest")
    total = line.get("total")
    completed = line.get("completed")
    if digest and total is not None and completed is not None:
        mp.phase = "pulling"
        mp.layers[digest] = {"total": total, "completed": completed}
        new_total = sum(v["total"] for v in mp.layers.values())
        new_completed = sum(v["completed"] for v in mp.layers.values())
        # total_bytes only grows (new layers discovered during pull)
        mp.total_bytes = max(mp.total_bytes, new_total)
        # completed_bytes is monotonic — reconnect can cause Ollama to report
        # a lower value for a layer it already reported; ignore those.
        if new_completed >= mp.completed_bytes:
            mp.completed_bytes = new_completed
            _update_speed_and_eta(mp)


async def _track_model(model: str) -> None:
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
    for model in models:
        await _track_model(model)
