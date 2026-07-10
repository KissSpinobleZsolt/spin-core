# spin-core / frontend

React 19 SPA for the spin-core platform.

## Tech

- **Framework**: React 19 + TypeScript
- **Build tool**: Vite 8 with React Compiler enabled
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Data fetching**: TanStack React Query v5
- **i18n**: i18next + react-i18next
- **Package manager**: pnpm 9

## Pages

| Route | Page | Auth required |
|-------|------|--------------|
| `/login` | Login | No |
| `/dashboard` | Dashboard | Yes |
| `/reports` | Reports | Yes |
| `/chat` | Chat | Yes |

## Local development (without Docker)

```bash
pnpm install
pnpm dev
```

Runs on [http://localhost:3000](http://localhost:3000). Requires the backend running on port 6000 locally (or set `API_PROXY_TARGET`).

## Development with Docker (hot reload)

From the project root:

```bash
docker compose --profile dev up frontend-dev backend db
```

Source files are mounted into the container — edits are reflected immediately via Vite HMR.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PROXY_TARGET` | `http://localhost:6000` | Backend URL for Vite dev proxy |
| `VITE_API_BASE_URL` | `/api` | API base URL (build-time) |
| `VITE_USE_MOCK` | `false` | Use mock API responses (build-time) |

`API_PROXY_TARGET` is set to `http://backend:8000` automatically when running via Docker Compose.

## Production build

```bash
pnpm build       # outputs to dist/
pnpm preview     # preview the production build locally
```

The Docker production image (`Dockerfile`) builds the SPA and serves it via nginx. nginx also proxies `/api/*` to the backend container.

## Linting

```bash
pnpm lint
```
