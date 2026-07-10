# spin-core / backend

FastAPI backend for the spin-core platform.

## Tech

- **Framework**: FastAPI, Python 3.12, uvicorn
- **Primary DB**: PostgreSQL 16 via SQLAlchemy + psycopg2 (users, pages)
- **Log DB**: ClickHouse 24 via clickhouse-driver (append-only event log)
- **Module DB**: MongoDB 7 via pymongo (generic document store for installed modules)
- **Auth**: JWT via python-jose, password hashing via bcrypt
- **Config**: `/app/data/settings.json` on a Docker / Kubernetes volume

## Architecture

All three databases are always initialised at startup via `init_db()`. Each has a fixed role — there is no user-selectable DB mode.

```
get_pg()    → PostgresAdapter      — users, pages, admin ops
get_ch()    → ClickHouseLogAdapter — write_log() / query_logs()
get_mongo() → MongoDataAdapter     — get/insert/update/delete documents per module
```

Every HTTP request is automatically appended to ClickHouse by the middleware in `main.py`.

## Running locally

```bash
pip install -r requirements.txt
SETTINGS_PATH=./data/settings.json \
JWT_SECRET_KEY=change-me \
ADMIN_EMAIL=admin@spin.local \
ADMIN_PASSWORD=change-me \
POSTGRES_URL=postgresql://core-postgres:core-postgres@localhost:5432/core-postgres \
MONGO_URL=mongodb://core-mongo:core-mongo@localhost:27017/core-mongo?authSource=admin \
CLICKHOUSE_URL=clickhouse://core-ch:core-ch@localhost:9000/core \
uvicorn app.main:app --reload --port 8000
```

Or via Docker Compose from the project root:

```bash
docker compose up backend db mongo clickhouse
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@spin.local` | Admin login email seeded on first run — **change before deploying** |
| `ADMIN_PASSWORD` | `change-me` | Admin password seeded on first run — **change before deploying** |
| `ADMIN_NAME` | `Admin` | Admin display name |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing secret — **change before deploying** |
| `SETTINGS_PATH` | `/app/data/settings.json` | Path to the settings file |
| `POSTGRES_URL` | `postgresql://core-postgres:core-postgres@db:5432/core-postgres` | Primary DB |
| `MONGO_URL` | `mongodb://core-mongo:core-mongo@mongo:27017/core-mongo?authSource=admin` | Module data store |
| `CLICKHOUSE_URL` | `clickhouse://core-ch:core-ch@clickhouse:9000/core` | Event log DB |

## Admin bootstrap

There is no setup wizard. On startup the lifespan hook checks whether a user with `ADMIN_EMAIL` exists in PostgreSQL. If not, it creates one using `ADMIN_PASSWORD` and `ADMIN_NAME`. Subsequent restarts skip the seed.

Log output on first run:
```
[spin-core] Admin user created: admin@spin.local
```

Default i18n translations (EN + RO) are also seeded into MongoDB on first run in the same way.

## API reference

All routes are prefixed with `/api`.

### Setup (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/setup/status` | `{ setup_complete: bool }` |
| `POST` | `/api/setup/complete` | Create admin user, write settings, mark complete |

`POST /api/setup/complete` body:
```json
{
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
| `POST` | `/api/auth/login` | No | Returns JWT + user object. Login is also appended to ClickHouse. |

### Dashboard & user

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/dashboard` | Bearer | Returns dashboard page content from PostgreSQL |
| `PATCH` | `/api/user/theme` | Bearer | Update user's preferred theme |

### Settings (admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Full `AppSettings` (theme + modules) |
| `PATCH` | `/api/settings/theme` | Update default theme |
| `GET` | `/api/settings/modules` | List registered modules |
| `POST` | `/api/settings/modules` | Add a module |
| `PUT` | `/api/settings/modules/{id}` | Update a module |
| `DELETE` | `/api/settings/modules/{id}` | Delete a module |

### Logs (admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/logs` | Query ClickHouse event log. Query params: `limit`, `offset`, `event_type`, `user_email` |

### Translations (i18n)

Translations are stored in MongoDB (`system__i18n` collection) and seeded from `app/i18n_defaults.py` on first startup.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/i18n/{lang}` | No | Return full translation object for `lang` (e.g. `en`, `ro`) |
| `PUT` | `/api/i18n/{lang}` | Admin | Replace translation object for `lang` |

`GET /api/i18n/{lang}` is intentionally public so the frontend can fetch translations before the user logs in.

### Module data (any authenticated user)

Namespaced MongoDB collections for installed modules. Collections are stored as `{module_id}__{collection}`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/module-data/{moduleId}/{collection}` | List documents (`limit`, `skip`) |
| `POST` | `/api/module-data/{moduleId}/{collection}` | Insert document |
| `PUT` | `/api/module-data/{moduleId}/{collection}/{docId}` | Update document |
| `DELETE` | `/api/module-data/{moduleId}/{collection}/{docId}` | Delete document |

### Data ingestion (WebSocket)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/data-ingestion` | Submit payload for async processing |
| `WS` | `/api/data-ingestion-listener/{client_id}` | Receive processing status updates |
| `GET` | `/api/data-ingestion-response/{client_id}` | Poll for final result |

## Project structure

```
backend/
├── app/
│   ├── main.py           # App factory, HTTP logging middleware, router registration
│   ├── settings.py       # AppSettings dataclass, read/write settings.json
│   ├── database.py       # init_db(), get_pg() / get_ch() / get_mongo()
│   ├── auth.py           # JWT creation/validation, password hashing
│   ├── deps.py           # require_token / require_admin
│   ├── state.py          # In-process AppSettings singleton
│   ├── i18n_defaults.py  # Default EN + RO translations (seeded into MongoDB on first run)
│   ├── models.py         # (placeholder — SQLAlchemy models live in db/postgres.py)
│   └── db/
│       ├── interface.py  # AppAdapter protocol + UserRecord dataclass
│       ├── postgres.py   # PostgresAdapter — users + pages via SQLAlchemy
│       ├── clickhouse.py # ClickHouseLogAdapter — MergeTree log table
│       └── mongo.py      # MongoDataAdapter — generic collection CRUD + i18n helpers
├── routes/
│   ├── setup.py          # /api/setup/*
│   ├── auth.py           # /api/auth/login
│   ├── dashboard.py      # /api/dashboard, /api/user/theme
│   ├── settings.py       # /api/settings/*
│   ├── logs.py           # /api/logs
│   ├── module_data.py    # /api/module-data/*
│   ├── i18n.py           # /api/i18n/{lang}
│   └── ingestion.py      # /api/data-ingestion + WebSocket
├── requirements.txt
└── Dockerfile
```
