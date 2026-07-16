# spin-core / frontend

React 19 SPA for the spin-core platform.

## Tech

- **Framework**: React 19 + TypeScript
- **Build tool**: Vite 8 with React Compiler enabled
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Data fetching**: TanStack React Query v5
- **i18n**: i18next + react-i18next — translations fetched from `GET /api/i18n/{lang}` (PostgreSQL-backed), live-editable by admins
- **Package manager**: pnpm 9

## Pages & routes

| Route | Page | Auth | Notes |
|-------|------|------|-------|
| `/login` | Login | No | |
| `/` | Dashboard | Yes | |
| `/bots` | Bots | Yes | Card grid of enabled bots the user can launch |
| `/bots/:botId` | Bot chat | Yes | Full-page streaming chat with a specific bot |
| `/admin/llms` | LLMs | Admin | Ollama model management — pull, list, delete |
| `/admin/users` | Users | Admin | User listing (stub) |
| `/admin/modules` | Modules | Admin | Module CRUD — register (with i18n translations + manifest auto-fill), edit, delete, toggle, scan for new modules, view per-module log drawer |
| `/admin/status` | Status | Admin | Live overview — app health, DB status, installed LLMs, modules, active bots with clickable navigation |
| `/logs` | Logs | Admin | ClickHouse event log viewer + "Purge expired logs" admin button |
| `/translations` | Translations | Admin | Live i18n editor (EN + RO side-by-side) |
| `/bots-admin` | Bots (admin) | Admin | Bot CRUD — create, edit, delete, enable/disable |
| `/admin/components` | Component preview | Admin | Live interactive showcase of every UI primitive in `src/components/ui/` |
| `/admin/docs/ui` | UI docs | Admin | Component reference with props tables, import paths, and a sticky scroll-tracked sidebar |
| `/admin/docs/api` | API docs | Admin | Full API endpoint reference with method/auth legend, search, and sticky scroll-tracked sidebar |
| `/admin/docs/deployment` | Deployment docs | Admin | Docker Compose and Kubernetes deployment guide |
| `/modules/:id` | Federated module | Yes | Webpack container protocol |

All authenticated routes redirect to `/login` if no token is present. The admin user is seeded by the backend from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars — there is no setup wizard.

## Context providers

| Provider | Key stored | Purpose |
|----------|-----------|---------|
| `AuthContext` | `token` (localStorage) | JWT + user object |
| `ThemeContext` | `theme` (localStorage) | Dark / light, cross-tab sync |
| `SettingsContext` | — | Polls `GET /api/settings/modules` |
| `UIPrefsContext` | `ui_prefs` (localStorage) | Sidebar collapsed state, cross-tab sync |
| `HealthContext` | — | Receives DB liveness updates from the health Web Worker |
| `ModelStatusContext` | — | Provides Ollama model readiness state — consumed by `ChatBubble` to decide visibility |

## Health monitoring

`src/workers/healthWorker.ts` is a **Web Worker** that runs off the main thread. It pings `GET /api/health` immediately on startup, then every 30 s (5 s timeout). Results are sent back via `postMessage` and consumed by `HealthContext`.

The health payload includes a `translations` map (`lang → ISO timestamp`) alongside the DB liveness flags. `useI18nSync` watches this map and reloads the active language's bundle only when its timestamp changes — no polling, no unnecessary fetches.

- **Header**: shows a red "API offline" or "DB degraded" pill when any service is down; invisible when everything is healthy.
- **Admin → Status**: live system overview with per-service health badges and a "Last checked" timestamp.

## i18n

Translations are fetched from `GET /api/i18n/{lang}` (PostgreSQL-backed) — there are no bundled locale files. On first render `App` shows a full-screen spinner while the initial fetch completes, then unmounts it. Subsequent reloads happen automatically when the health worker detects a `translations` timestamp bump (i.e. an admin saved changes in the Translations page). Language switches trigger an immediate fetch for the new language.

## Ollama model status banner

`src/components/layout/ModelStatusBanner.tsx` is a persistent banner rendered in `Layout` between the header and the page content. It connects to `GET /api/model-status/stream` via the browser-native `EventSource` API and shows live download progress for required Ollama models.

### Behaviour

| State | Banner |
|-------|--------|
| All models already ready on page load | Never appears |
| Models still downloading | Amber banner with per-model progress bar, speed, and ETA |
| All models finish downloading | Green "All models ready" — auto-dismisses after 4 s |
| Ollama container unreachable | Grey "Waiting for Ollama…" until it responds |

