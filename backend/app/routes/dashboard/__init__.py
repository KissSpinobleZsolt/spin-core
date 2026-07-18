from app.routes.dashboard.schemas import ThemePayload  # user theme patch schema
from app.routes.dashboard.router import router  # APIRouter with /api/dashboard endpoints

__all__ = ["ThemePayload", "router"]
