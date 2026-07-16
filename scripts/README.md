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

## `k8s-push.sh`

Builds the three app images (`backend`, `frontend`, `hello-world`) and pushes them to
`ghcr.io/kissspinoblezsolt/spin-core-<name>` tagged with the current git SHA and `:latest`.
Run this before `k8s-deploy.sh` whenever the source changes.

```bash
bash scripts/k8s-push.sh

# Override the tag (e.g. for a release)
IMAGE_TAG=v1.2.3 bash scripts/k8s-push.sh
```

## `k8s-deploy.sh`

Pure Kubernetes deploy — no Docker build step. Stamps the git SHA tag into the Kustomize
image references, applies all manifests from `k8s/`, and waits for rollouts.
See [k8s/README.md](../k8s/README.md) for prerequisites and cluster setup.

```bash
cp k8s/.env.example k8s/.env   # fill in credentials
bash scripts/k8s-push.sh       # build + push images first
bash scripts/k8s-deploy.sh     # apply manifests + wait for rollouts

# Pass an explicit tag to deploy a specific build
IMAGE_TAG=abc1234 bash scripts/k8s-deploy.sh
```

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
