from app.routes.auth.schemas import LoginCredentials  # request body schema
from app.routes.auth.router import router  # APIRouter with /api/auth endpoints

__all__ = ["LoginCredentials", "router"]
