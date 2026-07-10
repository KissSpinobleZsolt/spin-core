# spin-core / backend

FastAPI backend for the spin-core platform.

## Tech

- **Framework**: FastAPI
- **Runtime**: Python 3.12, uvicorn
- **Database**: PostgreSQL (SQLAlchemy + psycopg2) **or** MongoDB (pymongo) — chosen during first-time setup
- **Auth**: JWT via python-jose, password hashing via bcrypt
- **Config persistence**: `/app/data/settings.json` (Docker volume)

## Running locally

```bash
pip install -r requirements.txt
SETTINGS_PATH=./data/settings.json \
JWT_SECRET_KEY=change-me \
uvicorn app.main:app --reload --port 8000
```

On first run the backend starts in setup mode (no DB connection required) until setup is completed via `POST /api/setup/complete`.

Or via Docker Compose from the project root:

```bash
docker compose up backend db mongo
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SETTINGS_PATH` | `/app/data/settings.json` | Path to the settings file |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing secret — change before deploying |

## First-time setup

On first startup `settings.json` does not exist, so the backend starts in **setup mode**:
- Only `GET /api/setup/status` and `POST /api/setup/complete` are functional
- All other routes that require a DB return errors

The frontend automatically detects setup mode and redirects to the setup wizard.

## API endpoints

All routes are prefixed with `/api`.

### Setup (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/setup/status` | Returns `{ setup_complete: bool }` |
| `POST` | `/api/setup/test-connection` | Test a DB connection before committing |
| `POST` | `/api/setup/complete` | Complete setup — writes settings, creates admin user |

`POST /api/setup/complete` body:
```json
{
  "db_type": "postgres",
  "db_url": "postgresql://...",
  "admin_name": "Jane Doe",
  "admin_email": "admin@example.com",
  "admin_password": "securepassword",
  "default_theme": "dark",
  "modules": []
}
```

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | No | Returns JWT token |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/dashboard` | Bearer token | Returns dashboard page content |

### User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `/api/user/theme` | Bearer token | Set preferred theme (`dark` or `light`) |

### Settings (admin role required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Full settings (db_url excluded) |
| `PATCH` | `/api/settings/theme` | Update default theme |
| `GET` | `/api/settings/modules` | List registered modules |
| `POST` | `/api/settings/modules` | Add a module |
| `PUT` | `/api/settings/modules/{id}` | Update a module |
| `DELETE` | `/api/settings/modules/{id}` | Delete a module |

### Data ingestion

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/data-ingestion` | No | Submit data payload for async processing |
| `WS` | `/api/data-ingestion-listener/{client_id}` | No | WebSocket — receive processing status updates |
| `GET` | `/api/data-ingestion-response/{client_id}` | No | Poll for the final processed result |

**Data ingestion flow:**
1. `POST /api/data-ingestion` → returns `accepted`.
2. Connect WebSocket at `/api/data-ingestion-listener/{client_id}` to receive status messages.
3. When the WebSocket delivers `CALL_OUTPUT_ENDPOINT`, fetch `GET /api/data-ingestion-response/{client_id}` for the result.

## Project structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app, all routes, WebSocket manager
│   ├── settings.py       # AppSettings dataclass, read/write settings.json
│   ├── database.py       # Lazy DB init, get_adapter()
│   ├── auth.py           # JWT creation/validation, password hashing
│   ├── models.py         # (superseded — see db/postgres.py)
│   └── db/
│       ├── interface.py  # DBAdapter protocol + UserRecord dataclass
│       ├── postgres.py   # SQLAlchemy adapter (UserRow, PageRow)
│       └── mongo.py      # pymongo adapter
├── requirements.txt
└── Dockerfile
```
