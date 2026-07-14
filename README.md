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
| `frontend-dev` | 3000 | Vite dev server with HMR (profile: `dev`) |
| `backend` | 8000 | FastAPI REST + WebSocket API |
| `postgres` | 5432 | PostgreSQL |
| `mongo` | 27017 | MongoDB |
| `clickhouse` | 8123 / 9000 | ClickHouse HTTP + native |
| `ollama` | 11434 | Self-hosted LLM server — pure `ollama serve`, GPU-accelerated, healthchecked |
| `model-downloader` | — | One-shot HTTP client: instructs the `ollama` server to pull all required models, then exits |
| `hello-world` | 3001 | Reference MF remote (nginx, serves `remoteEntry.js` + `manifest.json`) |
| `chatbot` | 3002 | AI chatbot MF remote (nginx, serves `remoteEntry.js` + `manifest.json`) |

All services expose Docker healthchecks. Dependent services wait for `service_healthy` before starting, so startup order is fully enforced. `model-downloader` waits for `ollama` to be healthy, then uses `OLLAMA_HOST` to instruct the server to pull models via the REST API — no shared volume access, no second server process.

## Quick start

### Production (Docker Compose)

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) — on first run go to `/login` and sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` credentials configured in `docker-compose.yml`.

### Development (hot reload)

Frontend source is volume-mounted; edits reflect instantly via Vite HMR. A single command brings up the full dependency graph in the correct order (health checks enforce sequencing):

```bash
docker compose up --build frontend-dev
```

This starts: `ollama` → `model-downloader` (pulls models via Ollama API) + `chatbot` + `hello-world` + (`postgres` + `mongo` + `clickhouse` → `backend`) → `frontend-dev`.

### Kubernetes (minikube)

See the full [Kubernetes deploy guide](#kubernetes-deploy-guide) below.

```bash
minikube start --driver=docker
bash scripts/k8s-deploy.sh
# Prints the app URL when ready
```

Deploys to the `spin-core` namespace. NodePort assignments:

| Service | NodePort | URL |
|---------|----------|-----|
| frontend | 30080 | `http://$(minikube ip):30080` |
| backend | 30800 | `http://$(minikube ip):30800` |
| hello-world | 30001 | `http://$(minikube ip):30001` |
| chatbot | 30002 | `http://$(minikube ip):30002` |

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

### React singleton — externals contract

The host exposes `window.React` and `window.ReactDOM` before injecting each remote script. Every remote **must** declare these as webpack externals so it uses the host's React instance rather than bundling its own:

```js
// remote's webpack.config.js
externals: {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOM',
}
```

This prevents the "two React instances" hook error that occurs when a remote bundles its own copy alongside the host's renderer.

### Module discovery (on-demand scan)

Each module publishes a `manifest.json` that describes itself. The backend fetches these concurrently when an admin clicks **Scan for modules** in Settings.

**How it works:**

