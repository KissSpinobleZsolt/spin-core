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
