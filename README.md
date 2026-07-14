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
| AI | Ollama (`qwen2.5:7b`) — local LLM, no external API keys |
| Containers | Docker Compose (dev/prod) · Kubernetes / minikube |

## Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | React SPA (nginx, proxies `/api/*` to backend) |
| `frontend-dev` | 3000 | Vite dev server with HMR |
| `backend` | 8000 | FastAPI REST + WebSocket API |
| `postgres` | 5432 | PostgreSQL |
| `mongo` | 27017 | MongoDB |
| `clickhouse` | 8123/9000 | ClickHouse HTTP + native |
| `ollama` | 11434 | Self-hosted LLM server — pure `ollama serve`, GPU-accelerated |
| `model-downloader` | — | One-shot job: pulls `qwen2.5:7b` + `nomic-embed-text` via Ollama API, then exits |
| `hello-world` | 3001 | Reference MF remote |
| `chatbot` | 3002 | AI chatbot MF remote |

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

To start fresh: `docker compose down -v`

## Package documentation

| Package | README | Description |
|---------|--------|-------------|
| — | [GUIDE.md](GUIDE.md) | Step-by-step: WSL2, Docker, GPU, Ollama, VS Code Continue |
| `backend/` | [backend/README.md](backend/README.md) | API routes, env vars, architecture, local dev |
| `frontend/` | [frontend/README.md](frontend/README.md) | Pages, context providers, module federation loader, build |
| `modules/` | [modules/README.md](modules/README.md) | Module federation overview, manifest format, React singleton contract |
| `modules/hello-world/` | [modules/hello-world/README.md](modules/hello-world/README.md) | Reference remote — how to build and register |
| `modules/chatbot/` | [modules/chatbot/README.md](modules/chatbot/README.md) | AI chatbot remote — components, Ollama wiring, auto-seeding |
| `k8s/` | [k8s/README.md](k8s/README.md) | Kubernetes deploy guide, secrets, day-to-day ops |

## Architecture overview

```
Browser
  └─ Frontend (React 19 + Vite)
       ├─ /api/*  ──►  Backend (FastAPI)
       │                  ├─ PostgreSQL  — users, pages, settings
       │                  ├─ ClickHouse  — every HTTP request logged here
       │                  ├─ MongoDB     — module data + i18n translations
       │                  └─ Ollama      — streaming LLM proxy (/api/chat)
       └─ Module Federation
            ├─ hello-world remote (port 3001)
            └─ chatbot remote   (port 3002)

Ollama stack:
  ollama (pure server)  ◄──  model-downloader (HTTP client via OLLAMA_HOST)
```

## Useful commands

```bash
# Wipe all data and restart fresh
docker compose down -v

# Tail logs for a service
docker compose logs -f backend

# Rebuild a single service
docker compose up --build backend

# Check health status of all running services
docker compose ps

# Check downloaded AI models
docker exec spin-core-ollama-1 ollama list

# Watch model download progress
docker logs spin-core-model-downloader-1 --follow
```

## Project structure

```
spin-core/
├── backend/          # FastAPI app — see backend/README.md
├── frontend/         # React SPA — see frontend/README.md
├── modules/
│   ├── hello-world/  # Reference MF remote — see modules/hello-world/README.md
│   └── chatbot/      # AI chatbot MF remote — see modules/chatbot/README.md
├── k8s/              # Kubernetes manifests — see k8s/README.md
├── scripts/
│   └── k8s-deploy.sh
└── docker-compose.yml
```
