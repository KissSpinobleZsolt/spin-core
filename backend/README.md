# spin-core / backend

FastAPI backend for the spin-core platform.

## Tech

- **Framework**: FastAPI, Python 3.12, uvicorn
- **Primary DB**: PostgreSQL 16 via SQLAlchemy + psycopg2 (users, pages)
- **Log DB**: ClickHouse 24 via clickhouse-driver (append-only event log)
- **Module DB**: MongoDB 7 via pymongo (generic document store for installed modules)
- **Auth**: JWT via python-jose, password hashing via bcrypt
- **AI proxy**: httpx — async streaming proxy to Ollama for the `/api/chat` endpoint
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
docker compose up backend postgres mongo clickhouse
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
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API base URL (K8s: injected from ConfigMap) |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Model used as the default for `POST /api/chat`. Override to switch models without a code change. |
| `CHATBOT_REMOTE_URL` | `http://localhost:3002/remoteEntry.js` | Browser-accessible URL of the chatbot MF remote, stored in settings on first run |
| `MODULE_REGISTRY_URLS` | _(empty)_ | Comma-separated base URLs scanned for `manifest.json` by `GET /api/settings/modules/discover` |

## Admin bootstrap

There is no setup wizard. The lifespan hook seeds the following on first run (all checks are idempotent — subsequent restarts skip already-present data):

| What | Guard | Log line |
|------|-------|----------|
| Admin user | email not in PostgreSQL | `[spin-core] Admin user created: …` |
| i18n translations (EN + RO) | language key absent in MongoDB | _(silent)_ |
| Chatbot module | no module with `scope == "chatbot"` in `settings.json` | `[spin-core] Chatbot module seeded` |

If you need to re-seed the chatbot module (e.g. after manually deleting a stale entry in Settings), restart the backend — the guard will trigger and insert the correct entry.

## API reference

All routes are prefixed with `/api`.

### Health (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns liveness of the API and all three databases |

Response:
```json
{ "api": true, "postgres": true, "clickhouse": true, "mongo": false }
```

Each field is `true` if the connection check passed, `false` otherwise. `api` is always `true` when the endpoint itself responds. Used by the frontend Web Worker to drive the status indicator in the header and the per-DB badges in Settings.

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
| `GET` | `/api/settings/modules/discover` | Scan `MODULE_REGISTRY_URLS` for `manifest.json` — returns discovered modules with `already_registered` flag |

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

### Chat (AI assistant)

Streams responses from a local Ollama instance. Requires `OLLAMA_URL` to point at a running Ollama server.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/chat` | Bearer | Send a message list, receive a streaming NDJSON response from Ollama |

Request body:
```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "qwen2.5:7b"
}
```

`model` defaults to the value of `OLLAMA_MODEL` (env var). Callers can override it per-request by passing a different model name in the body.

Each streamed line is a raw Ollama NDJSON chunk — the frontend reads `chunk.message.content` and appends it to the current reply. If Ollama is unreachable the stream yields `{"error": "..."}` and closes.

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
│   ├── db/
│   │   ├── interface.py  # AppAdapter protocol + UserRecord dataclass
│   │   ├── postgres.py   # PostgresAdapter — users + pages via SQLAlchemy
│   │   ├── clickhouse.py # ClickHouseLogAdapter — MergeTree log table
│   │   └── mongo.py      # MongoDataAdapter — generic collection CRUD + i18n helpers
│   └── routes/
│       ├── auth.py           # /api/auth/login
│       ├── dashboard.py      # /api/dashboard, /api/user/theme
│       ├── settings.py       # /api/settings/* (modules CRUD + concurrent manifest discovery)
│       ├── logs.py           # /api/logs
│       ├── module_data.py    # /api/module-data/*
│       ├── i18n.py           # /api/i18n/{lang}
│       ├── health.py         # /api/health — DB liveness checks
│       ├── ingestion.py      # /api/data-ingestion + WebSocket
│       └── chat.py           # /api/chat — JWT-protected streaming proxy to Ollama
├── requirements.txt
└── Dockerfile
```
