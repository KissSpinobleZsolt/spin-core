# spin-core / backend

FastAPI backend for the spin-core platform.

## Tech

- **Framework**: FastAPI, Python 3.12, uvicorn
- **Primary DB**: PostgreSQL 16 via SQLAlchemy + psycopg2 (users, pages)
- **Log DB**: ClickHouse 24 via clickhouse-driver (append-only event log + per-module log tables + refreshable materialized views)
- **Module DB**: MongoDB 7 via pymongo (generic document store for installed modules)
- **Auth**: JWT via python-jose, password hashing via bcrypt
- **AI proxy**: httpx — async streaming proxy to Ollama for the `/api/chat` endpoint
- **Config**: `/app/data/settings.json` on a Docker / Kubernetes volume

## Architecture

All three databases are always initialised at startup via `init_db()`. Each has a fixed role — there is no user-selectable DB mode.

```
get_pg()    → PostgresAdapter      — users, pages, admin ops
get_ch()    → ClickHouseLogAdapter — write_log() / query_logs() / query_app_logs_mv()
                                     ensure_module_table() / write_module_log()
                                     query_module_logs() / query_module_logs_mv()
get_mongo() → MongoDataAdapter     — get/insert/update/delete documents per module
```

Every HTTP request is automatically appended to `app_logs` by the middleware in `main.py`.

**ClickHouse tables created at startup:**

| Table | Description |
|-------|-------------|
| `app_logs` | Every HTTP request — method, path, status, duration, user |
| `app_logs_mv` | Refreshable MV — hourly aggregates of `app_logs` (request count, avg/max duration, error count). Rebuilt every 10 minutes. |
| `module_{scope}_logs` | Per-module event log — created automatically when a module is registered |
| `module_{scope}_logs_mv` | Refreshable MV — hourly aggregates per module (event count, unique users). Rebuilt every 10 minutes. |

All raw tables have a 30-day TTL. All `from`/`to` query params default to the start of the current month → now.

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
| `OLLAMA_MODEL` | `qwen2.5:7b` | Default model for `POST /api/chat` when no bot is selected or the bot has no model set |
| `MODULE_REGISTRY_URLS` | _(empty)_ | Comma-separated base URLs scanned for `manifest.json` by `GET /api/settings/modules/discover` |

## Admin bootstrap

There is no setup wizard. The lifespan hook seeds the following on first run (all checks are idempotent — subsequent restarts skip already-present data):

| What | Guard | Log line |
|------|-------|----------|
| Admin user | email not in PostgreSQL | `[spin-core] Admin user created: …` |
| i18n translations (EN + RO) | language key absent in MongoDB | _(silent)_ |
| Default "AI Assistant" bot | `bots` table is empty | `[spin-core] Seeded default AI Assistant bot` |

The default bot is a general-purpose chatbot that uses `OLLAMA_MODEL` and carries no system prompt. Admins can edit or delete it, and create additional bots at `/bots-admin`.

## API reference

All routes are prefixed with `/api`.

### Model status & LLM management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/model-status` | No | Check whether required Ollama models (`OLLAMA_MODEL`, `OLLAMA_EMBED_MODEL`) are pulled and ready |
| `GET` | `/api/model-status/installed` | No | List all models currently installed in Ollama (name, family, params, quantization, size) |
| `GET` | `/api/model-status/stream` | No | SSE stream — pushes pull progress every second until all required models are ready |
| `POST` | `/api/model-status/pull` | Admin | Trigger a background pull of an arbitrary Ollama model. Body: `{ "name": "llama3.2:3b" }`. Returns immediately; progress is tracked internally. |
| `DELETE` | `/api/model-status/{model_name}` | Admin | Delete a model from Ollama. Proxies to `DELETE /api/delete`. |

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

All log endpoints support `from` and `to` query params (ISO datetime, e.g. `2026-07-01T00:00:00`). Default range: start of current month → now.

**App logs:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/logs` | Raw `app_logs` rows. Params: `limit`, `offset`, `event_type`, `user_email`, `from`, `to`. Returns `{items, total}`. |
| `GET` | `/api/logs/summary` | Hourly aggregates from `app_logs_mv`. Params: `from`, `to`, `event_type`, `path`, `limit`, `offset`. Returns `{items, total}`. |

**Module logs:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/module-logs/{moduleId}` | Bearer | Write a log entry to `module_{scope}_logs`. Body: `{event_type, details}`. |
| `GET` | `/api/module-logs/{moduleId}` | Admin | Raw module log rows. Params: `limit`, `offset`, `event_type`, `from`, `to`. Returns `{items, total}`. |
| `GET` | `/api/module-logs/{moduleId}/summary` | Admin | Hourly aggregates from `module_{scope}_logs_mv`. Params: `from`, `to`, `event_type`. Returns `{items, total}`. |

