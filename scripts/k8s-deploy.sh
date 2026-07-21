#!/usr/bin/env bash
set -euo pipefail

NAMESPACE=spin-core
# Default to the current git SHA; CI can override by setting IMAGE_TAG before calling this script.
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

echo "→ Deploying tag ${IMAGE_TAG} to namespace ${NAMESPACE}..."

# Stamp the SHA tag into kustomization.yaml so kubectl apply picks it up.
# Subshell keeps the cd scoped — kustomize edit must run from the kustomization.yaml directory.
# git checkout below resets the file so the working tree stays clean.
(
  cd k8s
  kustomize edit set image \
    "ghcr.io/kissspinoblezsolt/spin-core-backend:${IMAGE_TAG}" \
    "ghcr.io/kissspinoblezsolt/spin-core-frontend:${IMAGE_TAG}" \
    "ghcr.io/kissspinoblezsolt/spin-core-spin-docs:${IMAGE_TAG}"
)

kubectl apply -k k8s/

# Reset kustomization.yaml so the SHA tag is not left as a local modification.
git checkout k8s/kustomization.yaml

echo "→ Waiting for rollouts..."
kubectl rollout status deployment/backend    -n "${NAMESPACE}" --timeout=120s
kubectl rollout status deployment/frontend   -n "${NAMESPACE}" --timeout=60s
kubectl rollout status deployment/spin-docs   -n "${NAMESPACE}" --timeout=60s

echo ""
echo "Deploy complete — tag ${IMAGE_TAG} is live in ${NAMESPACE}."
