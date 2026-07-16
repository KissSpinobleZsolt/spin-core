# spin-core / backend

FastAPI backend for the spin-core platform.

## Tech

- **Framework**: FastAPI, Python 3.12, uvicorn
- **Primary DB**: PostgreSQL 16 via SQLAlchemy + psycopg2 (users, pages, modules, i18n translations, module data)
- **Log DB**: ClickHouse 24 via clickhouse-driver (append-only event logs — six fixed tables, no materialized views)
- **Auth**: JWT via python-jose, password hashing via bcrypt
- **LLM providers**: Ollama (self-hosted, default), Anthropic, and any OpenAI-compatible endpoint (Groq, Mistral, Azure, vLLM) — selected per-bot via the `provider` field; streamed via httpx
- **Config**: `/app/data/settings.json` on a Docker / Kubernetes volume

## Architecture

Both databases are always initialised at startup via `init_db()`. Each has a fixed role — there is no user-selectable DB mode.

```
get_pg()    → PostgresAdapter      — users, pages, bots, modules, i18n translations, module data
get_ch()    → ClickHouseLogAdapter — write_api_log() / write_app_log() / write_user_log()
                                     write_module_log() / write_bot_log() / write_notification()
                                     query_api_logs() / query_api_logs_summary()
                                     query_user_logs() / query_module_logs() / query_module_logs_summary()
                                     query_bot_logs() / query_bot_logs_summary()
                                     ensure_module_logs_table() / ensure_bot_logs_table()
```

**PostgreSQL tables (SQLAlchemy ORM, auto-created by `init_db()`, incremental column additions via `_run_migrations()`):**

| Table | Description |
|-------|-------------|
| `users` | Auth users — email, hashed password, roles, theme preference |
| `page_responses` | Dashboard page content (editable by admins) |
| `page_registry` | Server-driven page config — route, title, roles, skeleton, enabled |
| `bot_types` | Built-in bot type definitions — name, icon, description, preprompt, skills, tools, output_format, default_model, context_strategy |
| `bots` | Bot configurations — name, type, model, system_prompt, icon, active, restricted, roles, modules, created_by |
| `modules` | Registered MF modules — **source of truth** (not `settings.json`) |
| `translations` | EN + RO i18n bundles — deep-merged from `i18n_defaults.py` every startup |
| `module_documents` | Per-module namespaced document store (scoped by `module_id` + `collection`) |

Every HTTP request is automatically appended to `app_logs` by the middleware in `main.py`.

**ClickHouse tables created at startup (six fixed tables, no materialized views):**

| Table | TTL | Description |
|-------|-----|-------------|
| `api_logs` | 30 days | Every HTTP request — method, path, status, duration, user |
| `app_logs` | 30 days | Platform/system events — startup, config changes, background task results |
| `user_logs` | 30 days | User lifecycle events — login, create, update, delete |
| `module_logs` | 30 days | All module events in one table; `scope` column identifies the module. Table is ensured on module registration. |
| `bot_logs` | 30 days | All bot events in one table; `bot_name` column identifies the bot. Chat completions are written here. Table is ensured on bot provisioning. |
| `notifications` | 30 days | Platform notifications delivered via WebSocket (`/api/notifications/ws`) |

All `from`/`to` query params default to the start of the current month → now.

## Running locally

```bash
pip install -r requirements.txt
SETTINGS_PATH=./data/settings.json \
JWT_SECRET_KEY=change-me \
ADMIN_EMAIL=admin@spin.local \
ADMIN_PASSWORD=change-me \
POSTGRES_URL=postgresql://core-postgres:core-postgres@localhost:5432/core-postgres \
CLICKHOUSE_URL=clickhouse://core-ch:core-ch@localhost:9000/core \
uvicorn app.main:app --reload --port 8000
```

Or via Docker Compose from the project root:

