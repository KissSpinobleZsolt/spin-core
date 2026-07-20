# Model Pull Tracker State Machine

Tracks the download progress of Ollama models. The shared `ModelProgress` dict is consumed by `GET /api/model-status/stream` (SSE) so the frontend can show live pull progress. Defined in `backend/app/model_tracker/`.

```mermaid
stateDiagram-v2
    [*] --> pending : model added to required list\n(OLLAMA_MODEL or OLLAMA_EMBED_MODEL)

    pending --> pulling : Ollama pull stream started\nphase = "pulling manifest"

    pulling --> pulling : NDJSON progress lines received\nupdates layers dict\nrolling speed window (30s, maxlen=300)\neta_str recalculated

    pulling --> verifying : phase = "verifying digest"
    verifying --> writing : phase = "writing manifest"
    writing --> done : status = "success"

    pulling --> error : HTTP error or connection failure\n5s backoff then retry from pending

    done --> [*] : model available in Ollama

    note right of pulling
        ModelProgress fields:
        - model: str
        - phase: str
        - layers: dict[digest → {total, completed}]
        - speed_samples: deque(maxlen=300)
        - speed_bps: float (bytes/sec)
        - total_bytes / completed_bytes: int
        - eta_str: str (human readable)
    end note
```
