from fastapi import HTTPException

from app.database import get_pg


def _get_bot_name(bot_id: str) -> str:
    """Resolve the bot name (used as bot_logs filter key) from a bot ID, raising 404 if missing."""
    bot = get_pg().get_bot_by_id(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot.name
