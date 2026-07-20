# Application Startup Sequence

The full boot process inside `lifespan()` in `main.py`. Auto-discovery from `MODULE_REGISTRY_URLS` was removed — modules are now registered exclusively via the admin-triggered `GET /api/settings/modules/discover` endpoint.

```mermaid
sequenceDiagram
    participant UV as Uvicorn
    participant App as FastAPI lifespan
    participant PG as PostgreSQL
    participant CH as ClickHouse
    participant OLL as Ollama

    UV->>App: startup
    App->>App: read_settings() → set_settings()
    App->>PG: init_db() — create PostgresAdapter
    App->>CH: init_db() — create ClickHouseLogAdapter
    App->>App: init_logger() — wrap CH adapter in AppLogger singleton
    App->>PG: run PG_MIGRATION_STMTS (ALTER TABLE IF NOT EXISTS)
    App->>PG: create_all() — SQLAlchemy DDL
    App->>PG: seed admin user (ADMIN_EMAIL/ADMIN_PASSWORD)
    App->>PG: seed dashboard page
    App->>PG: seed bot_types, ui_components from seed.json
    App->>PG: seed bots from seed.json (if table empty)
    App->>PG: read_legacy_modules() → migrate settings.json → PG (one-time)
    App->>PG: seed default modules from seed.json (if table empty)
    App->>CH: run_migrations() — rename tables/columns
    App->>CH: ensure all 6 tables exist (DDL)
    App->>App: get_logger().app("app.start", ...)
    App->>App: get_logger().bot(BotEvent.INIT, ...) — backfill missing CH history
    App->>App: get_logger().module(ComponentEvent.INIT, ...) — backfill missing CH history
    App->>App: get_logger().user(UserEvent.INIT, ...) — only when admin was just seeded
    App->>PG: merge EN+RO default translations
    App->>PG: upsert "system" virtual module
    App->>PG: seed_page_registry() — 14 native routes
    App->>App: get_logger().module(PageEvent.INIT, ...) — new routes only
    App-->>App: launch asyncio task: run_sequential_trackers
    App-->>App: launch asyncio task: _daily_log_purge (24h loop)
    App-->>App: launch asyncio task: _module_health_checker (30s loop)
    UV->>App: shutdown
    App-->>App: cancel + await all 3 tasks
```

## What changed

| Before | After |
|---|---|
| `MODULE_REGISTRY_URLS` probed at every startup | Removed — use `GET /api/settings/modules/discover` instead |
| Direct `ch.write_*` calls throughout startup | All writes via `get_logger().*` (AppLogger singleton) |
| `init_logger()` did not exist | Initialised immediately after `init_db()` |
