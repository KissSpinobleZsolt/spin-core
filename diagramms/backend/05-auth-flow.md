# Authentication & Authorization Flow

Login produces a 24-hour HS256 JWT. Every subsequent request validates it via `token_dep` (any user) or `admin_dep` (role check in PostgreSQL). Defined in `backend/app/auth/` and `backend/app/deps/`.

```mermaid
sequenceDiagram
    participant C as Client
    participant A as auth/router
    participant D as deps/token.py
    participant DA as deps/admin.py
    participant PG as PostgreSQL
    participant CH as ClickHouse

    Note over C,CH: LOGIN
    C->>A: POST /api/auth/login {email, password}
    A->>PG: get_user_by_email(email)
    PG-->>A: UserRecord
    A->>A: verify_password(plain, hashed) [bcrypt]
    A->>A: create_token(email) [HS256, 24h]
    A->>CH: write user.login to user_logs
    A-->>C: {access_token, name, roles, defaultTheme}

    Note over C,CH: AUTHENTICATED REQUEST (any user)
    C->>A: GET /api/bots  Authorization: Bearer token
    A->>D: require_token(authorization)
    D->>D: decode_token() → email [python-jose]
    D-->>A: email
    A->>PG: get_bots(admin=False, user_roles)
    A-->>C: [BotOut, ...]

    Note over C,CH: ADMIN REQUEST
    C->>A: DELETE /api/bots/{id}  Authorization: Bearer token
    A->>DA: require_admin(authorization)
    DA->>DA: decode_token() → email
    DA->>PG: get_user_by_email(email) → check roles
    alt "admin" not in roles
        DA-->>C: HTTP 403 Forbidden
    else has admin role
        DA-->>A: email
        A->>PG: delete_bot(id)
        A->>CH: write bot.delete to app_logs
        A-->>C: HTTP 204
    end
```
