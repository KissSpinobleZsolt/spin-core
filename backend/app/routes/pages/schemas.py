from typing import Optional

from pydantic import BaseModel


class PageConfigPatch(BaseModel):
    title: Optional[str] = None
    roles: Optional[list[str]] = None
    skeleton: Optional[dict] = None
    enabled: Optional[bool] = None
