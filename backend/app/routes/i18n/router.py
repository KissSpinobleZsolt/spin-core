from fastapi import APIRouter, Depends, HTTPException

from app.database import get_pg
from app.deps import admin_dep, token_dep

router = APIRouter(prefix="/api/i18n", tags=["i18n"])


@router.get("/{lang}")
async def get_translations(lang: str, _: str = Depends(token_dep)):
    """Return all translation strings for the requested language."""
    data = get_pg().get_i18n_data(lang)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Language '{lang}' not found")
    return data


@router.put("/{lang}")
async def update_translations(
    lang: str,
    data: dict,
    _: str = Depends(admin_dep),
):
    """Replace the full translation dataset for a given language (admin only)."""
    get_pg().set_i18n_data(lang, data)
    return {"ok": True}
