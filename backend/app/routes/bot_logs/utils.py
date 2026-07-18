from fastapi import HTTPException

from app.database import get_pg


def _get_bot_name(bot_id: str) -> str:
    """Resolve the bot name (used as bot_logs filter key) from a bot ID, raising 404 if missing."""
    bot = get_pg().get_bot_by_id(bot_id)  # look up the bot by its UUID primary key
    if not bot:  # bot not found; surface a clear 404 before attempting any log query
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot.name  # bot_logs is keyed by bot_name, not bot_id
