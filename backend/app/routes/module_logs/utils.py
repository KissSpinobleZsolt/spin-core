from fastapi import HTTPException

from app.database import get_pg


def _get_scope(module_id: str) -> str:
    """Resolve the scope name for a module, raising 404 if the module does not exist."""
    mod = get_pg().get_module(module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    return mod["scope"]
