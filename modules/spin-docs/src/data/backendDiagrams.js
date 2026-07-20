// Architecture diagrams — Backend. Auto-generated from diagramms/ folder.
export const DIAGRAMS = [
  {
    id: 'system-architecture',
    title: 'System Architecture',
    description: 'High-level view of all services, storage backends, and external integrations.',
    code: `graph TB
    Browser["Browser (React 19, port 3000)"]

    subgraph FastAPI["FastAPI Backend (port 8000)"]
        MW["Middleware\\nCORS + HTTP Logger"]
        Routers["16 Routers"]
        Deps["Dependencies\\ntoken_dep / admin_dep"]
        BG["Background Tasks\\n3 asyncio tasks"]
    end

    subgraph Storage["Storage Layer"]
        PG["PostgreSQL 16\\nUsers · Bots · Modules\\nPages · i18n · Documents"]
        CH["ClickHouse 24\\napi_logs · app_logs\\nuser_logs · module_logs\\nbot_logs · notifications"]
        OLL["Ollama\\nLocal LLM Server"]
    end

    subgraph External["External LLM APIs (optional)"]
        ANT["Anthropic API"]
        OAI["OpenAI-compat API"]
    end

    subgraph Modules["Module Backends (plugin pattern)"]
        MB1["data-ingestion-backend\\nport 8002"]
        MB2["vision-watch-backend\\nport 8003"]
    end

    Browser -->|"REST / SSE / WebSocket"| MW
    MW --> Routers
    Routers --> Deps
    Routers -->|"SQLAlchemy sync"| PG
    Routers -->|"clickhouse-driver sync"| CH
    Routers -->|"httpx async stream"| OLL
    Routers -->|"httpx async proxy"| Modules
    BG -->|"pull tracking"| OLL
    BG -->|"OPTIMIZE TABLE"| CH
    BG -->|"manifest probe"| Modules
    Routers -->|"anthropic SDK"| ANT
    Routers -->|"openai SDK"| OAI`,
  },
  {
    id: 'startup-sequence',
    title: 'Application Startup Sequence',
    description: 'The full boot process inside `lifespan()` in `main.py`. Auto-discovery from `MODULE_REGISTRY_URLS` was removed — modules are now registered exclusively via the admin-triggered `GET /api/settings/modul',
    code: `sequenceDiagram
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
    App-->>App: cancel + await all 3 tasks`,
  },
  {
    id: 'postgresql-schema',
    title: 'PostgreSQL Schema',
    description: 'All 9 SQLAlchemy ORM tables, their columns, and relationships. Defined in `backend/app/db/postgres/orm.py`.',
    code: `erDiagram
    users {
        int id PK
        string email UK
        string name
        string hashed_password
        string[] roles
        string default_theme
    }
    page_responses {
        int id PK
        string page_key UK
        text content
    }
    bot_types {
        uuid id PK
        string name UK
        string icon
        string description
        string preprompt
        string[] skills
        string[] tools
        string output_format
        string default_model
        string context_strategy
    }
    bots {
        uuid id PK
        string name
        string description
        string type
        string provider
        string model
        text system_prompt
        string icon
        bool active
        string restricted
        string[] modules
        string created_by
        json config_schema
        datetime created_at
        datetime updated_at
    }
    translations {
        string lang PK
        json data
        datetime updated_at
    }
    modules {
        uuid id PK
        string name
        string description
        string remote_url
        string scope UK
        string component
        string route
        string icon
        bool enabled
        string[] roles
        json presets
        string backend_url
        string subscription
    }
    module_documents {
        uuid id PK
        uuid module_id FK
        string collection
        json data
    }
    page_registry {
        uuid id PK
        string route UK
        string title
        string type
        string component_key
        string remote_url
        string scope
        string component
        string[] roles
        json skeleton
        bool enabled
    }
    ui_components {
        uuid id PK
        string name UK
        string export
        string file
        string description
        json props
        string notes
        int sort_order
    }

    bots }o--|| bot_types : "type ref"
    module_documents }o--|| modules : "module_id"
    bots }o--o{ modules : "modules[] (scope refs)"`,
  },
  {
    id: 'clickhouse-tables',
    title: 'ClickHouse Tables',
    description: '6 append-only MergeTree tables with 30-day TTL (notifications: 7 days). No materialized views — summaries are computed via live GROUP BY queries. Defined in `backend/app/db/clickhouse/adapter.py`.',
    code: `graph LR
    subgraph CH["ClickHouse — all MergeTree, TTL 30 days unless noted"]
        AL["api_logs\\nevent_time, path, method,\\nstatus_code, duration_ms,\\nowner, message, name, details\\nORDER BY event_time"]
        APL["app_logs\\nevent_time, event_type,\\nlevel, name, message,\\nowner, details\\nORDER BY event_time"]
        UL["user_logs\\nevent_time, event_type,\\nlevel, name, message,\\nowner, details\\nORDER BY event_time"]
        ML["module_logs\\nscope, event_time, event_type,\\nlevel, name, message,\\nowner, details\\nORDER BY (scope, event_time)"]
        BL["bot_logs\\nbot_name, event_time, event_type,\\nlevel, name, message,\\nowner, details\\nORDER BY (bot_name, event_time)"]
        NF["notifications\\nevent_time, event_type,\\nlevel, owner, name,\\nmessage, details\\nORDER BY event_time\\nTTL 7 days"]
    end

    MW["HTTP Middleware"] -->|"every request"| AL
    Chat["chat router"] -->|"chat.completion"| ML
    Chat -->|"bot.info / bot.error / bot.abort"| BL
    ModLog["module-logs router"] -->|"custom events"| ML
    Auth["auth router"] -->|"user.login"| UL
    Settings["settings router"] -->|"module.init/update/delete"| APL
    BotsR["bots router"] -->|"bot.init/update/delete"| APL
    WS["WebSocket /notifications"] -->|"poll every 5s"| NF`,
  },
  {
    id: 'auth-flow',
    title: 'Authentication & Authorization Flow',
    description: 'Login produces a 24-hour HS256 JWT. Every subsequent request validates it via `token_dep` (any user) or `admin_dep` (role check in PostgreSQL). Defined in `backend/app/auth/` and `backend/app/deps/`.',
    code: `sequenceDiagram
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
    end`,
  },
  {
    id: 'chat-llm-flow',
    title: 'Chat / LLM Streaming Flow',
    description: 'How a chat request travels from the browser through bot resolution, provider dispatch, and back as an NDJSON stream. Defined in `backend/app/routes/chat/router.py`.',
    code: `sequenceDiagram
    participant C as Client
    participant R as chat/router
    participant PG as PostgreSQL
    participant GP as get_provider()
    participant OLL as Ollama
    participant ANT as Anthropic
    participant OAI as OpenAI-compat
    participant CH as ClickHouse

    C->>R: POST /api/chat {bot_id, messages, model, module_id}
    R->>PG: get_bot_by_id(bot_id)
    PG-->>R: BotRecord {provider, model, system_prompt, active, restricted}
    R->>R: check bot.active, check roles vs bot.restricted
    R->>GP: get_provider(bot.provider)
    alt provider = "ollama"
        GP-->>R: OllamaProvider
        R->>OLL: POST /api/chat  NDJSON stream
    else provider = "anthropic"
        GP-->>R: AnthropicProvider
        R->>ANT: messages.stream() SSE
    else provider = "openai" or any other
        GP-->>R: OpenAICompatProvider
        R->>OAI: chat.completions.create(stream=True)
    end
    loop each chunk
        R-->>C: NormalizedChunk {content, done=false}  application/x-ndjson
    end
    R-->>C: final chunk {done=true, prompt_tokens, completion_tokens}
    R->>CH: write chat.completion → module_logs[chatbot scope]
    R->>CH: write bot.info → bot_logs

    Note over C,R: ABORT PATH
    C->>R: POST /api/chat/abort {bot_id, module_id}
    R->>CH: write bot.abort → bot_logs
    R->>CH: write chat.abort → module_logs`,
  },
  {
    id: 'llm-provider-hierarchy',
    title: 'LLM Provider Class Hierarchy',
    description: 'The `LLMProvider` abstract base class and its three concrete implementations. The `get_provider()` factory dispatches at runtime based on the bot\'s `provider` field. Defined in `backend/app/providers/',
    code: `classDiagram
    class LLMProvider {
        <<abstract>>
        +stream(model, messages, timeout) AsyncIterator~NormalizedChunk~
    }
    class NormalizedChunk {
        +content: str
        +done: bool
        +prompt_tokens: int
        +completion_tokens: int
    }
    class OllamaProvider {
        +OLLAMA_URL: str
        +stream() httpx async NDJSON
        +token counts from final chunk eval_count
    }
    class AnthropicProvider {
        +ANTHROPIC_API_KEY: str
        +default_model: claude-sonnet-5
        +max_tokens: 8192
        +stream() anthropic.AsyncAnthropic.messages.stream()
        +separates system messages automatically
    }
    class OpenAICompatProvider {
        +OPENAI_API_KEY: str
        +OPENAI_BASE_URL: str optional
        +default_model: gpt-4o
        +stream() openai.AsyncOpenAI chat.completions.create(stream=True)
        +works with Azure, Groq, Mistral, vLLM
    }
    class get_provider {
        <<factory>>
        +"ollama" → OllamaProvider
        +"anthropic" → AnthropicProvider
        +anything else → OpenAICompatProvider
    }

    LLMProvider <|-- OllamaProvider
    LLMProvider <|-- AnthropicProvider
    LLMProvider <|-- OpenAICompatProvider
    LLMProvider ..> NormalizedChunk
    get_provider --> OllamaProvider
    get_provider --> AnthropicProvider
    get_provider --> OpenAICompatProvider`,
  },
  {
    id: 'module-lifecycle',
    title: 'Module Lifecycle State Machine',
    description: 'The full set of states a module can be in, and the transitions driven by admin actions and the background health checker. Defined in `backend/app/routes/settings/router.py` and the `_module_health_che',
    code: `stateDiagram-v2
    [*] --> Discovered : manifest.json probed\\n(auto-discovery or POST /settings/modules)

    Discovered --> Inactive : inserted with enabled=false\\n(auto-discovery path)
    Discovered --> Active : inserted with enabled=true\\n(admin adds manually)

    Inactive --> Active : PUT /settings/modules/{id} enabled=true\\nwrites module.activate to CH
    Active --> Inactive : PUT /settings/modules/{id} enabled=false\\nwrites module.deactivate to CH

    Active --> Offline : health_checker: /manifest.json probe fails\\nauto-disables, writes module.deactivate to CH
    Offline --> Active : health_checker: /manifest.json recovers\\nauto-enables, writes module.activate to CH

    Active --> [*] : DELETE /settings/modules/{id}\\ncascades — remove from bots.modules[]\\ndelete orphaned bots\\nwrites module.delete to CH
    Inactive --> [*] : DELETE /settings/modules/{id}`,
  },
  {
    id: 'plugin-proxy-flow',
    title: 'Plugin Proxy Flow',
    description: 'How `/api/plugin/{scope}/{path}` routes requests to a module\'s own backend service. The scope is resolved to a `backend_url` stored in PostgreSQL. Defined in `backend/app/routes/plugin_proxy/router.py',
    code: `sequenceDiagram
    participant C as Client (Browser)
    participant PP as plugin_proxy/router
    participant PG as PostgreSQL
    participant MB as Module Backend (backend_url)

    C->>PP: ANY /api/plugin/{scope}/{path}  Bearer token
    PP->>PP: require_token() — validate JWT
    PP->>PG: get_module_by_scope(scope)
    PG-->>PP: ModuleRow {backend_url}
    alt backend_url not set
        PP-->>C: HTTP 404
    end
    PP->>MB: forward request to {backend_url}/{path}
    Note over PP,MB: Forwarded headers: content-type, content-length, accept, authorization
    Note over PP,MB: Stripped: transfer-encoding, content-encoding
    Note over PP,MB: Timeout: 120s
    MB-->>PP: response (any status + body)
    PP-->>C: proxied response (status + body)`,
  },
  {
    id: 'background-tasks',
    title: 'Background Tasks',
    description: 'Three long-running `asyncio` tasks launched in the FastAPI lifespan and cancelled on shutdown. Defined in `backend/app/main.py`.',
    code: `graph TB
    subgraph Lifespan["lifespan() — launched at startup, cancelled at shutdown"]
        direction TB

        subgraph T1["Task 1: run_sequential_trackers"]
            T1A["Pull OLLAMA_MODEL\\n(e.g. qwen2.5:7b)"]
            T1B["Pull OLLAMA_EMBED_MODEL\\n(e.g. nomic-embed-text)"]
            T1C["POST OLLAMA_URL/api/pull\\nNDJSON stream\\nupdate ModelProgress dict\\n5s retry backoff on error"]
            T1A --> T1C
            T1C --> T1B
        end

        subgraph T2["Task 2: _daily_log_purge"]
            T2A["sleep 24h"]
            T2B["OPTIMIZE TABLE FINAL\\napi_logs\\napp_logs\\nuser_logs\\nmodule_logs\\nbot_logs"]
            T2A --> T2B --> T2A
        end

        subgraph T3["Task 3: _module_health_checker"]
            T3A["sleep 30s"]
            T3B["for each module:\\nGET remote_url/manifest.json\\ntimeout 5s"]
            T3C{responds?}
            T3D["mark enabled=true\\nwrite module.activate to CH"]
            T3E["mark enabled=false\\nwrite module.deactivate to CH"]
            T3A --> T3B --> T3C
            T3C -->|yes| T3D --> T3A
            T3C -->|no| T3E --> T3A
        end
    end`,
  },
  {
    id: 'http-request-logging',
    title: 'HTTP Request Logging Middleware',
    description: 'Every HTTP request passes through `log_requests`, which records path, method, status code, duration, and the authenticated user (if any) to ClickHouse `api_logs`. Defined in `backend/app/main.py`.',
    code: `flowchart TD
    REQ["Incoming HTTP Request"] --> MW["log_requests middleware"]
    MW --> TS["record start_time = time.time()"]
    TS --> NEXT["await call_next(request)"]
    NEXT --> RESP["Response received"]
    RESP --> DUR["duration_ms = (now - start_time) × 1000"]
    DUR --> TOK{Authorization\\nheader present?}
    TOK -->|yes| DEC["decode_token() → owner email\\n(silently ignore invalid tokens)"]
    TOK -->|no| ANON["owner = ''"]
    DEC --> LOG
    ANON --> LOG
    LOG["write_api_log to ClickHouse api_logs\\n{event_time, path, method,\\nstatus_code, duration_ms, owner}"]
    LOG --> RET["return Response"]`,
  },
  {
    id: 'model-pull-tracker',
    title: 'Model Pull Tracker State Machine',
    description: 'Tracks the download progress of Ollama models. The shared `ModelProgress` dict is consumed by `GET /api/model-status/stream` (SSE) so the frontend can show live pull progress. Defined in `backend/app/',
    code: `stateDiagram-v2
    [*] --> pending : model added to required list\\n(OLLAMA_MODEL or OLLAMA_EMBED_MODEL)

    pending --> pulling : Ollama pull stream started\\nphase = "pulling manifest"

    pulling --> pulling : NDJSON progress lines received\\nupdates layers dict\\nrolling speed window (30s, maxlen=300)\\neta_str recalculated

    pulling --> verifying : phase = "verifying digest"
    verifying --> writing : phase = "writing manifest"
    writing --> done : status = "success"

    pulling --> error : HTTP error or connection failure\\n5s backoff then retry from pending

    done --> [*] : model available in Ollama

    note right of pulling
        ModelProgress fields:
        - model: str
        - phase: str
        - layers: dict[digest → {total, completed}]
        - speed_samples: deque(maxlen=300)
        - speed_bps: float (bytes/sec)
        - total_bytes / completed_bytes: int
        - eta_str: str (human readable)
    end note`,
  },
  {
    id: 'websocket-notifications',
    title: 'WebSocket Notifications Flow',
    description: 'The notifications WebSocket authenticates via a JWT query parameter, then polls ClickHouse every 5 seconds for new rows belonging to that user. Defined in `backend/app/routes/notifications/router.py`.',
    code: `sequenceDiagram
    participant C as Client (Browser)
    participant WS as notifications/router
    participant CH as ClickHouse notifications table

    C->>WS: WS /api/notifications/ws?token=jwt
    WS->>WS: decode_token(token) → owner email
    alt invalid token
        WS-->>C: close(code=1008 Policy Violation)
    end
    WS->>WS: since = datetime.utcnow()
    loop every 5 seconds
        WS->>CH: query_notifications_since(owner, since)
        CH-->>WS: [NotificationRow, ...]
        alt new rows returned
            WS->>WS: update since = last row event_time
            WS-->>C: JSON array of new notifications
        end
        WS->>WS: asyncio.sleep(5)
    end
    C-->>WS: disconnect`,
  },
  {
    id: 'api-route-map',
    title: 'API Route Map',
    description: 'All 16 routers grouped by required authorization level.',
    code: `graph LR
    subgraph Public["No Auth Required"]
        PUB1["POST /api/auth/login"]
        PUB2["GET /api/health"]
        PUB3["GET /api/model-status"]
        PUB4["GET /api/model-status/installed"]
        PUB5["GET /api/model-status/stream (SSE)"]
    end

    subgraph Token["Bearer Token — any authenticated user"]
        T1["GET /api/dashboard"]
        T2["PATCH /api/user/theme"]
        T3["GET /api/bots"]
        T4["GET /api/bots/types"]
        T5["GET /api/bots/{id}"]
        T6["POST /api/chat"]
        T7["POST /api/chat/abort"]
        T8["GET /api/i18n/{lang}"]
        T9["GET /api/pages/config?route="]
        T10["POST /api/module-logs/{id}"]
        T11["GET|POST|PUT|DELETE /api/module-data/{id}/{collection}"]
        T12["GET /api/ui-components"]
        T13["WS /api/notifications/ws?token="]
        T14["ANY /api/plugin/{scope}/{path}"]
    end

    subgraph Admin["Admin Role Required"]
        A1["PATCH /api/settings/theme"]
        A2["GET|POST|PUT|DELETE /api/settings/modules"]
        A3["GET /api/settings/modules/discover"]
        A4["POST /api/settings/modules/{id}/reset-i18n"]
        A5["POST|PUT|DELETE /api/bots"]
        A6["GET /api/logs"]
        A7["GET /api/logs/summary"]
        A8["GET /api/logs/user"]
        A9["POST /api/logs/purge"]
        A10["GET /api/module-logs/{id}"]
        A11["GET /api/module-logs/{id}/summary"]
        A12["GET /api/bot-logs/{id}"]
        A13["GET /api/bot-logs/{id}/summary"]
        A14["GET /api/chat/logs"]
        A15["GET /api/chat/logs/summary"]
        A16["PUT /api/i18n/{lang}"]
        A17["GET|PATCH /api/pages"]
        A18["POST /api/model-status/pull"]
        A19["DELETE /api/model-status/{name}"]
        A20["PUT /api/ui-components/{name}"]
    end`,
  },
  {
    id: 'module-registration-i18n',
    title: 'Module Registration & i18n Merge Flow',
    description: 'What happens when an admin registers a new module, and how translations are deep-merged without overwriting user edits. Defined in `backend/app/routes/settings/router.py` and `backend/app/db/postgres/',
    code: `flowchart TD
    ADM["Admin: POST /api/settings/modules\\n{name, remote_url, scope, ...}"] --> PROBE
    PROBE["httpx GET remote_url/manifest.json\\n(5s timeout)"] --> PARSE
    PARSE["Parse manifest:\\n  i18n key presets\\n  bot definitions\\n  scope / component"] --> UPSERT
    UPSERT["pg.upsert_module()"] --> SEED_BOTS
    SEED_BOTS["pg.seed_bots_for_module(scope, manifest.bots)\\n  only inserts bots that do not already exist"] --> MERGE_I18N
    MERGE_I18N["pg.merge_i18n_data(manifest.i18n)\\n  _deep_merge: existing keys win\\n  missing keys are inserted"] --> LOG_CH
    LOG_CH["CH: write module.init to app_logs\\nCH: write bot.init for each seeded bot"] --> DONE["201 Created"]

    subgraph Startup["Every startup — translations refresh"]
        S1["Load DEFAULT_TRANSLATIONS\\n  {en: EN_DICT, ro: RO_DICT}\\nfrom backend/app/i18n_defaults/"]
        S2["pg.merge_i18n_data(defaults)\\n  deep_merge: existing user edits are preserved\\n  only missing keys are inserted"]
        S1 --> S2
    end`,
  },
  {
    id: 'db-dependency-chain',
    title: 'Database Dependency Chain',
    description: 'How FastAPI routes get access to the database adapters via `Depends()`, and how the singletons are initialised once at startup. Defined in `backend/app/database.py` and `backend/app/deps/`.',
    code: `graph TD
    subgraph Request["Request lifecycle"]
        ROUTE["Route handler\\n@router.get / @router.post / ..."]
        DEP_PG["Depends(get_pg)"]
        DEP_CH["Depends(get_ch)"]
        ROUTE --> DEP_PG
        ROUTE --> DEP_CH
    end

    subgraph Singletons["database.py — module-level singletons"]
        PG_SNG["_pg: PostgresAdapter or None"]
        CH_SNG["_ch: ClickHouseLogAdapter or None"]
        INIT["init_db() — called once in lifespan startup\\nreads POSTGRES_URL / CLICKHOUSE_URL env vars"]
        INIT --> PG_SNG
        INIT --> CH_SNG
    end

    subgraph PGA["PostgresAdapter — backend/app/db/postgres/adapter.py"]
        SESSION["_session_ctx()\\nwith Session(engine) as s: yield s\\n(always closes, even on error)"]
        ORM["SQLAlchemy ORM operations\\nscoped to session lifetime"]
        SESSION --> ORM
    end

    subgraph CHA["ClickHouseLogAdapter — backend/app/db/clickhouse/adapter.py"]
        CLIENT["clickhouse_driver.Client\\n(synchronous, from_url(db_url))"]
        WRITE["client.execute(INSERT INTO ...)"]
        QUERY["client.execute(SELECT ...)"]
        CLIENT --> WRITE
        CLIENT --> QUERY
    end

    DEP_PG -->|"get_pg() → raises RuntimeError if not init"| PG_SNG --> SESSION
    DEP_CH -->|"get_ch() → raises RuntimeError if not init"| CH_SNG --> CLIENT`,
  },
]