```bash
docker compose up backend postgres clickhouse
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@spin.local` | Admin login email seeded on first run — **change before deploying** |
| `ADMIN_PASSWORD` | `change-me` | Admin password seeded on first run — **change before deploying** |
| `ADMIN_NAME` | `Admin` | Admin display name |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing secret — **change before deploying** |
| `SETTINGS_PATH` | `/app/data/settings.json` | Path to the settings file |
| `SEED_PATH` | `/app/seed-data/seed.json` | Path to the first-run seed file (see `./data/seed.json`) |
| `POSTGRES_URL` | `postgresql://core-postgres:core-postgres@db:5432/core-postgres` | Primary DB |
| `CLICKHOUSE_URL` | `clickhouse://core-ch:core-ch@clickhouse:9000/core` | Event log DB |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API base URL (K8s: injected from ConfigMap) |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Default model used by model-status checks; `POST /api/chat` falls back to this when no bot is selected |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text:latest` | Embedding model checked by `GET /api/model-status` alongside `OLLAMA_MODEL` |
| `ANTHROPIC_API_KEY` | _(empty)_ | Anthropic Claude API key — required for bots with `provider = "anthropic"`. Obtain at console.anthropic.com |
| `OPENAI_API_KEY` | _(empty)_ | OpenAI API key — also used for Groq, Mistral, Azure OpenAI, and any other OpenAI-compatible endpoint |
| `OPENAI_BASE_URL` | _(empty)_ | Override the OpenAI-compatible base URL (e.g. `https://api.groq.com/openai/v1`). Leave blank for `api.openai.com` |
| `MODULE_REGISTRY_URLS` | _(empty)_ | Comma-separated base URLs scanned for `manifest.json` on startup (auto-discovery) and by `GET /api/settings/modules/discover`. Docker Compose default: `http://cloud-insight-ai:80,http://hello-world:80,http://anomascan:80` |

## Admin bootstrap

There is no setup wizard. The lifespan hook seeds the following on first run (all checks are idempotent — subsequent restarts skip already-present data):

| What | Guard | Log line |
|------|-------|----------|
| Admin user | email not in PostgreSQL | `[spin-core] Admin user created: …` |
| Dashboard page | `page_responses` row absent | _(silent)_ |
| Bot types | upsert by name from `data/seed.json` `bot_types` — always syncs on restart | _(silent)_ |
| Default bots | `bots` table is empty | `[spin-core] Seeded bot: …` (one line per bot) |
| Modules (migration) | `settings.json` contains `modules` array | migrated to PostgreSQL; `settings.json` rewritten without `modules` |
| Modules (seed) | `modules` table is empty after migration | seeded from `data/seed.json` |
| Modules (discovery) | `MODULE_REGISTRY_URLS` is set | new scopes inserted; existing admin edits never overwritten |
| Module i18n (discovery / manual create) | manifest contains `i18n` key | stored in `module.presets.i18n` snapshot; merged into `translations` table immediately |
| Module bots (discovery) | new scope registered via discovery and manifest contains `bots` | `[spin-core] Provisioned bot '…' for module …` (idempotent — name+module_id guard) |
| Module bots (manual create) | `POST /api/settings/modules` — backend fetches manifest from `remote_url` | same idempotent provisioning + i18n merge; best-effort (failure does not fail the create response) |
| Bot ClickHouse tables | bot provisioned from manifest (discovery or manual create) | `bot_logs` table ensured (shared table; `bot_name` column scopes rows per bot); also ensured for all existing bots at every startup |
| Settings file | `settings.json` absent | _(silent)_ |
| i18n translations (EN + RO) | deep-merged into PostgreSQL every startup (new keys added, existing preserved) | _(silent)_ |
| Daily log purge (background task) | always started; first run after 24 h | `[spin-core] Daily log purge: N table(s) optimized` |

**Startup order:** migration → seed → discovery → i18n merge → ClickHouse table provisioning (module_logs + bot_logs ensured for all registered modules/bots) → background tasks (model tracker + daily log purge).

Default values for dashboard content, bots, theme, and modules come from **`./data/seed.json`** (mounted read-only at `SEED_PATH`). Edit that file before first run to customise defaults. If the file is absent or malformed, the backend falls back to built-in defaults and logs a warning.

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
| `GET` | `/api/health` | Returns liveness of the API and both databases |

