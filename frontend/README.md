# spin-core / frontend

React 19 SPA for the spin-core platform.

## Tech

- **Framework**: React 19 + TypeScript
- **Build tool**: Vite 8 with React Compiler enabled
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Data fetching**: TanStack React Query v5
- **i18n**: i18next + react-i18next — translations stored in MongoDB, live-editable by admins; static locale files serve as instant-render fallback
- **Package manager**: pnpm 9

## Pages & routes

| Route | Page | Auth | Notes |
|-------|------|------|-------|
| `/login` | Login | No | |
| `/` | Dashboard | Yes | |
| `/settings` | Settings | Admin | Tri-DB panel with live health badges + modules |
| `/logs` | Logs | Admin | ClickHouse event log viewer |
| `/translations` | Translations | Admin | Live i18n editor (EN + RO side-by-side) |
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

- **Header**: shows a red "API offline" or "DB degraded" pill when any service is down; invisible when everything is healthy.
- **Settings → Databases**: each row shows a live badge — grey pulsing "checking…" before the first result, green "online", or red pulsing "unreachable" — plus a "Last checked" timestamp.

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

## Local development (without Docker)

```bash
pnpm install
pnpm dev
```

Runs on [http://localhost:3000](http://localhost:3000). Requires the backend on port 8000 (or set `API_PROXY_TARGET`).

## Development with Docker (hot reload)

From the project root:

```bash
docker compose --profile dev up frontend-dev backend db mongo clickhouse
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
