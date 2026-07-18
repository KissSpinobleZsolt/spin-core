from pydantic import BaseModel


class PropSchema(BaseModel):
    """Schema for a single prop accepted by a UI component."""
    name: str                  # prop name as used in JSX (e.g. "onClick")
    type: str                  # TypeScript type string (e.g. "string", "() => void")
    default: str | None = None  # default value shown in the catalogue; None means no default
    required: bool = False     # True when the prop must be supplied by the consumer
    description: str           # human-readable explanation of what the prop controls


class UIComponentOut(BaseModel):
    """Response schema for a UI component catalogue entry."""
    id: str              # UUID primary key from the ui_components table
    name: str            # unique component name used as the lookup key
    export: str          # named export from the source file
    file: str            # source file path relative to the frontend src directory
    description: str     # documentation description rendered in the catalogue
    props: list[PropSchema]  # list of accepted props with their metadata
    notes: str | None    # optional freeform developer notes; None when absent
    sort_order: int      # ascending sort key controlling display order in the catalogue


class UIComponentPayload(BaseModel):
    """Request body schema for creating or updating a UI component catalogue entry."""
    name: str                       # unique component name; used as the upsert key
    export: str                     # named export from the source file
    file: str                       # source file path relative to the frontend src directory
    description: str = ""           # documentation description; defaults to empty
    props: list[PropSchema] = []    # prop definitions; empty list means no documented props
    notes: str | None = None        # optional freeform notes; None when not provided
    sort_order: int = 0             # display order; lower values appear first
