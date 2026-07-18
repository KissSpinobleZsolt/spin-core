from fastapi import HTTPException

from app.database import get_pg


def _check_module(module_id: str) -> None:
    """Raise a 404 HTTP error if the given module ID does not exist."""
    if not get_pg().get_module(module_id):
        raise HTTPException(status_code=404, detail="Module not found")
