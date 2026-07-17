# Frontend Developer Structure

React 19 SPA built with Vite + TypeScript. Styling via Tailwind + co-located `.style.css` files. API layer is fully separated into service files. Module Federation remotes are loaded dynamically at runtime.

---

## Root (`frontend/`)

| File | Purpose |
|---|---|
| `index.html` | Vite HTML entry point — mounts `#root` |
| `vite.config.ts` | Vite config (aliases, plugins, dev proxy) |
| `tsconfig.app.json` | TypeScript config for application source |
| `tsconfig.node.json` | TypeScript config for Vite/Node tooling |
| `tsconfig.json` | Root TS config — references both above |
| `eslint.config.js` | ESLint flat config |
| `package.json` | Dependencies and scripts (`dev`, `build`, `preview`) |
| `pnpm-lock.yaml` | Locked dependency tree |
| `nginx.conf` | Nginx config used in the production Docker image |
| `Dockerfile` | Production image — builds dist, serves via nginx |
| `Dockerfile.dev` | Development image — runs `vite dev` with HMR |
| `.env` | Environment variables (e.g. `VITE_API_URL`) |
| `README.md` | Frontend-specific developer documentation |

---

## `src/`

### `main.tsx`
App bootstrap — creates the React root, wraps `<App>` in all top-level context providers, imports global CSS.

### `index.css`
Global stylesheet — imports Tailwind layers and `styles/variables.css`; sets base resets.

---

## `src/app/`

Application shell and routing.

| File | Purpose |
|---|---|
| `App.tsx` | Root component — renders `<Router>` and top-level layout |
| `index.ts` | Barrel export |
| `loginFallback.constant.tsx` | Fallback element shown while the login page loads |
| `router/router.config.tsx` | `createBrowserRouter` definition — all route objects |
| `router/lazyPages.constant.ts` | Lazy-import map: page name → `React.lazy(() => import(...))` |
| `router/index.ts` | Barrel export |

---

## `src/components/`

Reusable components, grouped by domain.

### `ui/` — Design-system primitives

| Component | Purpose |
|---|---|
| `button/` | `Btn` — themed button with `variant` prop (primary, secondary, danger, ghost) |
| `badge/` | `Badge` — coloured status pill with dot/ring variants |
| `chip/` | `Chip` — small removable tag |
| `input/` | `Input` — styled text input |
| `modal/` | `Modal` — accessible overlay with backdrop |
| `toggle/` | `Toggle` — boolean switch |
| `spinner/` | `Spinner` — loading indicator with size variants |
| `progressBar/` | `ProgressBar` — coloured fill bar with colour type |
| `statCard/` | `StatCard` — KPI metric tile (label + value) |
| `tabs/` | `Tabs` — horizontal tab bar |
| `Card.tsx` | Generic content card wrapper |
| `ErrorBanner.tsx` | Inline error message strip |
| `Label.tsx` | Form field label |
| `PageTitle.tsx` | `<h1>`-level page heading |
| `Table/` | Generic sortable data table |
| `Pagination/` | Page-based navigation controls |
| `dropZone/` | File drag-and-drop input area |
| `index.ts` | Barrel — re-exports all primitives |

Each sub-folder follows the atomization pattern: one `.tsx`, one `Props.type.ts`, one `index.ts`, and a `.style.css` when visual styles are needed.

---

### `layout/` — App shell structure

| Component | Purpose |
|---|---|
| `Layout.tsx` | Master shell — composes `Sidebar`, `Header`, `Footer`, and `<Outlet>` |
| `Footer.tsx` | Bottom bar with version/copyright |
| `PageLoader.tsx` | Full-page loading overlay triggered by `PageLoaderContext` |
| `header/` | Top navigation bar; shows user avatar initials, theme toggle, logout |
| `sidebar/` | Collapsible left nav; renders module links from `SettingsContext` |
| `modelStatusBanner/` | Banner shown during Ollama model pull — progress bar + phase label |
| `pageSkeletonLoader/` | Skeleton screens (cards, table, doc) used while page data loads |
| `adminPageShell/` | Wrapper for admin pages — standard title + content area |
| `docPageShell/` | Wrapper for documentation pages — sticky sidebar nav + scroll body |

---

### `guards/` — Route protection

| File | Purpose |
|---|---|
| `AuthGuard.tsx` | Redirects to `/login` when no valid JWT is present |
| `roleGuard/RoleGuard.tsx` | Renders `null` (or a fallback) if the user lacks a required role |

---

### `chat/chatBubble/` — Persistent chat widget

| File | Purpose |
|---|---|
| `ChatBubble.tsx` | Floating chat button + expandable chat panel |
| `loadHistory.ts` | Reads prior messages from `localStorage` |
| `saveHistory.ts` | Persists messages to `localStorage` |
| `STORAGE_KEYS.constant.ts` | Key names used for `localStorage` |

---

### `modules/` — Module Federation integration

