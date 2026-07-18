from app.routes.module_data.schemas import DocPayload  # module document request schema
from app.routes.module_data.router import router  # APIRouter with /api/module-data endpoints

__all__ = ["DocPayload", "router"]
