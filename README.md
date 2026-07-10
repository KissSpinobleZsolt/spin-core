# spin-core

Full-stack platform shell with a fixed tri-database architecture, env-var-seeded admin, webpack module federation, and Kubernetes / minikube support.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, React Query, React Router v7, i18next |
| Backend | FastAPI, Python 3.12, uvicorn |
| Primary DB | PostgreSQL 16 — users, auth, app settings |
| Log DB | ClickHouse 24 — append-only event log, 30-day TTL |
| Module DB | MongoDB 7 — data store for installed modules |
| Containers | Docker Compose (dev/prod) · Kubernetes / minikube (local cluster) |

## Database roles

All three databases start unconditionally. Each has a fixed, non-configurable role:

| Database | Role |
|----------|------|
| 🐘 PostgreSQL | Users, authentication, pages, application settings |
| 🏠 ClickHouse | Every HTTP request and named event is appended here |
| 🍃 MongoDB | Generic document store — modules read/write their own namespaced collections via `/api/module-data` |

## Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | React SPA (nginx in production, proxies `/api/*` to backend) |
| `backend` | 8000 | FastAPI REST + WebSocket API |
| `db` | 5432 | PostgreSQL |
| `mongo` | 27017 | MongoDB |
| `clickhouse` | 8123 / 9000 | ClickHouse HTTP + native |

## Quick start

### Production (Docker Compose)

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) — on first run you are redirected to the **setup wizard**.

### Development (hot reload)

Frontend source is volume-mounted; edits reflect instantly via Vite HMR.

```bash
docker compose --profile dev up --build frontend-dev backend db mongo clickhouse
```

### Kubernetes (minikube)

