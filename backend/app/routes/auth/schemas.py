from pydantic import BaseModel


class LoginCredentials(BaseModel):
    """Request body schema for email and password login."""

    email: str     # user's registered email address; used as the identity key
    password: str  # plain-text password; compared against the bcrypt hash stored in Postgres
