from collections import deque
from dataclasses import dataclass, field
from typing import Literal

from app.model_tracker.utils import _fmt_speed

ModelPhase = Literal["pending", "pulling", "verifying", "writing", "done", "error"]  # named phases of an Ollama model pull


@dataclass
class ModelProgress:
    """Tracks the live download state of a single Ollama model pull."""
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
        """Return a serialisable snapshot of the current download progress."""
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