See the full [Kubernetes deploy guide](#kubernetes-deploy-guide) below.

```bash
minikube start --driver=docker
bash scripts/k8s-deploy.sh
# Prints the app URL when ready
```

Deploys to the `spin-core` namespace. Frontend on NodePort **30080**, backend on **30800**.

## First-time login

There is no setup wizard. On first startup the backend seeds an admin user from environment variables:

| Variable | docker-compose default | Description |
|----------|----------------------|-------------|
| `ADMIN_EMAIL` | `admin@spin.local` | Admin login email — **change this** |
| `ADMIN_PASSWORD` | `change-me` | Admin password — **change this** |
| `ADMIN_NAME` | `Admin` | Display name |

The seed runs only once: if the email already exists in PostgreSQL it is skipped on subsequent restarts. Open the app, go to `/login`, and sign in with those credentials.

To create a fresh database: `docker compose down -v`.

## Modules (webpack module federation)

Modules are independent webpack-federation remote builds loaded at runtime. No platform rebuild required.

Each registered module:
- Appears in the sidebar under **Modules**
- Loads at `/modules/:id` via script injection + webpack container protocol (`window[scope].init / .get`)
- Stores and retrieves data via `GET|POST|PUT|DELETE /api/module-data/{moduleId}/{collection}`
- Can be scoped to specific roles and toggled from **Settings → Modules**

## Event logging

Every HTTP request is automatically appended to ClickHouse (`app_logs` table, `MergeTree`, 30-day TTL). Admins can browse, filter, and paginate logs at `/logs`.

## Translations (i18n)

All UI strings are stored in MongoDB (`system__i18n` collection) and served via `GET /api/i18n/{lang}` (public endpoint — no auth required). The frontend initialises i18next synchronously from bundled static locale files (instant render, no flash), then hot-patches the running instance with the MongoDB version as soon as the API responds.

Admins can edit every translation string live at `/translations` — a side-by-side EN/RO table with inline editing, key search, and per-language save. Changes take effect across the entire UI immediately without a page reload.

To add a new language: seed a document in `system__i18n` and extend `LANGS` in `Translations.tsx`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@spin.local` | Seeded admin email — **change before deploying** |
| `ADMIN_PASSWORD` | `change-me` | Seeded admin password — **change before deploying** |
| `ADMIN_NAME` | `Admin` | Seeded admin display name |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing secret — **change before deploying** |
| `SETTINGS_PATH` | `/app/data/settings.json` | Path to the settings file |
| `POSTGRES_URL` | `postgresql://core-postgres:core-postgres@db:5432/core-postgres` | PostgreSQL connection string |
| `MONGO_URL` | `mongodb://core-mongo:core-mongo@mongo:27017/core-mongo?authSource=admin` | MongoDB connection string |
| `CLICKHOUSE_URL` | `clickhouse://core-ch:core-ch@clickhouse:9000/core` | ClickHouse connection string |
| `VITE_API_BASE_URL` | `/api` | API base URL (build-time) |

## Project structure

```
spin-core/
├── backend/
│   └── app/
│       ├── main.py          # App factory, HTTP logging middleware
│       ├── settings.py      # AppSettings dataclass, read/write settings.json
│       ├── database.py      # init_db(), get_pg() / get_ch() / get_mongo()
│       ├── auth.py          # JWT + bcrypt
│       ├── deps.py          # require_token / require_admin helpers
│       ├── state.py         # In-process settings singleton
│       ├── db/
│       │   ├── interface.py     # AppAdapter protocol + UserRecord
│       │   ├── postgres.py      # SQLAlchemy adapter (users, pages)
│       │   ├── clickhouse.py    # ClickHouseLogAdapter (write_log, query_logs)
│       │   └── mongo.py         # MongoDataAdapter (generic collection CRUD)
│       └── routes/
│           ├── auth.py          # /api/auth/*
│           ├── dashboard.py     # /api/dashboard, /api/user/theme
│           ├── settings.py      # /api/settings/*
│           ├── logs.py          # /api/logs (admin)
│           ├── module_data.py   # /api/module-data/*
│           ├── i18n.py          # /api/i18n/{lang} (GET public, PUT admin)
│           └── ingestion.py     # /api/data-ingestion (WebSocket)
├── frontend/
│   └── src/
│       ├── pages/           # Login, Dashboard, Settings, Logs, Translations
│       ├── components/
│       │   ├── guards/      # AuthGuard, RoleGuard
│       │   ├── layout/      # Sidebar (collapsible), Header, Footer, Layout
│       │   └── modules/     # FederatedPage
│       ├── context/         # AuthContext, ThemeContext, SettingsContext, UIPrefsContext
│       ├── services/        # apiService, settingsService, logsService, i18nService
│       └── utils/           # federationLoader (webpack container protocol)
├── k8s/                     # Kubernetes manifests (kustomize)
│   ├── kustomization.yaml
│   ├── postgres/ mongo/ clickhouse/   # StatefulSet + Service + PVC per DB
│   ├── backend/ frontend/             # Deployment + Service
│   └── secret.yaml / configmap.yaml
├── scripts/
│   └── k8s-deploy.sh        # One-command minikube build + deploy
├── docker-compose.yml
└── README.md
```

## Useful commands

```bash
# Wipe all data and restart fresh (re-seeds admin on next boot)
docker compose down -v

# Tail logs for a service
docker compose logs -f backend

# Rebuild a single service
docker compose up --build backend
```

## Kubernetes deploy guide

> Uses **minikube** with the Docker driver — no VM needed, works on WSL2.
> `kubectl` is just the CLI; minikube is the local cluster it talks to.

### 1. Install minikube (once)

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
rm minikube-linux-amd64
```

### 2. Start the cluster

```bash
minikube start --driver=docker
# kubectl context is now switched to minikube automatically
```

### 3. Set credentials before deploying

Edit [k8s/secret.yaml](k8s/secret.yaml) and replace the placeholder values for `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET_KEY`.

### 4. Deploy everything

```bash
bash scripts/k8s-deploy.sh
```

This script:
1. Points Docker at minikube's daemon (`eval $(minikube docker-env)`)
2. Builds `spin-core-backend:latest` and `spin-core-frontend:latest` inside minikube
3. Applies all manifests via `kubectl apply -k k8s/`
4. Waits for backend and frontend rollouts to complete
5. Prints the app URL

### 5. Watch what's happening

```bash
# Live pod status — see Pending → ContainerCreating → Running
kubectl get pods -n spin-core -w

# All resources at once, refreshed every 2 s
watch -n2 kubectl get all -n spin-core

# Stream backend logs
kubectl logs -n spin-core -l app=backend -f

# Describe a pod when something is stuck (shows events, probe failures, OOM)
kubectl describe pod -n spin-core -l app=backend
```

### Day-to-day operations

```bash
# Rebuild backend only after a code change
eval $(minikube docker-env)
docker build -t spin-core-backend:latest ./backend
kubectl rollout restart deployment/backend -n spin-core

# Switch kubectl between minikube and another cluster (e.g. EKS)
kubectl config use-context minikube
kubectl config use-context <your-other-context>
kubectl config current-context          # check which cluster you're talking to

# Get the frontend URL
minikube service frontend -n spin-core --url

# Tear down the namespace (keeps minikube running)
kubectl delete namespace spin-core

# Stop minikube entirely
minikube stop
```
