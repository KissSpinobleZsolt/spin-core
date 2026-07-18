from typing import Optional

from pydantic import BaseModel


class PageConfigPatch(BaseModel):
    """Partial update schema for mutable page registry fields."""
    title: Optional[str] = None       # new display title; None means leave unchanged
    roles: Optional[list[str]] = None  # updated role list controlling access; None means leave unchanged
    skeleton: Optional[dict] = None    # updated loading skeleton config; None means leave unchanged
    enabled: Optional[bool] = None     # toggle page visibility; None means leave unchanged
