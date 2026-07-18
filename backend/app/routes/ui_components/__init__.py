from app.routes.ui_components.schemas import PropSchema, UIComponentOut, UIComponentPayload  # component schemas
from app.routes.ui_components.router import router  # APIRouter with /api/ui-components endpoints

__all__ = ["PropSchema", "UIComponentOut", "UIComponentPayload", "router"]
