# Module Federation Flow

How the shell loads a remote micro-frontend at runtime using Webpack Module Federation.

```mermaid
sequenceDiagram
    participant U as User
    participant R as React Router
    participant FP as FederatedPage
    participant SC as SettingsContext
    participant LFM as loadFederatedModule()
    participant DOM as Browser DOM
    participant REMOTE as Remote Module Server (remoteEntry.js)
    participant API as Backend Plugin Proxy

    U->>R: navigate to /modules/:moduleId
    R->>FP: render FederatedPage({ params.moduleId })
    FP->>SC: useSettings() → find module by route/id
    SC-->>FP: ModuleConfig { remote_url, scope, component, presets, backend_url }

    FP->>SC: moduleReachability[mod.id]
    alt module offline
        FP-->>U: render ModuleOfflineFallback
    end

    FP->>LFM: loadFederatedModule(remote_url, scope, component)
    LFM->>DOM: expose window.React + window.ReactDOM
    LFM->>DOM: inject <script src="{remote_url}"> (remoteEntry.js)
    DOM->>REMOTE: fetch remoteEntry.js bundle
    REMOTE-->>DOM: Webpack container object at window[scope]

    LFM->>DOM: window[scope].init(shared_modules)
    LFM->>DOM: factory = await window[scope].get(component)
    LFM-->>FP: RemoteComponent

    FP->>FP: wrap in ErrorBoundary + Suspense
    FP-->>U: render <RemoteComponent presets={mod.presets} />

    Note over FP,API: REMOTE COMPONENT CALLS PLUGIN PROXY
    REMOTE->>API: fetch /api/plugin/{scope}/... (any HTTP method)
    API->>API: resolve scope → backend_url in Postgres
    API-->>REMOTE: proxied response from module backend

    Note over FP,U: MODULE BOT PANEL
    FP->>FP: render ModuleBotPanel(moduleId)
    FP-->>U: floating violet panel with module-scoped bots
```

## Key concepts

| Term | Meaning |
|---|---|
| `remote_url` | URL to the module's `remoteEntry.js` (e.g. `http://localhost:3001/remoteEntry.js`) |
| `scope` | Webpack federation container name (unique per module, stored in Postgres `modules.scope`) |
| `component` | Exposed component path inside the container (e.g. `./App`) |
| `presets` | JSON payload (`{ i18n, layout, settings }`) injected as props — the shell's way of passing config to the remote |
| `moduleReachability` | Live reachability map from `SettingsContext` — `false` means show fallback, don't attempt load |
