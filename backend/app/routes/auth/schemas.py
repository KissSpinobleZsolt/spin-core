from pydantic import BaseModel


class LoginCredentials(BaseModel):
    """Request body schema for email and password login."""

    email: str
    password: str
