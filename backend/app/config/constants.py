"""
Centralised environment-variable configuration for the backend.

All env-var reads live here so that routes and provider adapters import constants
rather than calling ``os.getenv`` scattered throughout the codebase.  Defaults are
chosen to match the Docker Compose service names used in ``docker-compose.yml``.
"""

import os

OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")  # base URL of the Ollama HTTP API; matches the ``ollama`` Docker Compose service

ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")  # secret API key for the Anthropic Claude API; required when any bot has ``provider = "anthropic"``

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")  # secret API key for OpenAI or any compatible endpoint; required when any bot has ``provider = "openai"``

OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "")  # optional base URL override for the OpenAI-compatible provider; leave unset to use the official endpoint
