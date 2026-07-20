# Plugin Proxy Flow

How `/api/plugin/{scope}/{path}` routes requests to a module's own backend service. The scope is resolved to a `backend_url` stored in PostgreSQL. Defined in `backend/app/routes/plugin_proxy/router.py`.

```mermaid
sequenceDiagram
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
    PP-->>C: proxied response (status + body)
```
