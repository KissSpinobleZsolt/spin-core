# HTTP Request Logging Middleware

Every HTTP request passes through `log_requests`, which records path, method, status code, duration, and the authenticated user (if any) to ClickHouse `api_logs`. Defined in `backend/app/main.py`.

```mermaid
flowchart TD
    REQ["Incoming HTTP Request"] --> MW["log_requests middleware"]
    MW --> TS["record start_time = time.time()"]
    TS --> NEXT["await call_next(request)"]
    NEXT --> RESP["Response received"]
    RESP --> DUR["duration_ms = (now - start_time) × 1000"]
    DUR --> TOK{Authorization\nheader present?}
    TOK -->|yes| DEC["decode_token() → owner email\n(silently ignore invalid tokens)"]
    TOK -->|no| ANON["owner = ''"]
    DEC --> LOG
    ANON --> LOG
    LOG["write_api_log to ClickHouse api_logs\n{event_time, path, method,\nstatus_code, duration_ms, owner}"]
    LOG --> RET["return Response"]
```