The banner is always dismissible via the `✕` button. The backend pushes a Server-Sent Event every ~1 second during download (deduped — identical frames are skipped). Per-model progress shows:
- Animated progress bar (`completed / total` bytes)
- Download speed (rolling 10-second window average, e.g. `5.0 MB/s`)
- ETA (e.g. `10m 7s`), hidden until enough speed samples are collected

### Hook

`src/hooks/useModelStatus.ts` wraps the `EventSource` lifecycle:

```ts
const { status, dismissed, dismiss } = useModelStatus()
// status: ModelStatusPayload | null
// dismissed: boolean — true once all ready (or manually closed)
// dismiss(): () => void — manual close
```

`ModelInfo.progress` is `null` when a model is ready or the tracker hasn't started yet; otherwise it carries `{ percent, speed_str, eta_str, total_bytes, completed_bytes }`.

`EventSource` auto-reconnects on network drops without any manual retry logic.

## Module federation loader

`src/utils/federationLoader.ts` implements the webpack container protocol for a **Vite host**.

### How it works

1. Sets `window.React` and `window.ReactDOM` to the host's running instances.
2. Injects a `<script>` tag for the remote's `remoteEntry.js` (deduplicated by scope name).
3. Calls `container.init({})` then `container.get(component)` to obtain the component factory.

### React singleton contract

Every remote **must** declare react as a webpack external so it reads from the host's globals rather than bundling its own copy:

```js
// remote webpack.config.js
externals: {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOM',
}
```

Bundling a second React alongside the host's renderer causes the `Invalid hook call` / `Cannot read properties of null (reading 'useState')` error.

For standalone testing of a remote at its own port, add the React 18 UMD scripts to the remote's `public/index.html` — they set `window.React` and `window.ReactDOM` automatically. See `modules/hello-world/` for a working example.

### Native bot system

The platform ships with a built-in bot system — no Module Federation required.

**`ChatBubble`** (`src/components/chat/ChatBubble.tsx`) — a floating bubble rendered on every authenticated page. It auto-selects the first available bot on first open. A ⚙ settings row lets users switch bots or (when no bot is selected) override the Ollama model for a free-form session. History is persisted to `localStorage`; the selected bot/model are also persisted.

**`/bots`** (`src/pages/Bots.tsx`) — a card grid showing all enabled bots the current user has access to. Each card shows the bot's icon, name, type badge, and description. Clicking **Launch** opens a full-page chat at `/bots/:botId`.

**`/bots/:botId`** (`src/pages/Chat.tsx`) — full-page streaming chat for a single bot. Fetches the bot metadata on mount and sends `bot_id` with every request to `POST /api/chat`. The backend injects the bot's system prompt and model. Non-communicator bots with a module backend render `BotConfigPage` (manifest-driven config UI with teams, risk profiles, and process monitoring); others render a `BotConfigSkeleton` placeholder.

**`ModuleBotPanel`** (`src/components/modules/ModuleBotPanel.tsx`) — a floating violet panel (`fixed bottom-6 left-6`) rendered inside every `FederatedPage`. On mount it fetches `GET /api/bots?module_id=<id>` and renders a bot selector + streaming chat scoped to that module. Passes `module_id` to `POST /api/chat` so the backend injects the module's name and description into the bot's system prompt. Returns `null` and is invisible when no active bots are assigned to the module.

**`/bots-admin`** (`src/pages/BotsAdmin.tsx`) — admin-only CRUD page. Fields per bot: name, icon, description, type (communicator / custom), **provider** (`ollama` / `anthropic` / `openai` — determines the LLM backend), model (free-text with provider-aware hints), system prompt, enabled toggle, and role access. A default "AI Assistant" bot (provider: `ollama`) is seeded on first backend startup.

### Module presets

Each registered module stores a `presets` JSON blob (`{ i18n, layout, settings }`) in PostgreSQL. When a federated module is loaded, `FederatedPage` passes the presets as a prop:

```tsx
<RemoteComponent presets={mod.presets} />
```

Remote components can read `props.presets` to receive platform configuration without any additional API calls.

`presets.i18n` is auto-populated from the module's `manifest.json` at registration time (both via auto-discovery and manual **Admin → Modules** create). The stored snapshot is the source of truth for translation resets.

### Add / Edit module form

The **Admin → Modules** add/edit modal exposes two additional sections beyond the basic fields:

**Load manifest** — button next to the Remote entry URL field. The browser fetches `manifest.json` from the module's base URL directly (no backend proxy — nginx serves it with `Access-Control-Allow-Origin: *`). On success, all empty form fields (name, description, scope, component, route, icon, roles, remote_url) are filled from the manifest, and the status line shows how many bots and how many i18n languages will be loaded on save.

