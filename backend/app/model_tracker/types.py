from collections import deque
from dataclasses import dataclass, field
from typing import Literal

from app.model_tracker.utils import _fmt_speed

ModelPhase = Literal["pending", "pulling", "verifying", "writing", "done", "error"]  # named phases of an Ollama model pull


@dataclass
class ModelProgress:
    """Tracks the live download state of a single Ollama model pull."""
    model: str                                                          # Ollama model name being pulled (e.g. "qwen2.5:7b")
    phase: ModelPhase = "pending"                                       # current pull phase; updated by _process_pull_line
    layers: dict[str, dict] = field(default_factory=dict)              # per-layer progress keyed by layer digest
    speed_samples: deque = field(default_factory=lambda: deque(maxlen=300))  # rolling (timestamp, bytes) window for speed calculation
    speed_bps: float = 0.0                                              # current download speed in bytes per second
    total_bytes: int = 0                                                # total bytes expected across all discovered layers
    completed_bytes: int = 0                                            # bytes received so far across all layers; monotonically increasing
    eta_str: str | None = None                                          # human-readable estimated time to completion; None when unavailable
    error: str | None = None                                            # last error message from a failed pull attempt; None when healthy

    def as_progress_dict(self) -> dict:
        """Return a serialisable snapshot of the current download progress."""
        pct = (self.completed_bytes / self.total_bytes * 100.0) if self.total_bytes else 0.0  # percentage complete; avoid division by zero before first layer arrives
        # Round speed to nearest KB/s — sub-kilobyte noise causes constant SSE frames
        # even when nothing meaningful has changed, defeating the dedup check.
        speed = round(self.speed_bps, -3)  # round to nearest 1000 bytes/s to reduce SSE churn
        return {  # serialisable dict consumed by the model-status SSE endpoint
            "phase": self.phase,
            "total_bytes": self.total_bytes,
            "completed_bytes": self.completed_bytes,
            "percent": round(pct, 1),
            "speed_bps": speed,
            "speed_str": _fmt_speed(speed),
            "eta_str": self.eta_str,
        }
