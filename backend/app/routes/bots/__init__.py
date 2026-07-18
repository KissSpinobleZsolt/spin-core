from app.routes.bots.schemas import BotPayload, BotOut  # request/response schemas
from app.routes.bots.router import router  # APIRouter with /api/bots endpoints

__all__ = ["BotPayload", "BotOut", "router"]