| Component | Purpose |
|---|---|
| `federatedPage/FederatedPage.tsx` | Dynamically loads a remote MF module; wraps it in an `ErrorBoundary` |
| `federatedPage/ErrorBoundary.tsx` | Class-based error boundary — catches render errors from remote modules |
| `federatedPage/ModuleErrorFallback.tsx` | UI shown when a module throws during render |
| `federatedPage/ModuleOfflineFallback.tsx` | UI shown when the remote `remoteEntry.js` cannot be fetched |
| `moduleBotPanel/ModuleBotPanel.tsx` | Side panel that surfaces the module-scoped bot chat |

---

### `timeRangeFilter/` — Shared date/time picker

| File | Purpose |
|---|---|
| `TimeRangeFilter.tsx` | From/to datetime inputs with preset shortcuts |
| `TimeRange.type.ts` | `{ from: string; to: string }` shape |
| `defaultTimeRange.util.ts` | Returns today's default range |
| `monthStart.util.ts` | Computes start of current month |
| `nowValue.util.ts` | Returns current datetime as an input-compatible string |
| `toInputValue.util.ts` | Converts a `Date` to `datetime-local` string format |
| `TimeRangeFilter.constant.ts` | Preset label/value list |

---

### `cookieConsent/` — GDPR banner

| File | Purpose |
|---|---|
| `CookieConsentModal.tsx` | Modal shown on first visit asking for cookie acceptance |
| `STORAGE_KEY.constant.ts` | `localStorage` key for persisting consent decision |

---

### `workspaceTermsModal/` — Workspace T&C gate

| File | Purpose |
|---|---|
| `WorkspaceTermsModal.tsx` | Modal that blocks the app until the user accepts workspace terms |
| `WorkspaceTermsModal.constant.ts` | Terms text content |
| `STORAGE_KEY.constant.ts` | `localStorage` key for persisting acceptance |

---

## `src/context/`

All React context providers. Each sub-folder is fully atomized: one `.context.tsx`, one `Value.type.ts`, one `index.ts`.

| Context | Purpose |
|---|---|
| `auth/` | `AuthContext` — JWT token, decoded user, login/logout |
| `health/` | `HealthContext` — backend/DB reachability state, polling |
| `modelStatus/` | `ModelStatusContext` — Ollama model pull phase and progress |
| `notification/` | `NotificationContext` — toast queue (add / dismiss) |
| `pageLoader/` | `PageLoaderContext` — show/hide the full-page loading overlay |
| `settings/` | `SettingsContext` — app settings, module list, reachability map |
| `theme/` | `ThemeContext` — active theme (light/dark), toggle, persist |
| `uiComponents/` | `UIComponentsContext` — registered UI component overrides from modules |
| `uiPrefs/` | `UIPrefsContext` — user UI preferences (sidebar collapsed, etc.), persisted to `localStorage` |

---

## `src/hooks/`

Custom React hooks, each in its own sub-folder.

| Hook | Purpose |
|---|---|
| `useApi.ts` | Generic hook wrapping `fetch` with loading/error state |
| `apiLogs/useApiLogs` | Paginated HTTP request log fetcher (ClickHouse) |
| `chatLogs/useChatLogs` | Paginated chat completion log fetcher (ClickHouse) |
| `userLogs/useUserLogs` | Paginated user activity log fetcher |
| `chatStream/useChatStream` | SSE streaming hook for bot chat — manages message list and stream state |
| `modelStatus/useModelStatus` | SSE hook that tracks Ollama model pull phase and download progress |
| `translations/useTranslations` | Loads i18n strings from the backend and exposes a `t(key)` helper |

---

## `src/i18n/`

Internationalisation bootstrap.

| File | Purpose |
|---|---|
| `i18nSync/useI18nSync.hook.ts` | Hook that fetches translations on mount and writes them to the i18n store |
| `i18nSync/reloadTranslations.ts` | Imperative helper — fetches and applies fresh translations |

---

## `src/pages/`

Full-page route components. Each page folder is atomized; the root `.tsx` is the page entry and sub-files are scoped helpers.

| Page | Route | Purpose |
|---|---|---|
| `Dashboard.tsx` | `/` | Landing dashboard with page content from the backend |
| `Login.tsx` | `/login` | Username/password form, issues JWT |
| `NotFound.tsx` | `*` | 404 fallback |
| `registry.ts` | — | Page name → component map used by `lazyPages.constant.ts` |

### `admin/`

| Page | Route | Purpose |
|---|---|---|
| `status/Status.tsx` | `/admin/status` | System health dashboard — DB status, installed LLMs, active bots, modules |
| `modules/Modules.tsx` | `/admin/modules` | Module CRUD table, modal editor, inline log drawer |
| `LLMs.tsx` | `/admin/llms` | Ollama model management — pull, delete, list |
| `Users.tsx` | `/admin/users` | User management — list, add, edit roles |
| `Docs.tsx` | `/admin/docs` | In-app documentation hub (tabs: API reference, UI components, deployment, layouts) |
| `docs/api/` | — | Interactive API reference — grouped endpoints with method badges |
| `docs/ui/` | — | UI component browser — live previews + prop tables |
| `docs/deployment/` | — | Deployment guide tabs: Docker Compose and Kubernetes |
| `docs/previewRegistry/` | — | Preview components for each UI primitive shown in the component browser |
| `layouts/` | — | Layout preview demos (AdminShell, DocShell, feature-specific shells) |

