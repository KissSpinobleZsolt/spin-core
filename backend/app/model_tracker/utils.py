import time

from app.model_tracker.constants import _SPEED_WINDOW


def _fmt_speed(bps: float) -> str:
    """Format a bytes-per-second value as a human-readable speed string."""
    if bps >= 1e9:
        return f"{bps / 1e9:.1f} GB/s"
    if bps >= 1e6:
        return f"{bps / 1e6:.1f} MB/s"
    if bps >= 1e3:
        return f"{bps / 1e3:.0f} KB/s"
    return f"{bps:.0f} B/s"


def _fmt_eta(seconds: float) -> str:
    """Format a remaining-time duration in seconds as a human-readable ETA string."""
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    m, s = divmod(s, 60)
    if m < 60:
        return f"{m}m {s}s"
    h, m = divmod(m, 60)
    return f"{h}h {m}m"


def _update_speed_and_eta(mp) -> None:
    """Recalculate the rolling download speed and ETA for a ModelProgress object."""
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


def _process_pull_line(mp, line: dict) -> None:
    """Process one JSON line from Ollama's streaming pull response and update ModelProgress."""
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
