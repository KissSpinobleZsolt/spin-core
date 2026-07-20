// Architecture diagrams — Frontend. Auto-generated from diagramms/ folder.
export const DIAGRAMS = [
  {
    id: 'overall-architecture',
    title: 'Frontend Overall Architecture',
    description: 'Top-level view of the React 19 SPA — build tooling, provider tree, router, and real-time channels.',
    code: `graph TB
    subgraph Build["Build — Vite + TypeScript"]
        VITE["Vite dev/prod bundler"]
        PWA["vite-plugin-pwa\\nService Worker registration"]
        MF["Webpack Module Federation\\n(consumer side — loads remote entries)"]
    end

    subgraph Entry["main.tsx — bootstrap"]
        QC["QueryClient\\nstaleTime 30s · retry 1"]
        STORE["theme.store.ts\\n(Zustand — reads localStorage\\napplies dark class before first paint)"]
        I18N["i18n.ts\\n(i18next initialisation\\ndetects persisted language)"]
    end

    subgraph Providers["Context Provider Tree (outermost → innermost)"]
        P1["AuthProvider\\nJWT · user · login · logout"]
        P2["UIPrefsProvider\\nsidebarCollapsed ↔ localStorage"]
        P3["SettingsProvider\\nmodules · reachability"]
        P4["HealthProvider\\nWeb Worker → GET /api/health every 30s"]
        P5["ModelStatusProvider\\nSSE → /api/model-status/stream"]
        P6["NotificationProvider\\nWebSocket → /api/notifications/ws"]
    end

    subgraph Router["React Router v6"]
        LOGIN["/login — Login (no guard)"]
        GUARD["AuthGuard → redirects to /login if no user"]
        LAYOUT["Layout Shell\\nSidebar · Header · Footer\\nChatBubble · ModelStatusBanner"]
        PAGES["14 page routes\\n(lazy code-split)"]
        FEDERATED["/modules/:id\\nFederatedPage\\n(Webpack Module Federation)"]
    end

    subgraph RealtimeChannels["Real-time Channels"]
        WW["Web Worker\\nGET /api/health every 30s"]
        SSE["SSE EventSource\\n/api/model-status/stream"]
        WS["WebSocket\\n/api/notifications/ws"]
    end

    VITE --> Entry
    Entry --> Providers
    P1 --> P2 --> P3 --> P4 --> P5 --> P6
    P6 --> Router
    GUARD --> LAYOUT --> PAGES
    PAGES --> FEDERATED
    P4 --> WW
    P5 --> SSE
    P6 --> WS`,
  },
  {
    id: 'provider-context-tree',
    title: 'Provider / Context Tree',
    description: 'Every React context provider, what state it holds, how it gets data, and which hook exposes it.',
    code: `graph TD
    subgraph AUTH["AuthProvider — context/auth/"]
        A1["State: user: AuthUser | null"]
        A2["Source: localStorage (auth_user key)"]
        A3["Hook: useAuth() → { user, login, logout }"]
        A4["login() → POST /api/auth/login → stores token + user"]
        A5["logout() → clears localStorage"]
    end

    subgraph UIPREFS["UIPrefsProvider — context/uiPrefs/"]
        U1["State: { sidebarCollapsed: boolean }"]
        U2["Source: localStorage (ui-prefs key)"]
        U3["Hook: useUIPrefs() → { sidebarCollapsed, toggleSidebar }"]
        U4["Cross-tab sync via window.addEventListener('storage')"]
    end

    subgraph SETTINGS["SettingsProvider — context/settings/"]
        S1["State: modules[], moduleReachability: Record<id, boolean>"]
        S2["Source: GET /api/settings/modules on mount + user change"]
        S3["Reachability: HEAD {remote_url}/manifest.json per module (3s timeout)"]
        S4["Hook: useSettings() → { modules, moduleReachability, refreshModules }"]
        S5["Depends on: useAuth (re-fetches when user changes)"]
    end

    subgraph HEALTH["HealthProvider — context/health/"]
        H1["State: { api, postgres, clickhouse, checkedAt, translations? }"]
        H2["Source: Web Worker → healthService.startWorker()"]
        H3["Worker polls GET /api/health every 30 seconds"]
        H4["Hook: useHealth() → HealthState"]
        H5["translations version map triggers i18n hot-reload"]
    end

    subgraph MODELSTATUS["ModelStatusProvider — context/modelStatus/"]
        M1["State: { status: ModelStatusPayload | null, dismissed }"]
        M2["Source: useModelStatus() hook — SSE EventSource"]
        M3["SSE at /api/model-status/stream"]
        M4["Hook: useModelStatusContext() → { status, dismissed, dismiss }"]
        M5["Auto-dismisses when all_ready = true"]
    end

    subgraph NOTIF["NotificationProvider — context/notification/"]
        N1["State: notifications[], unreadCount, markAllRead"]
        N2["Source: notificationService.connect(token) → WebSocket"]
        N3["WS at ws[s]://host/api/notifications/ws?token=JWT"]
        N4["Auto-reconnects after 3s on close; caps buffer at MAX_BUFFERED"]
        N5["Hook: useNotifications() → { notifications, unreadCount, markAllRead }"]
        N6["Depends on: useAuth — only connects when user is present"]
    end

    subgraph THEME["Theme (Zustand, NOT a React context)"]
        T1["Store: useThemeStore — theme: Theme"]
        T2["Source: localStorage (theme key) — read at module load"]
        T3["Applies dark CSS class before first paint"]
        T4["Hook: useTheme() → thin adapter over useThemeStore"]
        T5["setTheme() → PATCH /api/settings/theme (fire-and-forget)"]
        T6["Cross-tab via window.addEventListener('storage')"]
    end

    subgraph LOCAL["Local / Scoped Contexts"]
        L1["UIComponentsProvider — context/uiComponents/\\nwraps DocsUI only\\nHook: useUIComponents() → GET /api/ui-components"]
        L2["PageLoaderProvider — context/pageLoader/\\nwraps Outlet inside Layout\\nHook: usePageConfig() → GET /api/pages/config?route="]
        L3["TranslationsProvider — hooks/translations/\\nwraps Translations page\\nHook: useTranslationsContext() → useSuspenseQuery"]
    end

    AUTH --> UIPREFS --> SETTINGS --> HEALTH --> MODELSTATUS --> NOTIF
    NOTIF --> LOCAL
    THEME -.->|"used by Header, Sidebar, Layout"| LOCAL`,
  },
  {
    id: 'router-and-guards',
    title: 'React Router Map & Guards',
    description: 'All routes, access guards, lazy-loading strategy, and the DB-driven PageLoader pattern.',
    code: `graph TD
    ROOT["RouterProvider\\n(React Router v6)"]

    ROOT --> LOGIN["/login\\nLogin (eager load)\\nno guard"]
    ROOT --> AUTHGUARD["AuthGuard\\nuseAuth() — if no user → Navigate to /login"]

    AUTHGUARD --> LAYOUT["Layout Shell\\nSidebar + Header + ModelStatusBanner + Footer\\nChatBubble + WorkspaceTermsModal\\n(PageLoaderProvider wraps Outlet)"]

    LAYOUT --> IDX["/ (index)\\nDashboard\\n(lazy)"]

    LAYOUT --> BOTS["/bots\\nBots\\n(lazy)"]
    LAYOUT --> BOTID["/bots/:botId\\nChat\\n(lazy)"]

    LAYOUT --> MODULES["/modules/:moduleId\\nFederatedPage\\n(lazy — loads remote JS at runtime)"]

    LAYOUT --> LOGSGUARD["RoleGuard roles=['admin']"]
    LOGSGUARD --> LOGS["/logs\\nPageLoader → Logs\\n(DB-driven)"]
    LOGSGUARD --> BOTSADMIN["/bots-admin\\nPageLoader → BotsAdmin\\n(DB-driven)"]
    LOGSGUARD --> TRANS["/translations\\nTranslations\\n(lazy)"]
    LOGSGUARD --> LLMS["/admin/llms\\nLLMs\\n(lazy)"]
    LOGSGUARD --> USERS["/admin/users\\nUsers\\n(lazy)"]
    LOGSGUARD --> MODS["/admin/modules\\nModules\\n(lazy)"]
    LOGSGUARD --> STATUS["/admin/status\\nStatus\\n(lazy)"]
    LOGSGUARD --> LAYOUTS["/admin/layouts\\nLayouts\\n(lazy)"]
    LOGSGUARD --> DOCSUI["/admin/docs/ui\\nUIComponentsProvider → DocsUI\\n(lazy)"]
    LOGSGUARD --> DOCSAPI["/admin/docs/api\\nDocsApi\\n(lazy)"]
    LOGSGUARD --> DOCSDEPLOY["/admin/docs/deployment\\nDocsDeployment\\n(lazy)"]

    LAYOUT --> NOTFOUND["/*\\nNotFound"]

    subgraph PageLoader["PageLoader pattern (DB-driven routes)"]
        PL1["usePageConfig(route)\\n→ GET /api/pages/config?route="]
        PL2{"config.type?"}
        PL3["'native' → PAGE_REGISTRY[component_key]\\n→ render lazily-imported component"]
        PL4["'federated' → FederatedPage\\n→ load remote entry JS"]
        PL1 --> PL2 --> PL3
        PL2 --> PL4
    end

    subgraph Guards["Guard logic"]
        AG["AuthGuard\\nif user === null → redirect /login\\nelse → Outlet"]
        RG["RoleGuard\\nif user.roles ∩ requiredRoles = ∅ → render fallback\\nelse → children"]
    end`,
  },
  {
    id: 'service-layer',
    title: 'Service Layer Map',
    description: 'Every service file, its methods, and the backend endpoints they call. All go through `apiService` which attaches `Authorization: Bearer <token>` and enforces a 15-second timeout.',
    code: `graph LR
    subgraph Core["Core HTTP — services/api/"]
        REQ["request(url, options)\\n• base: VITE_API_BASE_URL ?? '/api'\\n• Bearer token from localStorage\\n• 15s AbortController timeout\\n• 401 with token → redirect /login\\n• handles 204 / empty body"]
        API["apiService\\n{ get, post, put, patch, delete }"]
        REQ --> API
    end

    subgraph Auth["authService"]
        AU1["login(credentials) → POST /api/auth/login\\n  stores token + auth_user in localStorage"]
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
        I18N["i18nService\\ngetTranslations(lang) → GET /api/i18n/:lang\\nsaveTranslations(lang, d) → PUT /api/i18n/:lang"]
        DASH["dashboardService\\ngetDashboard() → GET /api/dashboard"]
        THEME["themeService\\nsetTheme(t) → PATCH /api/settings/theme"]
        HEALTH["healthService\\nstartWorker(cb) → spawns Web Worker\\nworker: fetch /api/health every 30s"]
        NOTIF["notificationService\\nconnect(token) → WebSocket /api/notifications/ws?token=\\nauto-reconnect 3s · subscribe(listener) · disconnect()"]
        UICOMP["uiComponentsService\\ngetAll() → GET /api/ui-components"]
    end

    API --> Auth
    API --> Bots
    API --> BotConfig
    API --> Settings
    API --> Pages
    API --> Logs
    API --> Other`,
  },
  {
    id: 'page-data-flow',
    title: 'Page → Hook → Service → API Data Flow',
    description: 'How each page fetches and mutates data.',
    code: `graph LR
    subgraph Dashboard
        D1["Dashboard.tsx"] --> D2["useGet(dashboardService.getDashboard)"]
        D2 --> D3["GET /api/dashboard"]
    end

    subgraph Login
        LG1["Login.tsx"] --> LG2["useAuth().login(credentials)"]
        LG2 --> LG3["POST /api/auth/login\\n→ stores JWT + user in localStorage"]
    end

    subgraph Bots
        B1["Bots.tsx"] --> B2["useGet(botsService.getBots)"]
        B2 --> B3["GET /api/bots"]
    end

    subgraph Chat
        CH1["Chat.tsx"] --> CH2["useGet(botsService.getBot(botId))"]
        CH2 --> CH3["GET /api/bots/:botId"]
        CH1 --> CH4["useChatStream(botId)"]
        CH4 --> CH5["POST /api/chat (ndjson stream)"]
        CH4 --> CH6["POST /api/chat/abort"]
        CH1 --> CH7["BotConfigPage (when type ≠ communicator)"]
        CH7 --> CH8["GET /api/plugin/:scope/bots/:id/config"]
        CH7 --> CH9["GET /api/plugin/:scope/bots/:id/entities"]
        CH7 --> CH10["PUT /api/plugin/:scope/bots/:id/config"]
    end

    subgraph Logs
        LO1["Logs.tsx"] --> LO2["ApiLogsTab"]
        LO2 --> LO3["useApiLogs → getLogs() + getSummary()"]
        LO3 --> LO4["GET /api/logs\\nGET /api/logs/summary"]
        LO1 --> LO5["UserLogsTab → useUserLogs"]
        LO5 --> LO6["GET /api/logs/user"]
        LO1 --> LO7["ChatLogsTab → useChatLogs"]
        LO7 --> LO8["GET /api/chat/logs"]
    end

    subgraph Translations
        TR1["Translations.tsx"] --> TR2["useTranslations (useSuspenseQuery)"]
        TR2 --> TR3["GET /api/i18n/en\\nGET /api/i18n/ro"]
        TR2 --> TR4["PUT /api/i18n/:lang (on save)"]
    end

    subgraph BotsAdmin
        BA1["BotsAdmin.tsx"] --> BA2["useGet(botsService.getBots)"]
        BA2 --> BA3["GET /api/bots"]
        BA1 --> BA4["useGet(botsService.getBotTypes)"]
        BA4 --> BA5["GET /api/bots/types"]
        BA1 --> BA6["useGet(settingsService.getModules)"]
        BA6 --> BA7["GET /api/settings/modules"]
        BA1 --> BA8["createBot / updateBot / deleteBot"]
        BA8 --> BA9["POST / PUT / DELETE /api/bots[/:id]"]
    end

    subgraph Modules
        MO1["Modules.tsx"] --> MO2["settingsService CRUD"]
        MO2 --> MO3["GET/POST/PUT/DELETE /api/settings/modules[/:id]"]
        MO1 --> MO4["pagesService.listPages + patchPageConfig"]
        MO4 --> MO5["GET /api/pages\\nPATCH /api/pages/config?route="]
        MO1 --> MO6["settingsService.discoverModules"]
        MO6 --> MO7["GET /api/settings/modules/discover"]
    end

    subgraph Status
        ST1["Status.tsx"] --> ST2["useHealth() — Web Worker"]
        ST1 --> ST3["GET /api/model-status/installed"]
        ST1 --> ST4["useSettings() — modules list"]
        ST1 --> ST5["botsService.getBots (filtered active)"]
    end

    subgraph LLMsPage["LLMs"]
        LL1["LLMs.tsx"] --> LL2["GET /api/model-status/installed"]
        LL1 --> LL3["POST /api/model-status/pull"]
        LL1 --> LL4["DELETE /api/model-status/:name"]
    end

    subgraph DocsUI
        DU1["DocsUI.tsx"] --> DU2["useUIComponents()"]
        DU2 --> DU3["GET /api/ui-components"]
    end

    subgraph FederatedPage
        FP1["FederatedPage.tsx"] --> FP2["loadFederatedModule(remote_url, scope, component)"]
        FP2 --> FP3["inject script tag for remoteEntry.js\\nexpose window.React + window.ReactDOM\\ncall container.init + container.get"]
        FP1 --> FP4["ModuleBotPanel"]
        FP4 --> FP5["GET /api/bots?module_id=\\nPOST /api/chat"]
    end`,
  },
  {
    id: 'component-hierarchy',
    title: 'Component Hierarchy',
    description: 'Full React component tree from the root mount point to leaf components.',
    code: `graph TD
    MAIN["main.tsx\\nQueryClientProvider\\nAuthProvider → UIPrefsProvider\\n→ SettingsProvider → HealthProvider\\n→ ModelStatusProvider → NotificationProvider"]

    MAIN --> APP["App.tsx\\nRouterProvider\\nCookieConsentModal (outside router)"]

    APP --> LOGIN["/login → Login\\nInput · Btn · ErrorBanner"]

    APP --> AUTHGUARD["AuthGuard"]
    AUTHGUARD --> LAYOUT["Layout\\nSidebar · Header · ModelStatusBanner\\nFooter · ChatBubble · WorkspaceTermsModal"]

    LAYOUT --> SIDEBAR["Sidebar\\nNav items (Dashboard, Bots)\\nDynamic module entries (from SettingsContext)\\nOfflineModuleItem\\nAdmin section (if admin role)\\nSign-out button"]

    LAYOUT --> HEADER["Header\\nPage title from route map\\nHealth indicator (red pulse if degraded)\\nUser avatar dropdown:\\n  Theme toggle\\n  Language toggle (EN/RO)\\n  Logout"]

    LAYOUT --> MSB["ModelStatusBanner\\nModelRow · ProgressBar\\nDismiss button"]

    LAYOUT --> CHATBUBBLE["ChatBubble\\nBot/model selector panel\\nStreaming chat UI (useChatStream)\\nPersists history to localStorage"]

    LAYOUT --> OUTLET["PageLoaderProvider → Outlet (route content)"]

    OUTLET --> DASHBOARD["/ → Dashboard\\nStatic content"]

    OUTLET --> BOTSPAGE["/bots → Bots\\nAdminPageShell · PageTitle\\nBotCard[] (grid)"]

    OUTLET --> CHAT["/bots/:botId → Chat"]
    CHAT --> CHATUI["(communicator type)\\nStreaming chat UI"]
    CHAT --> BOTCONFIG["(other types)\\nBotConfigPage\\nSectionHeader · ConfigFieldRow\\nWatchlistSection · RiskProfilesSection\\nTeamsSection · ProcessesSection"]

    OUTLET --> FEDERATED["/modules/:id → FederatedPage\\nErrorBoundary → Suspense\\n→ RemoteComponent (props: presets)\\nModuleBotPanel (floating bot chat)\\nModuleOfflineFallback (when unreachable)"]

    OUTLET --> PAGELOADER["PageLoader (DB-driven routes)\\nreads usePageConfig()\\n→ PAGE_REGISTRY[component_key] OR FederatedPage"]

    PAGELOADER --> LOGSPAGE["/logs → Logs\\nLogsHeader · LogsTimeFilter\\nLogsContent:\\n  ApiLogsTab (StatCard · Table · Pagination)\\n  UserLogsTab (Table · Pagination)\\n  ChatLogsTab (expandable replay)"]

    PAGELOADER --> BOTSADMIN["/bots-admin → BotsAdmin\\nPageTitle · Table · Btn · Badge · Toggle\\nBotModal · BotLogsDrawer"]

    OUTLET --> TRANS["/translations → Translations\\nTranslationsProvider:\\n  TranslationsToolbar\\n  TranslationsGrid"]

    OUTLET --> LLMS["/admin/llms → LLMs\\nAdminPageShell · PageTitle\\nBtn · Spinner · ErrorBanner"]

    OUTLET --> USERS["/admin/users → Users\\nAdminPageShell · PageTitle · Card"]

    OUTLET --> MODSPAGE["/admin/modules → Modules\\nAdminPageShell · PageTitle · Tabs · Badge\\nToggle · Btn · ErrorBanner\\nModuleModal · ModuleLogsDrawer"]

    OUTLET --> STATUS["/admin/status → Status\\nAppHealthSection\\nDbStatusSection\\nInstalledLLMsSection\\nModulesStatusSection\\nActiveBotsSection"]

    OUTLET --> LAYOUTS["/admin/layouts → Layouts\\nDocPageShell · Tabs\\nAnomaScanLayout · CloudInsightAILayout\\nAdminShellDemo · DocShellDemo"]

    OUTLET --> DOCSUI["/admin/docs/ui → UIComponentsProvider → DocsUI\\nDocPageShell · PageTitle · Input\\nComponentCard[] · Spinner · ErrorBanner"]

    OUTLET --> DOCSAPI["/admin/docs/api → DocsApi\\nDocPageShell · PageTitle · Input · GroupCard[]"]

    OUTLET --> DOCSDEPLOY["/admin/docs/deployment → DocsDeployment\\nDocPageShell · Tabs\\nDockerTab · KubernetesTab"]

    OUTLET --> NOTFOUND["/* → NotFound\\nBtn"]`,
  },
  {
    id: 'auth-flow',
    title: 'Authentication Flow',
    description: 'Login, token storage, route protection, and logout. Defined in `context/auth/`, `services/auth/`, `components/guards/`.',
    code: `sequenceDiagram
    participant U as User (Browser)
    participant LP as Login Page
    participant AC as AuthContext
    participant AS as authService
    participant API as Backend /api/auth/login
    participant LS as localStorage
    participant AG as AuthGuard
    participant APP as Protected App

    Note over U,APP: FIRST VISIT (not logged in)
    U->>LP: navigate to any route
    AG->>AC: useAuth() — user === null
    AG-->>U: Navigate to /login

    Note over U,APP: LOGIN
    U->>LP: enter email + password → submit
    LP->>AC: login(credentials)
    AC->>AS: authService.login(credentials)
    AS->>API: POST /api/auth/login { email, password }
    API-->>AS: { token, user: { name, roles, defaultTheme } }
    AS->>LS: localStorage.setItem('token', token)
    AS->>LS: localStorage.setItem('auth_user', JSON.stringify(user))
    AS-->>AC: user object
    AC->>AC: setState({ user })
    AC-->>LP: user set
    LP-->>U: navigate to /

    Note over U,APP: AUTHENTICATED REQUESTS
    U->>APP: interact with any page
    APP->>AS: apiService.get(url)
    AS->>LS: getItem('token')
    AS->>API: fetch with Authorization: Bearer <token>
    alt 401 response AND token was present
        API-->>AS: 401 Unauthorized
        AS-->>U: window.location.href = '/login' (force redirect)
    else success
        API-->>AS: data
        AS-->>APP: data
    end

    Note over U,APP: LOGOUT
    U->>APP: click Sign Out (Sidebar)
    APP->>AC: logout()
    AC->>AS: authService.logout()
    AS->>LS: removeItem('token') + removeItem('auth_user')
    AC->>AC: setState({ user: null })
    AC-->>U: Navigate to /login (AuthGuard redirects)

    Note over U,APP: PAGE REFRESH
    U->>APP: refresh browser
    AC->>AS: authService.getStoredUser()
    AS->>LS: getItem('auth_user')
    LS-->>AS: stored user JSON (or null)
    AS-->>AC: user object
    AC->>AC: useState initialiser — user restored from localStorage`,
  },
  {
    id: 'chat-streaming-flow',
    title: 'Chat / Streaming Flow',
    description: '`useChatStream`, `ChatBubble` (floating widget), and `ModuleBotPanel` (per-module bot).',
    code: `sequenceDiagram
    participant U as User
    participant CB as ChatBubble / Chat page
    participant UC as useChatStream
    participant API as POST /api/chat
    participant CH as ClickHouse (server-side)

    Note over U,CH: SEND MESSAGE
    U->>CB: type message → press Send
    CB->>UC: sendMessage(text)
    UC->>UC: append user message to local history
    UC->>API: fetch POST /api/chat\\n{ messages, bot_id, model, module_id }
    Note over API,CH: server resolves bot → provider → streams NDJSON

    loop NDJSON chunks (application/x-ndjson)
        API-->>UC: { "message": { "content": "..." }, "done": false }
        UC-->>CB: update streaming assistant message
        CB-->>U: live text appears
    end

    API-->>UC: { "done": true, "prompt_tokens": N, "eval_tokens": M }
    UC->>UC: finalise message; save history to localStorage
    API->>CH: write chat.completion to module_logs\\nwrite bot.info to bot_logs

    Note over U,CH: ABORT
    U->>CB: press Stop button mid-stream
    CB->>UC: abort()
    UC->>UC: abortController.abort() — kills fetch reader
    UC->>API: POST /api/chat/abort { bot_id, module_id }
    API->>CH: write bot.abort + chat.abort

    Note over U,CH: ERROR
    API-->>UC: { "error": "provider unreachable..." }
    UC-->>CB: show error state
    API->>CH: write bot.error to bot_logs

    subgraph "ChatBubble extras"
        C1["Fetches GET /api/bots (filters modules.includes('system'))"]
        C2["Fetches GET /api/model-status/installed"]
        C3["Bot selector + model selector panel"]
        C4["Gated on Ollama readiness unless cloud bots exist"]
        C5["Persists per-bot chat history in localStorage"]
    end

    subgraph "ModuleBotPanel (inside FederatedPage)"
        M1["Fetches GET /api/bots?module_id="]
        M2["Multi-bot tab selector when bots.length > 1"]
        M3["Violet floating panel bottom-left of the module view"]
        M4["Uses same useChatStream(botId, '', moduleId)"]
    end`,
  },
  {
    id: 'module-federation-flow',
    title: 'Module Federation Flow',
    description: 'How the shell loads a remote micro-frontend at runtime using Webpack Module Federation.',
    code: `sequenceDiagram
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
    FP-->>U: floating violet panel with module-scoped bots`,
  },
  {
    id: 'realtime-channels',
    title: 'Real-time Channels',
    description: 'Three independent real-time mechanisms: Web Worker (health), SSE (model status), WebSocket (notifications).',
    code: `graph TB
    subgraph WW["Web Worker — HealthProvider"]
        WW1["healthService.startWorker(onUpdate)"]
        WW2["healthWorker.ts spawned in separate thread"]
        WW3["fetch('/api/health') every 30 seconds"]
        WW4["postMessage(HealthPayload) back to main thread"]
        WW5["HealthPayload: { api, postgres, clickhouse, translations }"]
        WW6["translations version map → triggers i18n hot-reload\\n(useI18nSync detects version change)"]
        WW1 --> WW2 --> WW3 --> WW4 --> WW5 --> WW6
        WW7["useHealth() consumers:\\n  Header (health indicator)\\n  Status page (AppHealth, DbStatus sections)"]
        WW5 --> WW7
    end

    subgraph SSE["SSE EventSource — ModelStatusProvider"]
        S1["useModelStatus() hook"]
        S2["EventSource at {BASE_URL}/api/model-status/stream"]
        S3["Server pushes every 1 second; max 30 minutes"]
        S4["Payload: { ollama, all_ready, models[] }"]
        S5["ModelInfo: { name, phase, speed_bps, eta_str,\\n  total_bytes, completed_bytes }"]
        S1 --> S2 --> S3 --> S4 --> S5
        S6["auto-dismiss when all_ready = true"]
        S4 --> S6
        S7["useModelStatusContext() consumers:\\n  ModelStatusBanner (download progress strip)\\n  ChatBubble (gating — hide chat until Ollama ready)"]
        S4 --> S7
    end

    subgraph WS["WebSocket — NotificationProvider"]
        N1["notificationService.connect(token)"]
        N2["WebSocket ws[s]://host/api/notifications/ws?token=JWT"]
        N3["Server polls CH notifications table every 5s\\npushes JSON arrays of new rows"]
        N4["Client: auto-reconnects after 3s on close"]
        N5["Buffer capped at MAX_BUFFERED notifications"]
        N1 --> N2 --> N3 --> N4 --> N5
        N6["Only connects when user is authenticated (useAuth guard)"]
        N7["useNotifications() consumers:\\n  Header (unread badge)\\n  Notification dropdown"]
        N5 --> N6
        N5 --> N7
    end

    subgraph Lifecycle["Connection lifecycle"]
        L1["NotificationProvider mounts → connect(token)"]
        L2["User logs out → disconnect()"]
        L3["HealthProvider mounts → startWorker()"]
        L4["HealthProvider unmounts → worker.terminate()"]
        L5["ModelStatusProvider mounts → EventSource open"]
        L6["dismiss() called → EventSource close"]
    end`,
  },
  {
    id: 'theme-system',
    title: 'Theme System',
    description: 'Zustand-based theme (not a React context), with cross-tab sync, server persistence, and user-preference initialisation.',
    code: `flowchart TD
    subgraph Init["Module load — before first paint"]
        I1["theme.store.ts imported by main.tsx"]
        I2["read localStorage.getItem('theme') → 'dark' | 'light' | null"]
        I3["apply document.documentElement.classList (dark/light)"]
        I4["initialise Zustand store: theme = stored value ?? 'dark'"]
        I1 --> I2 --> I3 --> I4
    end

    subgraph Login["After user logs in"]
        L1["Layout.tsx calls initFromUser(user.defaultTheme)"]
        L2["if localStorage has no override → applyTheme(user.defaultTheme)"]
        L3["if localStorage already set → keep local preference (wins over server)"]
        L1 --> L2
        L1 --> L3
    end

    subgraph Toggle["User toggles theme"]
        T1["Header dropdown → useTheme().setTheme(newTheme)"]
        T2["applyTheme(newTheme):\\n  localStorage.setItem('theme', newTheme)\\n  document.documentElement.classList update\\n  store update"]
        T3["themeService.setTheme(newTheme)\\n→ PATCH /api/settings/theme { theme }\\n(fire-and-forget — updates user.default_theme in PG)"]
        T1 --> T2 --> T3
    end

    subgraph CrossTab["Cross-tab synchronisation"]
        C1["window.addEventListener('storage') at module level"]
        C2["key === 'theme' → applyTheme(newValue)"]
        C3["All browser tabs stay in sync automatically"]
        C1 --> C2 --> C3
    end

    subgraph Consumers["Components that consume theme"]
        CO1["useTheme() → { theme, setTheme }"]
        CO2["Header — theme toggle button"]
        CO3["Layout — CSS class on root element"]
        CO4["Sidebar — dark/light icon state"]
        CO5["variables.css — CSS custom properties per class"]
    end

    Init --> Login
    Toggle --> CrossTab
    Init --> Consumers
    Toggle --> Consumers`,
  },
  {
    id: 'i18n-system',
    title: 'i18n / Translation System',
    description: 'i18next initialisation, server-driven translation bundles, hot-reload on version change, and the admin Translations editor.',
    code: `flowchart TD
    subgraph Boot["Startup"]
        B1["main.tsx imports i18n.ts"]
        B2["i18next.init() — detects persisted language\\n(localStorage 'i18n_lang' or browser language)"]
        B3["useI18nStore.ready = false"]
        B4["useI18nSync() called inside Layout"]
        B5["fetch GET /api/i18n/{lang}\\n→ i18next.addResourceBundle(lang, 'translation', data)"]
        B6["useI18nStore.ready = true\\nLayout unblocks (stops showing Spinner)"]
        B1 --> B2 --> B3 --> B4 --> B5 --> B6
    end

    subgraph HotReload["Hot-reload on server version change"]
        HR1["HealthProvider Web Worker\\nposts HealthPayload.translations: Record<lang, version>"]
        HR2["useI18nSync detects version bump\\n(compares to last known version)"]
        HR3["re-fetch GET /api/i18n/{lang}"]
        HR4["i18next.addResourceBundle(lang, 'translation', freshData)"]
        HR5["UI re-renders with updated strings"]
        HR1 --> HR2 --> HR3 --> HR4 --> HR5
    end

    subgraph LanguageSwitch["User switches language"]
        LS1["Header language dropdown (EN / RO)"]
        LS2["localStorage.setItem('i18n_lang', newLang)"]
        LS3["i18next.changeLanguage(newLang)"]
        LS4["if bundle not loaded yet → fetch GET /api/i18n/{newLang}"]
        LS5["cross-tab sync via window.addEventListener('storage')"]
        LS1 --> LS2 --> LS3 --> LS4
        LS2 --> LS5
    end

    subgraph Admin["Admin Translations Editor"]
        AE1["Translations.tsx"]
        AE2["TranslationsProvider wraps subtree"]
        AE3["useTranslations() → useSuspenseQuery\\nGET /api/i18n/en + GET /api/i18n/ro (parallel)"]
        AE4["TranslationsGrid — editable virtual data grid\\nall keys from EN bundle; RO column editable"]
        AE5["TranslationsToolbar — Save buttons per language"]
        AE6["save → PUT /api/i18n/{lang} with updated object\\n→ i18next.addResourceBundle() to apply immediately"]
        AE1 --> AE2 --> AE3 --> AE4 --> AE5 --> AE6
    end

    Boot --> HotReload
    Boot --> LanguageSwitch`,
  },
  {
    id: 'page-loading-system',
    title: 'Page Loading System',
    description: 'Two-tier page resolution: static router for known paths, DB-driven `PageLoader` for configurable pages.',
    code: `flowchart TD
    NAV["User navigates to a URL"]
    NAV --> ROUTER["React Router matches path"]

    ROUTER --> STATIC["Static routes (hardcoded in router.config.tsx)\\n/bots · /bots/:id · /translations\\n/admin/llms · /admin/users · /admin/modules\\n/admin/status · /admin/layouts · /admin/docs/*\\n/modules/:moduleId"]

    ROUTER --> PAGELOADER_ROUTE["DB-driven routes\\n/logs · /bots-admin"]

    PAGELOADER_ROUTE --> PLC["PageLoaderProvider (mounted in Layout)\\nusePageConfig(currentPathname)"]

    PLC --> API["GET /api/pages/config?route={pathname}"]
    API --> BACKEND["Backend looks up page_registry table\\nby route (unique indexed)"]
    BACKEND --> CONFIG["PageConfig { type, component_key,\\nremote_url, scope, component, roles }"]

    CONFIG --> TYPE{config.type}

    TYPE -->|"'native'"| REGISTRY["PAGE_REGISTRY[component_key]\\nRecord<string, LazyComponent>\\n(Dashboard · Logs · BotsAdmin · Translations\\n LLMs · Users · Modules · Status · Layouts\\n DocsUI · DocsApi · DocsDeployment)"]
    REGISTRY --> NATIVE["React.lazy() import\\nrendered inside Suspense"]

    TYPE -->|"'federated'"| FEDPAGE["FederatedPage\\nloadFederatedModule(remote_url, scope, component)"]

    STATIC --> LAZYLOAD["All static page components are\\nReact.lazy() — code-split per route\\nSuspense boundary in Layout"]

    subgraph AdminControl["Admin can configure pages via Modules page"]
        AC1["pagesService.listPages() → GET /api/pages"]
        AC2["pagesService.patchPageConfig(route, { title, roles, skeleton, enabled })"]
        AC3["→ PATCH /api/pages/config?route="]
        AC1 --> AC2 --> AC3
    end

    subgraph Skeleton["While page config loads"]
        SK1["PageConfig.skeleton: { type, columns, rows }"]
        SK2["type 'cards' → card grid skeleton"]
        SK3["type 'table' → table row skeleton"]
        SK4["type 'doc' → doc block skeleton"]
    end

    CONFIG --> Skeleton`,
  },
  {
    id: 'state-management',
    title: 'State Management Overview',
    description: 'Where different kinds of state live in the frontend.',
    code: `graph TB
    subgraph Server["Server State — TanStack Query"]
        TQ1["useGet(fn) — useQuery wrapper\\nstaleTime: 30s · retry: 1"]
        TQ2["useSuspenseQuery — Translations page\\nblocks render until both EN + RO load"]
        TQ3["Cache key examples:\\n['bots'] · ['bot', id] · ['modules']\\n['logs', params] · ['translations', lang]"]
        TQ4["Invalidation: manual after mutations\\n(createBot → invalidate 'bots' query)"]
    end

    subgraph Global["Global Client State — React Context"]
        GC1["AuthContext — user identity\\nSource: localStorage · survives refresh"]
        GC2["SettingsContext — module list + reachability\\nSource: GET /api/settings/modules + HEAD probes\\nRe-fetches on user change"]
        GC3["HealthContext — infrastructure status\\nSource: Web Worker polling /api/health"]
        GC4["ModelStatusContext — Ollama pull progress\\nSource: SSE /api/model-status/stream"]
        GC5["NotificationContext — live alerts\\nSource: WebSocket /api/notifications/ws"]
        GC6["UIPrefsContext — sidebar collapsed\\nSource: localStorage · cross-tab sync"]
    end

    subgraph Zustand["Zustand Stores"]
        Z1["useThemeStore — theme: 'dark' | 'light'\\nRead at module load (before first paint)\\nPersisted to localStorage\\nCross-tab via storage event"]
        Z2["useI18nStore — ready: boolean\\nBlocks Layout render until translations loaded"]
    end

    subgraph Local["Local Component State — useState / useReducer"]
        L1["Form inputs (Login, BotModal, ModuleModal)"]
        L2["Pagination (page, offset) — Logs, BotsAdmin"]
        L3["Active tab — Logs, Modules, Translations"]
        L4["Expanded rows — ChatLogsTab"]
        L5["Modal open/close — BotsAdmin (?new ?edit ?logs)"]
        L6["Filter values — time range, owner, event type"]
    end

    subgraph Persistent["Persistent Local Storage"]
        P1["'token' — JWT for API auth"]
        P2["'auth_user' — user profile JSON"]
        P3["'theme' — 'dark' | 'light'"]
        P4["'i18n_lang' — 'en' | 'ro'"]
        P5["'ui-prefs' — { sidebarCollapsed }"]
        P6["'chat-history-{botId}' — message arrays per bot"]
        P7["'cookie_consent' — 'essential' | 'all'"]
        P8["workspace-terms-{user.name} — accepted flag"]
    end

    subgraph URL["URL State"]
        U1["?tab=api|user|chat — Logs active tab"]
        U2["?new · ?edit={id} · ?logs={id} — BotsAdmin modals"]
        U3["/modules/:moduleId — active federated module"]
        U4["/bots/:botId — active chat bot"]
    end

    Server --> Global
    Zustand -.->|"used by contexts + components"| Global
    Local -.->|"sometimes promoted to URL state"| URL`,
  },
  {
    id: 'ui-primitives',
    title: 'UI Primitive Components',
    description: 'All shared UI primitives in `frontend/src/components/ui/`. Every component has a co-located `.style.css` file.',
    code: `classDiagram
    class Btn {
        +variant: 'primary' | 'secondary' | 'danger'
        +size?: 'sm' | 'md' | 'lg'
        +disabled?: boolean
        +onClick?: handler
        +forwarded: all button attrs
    }
    class Badge {
        +variant: 'info' | 'success' | 'warn' | 'error' | 'neutral'
        +dot?: boolean
        +children: ReactNode
    }
    class Card {
        +children: ReactNode
        +className?: string
    }
    class ErrorBanner {
        +message: string
        renders: red alert box
    }
    class Input {
        +label?: string
        +id?: string
        +forwarded: all input attrs
    }
    class Label {
        +forwarded: all label attrs
        +htmlFor: string
    }
    class Modal {
        +title: string
        +onClose?: handler
        +maxWidth?: string
        +children: ReactNode
        renders: portal overlay
    }
    class PageTitle {
        +children: ReactNode
        renders: bold h1
    }
    class Spinner {
        +size: 'sm' | 'md' | 'lg'
        renders: CSS animated ring
    }
    class Toggle {
        +checked: boolean
        +onChange: handler
        +disabled?: boolean
        role: switch
    }
    class StatCard {
        +value: string | number
        +label: string
        +sub?: string
        renders: KPI metric tile
    }
    class Tabs {
        +tabs: Array of key+label
        +active: string
        +onChange: handler
        fully controlled
    }
    class ProgressBar {
        +value: number 0-100
        +label?: string
        +color?: string
    }
    class Chip {
        +children: ReactNode
        +onRemove?: handler
    }
    class DropZone {
        +onFiles?: handler
        +accept?: string
        +hint?: string
        +file?: File
    }
    class TableGeneric {
        +columns: TableColumn array
        +rows: T array
        +rowKey: keyof T
        +empty?: ReactNode
        +compact?: boolean
        generic T
    }
    class Pagination {
        +page: number
        +totalPages: number
        +onPage: handler
    }`,
  },
]
