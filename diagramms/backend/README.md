# Backend Diagrams

Architecture and flow diagrams for the `spin-core` FastAPI backend. All diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively in GitHub and VS Code.

| # | File | What it shows |
|---|------|---------------|
| 01 | [01-system-architecture.md](01-system-architecture.md) | All services, storage backends, and external LLM integrations |
| 02 | [02-startup-sequence.md](02-startup-sequence.md) | The full 17-step lifespan boot sequence |
| 03 | [03-postgresql-schema.md](03-postgresql-schema.md) | All 9 SQLAlchemy ORM tables and their relationships |
| 04 | [04-clickhouse-tables.md](04-clickhouse-tables.md) | 6 append-only log tables and which routes write to each |
| 05 | [05-auth-flow.md](05-auth-flow.md) | Login, token validation, and admin role enforcement |
| 06 | [06-chat-llm-flow.md](06-chat-llm-flow.md) | Chat request → bot resolution → provider dispatch → NDJSON stream |
| 07 | [07-llm-provider-hierarchy.md](07-llm-provider-hierarchy.md) | `LLMProvider` ABC and the Ollama / Anthropic / OpenAI-compat implementations |
| 08 | [08-module-lifecycle.md](08-module-lifecycle.md) | Module states: Discovered → Active ↔ Inactive ↔ Offline → Deleted |
| 09 | [09-plugin-proxy-flow.md](09-plugin-proxy-flow.md) | How `/api/plugin/{scope}/…` proxies to a module's own backend |
| 10 | [10-background-tasks.md](10-background-tasks.md) | The 3 asyncio tasks: model pull, daily CH optimize, 30s health check |
| 11 | [11-http-request-logging.md](11-http-request-logging.md) | The `log_requests` middleware and what it writes to ClickHouse |
| 12 | [12-model-pull-tracker.md](12-model-pull-tracker.md) | Ollama model download state machine and rolling speed window |
| 13 | [13-websocket-notifications.md](13-websocket-notifications.md) | JWT-authenticated WebSocket polling ClickHouse every 5s |
| 14 | [14-api-route-map.md](14-api-route-map.md) | All 16 routers grouped by auth level (public / token / admin) |
| 15 | [15-module-registration-i18n.md](15-module-registration-i18n.md) | Module registration flow and deep-merge i18n strategy |
| 16 | [16-db-dependency-chain.md](16-db-dependency-chain.md) | How `Depends(get_pg)` / `Depends(get_ch)` reach the singleton adapters |
