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
| `/admin/modules` | Modules | Admin | Module CRUD — register, edit, delete, toggle, scan for new modules |
| `/admin/status` | Status | Admin | Live overview — app health, DB status, installed LLMs, modules, active bots with clickable navigation |
| `/settings` | Settings | Admin | Appearance + DB health badges + installed Ollama models |
| `/logs` | Logs | Admin | ClickHouse event log viewer |
| `/translations` | Translations | Admin | Live i18n editor (EN + RO side-by-side) |
| `/bots-admin` | Bots (admin) | Admin | Bot CRUD — create, edit, delete, enable/disable |
| `/modules/:id` | Federated module | Yes | Webpack container protocol |

All authenticated routes redirect to `/login` if no token is present. The admin user is seeded by the backend from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars — there is no setup wizard.

## Context providers

| Provider | Key stored | Purpose |
|----------|-----------|---------|
| `AuthContext` | `token` (localStorage) | JWT + user object |
| `ThemeContext` | `theme` (localStorage) | Dark / light, cross-tab sync |
| `SettingsContext` | — | Polls `GET /api/settings` |
| `UIPrefsContext` | `ui_prefs` (localStorage) | Sidebar collapsed state, cross-tab sync |
| `HealthContext` | — | Receives DB liveness updates from the health Web Worker |

## Health monitoring

`src/workers/healthWorker.ts` is a **Web Worker** that runs off the main thread. It pings `GET /api/health` immediately on startup, then every 30 s (5 s timeout). Results are sent back via `postMessage` and consumed by `HealthContext`.

The health payload includes a `translations` map (`lang → ISO timestamp`) alongside the DB liveness flags. `useI18nSync` watches this map and reloads the active language's bundle only when its timestamp changes — no polling, no unnecessary fetches.

- **Header**: shows a red "API offline" or "DB degraded" pill when any service is down; invisible when everything is healthy.
- **Settings → Databases**: each row shows a live badge — grey pulsing "checking…" before the first result, green "online", or red pulsing "unreachable" — plus a "Last checked" timestamp.

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

**`/bots/:botId`** (`src/pages/Chat.tsx`) — full-page streaming chat for a single bot. Fetches the bot metadata on mount and sends `bot_id` with every request to `POST /api/chat`. The backend injects the bot's system prompt and model.

**`/bots-admin`** (`src/pages/BotsAdmin.tsx`) — admin-only CRUD page. Fields per bot: name, icon, description, type (chatbot / watchbot / tradebot / custom), model (selected from installed Ollama models), system prompt, enabled toggle, and role access. A default "AI Assistant" bot is seeded on first backend startup.

### Module discovery

`src/services/settingsService.ts` exposes `discoverModules()` which calls `GET /api/settings/modules/discover`. The backend concurrently fetches `manifest.json` from every URL in `MODULE_REGISTRY_URLS` and returns a `DiscoveredModule[]` with an `already_registered` flag per entry.

**Admin → Modules** (`/admin/modules`) surfaces this via a **🔍 Scan for modules** button. After a scan:
- Modules whose `scope` is already registered show a green **Registered** badge.
- New modules show an **Add** button that opens the module form pre-filled from the manifest — the admin adjusts the `remote_url` if needed (e.g. NodePort URL in K8s) and clicks Save.

The scan is on-demand (no background polling) and requires admin auth.

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