Response:
```json
{
  "api": true,
  "postgres": true,
  "clickhouse": true,
  "translations": { "en": "2026-07-15T10:00:00", "ro": "2026-07-15T09:58:00" }
}
```

Each DB field is `true` if the connection check passed, `false` otherwise. `api` is always `true` when the endpoint itself responds. `translations` maps each seeded language to its last-modified ISO timestamp — the frontend compares this against a stored value and reloads translation bundles only when the timestamp changes, avoiding unnecessary fetches.

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

Modules are stored in PostgreSQL. `settings.json` holds only the `theme` config.

| Method | Path | Description |
|--------|------|-------------|
| `PATCH` | `/api/settings/theme` | Update default theme |
| `GET` | `/api/settings/modules` | List registered modules (from PostgreSQL) |
| `POST` | `/api/settings/modules` | Create a module (provisions ClickHouse log tables; fetches manifest to auto-create module bots, load `i18n`, and set `backend_url`) |
| `POST` | `/api/settings/modules/{id}/reset-i18n` | Re-merge the i18n snapshot stored in `module.presets.i18n` back into the translations table |
| `PUT` | `/api/settings/modules/{id}` | Update a module |
| `DELETE` | `/api/settings/modules/{id}` | Delete a module |
| `GET` | `/api/settings/modules/discover` | Scan `MODULE_REGISTRY_URLS` for `manifest.json` — returns discovered modules with `already_registered` flag |

