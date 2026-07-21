import os

# Fallback Ollama model used when neither the bot record nor the request body
# specifies a model.  Cloud-provider bots always carry an explicit model string.
_OLLAMA_DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# ClickHouse scope key used for all chatbot log entries.
_CHATBOT_SCOPE = "chatbot"

# ---------------------------------------------------------------------------
# Platform-context navigation tables
# ---------------------------------------------------------------------------

# Public pages visible to all authenticated users.
_NAV_PUBLIC = [
    ("/",               "Dashboard",    "admin-editable welcome page"),
    ("/bots",           "Bots",         "browse and launch AI bots"),
]

# Admin-only pages appended when the requesting user has the ``admin`` role.
_NAV_ADMIN = [
    ("/admin/logs",     "Logs",         "HTTP and chat log viewer"),
    ("/translations",   "Translations", "live i18n string editor"),
    ("/admin/bots",     "Bot Admin",    "create and manage bots"),
    ("/admin/llms",     "LLM Models",   "Ollama model management"),
    ("/admin/users",    "Users",        "user management"),
    ("/admin/modules",  "Modules",      "micro-frontend registration and logs"),
    ("/admin/status",   "Status",       "live health dashboard"),
]
