# spin-core / k8s

Kubernetes manifests for the spin-core platform. Uses **Kustomize** — no Helm required.

## Prerequisites

- `kubectl` connected to a cluster (any: K3s, GKE, EKS, bare-metal, …)
- `kustomize` CLI (v5+) — or `kubectl` ≥ 1.27 which bundles it
- Docker, for running `scripts/k8s-push.sh`
- `git`, for the deploy script to resolve the image tag from `git rev-parse`
- ghcr.io access: images are pulled from `ghcr.io/kissspinoblezsolt/spin-core-*`. If the
  GitHub packages are private, create a pull secret and add it to the service accounts in
  the `spin-core` namespace before deploying:
  ```bash
  kubectl create secret docker-registry ghcr-pull-secret \
    --docker-server=ghcr.io \
    --docker-username=<github-user> \
    --docker-password=<PAT-with-read:packages> \
    -n spin-core
  ```

## Namespace

All resources live in the `spin-core` namespace, created by `namespace.yaml`.

## Credentials

Secrets are loaded from `k8s/.env` (gitignored). Copy the template and fill in your values:

```bash
cp k8s/.env.example k8s/.env
# edit k8s/.env
```

`kustomize secretGenerator` reads `.env` and generates the `spin-core-secrets` Secret at apply time — no secrets are committed to git.

Available keys:

| Key | Description |
|-----|-------------|
| `JWT_SECRET_KEY` | JWT signing secret — **change before deploying** |
| `ADMIN_EMAIL` | Admin login email seeded on first run |
| `ADMIN_PASSWORD` | Admin password seeded on first run |
| `ADMIN_NAME` | Admin display name |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | PostgreSQL credentials |
| `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD` | ClickHouse credentials |
| `ANTHROPIC_API_KEY` | Optional — enables Anthropic Claude models |
| `OPENAI_API_KEY` | Optional — enables OpenAI-compatible models |

## Deploy

### 1. Build and push images

```bash
bash scripts/k8s-push.sh
```

Builds `backend`, `frontend`, and `hello-world`, then pushes two tags to `ghcr.io/kissspinoblezsolt/spin-core-<name>`:
- `:<git-sha>` — content-addressable, used by the deploy script
- `:latest` — convenience alias

Override the tag: `IMAGE_TAG=v1.2.3 bash scripts/k8s-push.sh`

### 2. Apply manifests

```bash
bash scripts/k8s-deploy.sh
```

Uses the same `IMAGE_TAG` (defaults to the current git SHA) to stamp the image references via `kustomize edit set image`, then applies all manifests and waits for rollouts.

Run both steps together:

```bash
bash scripts/k8s-push.sh && bash scripts/k8s-deploy.sh
```

Or pass an explicit tag across both:

```bash
IMAGE_TAG=abc1234 bash scripts/k8s-push.sh
IMAGE_TAG=abc1234 bash scripts/k8s-deploy.sh
```

### 3. Wait for models

On first run the `model-downloader` Job pulls `qwen2.5:7b` (~5.5 GB) and `nomic-embed-text:latest` (~270 MB) from the internet into the `ollama-pvc` volume. Watch progress:

```bash
kubectl logs -n spin-core -l job-name=model-downloader -f
```

Subsequent deploys are instant — the volume persists between restarts.

## NodePort assignments

| Service | NodePort |
|---------|----------|
| `frontend` | 30080 |
| `backend` | 30800 |
| `hello-world` | 30001 |

## Configuration

Non-secret configuration (URLs, paths) is in `configmap.yaml`. The Ollama URL is set to the in-cluster DNS name:

```
OLLAMA_URL: http://ollama.spin-core.svc.cluster.local:11434
```

## Directory structure

```
k8s/
├── kustomization.yaml        # Kustomize entry point — secretGenerator + images + resource list
├── namespace.yaml
├── configmap.yaml            # Non-secret env vars (URLs, paths, model names)
├── seed-data-cm.yaml         # First-run seed data (bot_types, bots, modules, theme) — keep in sync with data/seed.json
├── .env.example              # Credentials template — copy to .env and fill in
├── .env                      # Your credentials (gitignored)
├── app-data-pvc.yaml         # Backend persistent data volume (settings.json + app data)
├── postgres/                 # StatefulSet + Service + PVC
├── clickhouse/               # StatefulSet + Service + PVC
├── ollama/
│   ├── deployment.yaml       # Pure ollama serve — GPU-accelerated, no model pulling
│   ├── service.yaml
│   ├── pvc.yaml              # 20 Gi — enough for qwen2.5:7b + nomic-embed-text
│   └── model-downloader-job.yaml  # Job: pulls models via OLLAMA_HOST, then exits
├── backend/                  # Deployment + Service (NodePort 30800)
├── frontend/                 # Deployment + Service (NodePort 30080)
└── hello-world/              # Deployment + Service (NodePort 30001)
```

## Day-to-day operations

```bash
# Live pod status
kubectl get pods -n spin-core -w

# All resources refreshed every 2 s
watch -n2 kubectl get all -n spin-core

# Stream backend logs
kubectl logs -n spin-core -l app=backend -f

# Describe a pod (events, probe failures, OOM)
kubectl describe pod -n spin-core -l app=backend

# Redeploy backend after a code change
bash scripts/k8s-push.sh
bash scripts/k8s-deploy.sh

# Or restart the deployment without a new image push (picks up any config changes)
kubectl rollout restart deployment/backend -n spin-core

# Switch kubectl context
kubectl config use-context <your-context>
kubectl config current-context

# Tear down the namespace (keeps the cluster running, volumes are deleted)
kubectl delete namespace spin-core

# Re-run the model downloader (e.g. to pull a newly added model)
kubectl delete job model-downloader -n spin-core
kubectl apply -f k8s/ollama/model-downloader-job.yaml
```

## Ollama in Kubernetes

The Ollama `Deployment` runs a pure server (`ollama serve`) with no model bundled inside. A separate `Job` (`model-downloader`) handles the download:

- Uses `OLLAMA_HOST=http://ollama:11434` — pure HTTP client, no shared volume
- An `initContainer` waits until the Ollama pod is ready before pulling
- `restartPolicy: OnFailure` with `backoffLimit: 10` retries on network failure
- `ttlSecondsAfterFinished: 300` — the Job pod is cleaned up 5 minutes after completion
