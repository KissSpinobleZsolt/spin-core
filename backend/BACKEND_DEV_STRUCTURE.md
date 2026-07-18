# Backend Developer Structure

FastAPI 0.115 application, Python 3.12. Fixed tri-database architecture: PostgreSQL 16 (ORM via SQLAlchemy), ClickHouse 24 (raw clickhouse-driver), Ollama (local LLM). All routes are mounted under `/api`. Authentication is symmetric JWT (python-jose HS256).

---

## Root (`backend/`)

| File | Purpose |
|---|---|
| `main.py` | FastAPI app entry — lifespan, middleware, router registration |
| `database.py` | Singleton holders: `init_db()`, `get_pg()`, `get_ch()` |
| `schemas.py` | Top-level shared Pydantic schema: `ModuleInput` |
| `settings.py` | `AppSettings` dataclass + `read_settings()` / `write_settings()` to `settings.json` |
| `requirements.txt` | Python package pinlist |
| `Dockerfile` | Production image |
| `Dockerfile.dev` | Development image (hot-reload via `uvicorn --reload`) |
| `README.md` | Backend-specific developer documentation |

---

## `app/`

### `main.py` — Application bootstrap

Single file that owns the `lifespan` context manager executed on startup:

1. Load `AppSettings` from `settings.json` into the in-process `state` singleton.
2. Call `init_db()` — instantiate both DB adapters.
3. Seed admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (first run only).
4. Seed pages, bot types, UI components, and bots from `data/seed.json`.
5. Migrate legacy modules from `settings.json` → PostgreSQL (one-time).
6. Run ClickHouse DDL migrations and provision all 6 tables.
7. Write startup lifecycle log entries to ClickHouse.
8. Auto-discover modules from `MODULE_REGISTRY_URLS`.
9. Deep-merge default EN + RO translations into PostgreSQL.
10. Ensure the built-in `"system"` virtual module exists.
11. Seed the native `page_registry` for 14 built-in platform pages.
12. Spawn three background asyncio tasks: Ollama model pull tracker, daily CH `OPTIMIZE`, 30-second module health checker.

An HTTP middleware logs every request to `api_logs` (path, method, status code, duration, JWT user). CORS is open to `localhost:3000` and `localhost:5173`.

---

## `app/auth/`

Symmetric JWT authentication utilities.

| File | Purpose |
|---|---|
| `constants.py` | `SECRET_KEY`, `ALGORITHM`, `TOKEN_EXPIRE_HOURS` |
| `token.py` | `create_token()`, `decode_token()` via python-jose |
| `utils.py` | `hash_password()`, `verify_password()` via bcrypt |

---

## `app/config/`

Centralised environment-variable reads.

| File | Purpose |
|---|---|
| `constants.py` | `OLLAMA_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` |

---

## `app/db/`

All database access. Routes import `get_pg()` / `get_ch()` from `database.py`; they never instantiate adapters directly.

### `db/postgres/`

| File | Purpose |
|---|---|
| `adapter.py` | `PostgresAdapter` — full CRUD surface over PostgreSQL (see table below) |
| `orm.py` | SQLAlchemy ORM models for all 9 tables |
| `utils.py` | `_deep_merge()` helper used by i18n translation merging |

**`PostgresAdapter` method groups:**

| Entity | Methods |
|---|---|
| Users | `get_user_by_email`, `create_user`, `update_user_theme` |
| Pages (dashboard content) | `get_page`, `upsert_page` |
| Bot Types | `get_bot_types`, `upsert_bot_type` |
| Bots | `get_bots`, `get_bots_for_module`, `get_bot_by_id`, `create_bot`, `update_bot`, `delete_bot`, `seed_bots_for_module` |
| Modules | `get_modules`, `get_module`, `get_module_by_id`, `get_module_by_scope`, `upsert_module`, `create_module`, `update_module`, `delete_module` |
| i18n | `get_i18n_data`, `set_i18n_data`, `merge_i18n_data`, `get_i18n_versions` |
| Module Documents | `get_documents`, `insert_document`, `update_document`, `delete_document` |
| Page Registry | `list_pages`, `get_page_config`, `update_page_config`, `seed_page_registry` |
| UI Components | `get_ui_components`, `upsert_ui_component` |

On construction: `Base.metadata.create_all()` then `PG_MIGRATION_STMTS` (idempotent `ALTER TABLE IF NOT EXISTS` list).

**ORM models (`orm.py`):**

| Table | Class | Key columns |
|---|---|---|
| `users` | `UserRow` | `email` (unique), `hashed_password`, `roles` (ARRAY), `default_theme` |
| `page_responses` | `PageRow` | `page_key` (unique), `content` (Text) |
| `bot_types` | `BotTypeRow` | `name` (unique), `preprompt`, `skills`, `tools`, `output_format`, `context_strategy` |
| `bots` | `BotRow` | `provider`, `model`, `active`, `restricted`, `modules` (ARRAY), `config_schema` (JSONB) |
| `translations` | `TranslationRow` | `lang` (PK), `data` (JSON), `updated_at` |
| `modules` | `ModuleRow` | `scope` (unique), `remote_url`, `backend_url`, `presets` (JSON) |
| `module_documents` | `ModuleDocumentRow` | `module_id`, `collection`, `data` (JSON); composite index on `(module_id, collection)` |
| `page_registry` | `PageRegistryRow` | `route` (unique), `type` (`native`/`federated`), `component_key`, `skeleton` (JSON) |
| `ui_components` | `UIComponentRow` | `name` (unique), `export`, `file`, `props` (JSON), `sort_order` |

