# Database Dependency Chain

How FastAPI routes get access to the database adapters via `Depends()`, and how the singletons are initialised once at startup. Defined in `backend/app/database.py` and `backend/app/deps/`.

```mermaid
graph TD
    subgraph Request["Request lifecycle"]
        ROUTE["Route handler\n@router.get / @router.post / ..."]
        DEP_PG["Depends(get_pg)"]
        DEP_CH["Depends(get_ch)"]
        ROUTE --> DEP_PG
        ROUTE --> DEP_CH
    end

    subgraph Singletons["database.py — module-level singletons"]
        PG_SNG["_pg: PostgresAdapter or None"]
        CH_SNG["_ch: ClickHouseLogAdapter or None"]
        INIT["init_db() — called once in lifespan startup\nreads POSTGRES_URL / CLICKHOUSE_URL env vars"]
        INIT --> PG_SNG
        INIT --> CH_SNG
    end

    subgraph PGA["PostgresAdapter — backend/app/db/postgres/adapter.py"]
        SESSION["_session_ctx()\nwith Session(engine) as s: yield s\n(always closes, even on error)"]
        ORM["SQLAlchemy ORM operations\nscoped to session lifetime"]
        SESSION --> ORM
    end

    subgraph CHA["ClickHouseLogAdapter — backend/app/db/clickhouse/adapter.py"]
        CLIENT["clickhouse_driver.Client\n(synchronous, from_url(db_url))"]
        WRITE["client.execute(INSERT INTO ...)"]
        QUERY["client.execute(SELECT ...)"]
        CLIENT --> WRITE
        CLIENT --> QUERY
    end

    DEP_PG -->|"get_pg() → raises RuntimeError if not init"| PG_SNG --> SESSION
    DEP_CH -->|"get_ch() → raises RuntimeError if not init"| CH_SNG --> CLIENT
```