1. Every module's `public/manifest.json` is copied into `dist/` at build time (via `CopyWebpackPlugin`) and served by nginx at `http://<host>/manifest.json`.
2. The backend reads `MODULE_REGISTRY_URLS` (comma-separated base URLs) and fetches `{url}/manifest.json` from each concurrently (5 s timeout, failures don't block the others).
3. The Settings UI renders a discovery panel showing: icon, name, description, remote URL, and either a **Registered** badge (scope already registered) or an **Add** button that pre-fills the module form.
4. The admin confirms/edits fields (especially `remote_url` for K8s NodePort URLs) and clicks Save — the existing `POST /api/settings/modules` flow registers it.

**Manifest format** (`public/manifest.json` in each module):

```json
{
  "name": "Hello World",
  "scope": "helloWorld",
  "component": "./App",
  "route": "hello-world",
  "icon": "👋",
  "roles": ["user", "admin"],
  "description": "Short description shown in the discovery panel.",
  "remote_entry": "http://localhost:3001/remoteEntry.js"
}
```

`remote_entry` is the **browser-accessible** URL. The backend fetches the manifest via the internal Docker/K8s URL but stores `remote_entry` as `remote_url` in settings — so the browser-side URL and the service-mesh URL are decoupled.

### Example module (hello-world)

`modules/hello-world/` is a working reference remote:

```bash
cd modules/hello-world
npm install
npm start          # serves remoteEntry.js + manifest.json at http://localhost:3001
```

Register it via **Settings → Modules → 🔍 Scan for modules** (when `MODULE_REGISTRY_URLS` includes `http://localhost:3001`), or manually:

| Field | Value |
|-------|-------|
| Remote URL | `http://localhost:3001/remoteEntry.js` |
| Scope | `helloWorld` |
| Component | `./App` |

Open `localhost:3001` directly to test the component standalone (CDN React scripts are included in the template HTML).

## AI chatbot (Ollama)

A self-hosted AI chatbot built on [Ollama](https://ollama.com) — no external API keys or costs required. It is a **default seeded module**: on first backend start it is automatically registered in Settings so it appears in the sidebar and can be managed (URL, roles, toggle) like any other module.

### How it works

```
Sidebar nav "💬 Chatbot" → /modules/:id → FederatedPage → loads ./ChatPage
Layout (all pages) → ChatBubble → loads ./ChatWidget (floating bubble)
Both →  POST /api/chat  ──►  FastAPI (streams NDJSON)
                                  └─ Ollama HTTP API ($OLLAMA_MODEL)
```

- **`modules/chatbot/`** — Webpack 5 MF remote, independently buildable. Exposes two components:
  - `./ChatPage` — full-page chat UI, loaded by the sidebar link
  - `./ChatWidget` — floating bubble, loaded by the persistent `ChatBubble` in the Layout
- **`backend/app/routes/chat.py`** — `POST /api/chat`, JWT-protected, streams NDJSON from Ollama.
- **Auto-seeding** — on first run the backend lifespan seeds a `ModuleConfig` (scope `chatbot`, component `./ChatPage`) into `settings.json`. The seed is idempotent; subsequent restarts skip it.
- **Settings-aware bubble** — `ChatBubble.tsx` reads the chatbot module from `SettingsContext`. If an admin changes the remote URL in Settings, the bubble reloads from the new URL without a page refresh. Disabling the module hides the bubble.

### GPU acceleration (recommended)

The Ollama service is configured to use an NVIDIA GPU when available — inference goes from ~5 tok/s (CPU) to ~30–50 tok/s (GPU). Requires the NVIDIA Container Toolkit installed once per machine:

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -sL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

If no GPU is available Docker falls back to CPU automatically (the `deploy` block is silently ignored).

### Changing the model

The chatbot model is controlled by a single env var — no code change needed:

```bash
# Use a smaller/faster model
OLLAMA_MODEL=llama3.2:1b docker compose up ollama model-downloader backend

# Use a larger model (needs more VRAM / RAM)
OLLAMA_MODEL=llama3.1:8b docker compose up ollama model-downloader backend
```

Default: `llama3.2:3b`. `model-downloader` reads `OLLAMA_MODEL` and pulls that model first, then pulls the fixed VS Code Continue models (`llama3.1:8b`, `qwen2.5-coder:1.5b-base`, `nomic-embed-text:latest`). The chatbot model name is stored in `settings.json` when seeded; changing it after first run requires updating **Settings → Modules** or deleting `settings.json` and restarting.

### Docker Compose (multi-terminal dev workflow)

One command is enough (health checks enforce ordering automatically):

```bash
docker compose up --build frontend-dev
```

If you prefer to watch each tier's logs separately, split across terminals:

```bash
# Terminal 1 — Ollama server + model downloads (model-downloader pulls via Ollama API)
docker compose up --build ollama model-downloader

# Terminal 2 — MF remotes (waits for ollama to be healthy)
docker compose up --build chatbot hello-world

# Terminal 3 — Databases + backend
docker compose up --build postgres mongo clickhouse backend

# Terminal 4 — Frontend dev server with HMR (port 3000)
docker compose up --build frontend-dev
```

Open [http://localhost:3000](http://localhost:3000) once all are healthy. See **[What to do after the services start](#what-to-do-after-the-services-start)** below.

### Minikube

The Ollama pod is included in the Kustomize manifest — `kubectl apply -k k8s/` deploys it alongside everything else. The first pod start may take several minutes while the model downloads:

```bash
kubectl logs -n spin-core -l app=ollama -f
```

### What to do after the services start

1. **Wait for Ollama** — terminal 1 shows download progress in the `ollama` container logs. `model-downloader` exits once all models are ready (≈ 15–60 min on first run depending on connection; instant on subsequent starts because models are cached in the `ollama_data` volume). Watch progress with `docker logs spin-core-ollama-1 --follow`.
2. **Open the app** — [http://localhost:3000](http://localhost:3000), log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
3. **Chatbot in sidebar** — a "💬 Chatbot" link appears automatically under **Modules**. Click it to open the full-page chat. The floating bubble is also visible on every page.
4. **If the sidebar link is missing** — the chatbot module was already seeded with a different scope. Go to **Settings → Modules**, delete any stale Chatbot entry, then restart the backend (`docker compose restart backend`). The correct entry is re-seeded automatically.
5. **Send a message** — type in the chat and press Enter. You get a streamed reply once the model has finished loading (Ollama logs show `llm server loaded` when ready).
6. **Discover modules** — go to **Settings → Modules** and click **🔍 Scan for modules**. The backend fetches `manifest.json` from `hello-world` and `chatbot`. The chatbot shows a "Registered" badge; hello-world shows an **Add** button that pre-fills the registration form.

## Event logging

Every HTTP request is automatically appended to ClickHouse (`app_logs` table, `MergeTree`, 30-day TTL). Admins can browse, filter, and paginate logs at `/logs`.

## Translations (i18n)

All UI strings are stored in MongoDB (`system__i18n` collection) and served via `GET /api/i18n/{lang}` (public endpoint — no auth required). The frontend initialises i18next synchronously from bundled static locale files (instant render, no flash), then hot-patches the running instance with the MongoDB version as soon as the API responds.

Admins can edit every translation string live at `/translations` — a side-by-side EN/RO table with inline editing, key search, and per-language save. Changes take effect across the entire UI immediately without a page reload.

To add a new language: seed a document in `system__i18n` and extend `LANGS` in `Translations.tsx`.

## Health monitoring

A Web Worker (`src/workers/healthWorker.ts`) polls `GET /api/health` every 30 s off the main thread. The endpoint checks all three database connections and returns:

```json
{ "api": true, "postgres": true, "clickhouse": true, "mongo": true }
```

- **Header**: shows a red "API offline" or "DB degraded" pill only when something is down — invisible when all services are healthy.
- **Settings → Databases**: each DB row shows a live status badge (grey pulsing while checking, green "online", red pulsing "unreachable") with a "Last checked HH:MM:SS" timestamp.

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
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API base URL (K8s: set via ConfigMap) |
| `OLLAMA_MODEL` | `llama3.2:3b` | Model pulled by Ollama and used as the chat default |
| `CHATBOT_REMOTE_URL` | `http://localhost:3002/remoteEntry.js` | Chatbot remote URL seeded into settings on first run |
| `MODULE_REGISTRY_URLS` | _(empty)_ | Comma-separated base URLs the backend scans for `manifest.json` on `/api/settings/modules/discover` |
| `VITE_API_BASE_URL` | `/api` | API base URL (build-time) |
| `VITE_CHATBOT_REMOTE_URL` | `http://localhost:3002/remoteEntry.js` | Chatbot MF remote entry URL — build-time fallback for non-admin users |

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
│           ├── health.py        # /api/health (GET public — DB liveness checks)
│           ├── ingestion.py     # /api/data-ingestion (WebSocket)
│           └── chat.py          # /api/chat — JWT-protected streaming proxy to Ollama
├── frontend/
│   └── src/
│       ├── pages/           # Login, Dashboard, Settings, Logs, Translations
│       ├── components/
│       │   ├── guards/      # AuthGuard, RoleGuard
│       │   ├── layout/      # Sidebar (collapsible), Header (health indicator), Footer, Layout
│       │   └── modules/     # FederatedPage
│       ├── context/         # AuthContext, ThemeContext, SettingsContext, UIPrefsContext, HealthContext
│       ├── services/        # apiService, settingsService, logsService, i18nService
│       ├── workers/         # healthWorker.ts — polls /api/health every 30 s off the main thread
│       └── utils/           # federationLoader — injects remoteEntry, exposes window.React/ReactDOM
├── modules/
│   ├── hello-world/         # Reference webpack-federation remote (React 18, externals)
│   │   ├── webpack.config.js
│   │   ├── public/manifest.json   # Module descriptor — served at /manifest.json
│   │   ├── src/App.jsx       # Exposed component — uses window.React via externals
│   │   └── public/index.html # Standalone shell with CDN React for local testing
│   └── chatbot/             # AI chat widget MF remote (port 3002)
│       ├── webpack.config.js # Exposes ./ChatWidget and ./ChatPage as scope "chatbot"
│       ├── public/manifest.json   # Module descriptor — served at /manifest.json
│       ├── src/ChatWidget.jsx # Floating bubble + streaming chat panel
│       ├── src/ChatPage.jsx  # Full-page chat interface
│       └── public/index.html # Standalone shell for local testing
├── k8s/                     # Kubernetes manifests (kustomize)
│   ├── kustomization.yaml
│   ├── postgres/ mongo/ clickhouse/   # StatefulSet + Service + PVC per DB
│   ├── ollama/              # Ollama Deployment + Service + PVC (llama3.2:3b)
│   ├── backend/ frontend/             # Deployment + Service
│   ├── chatbot/             # Chatbot MF remote Deployment + NodePort 30002
│   ├── hello-world/         # Hello-world MF remote Deployment + NodePort 30001
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

# Check health status of all running services
docker compose ps
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
2. Builds `spin-core-backend:latest`, `spin-core-frontend:latest`, `spin-core-hello-world:latest`, and `spin-core-chatbot:latest` inside minikube
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