### `bots/`

| File | Purpose |
|---|---|
| `Bots.tsx` | Bot discovery grid — cards for each available bot |
| `BotCard.tsx` | Single bot card with icon, name, description |
| `BotHeader.tsx` | Header bar shown inside the chat view |

### `botsAdmin/`

Admin CRUD panel for managing bot definitions (name, model, system prompt, roles).

### `chat/`

Full-page chat interface for a single bot. Streams responses via `useChatStream`. Shows a bot config skeleton while loading.

### `botConfigPage/`

Read-only config viewer for a module-scoped bot — risk profiles, watchlists, teams, processes.

### `logs/`

| File | Purpose |
|---|---|
| `Logs.tsx` | Top-level logs page with tab switcher |
| `ApiLogsTab.tsx` | HTTP request log table (paginated, filterable by time range) |
| `ChatLogsTab.tsx` | Chat completion log table |
| `UserLogsTab.tsx` | User activity log table |
| `LogsContext.context.tsx` | Local context sharing filter state across log tabs |

### `translations/`

Live i18n editor — grid of language keys with inline editing, filtered by language and search term.

---

## `src/services/`

All backend API calls. One sub-folder per API domain; never call `fetch` directly from components.

| Service | Purpose |
|---|---|
| `api/apiService.ts` | HTTP log queries — list with filters and pagination |
| `api/request.ts` | Base `request()` helper — attaches JWT, parses JSON, throws on non-2xx |
| `auth/authService.ts` | Login, logout, token refresh |
| `botConfig/botConfigService.ts` | Fetch bot configuration (risk profiles, watchlist, etc.) |
| `bots/botsService.ts` | Bot CRUD — list, create, update, delete |
| `dashboard/dashboardService.ts` | Fetch dashboard page content from the backend |
| `health/healthService.ts` | Ping backend health endpoint |
| `health/healthWorker.ts` | Web Worker that polls health on an interval off the main thread |
| `i18n/i18nService.ts` | Fetch and update translation strings |
| `logs/logsService.ts` | Unified log queries (API, chat, user, module) |
| `modelStatus/` | Types for Ollama model pull status SSE payloads |
| `notifications/notificationService.ts` | Fetch system notifications |
| `pages/pagesService.ts` | Fetch/save page response content |
| `settings/settingsService.ts` | Fetch/update app settings and module list |
| `theme/themeService.ts` | Fetch/persist the user's active theme |
| `uiComponents/uiComponentsService.ts` | Fetch registered UI component overrides from backend |

---

## `src/store/`

Lightweight module-level state (not React context) for values that must be readable outside React trees.

| File | Purpose |
|---|---|
| `i18n.store.ts` | Holds the active translation map; updated by `useI18nSync` |
| `theme.store.ts` | Holds the current theme string; read by non-React utilities |

---

## `src/utils/`

Pure functions with no React dependencies.

| Utility | Purpose |
|---|---|
| `safeJsonParse.ts` | `JSON.parse` wrapper that returns `null` instead of throwing |
| `federationLoader/loadFederatedModule.ts` | Dynamically initialises a Webpack Module Federation container and returns the requested exposed module |
| `flatten/flatten.ts` | Recursively flattens a nested object to dot-notation keys |
| `flatten/unflatten.ts` | Reconstructs a nested object from dot-notation keys |
| `formatters/fmtBytes.ts` | Converts byte counts to human-readable strings (KB, MB, GB) |
| `formatters/formatEventTime.ts` | Formats ISO timestamps for display in log tables |

---

## `src/constants/`

Shared constant values used across multiple pages.

| File | Purpose |
|---|---|
| `botConstants/BOT_TYPES.constant.ts` | Enum-like list of recognised bot type strings |
| `botConstants/CUSTOM_ICONS.constant.ts` | Map of bot type → custom icon component |
| `botConstants/TYPE_BADGE.constant.ts` | Map of bot type → `Badge` variant string |

---

## Naming conventions

| Suffix | Meaning |
|---|---|
| `.constant.ts` | Exported primitive value or static object |
| `.type.ts` | TypeScript `interface`, `type`, or `enum` |
| `.util.ts` | Pure utility function |
| `.hook.ts` | React hook (`use*`) |
| `.schema.ts` | Zod or other validation schema |
| `.config.ts` | Static configuration object |
| `.context.tsx` | React context + provider |
| `.style.css` | Co-located component styles (Tailwind `@apply`) |
| `index.ts` | Barrel re-export for a folder |
