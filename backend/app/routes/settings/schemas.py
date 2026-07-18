from typing import Literal, Optional

from pydantic import BaseModel


class ThemePayload(BaseModel):
    """Request body schema for updating the platform default theme."""

    theme: Literal["dark", "light"]


class DiscoveredModule(BaseModel):
    """Metadata returned when probing a remote module registry URL."""

    source_url: str
    name: Optional[str] = None
    scope: Optional[str] = None
    component: Optional[str] = None
    route: Optional[str] = None
    icon: Optional[str] = None
    roles: Optional[list[str]] = None
    description: Optional[str] = None
    remote_url: Optional[str] = None
    already_registered: bool = False
    # Populated only when already_registered=True so the frontend can enable disabled modules.
    module_id: Optional[str] = None
    enabled: Optional[bool] = None
    error: Optional[str] = None
