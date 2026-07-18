from app.routes.settings.schemas import ThemePayload, DiscoveredModule  # request/response schemas
from app.routes.settings.router import router  # APIRouter with /api/settings endpoints

__all__ = ["ThemePayload", "DiscoveredModule", "router"]
