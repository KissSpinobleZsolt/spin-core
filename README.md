# spin-core

Full-stack platform shell with a fixed tri-database architecture, env-var-seeded admin, webpack module federation, and Kubernetes / minikube support.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, React Query, React Router v7, i18next |
| Backend | FastAPI, Python 3.12, uvicorn |
| Primary DB | PostgreSQL 16 — users, auth, modules, i18n translations, module data |
| Log DB | ClickHouse 24 — append-only event log, 30-day TTL |
| AI | Ollama (`qwen2.5:7b`) — local LLM, no external API keys |
| Containers | Docker Compose (dev/prod) · Kubernetes / minikube |

## Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | React SPA (nginx, proxies `/api/*` to backend) |
| `frontend-dev` | 3000 | Vite dev server with HMR |
| `backend` | 8000 | FastAPI REST API — core platform only (no module-specific logic) |
| `postgres` | 5432 | PostgreSQL |
| `clickhouse` | 8123/9000 | ClickHouse HTTP + native |
| `ollama` | 11434 | Self-hosted LLM server — pure `ollama serve`, GPU-accelerated |
| `model-downloader` | — | One-shot job: pulls `qwen2.5:7b` + `nomic-embed-text` via Ollama API, then exits |
| `hello-world` | 3001 | Reference MF remote (frontend only) |
| `cloud-insight-ai` | 3002 | CloudInsight AI MF remote (frontend only) |
| `cloud-insight-ai-backend` | 8002 | Plugin backend for CloudInsight AI |
| `anomascan` | 3003 | AnomaScan MF remote (frontend only) |
| `anomascan-backend` | 8003 | Plugin backend for AnomaScan (YOLO, PyTorch) |

All services expose Docker healthchecks. Startup order is fully enforced — dependent services wait for `service_healthy`.

## WSL2 + Docker + GPU setup guide

New to running Docker with an NVIDIA GPU on Windows? See **[GUIDE.md](GUIDE.md)** for a complete step-by-step walkthrough:

- Part 1 — Enable WSL2
- Part 2 — Install Docker Engine inside WSL2
- Part 3 — NVIDIA Container Toolkit (GPU passthrough)
- Part 4 — Run Ollama and download models
- Part 5 — VS Code + Continue extension (free Copilot alternative)

> If you already have Docker + GPU working, skip straight to Quick start below.

## First-time setup

### Prerequisites

You do not need every tool listed below — install only what matches your chosen run mode.

