# spin-core / scripts

Utility shell scripts for development and deployment.

## `restart.sh`

Fast container restart without a full rebuild. Use this after config or env-var changes.

```bash
# Restart all core services
bash scripts/restart.sh

# Restart specific services
bash scripts/restart.sh backend
bash scripts/restart.sh backend clickhouse

# Rebuild image then restart (after code changes)
bash scripts/restart.sh --rebuild backend
bash scripts/restart.sh --rebuild frontend
```

Does a `docker compose stop` + `docker compose up -d` on the named service(s). With `--rebuild` it prepends `docker compose build` before starting.

## `k8s-deploy.sh`

Full Kubernetes deploy via minikube. See [k8s/README.md](../k8s/README.md) for prerequisites and environment setup.

```bash
cp k8s/.env.example k8s/.env   # fill in ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET_KEY
minikube start --driver=docker
bash scripts/k8s-deploy.sh
```

The script:
1. Points `docker` CLI at the minikube daemon so images are built directly into the cluster.
2. Builds backend and frontend Docker images.
3. Applies all manifests from `k8s/` in dependency order.
4. Waits for core pods to become ready.
5. Prints the NodePort URLs for frontend and backend.

## `generate-docs.sh`

Generates API reference documentation for both the frontend and backend.

```bash
bash scripts/generate-docs.sh
```

Output:
- `docs/frontend/` — TypeDoc HTML site (services, contexts, hooks)
- `docs/backend/` — pdoc HTML site (all Python modules)

The script auto-installs **TypeDoc** (`npm`) and **pdoc** (`pip`) if they are not already present. To use a specific Python interpreter set the `PYTHON` env var:

```bash
PYTHON=python3.12 bash scripts/generate-docs.sh
```

You can also generate frontend docs alone via:

```bash
cd frontend && npm run docs
```

## `setup-workspace.sh`

Initialises all git submodules after a bare clone of spin-core. Run this once when you first check out the repo without `--recurse-submodules`:

```bash
bash scripts/setup-workspace.sh
```

Equivalent to `git submodule update --init --recursive`, but prints a human-readable status table afterwards.
