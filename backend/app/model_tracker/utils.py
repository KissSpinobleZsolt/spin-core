import time

from app.model_tracker.constants import _SPEED_WINDOW


def _fmt_speed(bps: float) -> str:
    """Format a bytes-per-second value as a human-readable speed string."""
    if bps >= 1e9:  # gigabyte range
        return f"{bps / 1e9:.1f} GB/s"
    if bps >= 1e6:  # megabyte range
        return f"{bps / 1e6:.1f} MB/s"
    if bps >= 1e3:  # kilobyte range; no decimal to avoid "1234.0 KB/s" noise
        return f"{bps / 1e3:.0f} KB/s"
    return f"{bps:.0f} B/s"  # sub-kilobyte range; rare for a model download but included for completeness


def _fmt_eta(seconds: float) -> str:
    """Format a remaining-time duration in seconds as a human-readable ETA string."""
    s = int(seconds)  # truncate to whole seconds; fractional seconds are not useful at this scale
    if s < 60:  # less than a minute: show seconds only
        return f"{s}s"
    m, s = divmod(s, 60)  # decompose into minutes and remaining seconds
    if m < 60:  # less than an hour: show minutes and seconds
        return f"{m}m {s}s"
    h, m = divmod(m, 60)  # decompose into hours and remaining minutes
    return f"{h}h {m}m"  # hour-scale ETA: omit seconds as they are insignificant


def _update_speed_and_eta(mp) -> None:
    """Recalculate the rolling download speed and ETA for a ModelProgress object."""
    now = time.monotonic()  # use monotonic clock to avoid wall-clock jumps skewing the window

    # Only add a sample when bytes actually advanced.
    # Duplicate-bytes samples (stall) would corrupt the rolling average as
    # old high-byte samples age out, making speed appear to crash.
    last_bytes = mp.speed_samples[-1][1] if mp.speed_samples else -1  # last recorded byte count, or -1 to force first sample
    if mp.completed_bytes > last_bytes:  # progress has advanced since the last sample
        mp.speed_samples.append((now, mp.completed_bytes))  # record the new (time, bytes) measurement

    cutoff = now - _SPEED_WINDOW  # discard samples older than the rolling window boundary
    while mp.speed_samples and mp.speed_samples[0][0] < cutoff:
        mp.speed_samples.popleft()  # evict stale samples from the left (oldest) end of the deque

    if len(mp.speed_samples) < 2:  # need at least two points to compute a rate
        mp.speed_bps = 0.0  # cannot compute speed; report zero
        mp.eta_str = None   # cannot compute ETA without speed
        return

    t0, b0 = mp.speed_samples[0]   # oldest point in the window
    t1, b1 = mp.speed_samples[-1]  # newest point in the window
    dt = t1 - t0  # elapsed time across the window in seconds
    if dt <= 0:  # degenerate case: all samples share the same timestamp
        mp.speed_bps = 0.0
        mp.eta_str = None
        return

    # Clamp to zero — negative values signal a reconnect artifact, not real data.
    mp.speed_bps = max(0.0, (b1 - b0) / dt)  # bytes-per-second over the rolling window
    remaining = mp.total_bytes - mp.completed_bytes  # bytes left to download
    mp.eta_str = _fmt_eta(remaining / mp.speed_bps) if mp.speed_bps > 0 and remaining > 0 else None  # avoid division-by-zero; None means ETA unavailable


def _process_pull_line(mp, line: dict) -> None:
    """Process one JSON line from Ollama's streaming pull response and update ModelProgress."""
    status = line.get("status", "")  # top-level status string from Ollama's NDJSON response

    if status == "success":  # Ollama signals the pull is fully complete
        mp.phase = "done"
        mp.completed_bytes = mp.total_bytes  # mark progress at 100% for a clean final state
        mp.speed_bps = 0.0  # no ongoing transfer
        mp.eta_str = None   # no ETA needed after completion
        return

    if "verifying sha256" in status:  # layer checksums are being verified after download
        mp.phase = "verifying"
        return

    if "writing manifest" in status:  # Ollama is writing the local model manifest
        mp.phase = "writing"
        return

    digest = line.get("digest")      # layer content-address hash identifying the current layer
    total = line.get("total")        # total bytes expected for this layer
    completed = line.get("completed")  # bytes received so far for this layer
    if digest and total is not None and completed is not None:  # a layer progress update
        mp.phase = "pulling"
        mp.layers[digest] = {"total": total, "completed": completed}  # update per-layer tracking dict
        new_total = sum(v["total"] for v in mp.layers.values())         # aggregate total across all discovered layers
        new_completed = sum(v["completed"] for v in mp.layers.values()) # aggregate completed bytes across all layers
        # total_bytes only grows (new layers discovered during pull)
        mp.total_bytes = max(mp.total_bytes, new_total)
        # completed_bytes is monotonic — reconnect can cause Ollama to report
        # a lower value for a layer it already reported; ignore those.
        if new_completed >= mp.completed_bytes:  # only advance; never regress the progress counter
            mp.completed_bytes = new_completed
            _update_speed_and_eta(mp)  # refresh speed and ETA after each progress update
