import os

import httpx

from app.config import OLLAMA_URL


def _required_models() -> list[str]:
    """Return the list of Ollama model names the platform requires, read from environment variables."""
    return [
        m for m in [
            os.getenv("OLLAMA_MODEL", "qwen2.5:7b"),
            os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text:latest"),
        ]
        if m
    ]


async def _check_status() -> dict:
    """Query Ollama for installed models and return ready or pending status for each required model."""
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