| Tool | Min version | Install | Required for |
|------|------------|---------|--------------|
| **Git** | 2.x | [git-scm.com](https://git-scm.com) | All modes |
| **Docker + Compose** | 24 + v2 plugin | [docs.docker.com](https://docs.docker.com/get-docker/) | Docker · Prod |
| **nvm** | — | [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm) | Dev (frontend) |
| **Node.js** | 20 LTS | via nvm: `nvm install 20` | Dev (frontend) |
| **pnpm** | 9 | `npm i -g pnpm` | Dev (frontend) |
| **Python** | 3.12 | [python.org](https://www.python.org/downloads/) | Dev (backend) |
| **kubectl** | 1.28 | [kubernetes.io/docs/tasks/tools](https://kubernetes.io/docs/tasks/tools/) | Prod (k8s) |
| **minikube** | 1.32 | [minikube.sigs.k8s.io](https://minikube.sigs.k8s.io/docs/start/) | Prod (local cluster) |

> **GPU (optional):** Ollama runs on CPU but is significantly faster with an NVIDIA GPU. See [GUIDE.md](GUIDE.md) for WSL2 + NVIDIA Container Toolkit setup.

---

### Step 1 — Clone

```bash
git clone --recurse-submodules https://github.com/KissSpinobleZsolt/spin-core.git
cd spin-core
```

If you already cloned without `--recurse-submodules`:

```bash
bash scripts/setup-workspace.sh
```

---

### Step 2 — Configure

Open `docker-compose.yml` and set these values before the first run:

```yaml
ADMIN_EMAIL:    admin@spin.local   # login email
ADMIN_PASSWORD: change-me          # login password — change before deploying
JWT_SECRET_KEY: change-me-in-production
```

> Default credentials are intentionally weak. Change them before exposing the app on any network.

To customise the seeded bots, dashboard content, or default theme, edit [`data/seed.json`](data/seed.json) before running. Changes only apply on first start (or after `docker compose down -v`).

---

### Step 3 — Run

Pick **one** of the three modes below. You do not need to run all three.

---

#### 🐳 Docker (recommended — one command, no local installs needed)

Builds and starts every service. Best for trying the full platform or running all modules.

```bash
docker compose up --build
```

> On first run Ollama downloads `qwen2.5:7b` (~4.7 GB). This takes 15–60 min depending on your connection. Subsequent starts are instant — the model is cached in the `ollama_data` Docker volume.

All services start in dependency order. Open **http://localhost:3000** and log in.

To run a single module alongside the core (without rebuilding everything):

```bash
# Terminal 1 — core backend + infra
docker compose up --build backend

# Terminal 2 — frontend dev server
docker compose up --build frontend-dev

# Terminal 3 — one module (example: CloudInsight AI)
cd modules/cloud-insight-ai && npm install && npm start
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full 3-terminal module dev workflow and the VSCode task shortcuts.

---

#### 💻 Dev — native Python + pnpm (fastest iteration, no Docker for core)

Run each service directly on the host. Best for active backend or frontend development with instant restarts.

You still need Docker for the databases and Ollama:

```bash
# Start only the infrastructure services
docker compose up postgres clickhouse ollama
```

**Backend:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (in a second terminal):

```bash
cd frontend
pnpm install
pnpm dev        # Vite dev server on http://localhost:3000
```

The backend reads `POSTGRES_URL`, `CLICKHOUSE_HOST`, and `OLLAMA_BASE_URL` from the environment. When running natively they default to `localhost` — no extra config needed if you used the docker compose infra step above.

---

#### ☸️ Prod — Kubernetes / minikube

Deploy to a local cluster. Best for testing the production manifest before a real deployment.

```bash
# Start minikube
minikube start --driver=docker

# Copy and fill in credentials
cp k8s/.env.example k8s/.env

# Deploy
bash scripts/k8s-deploy.sh
```

See [k8s/README.md](k8s/README.md) for the full deploy guide, secrets management, day-to-day ops, and pulling Ollama models inside the cluster.

---

### First-time login

There is no setup wizard — the admin user is seeded automatically on first backend startup.

Default credentials (set in `docker-compose.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@spin.local` | Login email |
| `ADMIN_PASSWORD` | `change-me` | Login password |

Go to **http://localhost:3000/login** and sign in with the above credentials.

To start completely fresh (wipe all data and re-seed):

```bash
docker compose down -v
docker compose up --build
```

## Package documentation

| Package | README | Description |
|---------|--------|-------------|
| — | [GUIDE.md](GUIDE.md) | Step-by-step: WSL2, Docker, GPU, Ollama, VS Code Continue |
| `backend/` | [backend/README.md](backend/README.md) | API routes, env vars, architecture, local dev |
| `frontend/` | [frontend/README.md](frontend/README.md) | Pages, context providers, module federation loader, build |
| `data/` | [data/README.md](data/README.md) | seed.json format, fields, first-run customisation |
| `modules/` | [modules/README.md](modules/README.md) | Module federation overview, manifest format, React singleton contract, submodule workflow |
| `modules/hello-world/` | [modules/hello-world/README.md](modules/hello-world/README.md) | Reference remote — how to build and register |
| `workspace.yml` | — | Multi-repo workspace manifest (shell + module repos, ports) |
| `k8s/` | [k8s/README.md](k8s/README.md) | Kubernetes deploy guide, secrets, day-to-day ops |
| `scripts/` | [scripts/README.md](scripts/README.md) | restart.sh, k8s-deploy.sh usage |

## Architecture overview

```
Browser
  └─ Frontend (React 19 + Vite)
       ├─ ChatBubble — floating widget; bot + model selectable, history in localStorage
       ├─ /bots      — user card grid (launch any available bot into full-page chat)
       ├─ /bots-admin — admin CRUD for bots (name, type, model, system prompt, roles)
       ├─ /admin/llms     — pull / list / delete Ollama models
       ├─ /admin/users    — user listing (stub)
       ├─ /admin/modules  — module CRUD (register, edit, scan, inline log drawer)
       ├─ /admin/status   — live system overview with clickable navigation
       ├─ /api/*  ──►  Backend (FastAPI)
       │                  ├─ PostgreSQL  — users, pages, bots, modules, i18n, module data
       │                  ├─ ClickHouse  — HTTP request log (app_logs)
       │                  │               per-module log tables (module_{scope}_logs)
       │                  │               chat completion log (module_chatbot_logs)
       │                  │               refreshable MVs rebuilt every 10 min:
       │                  │                 app_logs_mv           — hourly HTTP stats
       │                  │                 module_{scope}_logs_mv — hourly module stats
       │                  └─ Ollama      — streaming LLM proxy (/api/chat)
       │                                  bot system prompt injected per request
       │                                  each completion persisted to module_chatbot_logs
       └─ Module Federation (optional third-party remotes)
            ├─ hello-world (port 3001)                — reference implementation (frontend only)
            ├─ cloud-insight-ai (port 3002)          — CloudInsight AI: data upload and management
            │    └─ cloud-insight-ai-backend (8002)  — plugin backend (REST + WebSocket)
            └─ anomascan (port 3003)                 — AnomaScan: YOLO object detection
                 └─ anomascan-backend (8003)          — plugin backend (PyTorch, ultralytics)

Plugin backend pattern:
  core backend (/api/plugin/{scope}/…) ──► module backend (backend_url from modules table)
  Each module that needs server-side logic runs its own FastAPI service and declares
  "backend_url" in its manifest.json — no module-specific code lives in the core backend.

Ollama stack:
  ollama (pure server)  ◄──  model-downloader (HTTP client via OLLAMA_HOST)
```

## Useful commands

```bash
# Restart all core services (no rebuild — picks up config/env changes)
bash scripts/restart.sh

# Restart a specific service
bash scripts/restart.sh backend
bash scripts/restart.sh backend clickhouse

# Rebuild an image then restart (after code changes)
bash scripts/restart.sh --rebuild backend
bash scripts/restart.sh --rebuild frontend

# Wipe all data and restart fresh
docker compose down -v

# Tail logs for a service
docker compose logs -f backend

# Rebuild a single service
docker compose up --build backend

# Rebuild frontend after code changes
bash scripts/restart.sh --rebuild frontend

# Check health status of all running services
docker compose ps

# Check downloaded AI models
docker exec spin-core-ollama-1 ollama list

# Watch model download progress (in-app banner appears automatically on the frontend)
curl -N http://localhost:8000/api/model-status/stream

# Query the ClickHouse logs summary for the current month (admin token required)
curl -s "http://localhost:8000/api/logs/summary?from=$(date -u +%Y-%m-01T00:00:00)" \
  -H "Authorization: Bearer <token>" | python3 -m json.tool
```

## Project structure

```
spin-core/
├── backend/          # FastAPI app — see backend/README.md
├── frontend/         # React SPA — see frontend/README.md
├── data/             # seed.json (first-run defaults) — see data/README.md
├── modules/
│   ├── hello-world/          # Reference MF remote — see modules/hello-world/README.md
├── k8s/              # Kubernetes manifests — see k8s/README.md
├── scripts/          # Utility scripts — see scripts/README.md
└── docker-compose.yml
```
