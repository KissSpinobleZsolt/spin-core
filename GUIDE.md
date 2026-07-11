# Free Local AI Copilot — Ollama + Docker + WSL2 + VS Code

A step-by-step guide to running a local LLM (no API keys, no cloud costs) and using it as a GitHub Copilot replacement in VS Code. Works on any Windows 11 PC with an NVIDIA GPU.

---

## What you will have at the end

| Piece | What it does |
|-------|-------------|
| **WSL2** | Linux environment inside Windows |
| **Docker Desktop** | Runs containers on WSL2 |
| **NVIDIA Container Toolkit** | Passes your GPU into Docker containers |
| **Ollama** | Runs LLMs locally (no internet after first download) |
| **Continue (VS Code extension)** | Free Copilot — chat + tab autocomplete powered by your local model |

---

## Requirements

- Windows 11 (Windows 10 build 19041+ also works)
- NVIDIA GPU with at least **4 GB VRAM** (GTX 1060 / RTX series)
- Latest NVIDIA driver for Windows (≥ 525): [nvidia.com/drivers](https://www.nvidia.com/drivers)
- ~5 GB free disk space for Docker images + model

---

## Part 1 — WSL2

### 1.1 Enable WSL2

Open **PowerShell as Administrator** and run:

```powershell
wsl --install
```

Restart your PC when prompted. On reboot a Ubuntu terminal opens — set a username and password.

If WSL was already installed, make sure you are on WSL2:

```powershell
wsl --set-default-version 2
wsl --list --verbose   # should show VERSION 2
```

---

## Part 2 — Docker Desktop

### 2.1 Install Docker Desktop

Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) and install.

During setup, enable **"Use the WSL 2 based engine"** (it is the default on Windows 11).

### 2.2 Enable WSL integration

Open Docker Desktop → **Settings → Resources → WSL Integration** → turn on integration for your Ubuntu distro → **Apply & Restart**.

### 2.3 Verify

In your Ubuntu (WSL2) terminal:

```bash
docker run --rm hello-world
```

You should see `Hello from Docker!`.

---

## Part 3 — NVIDIA GPU in Docker (Container Toolkit)

This step lets Docker containers use your GPU. Without it Ollama falls back to CPU (~5 tok/s instead of ~40 tok/s).

### 3.1 Check your driver is visible inside WSL2

```bash
nvidia-smi
```

You should see your GPU listed. If you get "command not found", update your NVIDIA Windows driver first.

### 3.2 Install NVIDIA Container Toolkit

Run these commands inside the WSL2 terminal:

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -sL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
```

### 3.3 Configure the Docker runtime

```bash
sudo nvidia-ctk runtime configure --runtime=docker
```

Then restart Docker Desktop from the system tray icon (right-click → **Restart Docker Desktop**).

### 3.4 Verify GPU is available in Docker

```bash
docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi
```

You should see your GPU listed inside the container output.

---

## Part 4 — Run Ollama

### Option A — Docker Compose (recommended if you cloned this repo)

```bash
docker compose up ollama
```

Ollama starts on **http://localhost:11434** and automatically pulls `llama3.2:3b` on first run (≈ 2 GB download, takes a few minutes).

### Option B — Standalone Docker (no repo needed)

```bash
docker run -d \
  --name ollama \
  --gpus all \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama/ollama
```

Then pull a model:

```bash
docker exec ollama ollama pull llama3.2:3b
```

### Verify Ollama is running

```bash
curl http://localhost:11434/api/tags
```

Returns a JSON list of downloaded models. You should see `llama3.2:3b`.

### (Optional) Pull a fast autocomplete model

For snappy tab completion, a small code-specific model works better than the 3B chat model:

```bash
# Option A (with repo)
docker compose exec ollama ollama pull qwen2.5-coder:1.5b

# Option B (standalone)
docker exec ollama ollama pull qwen2.5-coder:1.5b
```

---

## Part 5 — VS Code + Continue extension

### 5.1 Install Continue

Open VS Code → Extensions (`Ctrl+Shift+X`) → search **Continue** → **Install**.

Publisher: `Continue` (the icon is a purple arrow).

### 5.2 Configure Continue

Press `Ctrl+Shift+P` → type **"Continue: Open config.json"** → Enter.

Replace the file contents with:

```json
{
  "models": [
    {
      "title": "Llama 3.2 3B (local)",
      "provider": "ollama",
      "model": "llama3.2:3b",
      "apiBase": "http://localhost:11434"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Qwen 2.5 Coder 1.5B (local)",
    "provider": "ollama",
    "model": "qwen2.5-coder:1.5b",
    "apiBase": "http://localhost:11434"
  },
  "allowAnonymousTelemetry": false
}
```

> If you skipped the autocomplete model, remove the `tabAutocompleteModel` block.

Save the file.

---

## Part 6 — Using it

| Action | Shortcut |
|--------|----------|
| Open chat panel | `Ctrl+L` |
| Inline edit selected code | `Ctrl+I` |
| Accept tab autocomplete | `Tab` |
| Dismiss tab autocomplete | `Esc` |
| Add a file to chat context | In chat, type `@` then the filename |

### Chat examples

- "Explain what this function does" (with code selected)
- "Write a unit test for this class"
- "Refactor this to use async/await"
- "What is the difference between X and Y?"

### Inline edit example

1. Select a function
2. Press `Ctrl+I`
3. Type: `add input validation and return an error if name is empty`
4. Continue rewrites the function in place — accept or reject with the diff UI

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `nvidia-smi` not found in WSL2 | Update NVIDIA Windows driver to ≥ 525 and restart |
| `could not select device driver "nvidia"` | Redo Part 3 — Container Toolkit not configured |
| Continue shows "connection refused" | Make sure Ollama is running (`docker compose up ollama`) |
| Autocomplete never appears | Check model was pulled: `curl localhost:11434/api/tags` |
| First reply is slow (~10 s) | Normal — Ollama loads the model on first request; subsequent replies are fast |
| Out of VRAM error | Use a smaller model: change `llama3.2:3b` → `llama3.2:1b` in config.json |

---

## Keeping models between restarts

The Docker volume `ollama_data` persists all downloaded models. You only download once — subsequent `docker compose up` or `docker run` starts are instant.

---

## Adding more models

Browse available models at [ollama.com/library](https://ollama.com/library).

```bash
# Pull a new model
docker exec ollama ollama pull mistral:7b

# Add it to Continue config.json — it will appear in the chat panel dropdown
```

---

*Guide tested on Windows 11 + WSL2 Ubuntu 22.04 + RTX GPU + Docker Desktop 4.x.*
