# spin-core

Full-stack data ingestion and management platform.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Query, React Router v7, i18next |
| Backend | FastAPI, Python 3.12, uvicorn |
| Database | PostgreSQL 16 **or** MongoDB 7 **or** ClickHouse 24 — chosen during first-time setup |
| Container | Docker, Docker Compose |

## Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 3000 | React SPA (nginx in production) |
| backend | 8000 | FastAPI REST + WebSocket API |
| db | 5432 | PostgreSQL (always running) |
| mongo | 27017 | MongoDB (always running) |
| clickhouse | 8123 / 9000 | ClickHouse HTTP + native (always running) |

## Quick start

### Production

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) — on first run you will be redirected to the **setup wizard** to configure your database, admin account, theme, and modules.

### Development (hot reload)

Runs the frontend with Vite HMR. Source changes reflect instantly without rebuilding.

```bash
docker compose --profile dev up --build frontend-dev backend db mongo
```

## First-time setup

When no `settings.json` exists in the `app_data` volume, the platform starts in setup mode and redirects every visitor to `/setup`. The wizard walks through:

1. **Database** — choose PostgreSQL or MongoDB, test the connection
2. **Admin account** — create the first admin user (email + password)
3. **Theme** — set the default theme (dark / light)
4. **Modules** — register webpack federation remotes (optional, can be added later)
5. **Review & launch**

After setup completes, `settings.json` is written to the `app_data` volume and the platform starts normally. Subsequent restarts skip setup.

To re-run setup, remove the volume: `docker compose down -v`.

## Modules (webpack module federation)

Modules are webpack-federation remote builds loaded at runtime. Each module exposes a React component via the standard webpack container protocol. The host (this app) loads them dynamically — no rebuild required.

Each registered module:
- Appears in the sidebar under **Modules**
- Loads at `/modules/:id` using script injection + the webpack container API
- Can be scoped to specific roles
- Can be enabled/disabled from **Settings**

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SETTINGS_PATH` | `/app/data/settings.json` | Path to the settings file |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing secret — change before deploying |
| `VITE_API_BASE_URL` | `/api` | API base URL used at build time |
| `VITE_USE_MOCK` | `false` | Use mock API responses |

## Project structure

```
spin-core/
├── backend/
│   └── app/
│       ├── main.py        # All routes
│       ├── settings.py    # AppSettings, read/write settings.json
│       ├── database.py    # Lazy DB init, get_adapter()
│       ├── auth.py        # JWT + bcrypt
│       └── db/
│           ├── interface.py   # DBAdapter protocol
│           ├── postgres.py    # SQLAlchemy adapter
│           └── mongo.py       # pymongo adapter
├── frontend/
│   └── src/
│       ├── pages/         # Setup, Settings, Dashboard, Login, …
│       ├── components/
│       │   ├── guards/    # SetupGuard, AuthGuard, RoleGuard
│       │   ├── layout/    # Sidebar, Header, Footer, Layout
│       │   └── modules/   # FederatedPage
│       ├── context/       # AuthContext, ThemeContext, SettingsContext
│       ├── services/      # apiService, authService, setupService, settingsService, …
│       └── utils/         # federationLoader
├── docker-compose.yml
└── README.md
```

## Useful commands

```bash
# Stop all services and remove volumes (triggers re-setup on next start)
docker compose down -v

# View logs for a specific service
docker compose logs -f backend

# Rebuild a single service
docker compose up --build backend
```
