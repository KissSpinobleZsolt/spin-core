#!/usr/bin/env bash
# Build and push Docker images for a non-core module (frontend MF remote + backend).
#
# Usage:
#   bash scripts/module-push.sh anomascan
#   bash scripts/module-push.sh cloud-insight-ai
#
# IMAGE_TAG defaults to the current git SHA. Override with:
#   IMAGE_TAG=v1.2.3 bash scripts/module-push.sh anomascan
set -euo pipefail

REGISTRY=ghcr.io/kissspinoblezsolt

# --- argument validation ---
MODULE="${1:-}"
if [[ -z "$MODULE" ]]; then
  echo "Usage: $0 <module-name>"
  echo "  Example: $0 anomascan"
  echo "  Example: $0 cloud-insight-ai"
  exit 1
fi

# Resolve the module directory — handles both exact name and case variants.
MODULE_DIR="modules/${MODULE}"
if [[ ! -d "$MODULE_DIR" ]]; then
  echo "ERROR: directory '${MODULE_DIR}' not found."
  exit 1
fi

# Verify this module has k8s manifests (so push and deploy stay in sync).
K8S_DIR="k8s/modules/${MODULE}"
if [[ ! -d "$K8S_DIR" ]]; then
  echo "ERROR: no k8s manifests found at '${K8S_DIR}'."
  echo "  Create them before pushing (see k8s/modules/ for examples)."
  exit 1
fi

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

echo "→ Building module: ${MODULE}  tag: ${IMAGE_TAG}"

# Build and push the MF remote (Nginx container that serves remoteEntry.js).
FRONTEND_IMAGE="${REGISTRY}/spin-core-${MODULE}"
echo ""
echo "→ [1/2] Frontend image: ${FRONTEND_IMAGE}"
docker build \
  -t "${FRONTEND_IMAGE}:${IMAGE_TAG}" \
  -t "${FRONTEND_IMAGE}:latest" \
  "${MODULE_DIR}"
docker push "${FRONTEND_IMAGE}:${IMAGE_TAG}"
docker push "${FRONTEND_IMAGE}:latest"

# Build and push the plugin FastAPI backend (if a backend/ subdirectory exists).
BACKEND_DIR="${MODULE_DIR}/backend"
if [[ -d "$BACKEND_DIR" ]]; then
  BACKEND_IMAGE="${REGISTRY}/spin-core-${MODULE}-backend"
  echo ""
  echo "→ [2/2] Backend image: ${BACKEND_IMAGE}"
  docker build \
    -t "${BACKEND_IMAGE}:${IMAGE_TAG}" \
    -t "${BACKEND_IMAGE}:latest" \
    "${BACKEND_DIR}"
  docker push "${BACKEND_IMAGE}:${IMAGE_TAG}"
  docker push "${BACKEND_IMAGE}:latest"
else
  echo "→ [2/2] No backend/ found — skipping backend image."
fi

echo ""
echo "Push complete. Deploy with:"
echo "  IMAGE_TAG=${IMAGE_TAG} bash scripts/module-deploy.sh ${MODULE}"
