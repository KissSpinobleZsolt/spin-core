import os

import httpx

from app.config import OLLAMA_URL


def _required_models() -> list[str]:
    """Return the list of Ollama model names the platform requires, read from environment variables."""
    return [
        m for m in [
            os.getenv("OLLAMA_MODEL", "qwen2.5:7b"),             # primary inference model
            os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text:latest"),  # embedding model for vector search
        ]
        if m  # filter out empty strings in case env vars are explicitly set to ""
    ]


async def _check_status() -> dict:
    """Query Ollama for installed models and return ready or pending status for each required model."""
    required = _required_models()  # list of model names the platform needs
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")  # Ollama's model list endpoint
            resp.raise_for_status()  # treat any non-2xx as unreachable
            data = resp.json()
    except Exception:
        return {  # Ollama is not reachable; report all models as unknown
            "ollama": "unreachable",
            "all_ready": False,
            "models": [{"model": m, "status": "unknown", "size_bytes": None} for m in required],
        }

    available: dict[str, dict] = {m["name"]: m for m in data.get("models", [])}  # index by full model name for O(1) lookup

    models = []
    for name in required:
        info = available.get(name)  # exact-name match first
        if info is None:
            base = name.split(":")[0]  # strip the tag (e.g. "qwen2.5" from "qwen2.5:7b") for prefix matching
            info = next(
                (v for k, v in available.items() if k == base or k.startswith(base + ":")),
                None,
            )  # fuzzy match: accept "qwen2.5:latest" when "qwen2.5:7b" is required but unlisted
        models.append({
            "model": name,
            "status": "ready" if info else "pending",         # pending means the model needs to be pulled
            "size_bytes": info.get("size") if info else None,  # None when the model is absent
        })

    return {
        "ollama": "ok",
        "all_ready": all(m["status"] == "ready" for m in models),  # True only when every required model is present
        "models": models,
    }