Module log tables and their MVs are created automatically when a module is registered via `POST /api/settings/modules`.

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

### Bots

CRUD for bot configurations. Bots are stored in PostgreSQL (`bots` table). Each bot has a name, type, Ollama model, system prompt, enabled flag, and a list of roles that can access it.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/bots` | Bearer | List bots. Admins see all; others see only enabled bots matching their roles. |
| `POST` | `/api/bots` | Admin | Create a bot |
| `GET` | `/api/bots/{id}` | Bearer | Get one bot (role-checked for non-admins) |
| `PUT` | `/api/bots/{id}` | Admin | Replace a bot |
| `DELETE` | `/api/bots/{id}` | Admin | Delete a bot |

Bot types (`chatbot`, `watchbot`, `tradebot`, `custom`) are metadata — all currently use the same streaming chat interface. The type field is available for future specialisation.

### Chat (AI assistant)

Streams responses from a local Ollama instance. Requires `OLLAMA_URL` to point at a running Ollama server. Every completed conversation is persisted to `module_chatbot_logs` in ClickHouse.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/chat` | Bearer | Send a message list, receive a streaming NDJSON response from Ollama |
| `GET` | `/api/chat/logs` | Admin | Paginated chat completion history. Params: `from`, `to`, `user_email`, `limit`, `offset`. Returns `{items, total}`. |
| `GET` | `/api/chat/logs/summary` | Admin | Hourly aggregates from `module_chatbot_logs_mv`. Params: `from`, `to`. Returns `{items, total}`. |

Request body for `POST /api/chat`:
```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "qwen2.5:7b",
  "bot_id": "optional-bot-uuid"
}
```

When `bot_id` is provided the backend looks up the bot's configured model and system prompt. The model overrides the `model` field; the system prompt is prepended as a `system` role message before calling Ollama. `model` defaults to `OLLAMA_MODEL` when no bot is selected or the bot has no model set.

Each streamed line is a raw Ollama NDJSON chunk. If Ollama is unreachable the stream yields `{"error": "..."}` and closes. After streaming finishes, the full conversation is written to ClickHouse — this never blocks or breaks the stream.

The chat log `details` field is JSON with the shape:
```json
{
  "model": "qwen2.5:7b",
  "messages": [{ "role": "user", "content": "…" }],
  "response": "…",
  "prompt_tokens": 42,
  "eval_tokens": 123,
  "duration_ms": 1842.5,
  "bot_id": "uuid",
  "bot_name": "Trade Bot"
}
```

`bot_id` and `bot_name` are only present when the request included a `bot_id`.

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
│   ├── model_tracker.py  # Background async pull tracker — progress dict consumed by the SSE stream
│   ├── db/
│   │   ├── interface.py  # AppAdapter protocol + UserRecord + BotRecord dataclasses
│   │   ├── postgres.py   # PostgresAdapter — users, pages, bots via SQLAlchemy
│   │   ├── clickhouse.py # ClickHouseLogAdapter — app_logs + module log tables + MVs
│   │   └── mongo.py      # MongoDataAdapter — generic collection CRUD + i18n helpers
│   └── routes/
│       ├── auth.py           # /api/auth/login
│       ├── dashboard.py      # /api/dashboard, /api/user/theme
│       ├── settings.py       # /api/settings/* (modules CRUD + manifest discovery)
│       ├── logs.py           # /api/logs, /api/logs/summary
│       ├── module_logs.py    # /api/module-logs/{id} (write/read/summary)
│       ├── module_data.py    # /api/module-data/*
│       ├── i18n.py           # /api/i18n/{lang}
│       ├── health.py         # /api/health — DB liveness checks
│       ├── ingestion.py      # /api/data-ingestion + WebSocket
│       ├── bots.py           # /api/bots — bot CRUD (stored in PostgreSQL)
│       ├── model_status.py   # /api/model-status — Ollama readiness, installed models, pull/delete, SSE stream
│       └── chat.py           # /api/chat — streaming Ollama proxy, bot system prompt injection
├── requirements.txt
└── Dockerfile
```