**i18n snapshot** (edit mode only) — a collapsible read-only viewer showing the `presets.i18n` snapshot stored in the database. Includes a **↺ Reset i18n to defaults** button that calls `POST /api/settings/modules/{id}/reset-i18n`, re-merging the stored snapshot into the translations table. The button is disabled when the snapshot is empty (module was registered before manifest-driven i18n was wired up — re-saving the module repopulates it).

### Module discovery

`src/services/settingsService.ts` exposes `discoverModules()` which calls `GET /api/settings/modules/discover`. The backend concurrently fetches `manifest.json` from every URL in `MODULE_REGISTRY_URLS` and returns a `DiscoveredModule[]` with an `already_registered` flag per entry.

**Admin → Modules** (`/admin/modules`) surfaces this via a **🔍 Scan for modules** button. After a scan:
- Modules whose `scope` is already registered show a green **Registered** badge.
- New modules show an **Add** button that opens the module form pre-filled from the manifest — the admin adjusts the `remote_url` if needed (e.g. NodePort URL in K8s) and clicks Save.

The scan is on-demand (no background polling) and requires admin auth.

## Shared UI components

All reusable primitives live in `src/components/ui/`. Always import from there — do not re-declare these inline.

| Component | File | Props |
|-----------|------|-------|
| `Btn` | `Button.tsx` | `variant?: 'primary' \| 'secondary' \| 'danger'`, all `<button>` attrs |
| `Input` | `Input.tsx` | `label?: string`, all `<input>` attrs |
| `Label` | `Label.tsx` | all `<label>` attrs |
| `Modal` | `Modal.tsx` | `title`, `onClose?`, `maxWidth?`, `children` |
| `Card` | `Card.tsx` | `className?`, `children` |
| `Spinner` | `Spinner.tsx` | `size?: 'sm' \| 'md' \| 'lg'` |
| `Toggle` | `Toggle.tsx` | `checked`, `onChange`, `disabled?` |
| `ErrorBanner` | `ErrorBanner.tsx` | `message: string` |
| `PageTitle` | `PageTitle.tsx` | `children` |

## Utilities, hooks, and constants

| File | Exports |
|------|---------|
| `src/utils/formatters.ts` | `fmtBytes(n)`, `formatEventTime(ts)` |
| `src/utils/safeJsonParse.ts` | `safeJsonParse<T>(raw, fallback)` |
| `src/constants/botConstants.ts` | `BOT_TYPES`, `TYPE_BADGE` |
| `src/services/modelStatusService.ts` | `InstalledModel`, `InstalledModelsData` types |
| `src/hooks/useChatStream.ts` | `useChatStream(botId, model, moduleId?)` → `{ messages, setMessages, input, setInput, loading, sendMessage }` |
| `src/hooks/useModelStatus.ts` | `useModelStatus()` → `{ status, dismissed, dismiss }` |

## First-visit modals

Two modals fire automatically — no configuration needed.

**`CookieConsentModal`** (`src/components/CookieConsentModal.tsx`) — fixed bottom banner shown to every visitor before login. Offers "Essential only" and "Accept all". Choice stored in `localStorage` under `spin_cookie_consent`. Disappears permanently once accepted.

**`WorkspaceTermsModal`** (`src/components/WorkspaceTermsModal.tsx`) — full-screen blocking overlay shown on first login per user. The user must tick a checkbox and click "Continue to spin-core". Acceptance stored in `localStorage` under `spin_workspace_accepted_v1` keyed by username. Cannot be dismissed without accepting.

## Local development (without Docker)

```bash
pnpm install
pnpm dev
```

Runs on [http://localhost:3000](http://localhost:3000). Requires the backend on port 8000 (or set `API_PROXY_TARGET`).

## Development with Docker (hot reload)

From the project root — health checks enforce the correct startup order automatically:

```bash
docker compose up --build frontend-dev
```

Source files are mounted into the container — edits are reflected immediately via Vite HMR.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PROXY_TARGET` | `http://localhost:8000` | Backend URL for Vite dev proxy |
| `VITE_API_BASE_URL` | `/api` | API base URL (build-time) |

`API_PROXY_TARGET` is set to `http://backend:8000` automatically when running via Docker Compose.

## Production build

```bash
pnpm build       # outputs to dist/
pnpm preview     # preview the production build locally
```

The Docker production image (`Dockerfile`) builds the SPA and serves it via nginx. nginx proxies `/api/*` to the backend container. The same `nginx.conf` works in Kubernetes because the backend Service DNS resolves as `backend` within the `spin-core` namespace.

## Linting

```bash
pnpm lint
```
