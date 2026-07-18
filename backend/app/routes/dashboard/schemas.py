from typing import Literal

from pydantic import BaseModel


class ThemePayload(BaseModel):
    """Request body schema for updating the authenticated user's theme preference."""

    theme: Literal["dark", "light"]
