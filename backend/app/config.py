"""
Centralised environment-variable configuration for the backend.

All env-var reads live here so that routes and provider adapters import constants
rather than calling ``os.getenv`` scattered throughout the codebase.  Defaults are
chosen to match the Docker Compose service names used in ``docker-compose.yml``.
"""

import os

# ---------------------------------------------------------------------------
# Ollama (self-hosted, default provider)
# ---------------------------------------------------------------------------

#: Base URL of the Ollama HTTP API.  Matches the ``ollama`` Docker Compose service.
OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")

# ---------------------------------------------------------------------------
# Anthropic
# ---------------------------------------------------------------------------

#: Secret API key for the Anthropic Claude API.
#: Required when any bot has ``provider = "anthropic"``.
#: Obtain yours at https://console.anthropic.com/settings/keys.
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

# ---------------------------------------------------------------------------
# OpenAI / OpenAI-compatible
# ---------------------------------------------------------------------------

#: Secret API key for OpenAI or any compatible endpoint (Groq, Mistral, Azure, …).
#: Required when any bot has ``provider = "openai"``.
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

#: Optional base URL override for the OpenAI-compatible provider.
#: Leave unset to use the official ``api.openai.com`` endpoint.
#: Set to e.g. ``https://api.groq.com/openai/v1`` for Groq.
OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "")