**Module fields** (stored in `modules` table): `id`, `name`, `description`, `remote_url`, `scope` (unique), `component`, `route`, `icon`, `enabled`, `roles`, `presets` (JSON — `{i18n, layout, settings}`), `backend_url` (nullable — URL of the module's own backend service; enables the plugin proxy).

### Logs (admin)

All log endpoints support `from` and `to` query params (ISO datetime, e.g. `2026-07-01T00:00:00`). Default range: start of current month → now.

**App logs:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/logs` | Raw `app_logs` rows. Params: `limit`, `offset`, `event_type`, `user_email`, `from`, `to`. Returns `{items, total}`. |
| `GET` | `/api/logs/summary` | Hourly aggregates from `app_logs_mv`. Params: `from`, `to`, `event_type`, `path`, `limit`, `offset`. Returns `{items, total}`. |
| `POST` | `/api/logs/purge` | Admin | Force-optimize all ClickHouse log tables (`OPTIMIZE TABLE … FINAL`) to enforce TTL expiry immediately. Returns `{purged: string[], errors: string[]}`. |

**Module logs:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/module-logs/{moduleId}` | Bearer | Write a log entry to `module_{scope}_logs`. Body: `{event_type, details}`. |
| `GET` | `/api/module-logs/{moduleId}` | Admin | Raw module log rows. Params: `limit`, `offset`, `event_type`, `from`, `to`. Returns `{items, total}`. |
| `GET` | `/api/module-logs/{moduleId}/summary` | Admin | Hourly aggregates from `module_{scope}_logs_mv`. Params: `from`, `to`, `event_type`. Returns `{items, total}`. |

Module log tables and their MVs are created automatically when a module is registered via `POST /api/settings/modules`.

### Translations (i18n)

Translations are stored in PostgreSQL (`translations` table) and deep-merged from `app/i18n_defaults.py` on every startup (new keys are added; admin-edited values are preserved).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/i18n/{lang}` | No | Return full translation object for `lang` (e.g. `en`, `ro`) |
| `PUT` | `/api/i18n/{lang}` | Admin | Replace translation object for `lang` |

`GET /api/i18n/{lang}` is intentionally public so the frontend can fetch translations before the user logs in.

### Module data (any authenticated user)

Namespaced document store in PostgreSQL (`module_documents` table). Documents are scoped by `module_id` and `collection`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/module-data/{moduleId}/{collection}` | List documents (`limit`, `skip`) |
| `POST` | `/api/module-data/{moduleId}/{collection}` | Insert document |
| `PUT` | `/api/module-data/{moduleId}/{collection}/{docId}` | Update document |
| `DELETE` | `/api/module-data/{moduleId}/{collection}/{docId}` | Delete document |

### Bots

CRUD for bot configurations. Bots are stored in PostgreSQL (`bots` table).

**Bot fields:** `id`, `name`, `description`, `type` (references `bot_types.name`), `provider` (`"ollama"` | `"anthropic"` | `"openai"` — determines the LLM backend), `model` (provider-specific model identifier; empty = provider default), `system_prompt`, `icon`, `active` (bool — requires at least one module), `restricted`, `modules` (string array of module IDs; `"core"` = visible in ChatBubble only, other IDs = visible on `/bots` page), `config_schema` (JSON — arbitrary configuration schema injected from the module's manifest; holds UI enumeration keys such as `severity_levels` and `risk_levels`), `created_by`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/bots/types` | Bearer | List all bot type definitions (from `bot_types` table) |
| `GET` | `/api/bots` | Bearer | List bots. Admins see all; others see only active bots matching their roles. Optional `?module_id={uuid}` returns only active bots assigned to that module (role-filtered). |
| `POST` | `/api/bots` | Admin | Create a bot |
| `GET` | `/api/bots/{id}` | Bearer | Get one bot (active + role-checked for non-admins) |
| `PUT` | `/api/bots/{id}` | Admin | Replace a bot |
| `DELETE` | `/api/bots/{id}` | Admin | Delete a bot |

`active` is stored as `active AND bool(modules)` — a bot with no modules is always inactive regardless of the payload value.

### Chat (AI assistant)

Streams responses from the bot's configured LLM provider. Every completed conversation is persisted to `bot_logs` in ClickHouse.

**Supported providers** (set per-bot in the `provider` field):

| Provider | Key required | Notes |
|----------|-------------|-------|
| `ollama` | — | Default; self-hosted. Requires `OLLAMA_URL` |
| `anthropic` | `ANTHROPIC_API_KEY` | Claude models (`claude-sonnet-5`, `claude-opus-4-8`, …) |
| `openai` | `OPENAI_API_KEY` | OpenAI + any compatible endpoint (Groq, Mistral, Azure, local vLLM). Set `OPENAI_BASE_URL` to override the endpoint. |

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/chat` | Bearer | Send a message list, receive a streaming NDJSON response |
| `GET` | `/api/chat/logs` | Admin | Paginated chat completion history. Params: `from`, `to`, `user_email`, `limit`, `offset`. Returns `{items, total}`. |
| `GET` | `/api/chat/logs/summary` | Admin | Hourly aggregates from `bot_logs`. Params: `from`, `to`. Returns `{items, total}`. |

Request body for `POST /api/chat`:
```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "qwen2.5:7b",
  "bot_id": "optional-bot-uuid",
  "module_id": "optional-module-uuid"
}
```

When `bot_id` is provided the backend loads the bot's `provider`, `model`, and system prompt from Postgres. The bot's provider and model override the request's `model` field. The system prompt (including platform context) is prepended as a `system` role message before calling the provider. `model` defaults to `OLLAMA_MODEL` when no bot is selected.

Each streamed line is NDJSON in the shape `{"message": {"role": "assistant", "content": "…"}, "done": false}`. On stream completion a `{"done": true}` chunk is emitted. If the provider is unreachable or the API key is missing, the stream yields `{"error": "…"}` and closes. After streaming finishes the full exchange is written to ClickHouse — this never blocks or breaks the stream.

The chat log `details` field is JSON with the shape:
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-5",
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

### Plugin proxy

Forwards REST requests to a module's own backend service. The module must have `backend_url` set in the `modules` table (populated from its `manifest.json` or via the admin API).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `*` | `/api/plugin/{scope}/{path}` | Bearer | Proxy any HTTP method to `{backend_url}/{path}`. Returns 404 if the module has no `backend_url`. |

The `Authorization` header is forwarded verbatim — module backends validate the same `JWT_SECRET_KEY`. WebSocket connections (e.g. for progress notifications) connect directly from the module frontend to the module backend URL passed via `presets.settings.backend_url`.

### Bot logs (admin)

Per-bot event log stored in the `bot_logs` ClickHouse table (single table; `bot_name` column identifies the bot).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/bot-logs/{bot_id}` | Admin | Raw bot log rows. Params: `limit`, `offset`, `event_type`, `from`, `to`. Returns `{items, total}`. |
| `GET` | `/api/bot-logs/{bot_id}/summary` | Admin | Hourly aggregates. Params: `from`, `to`, `event_type`, `limit`, `offset`. Returns `{items, total}`. |

### Pages (server-driven config)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/pages/config?route=…` | Bearer | Return the `page_registry` entry for the given route (title, roles, skeleton, enabled). |
| `PATCH` | `/api/pages/config?route=…` | Admin | Update title, roles, skeleton, or enabled flag for the given route. |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `WS` | `/api/notifications/ws?token=…` | Bearer (query param) | WebSocket stream — polls ClickHouse every 5 s and pushes new notifications as a JSON array. |

## Project structure

```
backend/
├── app/
│   ├── main.py           # App factory, HTTP logging middleware, router registration
│   ├── config.py         # Centralised env-var constants (OLLAMA_URL, …)
│   ├── schemas.py        # Shared Pydantic models (ModuleInput, …)
│   ├── settings.py       # AppSettings dataclass, read/write settings.json
│   ├── seed_loader.py    # Loads ./data/seed.json → SeedData (dashboard, bots, theme, modules)
│   ├── database.py       # init_db(), get_pg() / get_ch()
│   ├── auth.py           # JWT creation/validation, password hashing
│   ├── deps.py           # FastAPI Depends wrappers — token_dep / admin_dep
│   ├── state.py          # In-process AppSettings singleton
│   ├── i18n_defaults.py  # Default EN + RO translations (deep-merged into PostgreSQL every startup)
│   ├── model_tracker.py  # Background async pull tracker — progress dict consumed by the SSE stream
│   ├── db/
│   │   ├── interface.py  # UserRecord + BotRecord dataclasses
│   │   ├── postgres.py   # PostgresAdapter — users, pages, bots, modules, i18n, module data via SQLAlchemy
│   │   └── clickhouse.py # ClickHouseLogAdapter — app_logs + module log tables + MVs
│   └── routes/
│       ├── auth.py           # /api/auth/login
│       ├── dashboard.py      # /api/dashboard, /api/user/theme
│       ├── settings.py       # /api/settings/* (modules CRUD + manifest discovery)
│       ├── logs.py           # /api/logs, /api/logs/summary, /api/logs/purge
│       ├── module_logs.py    # /api/module-logs/{id} (write/read/summary)
│       ├── module_data.py    # /api/module-data/*
│       ├── i18n.py           # /api/i18n/{lang}
│       ├── health.py         # /api/health — DB liveness checks
│       ├── plugin_proxy.py   # /api/plugin/{scope}/{path} — forwards to module backend_url
│       ├── bots.py           # /api/bots — bot CRUD (stored in PostgreSQL)
│       ├── bot_logs.py       # /api/bot-logs/{bot_id} — per-bot ClickHouse log read
│       ├── model_status.py   # /api/model-status — Ollama readiness, installed models, pull/delete, SSE stream
│       ├── chat.py           # /api/chat — streaming LLM proxy, bot system prompt injection
│       ├── pages.py          # /api/pages/config — server-driven page registry CRUD
│       └── notifications.py  # /api/notifications/ws — WebSocket notification stream
├── requirements.txt
└── Dockerfile         # single pip install layer — core deps only (no ML libraries)
```

> **Module plugin pattern** — ML-heavy dependencies (PyTorch, ultralytics, OpenCV) live in the module's own `backend/Dockerfile`, not in the core image. The core backend stays lightweight. Each module that needs server-side logic declares `"backend_url"` in its `manifest.json`; the core backend proxy at `/api/plugin/{scope}/…` routes requests there at runtime.
