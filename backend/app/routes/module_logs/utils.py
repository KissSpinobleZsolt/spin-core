from fastapi import HTTPException

from app.database import get_pg


def _get_scope(module_id: str) -> str:
    """Resolve the scope name for a module, raising 404 if the module does not exist."""
    mod = get_pg().get_module(module_id)  # look up the module by its UUID primary key
    if not mod:  # module not found; surface a clear 404 before attempting any log write
        raise HTTPException(status_code=404, detail="Module not found")
    return mod["scope"]  # return the Webpack federation scope used as the module_logs.scope filter key
