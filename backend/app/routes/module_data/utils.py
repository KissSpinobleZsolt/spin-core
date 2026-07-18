from fastapi import HTTPException

from app.database import get_pg


def _check_module(module_id: str) -> None:
    """Raise a 404 HTTP error if the given module ID does not exist."""
    if not get_pg().get_module(module_id):  # look up the module; returns None when absent
        raise HTTPException(status_code=404, detail="Module not found")  # 404 signals invalid module_id to the caller
