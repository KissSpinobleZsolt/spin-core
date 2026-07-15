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
| `data-ingestion` | 3002 | Data ingestion MF remote (frontend only) |
| `data-ingestion-backend` | 8002 | Plugin backend for the data-ingestion module |
| `vision-watch` | 3003 | Vision-watch MF remote (frontend only) |
| `vision-watch-backend` | 8003 | Plugin backend for the vision-watch module (YOLO, PyTorch) |

All services expose Docker healthchecks. Startup order is fully enforced — dependent services wait for `service_healthy`.

## WSL2 + Docker + GPU setup guide

New to running Docker with an NVIDIA GPU on Windows? See **[GUIDE.md](GUIDE.md)** for a complete step-by-step walkthrough:

- Part 1 — Enable WSL2
- Part 2 — Install Docker Engine inside WSL2
- Part 3 — NVIDIA Container Toolkit (GPU passthrough)
- Part 4 — Run Ollama and download models
- Part 5 — VS Code + Continue extension (free Copilot alternative)

> If you already have Docker + GPU working, skip straight to Quick start below.

## Quick start

### Development (hot reload)

```bash
docker compose up --build frontend-dev
```

Starts everything in dependency order. Open [http://localhost:3000](http://localhost:3000).

### Production

```bash
docker compose up --build
```

### Kubernetes (minikube)

```bash
cp k8s/.env.example k8s/.env   # fill in credentials
minikube start --driver=docker
bash scripts/k8s-deploy.sh
```

See [k8s/README.md](k8s/README.md) for the full deploy guide, day-to-day ops, and model downloading.

## First-time login

There is no setup wizard. The backend seeds an admin user on first startup from env vars:

| Variable | Docker default | Description |
|----------|---------------|-------------|
| `ADMIN_EMAIL` | `admin@spin.local` | Login email — **change before deploying** |
| `ADMIN_PASSWORD` | `change-me` | Password — **change before deploying** |
| `ADMIN_NAME` | `Admin` | Display name |

Go to `/login` and sign in. The seed is idempotent — subsequent restarts skip it if the email already exists.

To customise first-run defaults (bots, dashboard content, theme), edit **`./data/seed.json`** before running `docker compose up`.

To start fresh: `docker compose down -v`

## Package documentation

| Package | README | Description |
|---------|--------|-------------|
| — | [GUIDE.md](GUIDE.md) | Step-by-step: WSL2, Docker, GPU, Ollama, VS Code Continue |
| `backend/` | [backend/README.md](backend/README.md) | API routes, env vars, architecture, local dev |
| `frontend/` | [frontend/README.md](frontend/README.md) | Pages, context providers, module federation loader, build |
| `data/` | [data/README.md](data/README.md) | seed.json format, fields, first-run customisation |
| `modules/` | [modules/README.md](modules/README.md) | Module federation overview, manifest format, React singleton contract |
| `modules/hello-world/` | [modules/hello-world/README.md](modules/hello-world/README.md) | Reference remote — how to build and register |
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
            ├─ hello-world (port 3001)              — reference implementation (frontend only)
            ├─ data-ingestion (port 3002)           — data source upload and management
            │    └─ data-ingestion-backend (8002)   — plugin backend (REST + WebSocket)
            └─ vision-watch (port 3003)             — YOLO object detection
                 └─ vision-watch-backend (8003)     — plugin backend (PyTorch, ultralytics)

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
│   ├── data-ingestion/       # Data ingestion MF remote
│   │   └── backend/          # Plugin backend (FastAPI) — optional, per-module
│   └── vision-watch/         # Vision-watch MF remote (YOLO)
│       └── backend/          # Plugin backend with PyTorch + ultralytics
├── k8s/              # Kubernetes manifests — see k8s/README.md
├── scripts/          # Utility scripts — see scripts/README.md
└── docker-compose.yml
```
