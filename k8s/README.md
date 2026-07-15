# spin-core / k8s

Kubernetes manifests for the spin-core platform. Uses **Kustomize** — no Helm required.

## Prerequisites

- [minikube](https://minikube.sigs.k8s.io/) with the Docker driver
- `kubectl` CLI
- NVIDIA Container Toolkit (for GPU acceleration in Ollama — optional, falls back to CPU)

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
| `MONGO_USER` / `MONGO_PASSWORD` | MongoDB credentials |
| `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD` | ClickHouse credentials |

## Deploy

### 1. Start the cluster

```bash
minikube start --driver=docker
```

### 2. Build images and apply manifests

```bash
bash scripts/k8s-deploy.sh
```

This script:
1. Points Docker at minikube's daemon (`eval $(minikube docker-env)`)
2. Builds `spin-core-backend`, `spin-core-frontend`, `spin-core-hello-world` inside minikube
3. Applies all manifests via `kubectl apply -k k8s/`
4. Waits for backend and frontend rollouts
5. Prints the app URL

### 3. Wait for models

On first run the `model-downloader` Job pulls `qwen2.5:7b` (~5.5 GB) and `nomic-embed-text:latest` (~270 MB) from the internet into the `ollama-pvc` volume. Watch progress:

```bash
kubectl logs -n spin-core -l job-name=model-downloader -f
```

Subsequent deploys are instant — the volume persists between restarts.

## NodePort assignments

| Service | NodePort | URL |
|---------|----------|-----|
| `frontend` | 30080 | `http://$(minikube ip):30080` |
| `backend` | 30800 | `http://$(minikube ip):30800` |
| `hello-world` | 30001 | `http://$(minikube ip):30001` |

Get the frontend URL:

```bash
minikube service frontend -n spin-core --url
```

## Configuration

Non-secret configuration (URLs, paths) is in `configmap.yaml`. The Ollama URL is set to the in-cluster DNS name:

```
OLLAMA_URL: http://ollama.spin-core.svc.cluster.local:11434
```

## Directory structure

```
k8s/
├── kustomization.yaml        # Kustomize entry point — secretGenerator + resource list
├── namespace.yaml
├── configmap.yaml            # Non-secret env vars (URLs, paths)
├── .env.example              # Credentials template — copy to .env and fill in
├── .env                      # Your credentials (gitignored)
├── app-data-pvc.yaml         # Backend settings.json volume
├── postgres/                 # StatefulSet + Service + PVC
├── mongo/                    # StatefulSet + Service + PVC
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

# Rebuild backend after a code change
eval $(minikube docker-env)
docker build -t spin-core-backend:latest ./backend
kubectl rollout restart deployment/backend -n spin-core

# Switch kubectl context
kubectl config use-context minikube
kubectl config current-context

# Tear down the namespace (keeps minikube running)
kubectl delete namespace spin-core

# Stop minikube
minikube stop
```

## Ollama in Kubernetes

The Ollama `Deployment` runs a pure server (`ollama serve`) with no model bundled inside. A separate `Job` (`model-downloader`) handles the download:

- Uses `OLLAMA_HOST=http://ollama:11434` — pure HTTP client, no shared volume
- An `initContainer` waits until the Ollama pod is ready before pulling
- `restartPolicy: OnFailure` with `backoffLimit: 10` retries on network failure
- `ttlSecondsAfterFinished: 300` — the Job pod is cleaned up 5 minutes after completion

To re-run the model downloader (e.g. to pull a newly added model):

```bash
kubectl delete job model-downloader -n spin-core
kubectl apply -f k8s/ollama/model-downloader-job.yaml
```
