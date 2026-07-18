from app.db.interface.bot_record import BotRecord  # database-agnostic bot dataclass
from app.db.interface.user_record import UserRecord  # database-agnostic user dataclass

__all__ = ["BotRecord", "UserRecord"]
