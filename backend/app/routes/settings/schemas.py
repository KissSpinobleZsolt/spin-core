from typing import Literal, Optional

from pydantic import BaseModel


class ThemePayload(BaseModel):
    """Request body schema for updating the platform default theme."""

    theme: Literal["dark", "light"]  # the new platform default theme; constrained to the two valid values


class DiscoveredModule(BaseModel):
    """Metadata returned when probing a remote module registry URL."""

    source_url: str                       # URL of the registry endpoint that was probed
    name: Optional[str] = None            # display name from the manifest; None on probe failure
    scope: Optional[str] = None           # Webpack federation scope from the manifest
    component: Optional[str] = None       # exposed component path (e.g. "./App")
    route: Optional[str] = None           # URL slug under /modules/
    icon: Optional[str] = None            # emoji icon from the manifest
    roles: Optional[list[str]] = None     # role slugs restricting access from the manifest
    description: Optional[str] = None     # short description from the manifest
    remote_url: Optional[str] = None      # browser-accessible URL to remoteEntry.js
    already_registered: bool = False      # True when the scope is already in the modules table
    # Populated only when already_registered=True so the frontend can enable disabled modules.
    module_id: Optional[str] = None       # existing module UUID when already_registered=True
    enabled: Optional[bool] = None        # current enabled flag when already_registered=True
    error: Optional[str] = None           # error message when the probe request failed
