import os
from pathlib import Path

SEED_PATH = Path(os.getenv("SEED_PATH", "./data/seed.json"))  # path to the JSON seed file; overridable via env var

_FALLBACK_BOT = {  # default bot provisioned when seed.json has no bots section
    "name": "AI Assistant",
    "description": "General-purpose AI assistant powered by Ollama.",
    "type": "communicator",
    "provider": "ollama",
    "model": "qwen2.5:7b",
    "system_prompt": "You are a helpful AI assistant for this platform. Use the platform context above to help users understand what they can do, which pages to visit, and which bots or modules are available. Be concise and friendly.",
    "icon": "💬",
    "active": True,
    "restricted": "user",
    "modules": ["system"],
}
