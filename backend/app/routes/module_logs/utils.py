from fastapi import HTTPException

from app.database import get_pg


def _get_scope(module_id: str) -> str:
    """Resolve the scope name for a module, raising 404 if the module does not exist.

    Accepts either a UUID primary key or a Webpack federation scope string so module
    backends can call the log endpoint using their own scope without knowing the DB id.
    """
    pg = get_pg()
    mod = pg.get_module(module_id) or pg.get_module_by_scope(module_id)  # UUID first, scope string as fallback
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    return mod["scope"]