---

### `db/clickhouse/`

| File | Purpose |
|---|---|
| `adapter.py` | `ClickHouseLogAdapter` — DDL provisioning, inserts, paginated + summary queries for all 6 tables |
| `utils.py` | `_month_start()` default time-bound helper |

**ClickHouse tables (all MergeTree, 30-day TTL; notifications 7 days):**

| Table | Purpose | Key columns |
|---|---|---|
| `api_logs` | HTTP request audit trail | `path`, `method`, `status_code`, `duration_ms`, `owner` |
| `app_logs` | Platform-level lifecycle events | `event_type`, `owner`, `message`, `name`, `details` |
| `user_logs` | User lifecycle events | `event_type`, `owner`, `message`, `name`, `details` |
| `module_logs` | Module/component/page events | `scope`, `event_type`, `owner`, `message`, `name`, `details` |
| `bot_logs` | Bot lifecycle and chat events | `bot_name`, `event_type`, `owner`, `message`, `name`, `details` |
| `notifications` | Push notifications (per-user or broadcast) | `id` (UUID), `level`, `title`, `message`, `owner` |

A shared `_paginated_query()` and `_summary_query()` helper is reused by all log tables. Summary queries use live `GROUP BY toStartOfHour(event_time)` (no materialized views).

---

### `db/interface/`

DB-agnostic record shapes used as intermediate types between adapters and routes.

| File | Purpose |
|---|---|
| `bot_record.py` | `BotRecord` dataclass |
| `user_record.py` | `UserRecord` dataclass |

---

## `app/deps/`

FastAPI dependency functions injected via `Depends()`.

| File | Purpose |
|---|---|
| `token.py` | `token_dep` — validates `Authorization: Bearer <jwt>`, returns user email |
| `admin.py` | `admin_dep` — calls `token_dep` then asserts `"admin" in user.roles` (HTTP 403 on failure) |

---

## `app/events/`

Event type registry and lifecycle log formatting.

| File | Purpose |
|---|---|
| `types.py` | `LogLevel`, `UserEvent`, `ModuleEvent`, `ComponentEvent`, `PageEvent`, `BotEvent` — string-constant classes (e.g. `BotEvent.INIT = "bot.init"`) |
| `lifecycle.py` | `lifecycle_message(event_type, name)` — maps event slug to a human-readable log message |

Every CRUD route that creates, updates, or deletes an entity emits a typed `lifecycle_message` entry to ClickHouse.

---

## `app/i18n_defaults/`

Default translations bundled as Python dicts, deep-merged into PostgreSQL on every startup.

| File | Purpose |
|---|---|
| `en.py` | English (`"en"`) translation dict |
| `ro.py` | Romanian (`"ro"`) translation dict |
| `defaults.py` | `DEFAULT_TRANSLATIONS = {"en": EN, "ro": RO}` |

---

## `app/model_tracker/`

Wraps Ollama's streaming `/api/pull` endpoint. Module-level dict `_model_progress` is the shared pull-state registry.

| File | Purpose |
|---|---|
| `constants.py` | `OLLAMA_URL`, `_SPEED_WINDOW`, `_model_progress` registry dict |
| `types.py` | `ModelPhase` literal, `ModelProgress` dataclass with `as_progress_dict()` |
| `tracker.py` | `get_model_progress()`, `run_sequential_trackers()`, `start_pull()` |
| `utils.py` | `_fmt_speed()`, `_fmt_eta()`, `_update_speed_and_eta()`, `_process_pull_line()` — Ollama pull-stream line parser |

---

## `app/providers/`

Strategy pattern for LLM backends. Every provider implements `LLMProvider.stream(model, messages, timeout) → AsyncIterator[NormalizedChunk]`.

| File | Purpose |
|---|---|
| `base/types.py` | `NormalizedChunk` dataclass, `LLMProvider` ABC |
| `ollama.py` | `OllamaProvider` — POSTs to `OLLAMA_URL/api/chat`, parses NDJSON |
| `anthropic_provider/constants.py` | `_DEFAULT_MODEL`, `_MAX_TOKENS` |
| `anthropic_provider/provider.py` | `AnthropicProvider` — extracts system message, streams via `anthropic` SDK |
| `openai_compat/constants.py` | `_DEFAULT_MODEL` |
| `openai_compat/provider.py` | `OpenAICompatProvider` — streams via `openai` SDK; supports `OPENAI_BASE_URL` override for Groq, Azure, vLLM |

`get_provider(provider_id)` is the factory used by the chat route. Both SDK providers use lazy `import` inside a try/except — making them optional at runtime.

