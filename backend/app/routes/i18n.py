from fastapi import APIRouter, Header, HTTPException

from app.database import get_mongo
from app.deps import require_admin

router = APIRouter(prefix="/api/i18n", tags=["i18n"])


@router.get("/{lang}")
async def get_translations(lang: str):
    data = get_mongo().get_i18n_data(lang)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Language '{lang}' not found")
    return data


@router.put("/{lang}")
async def update_translations(
    lang: str,
    data: dict,
    authorization: str = Header(default=""),
):
    require_admin(authorization)
    get_mongo().set_i18n_data(lang, data)
    return {"ok": True}
