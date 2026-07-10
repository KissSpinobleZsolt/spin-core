#!/usr/bin/env bash
set -euo pipefail

echo "→ Pointing Docker to minikube's daemon..."
eval $(minikube docker-env)

echo "→ Building backend image..."
docker build -t spin-core-backend:latest ./backend

echo "→ Building frontend image..."
docker build -t spin-core-frontend:latest ./frontend

echo "→ Applying Kubernetes manifests..."
kubectl apply -k k8s/

echo "→ Waiting for backend rollout..."
kubectl rollout status deployment/backend -n spin-core --timeout=120s

echo "→ Waiting for frontend rollout..."
kubectl rollout status deployment/frontend -n spin-core --timeout=60s

echo ""
echo "✓ Deployed. App URL:"
minikube service frontend -n spin-core --url