`NormalizedChunk` carries `content`, `done`, `prompt_tokens`, `completion_tokens`. The chat route serialises every chunk to `{"message": {"role": "assistant", "content": "…"}, "done": bool}` NDJSON — identical to Ollama's native shape — so the frontend is provider-agnostic.

---

## `app/queries/`

All raw SQL/ClickHouse query strings as module-level constants. Never defined inline in adapter or route code.

| File | Purpose |
|---|---|
| `ch_ddl/constants.py` | `CREATE TABLE IF NOT EXISTS` for all 6 ClickHouse tables |
| `ch_inserts/constants.py` | `INSERT` statement templates for all 6 tables |
| `ch_selects/constants.py` | `SELECT` templates: paginated, summary, notifications, API summary |
| `pg_migrations.py` | `PG_MIGRATION_STMTS` — idempotent `ALTER TABLE IF NOT EXISTS` list |

---

## `app/seed_loader/`

Reads `data/seed.json` at startup and returns typed seed data.

| File | Purpose |
|---|---|
| `constants.py` | `SEED_PATH`, `_FALLBACK_BOT` default |
| `types.py` | `BotSeed`, `SeedData` dataclasses |
| `loader.py` | `load_seed()` — parses seed.json → `SeedData`; provides fallback `"AI Assistant"` bot if file is absent or bots list is empty |

---

## `app/state/`

In-process singleton for `AppSettings` — avoids re-reading `settings.json` on every request.

| File | Purpose |
|---|---|
| `constants.py` | `_settings` module-level variable (the singleton) |
| `state.py` | `get_settings()`, `set_settings()` — read/write the singleton |

---

## `app/routes/`

One sub-folder per resource group. Each contains a `router.py` (and helpers where needed).

| Folder | Endpoints | Auth |
|---|---|---|
| `auth/` | `POST /api/auth/login` | None |
| `bots/` | `GET/POST /api/bots`, `GET/PUT/DELETE /api/bots/{id}`, `GET /api/bots/types` | token / admin |
| `bot_logs/` | `GET /api/bot-logs/{id}`, `GET /api/bot-logs/{id}/summary` | admin |
| `chat/` | `POST /api/chat`, `POST /api/chat/abort`, `GET /api/chat/logs`, `GET /api/chat/logs/summary` | token / admin |
| `dashboard/` | `GET /api/dashboard`, `PATCH /api/user/theme` | token |
| `health/` | `GET /api/health` | None |
| `i18n/` | `GET /api/i18n/{lang}`, `PUT /api/i18n/{lang}` | token / admin |
| `logs/` | `GET /api/logs`, `GET /api/logs/user`, `GET /api/logs/summary`, `POST /api/logs/purge` | admin |
| `model_status/` | `GET /api/model-status`, `GET /api/model-status/installed`, `POST /api/model-status/pull`, `DELETE /api/model-status/{name}`, `GET /api/model-status/stream` (SSE) | None / admin |
| `module_data/` | `GET/POST /api/module-data/{module_id}/{collection}`, `PUT/DELETE /api/module-data/{module_id}/{collection}/{doc_id}` | token |
| `module_logs/` | `POST/GET /api/module-logs/{module_id}`, `GET /api/module-logs/{module_id}/summary` | token / admin |
| `notifications/` | `WS /api/notifications/ws?token=` | token (query param) |
| `pages/` | `GET /api/pages`, `GET/PATCH /api/pages/config?route=` | admin / token |
| `plugin_proxy/` | `ALL /api/plugin/{scope}/{path}` | token |
| `settings/` | `PATCH /api/settings/theme`, `GET/POST /api/settings/modules`, `PUT/DELETE /api/settings/modules/{id}`, `POST /api/settings/modules/{id}/reset-i18n`, `GET /api/settings/modules/discover` | admin |
| `ui_components/` | `GET /api/ui-components`, `PUT /api/ui-components/{name}` | token / admin |

**Route-level helpers:**

| File | Purpose |
|---|---|
| `chat/constants.py` | `_OLLAMA_DEFAULT_MODEL`, `_CHATBOT_SCOPE`, nav section lists |
| `chat/utils.py` | `_build_system_message()` — composes preprompt + nav context + system_prompt |
| `model_status/utils.py` | `_required_models()`, `_check_status()` |

---

## Naming conventions

| Pattern | Meaning |
|---|---|
| `router.py` | FastAPI `APIRouter` — one per resource group, mounted in `main.py` |
| `adapter.py` | Database adapter class — all DB interactions for one engine |
| `orm.py` | SQLAlchemy ORM model definitions — one per engine |
| `constants.py` | Module-level constants (env reads, query strings, static values) |
| `types.py` | Pydantic models, dataclasses, or `Literal` type aliases |
| `utils.py` | Pure helper functions used internally by the parent module |
| `loader.py` | File/data parsing entry point |
| `state.py` | In-process singleton accessors (`get_*` / `set_*`) |
| `deps/` | FastAPI `Depends()` dependency functions only — no business logic |
| `providers/` | Strategy-pattern LLM backend implementations |
| `queries/` | Raw SQL / ClickHouse query strings — never inline in adapters or routes |
