# Service Layer Map

Every service file, its methods, and the backend endpoints they call. All go through `apiService` which attaches `Authorization: Bearer <token>` and enforces a 15-second timeout.

```mermaid
graph LR
    subgraph Core["Core HTTP — services/api/"]
        REQ["request(url, options)\n• base: VITE_API_BASE_URL ?? '/api'\n• Bearer token from localStorage\n• 15s AbortController timeout\n• 401 with token → redirect /login\n• handles 204 / empty body"]
        API["apiService\n{ get, post, put, patch, delete }"]
        REQ --> API
    end

    subgraph Auth["authService"]
        AU1["login(credentials) → POST /api/auth/login\n  stores token + auth_user in localStorage"]
        AU2["logout() → clears localStorage"]
        AU3["getStoredUser() → reads localStorage"]
    end

    subgraph Bots["botsService"]
        BO1["getBots() → GET /api/bots"]
        BO2["getBot(id) → GET /api/bots/:id"]
        BO3["getBotTypes() → GET /api/bots/types"]
        BO4["createBot(payload) → POST /api/bots"]
        BO5["updateBot(id, payload) → PUT /api/bots/:id"]
        BO6["deleteBot(id) → DELETE /api/bots/:id"]
        BO7["getBotsForModule(moduleId) → GET /api/bots?module_id="]
    end

    subgraph BotConfig["botConfigService (plugin proxy)"]
        BC1["getConfig(scope, botId) → GET /api/plugin/:scope/bots/:id/config"]
        BC2["updateConfig(...) → PUT /api/plugin/:scope/bots/:id/config"]
        BC3["getEntities(...) → GET /api/plugin/:scope/bots/:id/entities"]
        BC4["addEntity(...) → POST /api/plugin/:scope/bots/:id/entities"]
        BC5["patchEntity(scope, entityId) → PATCH /api/plugin/:scope/entities/:id"]
        BC6["deleteEntity(scope, entityId) → DELETE /api/plugin/:scope/entities/:id"]
        BC7["getProcesses(...) → GET /api/plugin/:scope/bots/:id/processes"]
    end

    subgraph Settings["settingsService"]
        SE1["getModules() → GET /api/settings/modules"]
        SE2["createModule(m) → POST /api/settings/modules"]
        SE3["updateModule(id, m) → PUT /api/settings/modules/:id"]
        SE4["deleteModule(id) → DELETE /api/settings/modules/:id"]
        SE5["discoverModules() → GET /api/settings/modules/discover"]
        SE6["resetModuleI18n(id) → POST /api/settings/modules/:id/reset-i18n"]
    end

    subgraph Pages["pagesService"]
        PA1["listPages() → GET /api/pages"]
        PA2["getPageConfig(route) → GET /api/pages/config?route="]
        PA3["patchPageConfig(route, data) → PATCH /api/pages/config?route="]
    end

    subgraph Logs["logsService"]
        LO1["getLogs(params) → GET /api/logs"]
        LO2["getUserLogs(params) → GET /api/logs/user"]
        LO3["getSummary(params) → GET /api/logs/summary"]
        LO4["getChatLogs(params) → GET /api/chat/logs"]
        LO5["getChatSummary(params) → GET /api/chat/logs/summary"]
        LO6["getModuleLogs(id, p) → GET /api/module-logs/:id"]
        LO7["getModuleLogsSummary(id, p) → GET /api/module-logs/:id/summary"]
        LO8["getBotLogs(id, p) → GET /api/bot-logs/:id"]
        LO9["getBotLogsSummary(id, p) → GET /api/bot-logs/:id/summary"]
        LO10["purgeExpiredLogs() → POST /api/logs/purge"]
    end

    subgraph Other["Other services"]
        I18N["i18nService\ngetTranslations(lang) → GET /api/i18n/:lang\nsaveTranslations(lang, d) → PUT /api/i18n/:lang"]
        DASH["dashboardService\ngetDashboard() → GET /api/dashboard"]
        THEME["themeService\nsetTheme(t) → PATCH /api/settings/theme"]
        HEALTH["healthService\nstartWorker(cb) → spawns Web Worker\nworker: fetch /api/health every 30s"]
        NOTIF["notificationService\nconnect(token) → WebSocket /api/notifications/ws?token=\nauto-reconnect 3s · subscribe(listener) · disconnect()"]
        UICOMP["uiComponentsService\ngetAll() → GET /api/ui-components"]
    end

    API --> Auth
    API --> Bots
    API --> BotConfig
    API --> Settings
    API --> Pages
    API --> Logs
    API --> Other
```
