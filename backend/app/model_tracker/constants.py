import os

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")  # Ollama base URL; mirrors app.config.OLLAMA_URL but kept local to avoid circular imports

_SPEED_WINDOW = 30.0  # rolling window in seconds used to smooth the download speed estimate

_model_progress: dict[str, "ModelProgress"] = {}  # shared registry mapping model name → live ModelProgress; mutated during pull
