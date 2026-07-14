# Free Local AI Copilot — Ollama + Docker + WSL2 + VS Code

A step-by-step guide to running a local LLM (no API keys, no cloud costs) and using it as a GitHub Copilot replacement in VS Code. Works on any Windows 11 PC with an NVIDIA GPU.

---

## What you will have at the end

| Piece | What it does |
|-------|-------------|
| **WSL2** | Linux environment inside Windows |
| **Docker Engine** | Runs containers inside WSL2 |
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

## Part 2 — Docker Engine

Install Docker Engine directly inside WSL2 (no Docker Desktop needed).

### 2.1 Install dependencies

```bash
sudo apt update
sudo apt-get install -y ca-certificates curl gnupg lsb-release
```

### 2.2 Add Docker's GPG key and repository

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 2.3 Install Docker Engine

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2.4 Allow your user to run Docker without sudo

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Then **restart WSL** from PowerShell so the group change takes effect:

```powershell
wsl --shutdown
```

Reopen your Ubuntu terminal.

### 2.5 Verify

```bash
source ~/.bashrc
docker --version   # e.g. Docker version 26.x.x
docker version     # shows client + server details
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

Then restart the Docker daemon:

```bash
sudo systemctl restart docker
```

### 3.4 Verify GPU is available in Docker

First confirm Docker has the NVIDIA runtime registered (no image needed):

```bash
docker info | grep -i runtime
```

The output should include `nvidia` in the list of runtimes.

Then confirm the GPU is visible inside a container. Use `nvidia-smi` directly in WSL2 to find your driver version, then pick a matching CUDA image from [hub.docker.com/r/nvidia/cuda/tags](https://hub.docker.com/r/nvidia/cuda/tags):

```bash
# Check your driver version in WSL2
nvidia-smi

# Run the GPU check inside Docker — replace the tag to match your setup
# Format: nvidia/cuda:<cuda-version>-base-<ubuntu-version>
# Example for CUDA 12 on Ubuntu 22.04:
docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi
```

You should see your GPU listed inside the container output. If you get a version mismatch error, adjust the image tag to a CUDA version supported by your driver (shown in the `nvidia-smi` table under "CUDA Version").

---

## Part 4 — Run Ollama

### Option A — Docker Compose (recommended if you cloned this repo)

Start the Ollama server and let `model-downloader` pull all required models automatically:

```bash
docker compose up ollama model-downloader
```

`ollama` starts on **http://localhost:11434** and becomes healthy within ~15 seconds. `model-downloader` then connects to it via the Ollama REST API and pulls all three Continue models (`llama3.1:8b`, `qwen2.5-coder:1.5b-base`, `nomic-embed-text:latest`) with automatic retry on network failure.

Watch download progress in the ollama container:

```bash
docker logs spin-core-ollama-1 --follow
```

On first run this takes 15–60 minutes depending on your connection (~6 GB total). Subsequent starts are instant — models are cached in the `ollama_data` Docker volume.

> **WSL2 tip — fix connection resets during download:** WSL2's internal NAT can drop long-lived TCP connections during large downloads. Run this once in your WSL2 terminal to enable TCP keepalives:
>
> ```bash
> sudo sysctl -w net.ipv4.tcp_keepalive_time=30
> sudo sysctl -w net.ipv4.tcp_keepalive_intvl=10
> sudo sysctl -w net.ipv4.tcp_keepalive_probes=5
> ```
>
> To persist across WSL2 restarts, add those three lines to `/etc/sysctl.conf`.

### Option B — Standalone Docker (no repo needed)

```bash
docker run -d \
  --name ollama \
  --gpus all \
  -p 11434:11434 \
  -v ollama_data:/root/.ollama \
  ollama/ollama
```

Wait for the server to start (a few seconds), then pull the models:

```bash
docker exec ollama ollama pull llama3.1:8b
docker exec ollama ollama pull qwen2.5-coder:1.5b-base
docker exec ollama ollama pull nomic-embed-text:latest
```

### Verify Ollama is running

```bash
curl http://localhost:11434/api/tags
```

Returns a JSON list of downloaded models. You should see all three models listed.

---

## Part 5 — VS Code + Continue extension

### 5.1 Install Continue

Open VS Code → Extensions (`Ctrl+Shift+X`) → search **Continue** → **Install**.

Publisher: `Continue` (the icon is a purple arrow).

### 5.2 Configure Continue

Press `Ctrl+Shift+P` → type **"Continue: Open config.yaml"** → Enter.

Replace the file contents with:

```yaml
name: Main Config
version: 1.0.0
schema: v1
models:
  - name: Qwen 2.5 7B
    provider: ollama
    model: qwen2.5:7b
    roles:
      - chat
      - edit
      - apply
      - agent
  - name: Nomic Embed
    provider: ollama
    model: nomic-embed-text:latest
    roles:
      - embed
```

Each model is assigned a **role**:

| Role | What it does |
|------|-------------|
| `chat` / `edit` / `apply` | Powers the chat panel and inline edits |
| `agent` | Multi-step agentic edits (file creation, refactors) |
| `embed` | Local codebase indexing for context-aware chat (`@codebase`) |

Both models are pulled automatically by `model-downloader` on first start — no manual download needed.

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
| Continue shows "connection refused" | Make sure Ollama is running: `docker compose up ollama model-downloader` |
| Models not found in Continue | Check models are downloaded: `docker exec spin-core-ollama-1 ollama list` — wait for `model-downloader` to finish |
| Downloads keep failing / resetting | Apply the WSL2 TCP keepalive fix in the Option A section above |
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

*Guide tested on Windows 11 + WSL2 Ubuntu 22.04 + RTX GPU + Docker Engine (CE).*