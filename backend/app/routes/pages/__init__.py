from app.routes.pages.schemas import PageConfigPatch  # page config patch schema
from app.routes.pages.router import router  # APIRouter with /api/pages endpoints

__all__ = ["PageConfigPatch", "router"]
