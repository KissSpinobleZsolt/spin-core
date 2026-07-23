# spin-core

**spin-core** is a self-hosted AI platform you can run entirely on your own machine — no cloud accounts, no API keys, no data leaving your network.

It gives your team a shared space to chat with AI assistants, analyse data, and run specialised AI tools, all through a clean web interface.

---

## What can you do with it?

### Talk to AI bots
Chat with AI assistants directly in the browser. Each bot can have its own personality, focus area, and role restrictions. The AI runs locally via [Ollama](https://ollama.com) — your conversations stay on your machine.

### Run specialised AI modules
Extend the platform with purpose-built modules:

| Module | What it does |
|--------|--------------|
| **AnomaScan** | Upload images or video — YOLO object detection flags anomalies in real time |
| **CloudInsight AI** | Upload and explore datasets; AI-assisted data analysis and management |
| **spin-docs** | In-app architecture diagrams and developer documentation |

Modules are plug-and-play — they appear in the sidebar as soon as they are registered.

### Manage your team
Create and manage users with role-based access. Control who can see which bots and modules.

### See what's happening
A live admin dashboard shows system health, running services, and AI model status. Detailed logs track every request and chat interaction.

### Speak your language
The interface supports English and Romanian out of the box, with a live translation editor so you can adjust any label without redeploying.

---

## Quick start

> Requires Docker. One command — no other installs needed.

```bash
git clone --recurse-submodules https://github.com/KissSpinobleZsolt/spin-core.git
cd spin-core
docker compose up --build
```

Then open **http://localhost:3000** and log in with the credentials set in `docker-compose.yml` (default: `admin@spin.local` / `change-me`).

On first run, Ollama downloads the default AI model (~4.7 GB). This takes 15–60 minutes depending on your connection. Subsequent starts are instant.

---

## Who is this for?

- **Teams** that want a private, on-premise AI assistant without sending data to external services.
- **Developers** who want a ready-made platform shell to build and deploy custom AI modules.
- **Organisations** with data-sensitivity requirements — everything runs inside your own infrastructure.

---

## Going further

| I want to… | Go here |
|------------|---------|
| Set up Docker + GPU on Windows/WSL2 | [GUIDE.md](GUIDE.md) |
| Understand how it works technically | [TECH_SPEC.md](TECH_SPEC.md) |
| Build or integrate a new module | [CONTRIBUTING.md](CONTRIBUTING.md) · [modules/README.md](modules/README.md) |
| Deploy to Kubernetes | [k8s/README.md](k8s/README.md) |
| Read the full API reference | [backend/README.md](backend/README.md) |
