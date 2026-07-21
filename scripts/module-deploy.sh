#!/usr/bin/env bash
# Deploy a non-core module to Kubernetes and register it with the core backend.
#
# Prerequisites:
#   - Core must already be running (kubectl apply -k k8s/ completed)
#   - Images must already be pushed (run module-push.sh first)
#
# Usage:
#   bash scripts/module-deploy.sh anomascan
#   bash scripts/module-deploy.sh cloud-insight-ai
#
# IMAGE_TAG defaults to the current git SHA. Override with:
#   IMAGE_TAG=v1.2.3 bash scripts/module-deploy.sh anomascan
set -euo pipefail

NAMESPACE=spin-core
REGISTRY=ghcr.io/kissspinoblezsolt

# --- argument validation ---
MODULE="${1:-}"
if [[ -z "$MODULE" ]]; then
  echo "Usage: $0 <module-name>"
  echo "  Example: $0 anomascan"
  echo "  Example: $0 cloud-insight-ai"
  exit 1
fi

K8S_DIR="k8s/modules/${MODULE}"
if [[ ! -d "$K8S_DIR" ]]; then
  echo "ERROR: no k8s manifests found at '${K8S_DIR}'."
  exit 1
fi

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

echo "→ Deploying module '${MODULE}' (tag ${IMAGE_TAG}) to namespace ${NAMESPACE}..."

# --- stamp SHA tag into kustomization.yaml ---
# Run in a subshell so kustomize edit's working-directory requirement is met.
# The git checkout below resets the file so the working tree stays clean.
(
  cd "${K8S_DIR}"
  kustomize edit set image \
    "${REGISTRY}/spin-core-${MODULE}:${IMAGE_TAG}" \
    "${REGISTRY}/spin-core-${MODULE}-backend:${IMAGE_TAG}" 2>/dev/null || true
    # 2>/dev/null || true: kustomize edit will warn (not error) if an image name
    # is not in the images block; safe to ignore when module has no backend.
)

kubectl apply -k "${K8S_DIR}/"

# Reset kustomization.yaml — keep the working tree clean.
git checkout "${K8S_DIR}/kustomization.yaml" 2>/dev/null || true

# --- wait for rollouts ---
echo "→ Waiting for frontend rollout..."
kubectl rollout status "deployment/${MODULE}" -n "${NAMESPACE}" --timeout=120s

# Wait for the backend deployment only if it exists.
if kubectl get deployment "${MODULE}-backend" -n "${NAMESPACE}" &>/dev/null; then
  echo "→ Waiting for backend rollout..."
  kubectl rollout status "deployment/${MODULE}-backend" -n "${NAMESPACE}" --timeout=120s
fi

# --- register module with core ---
# The core backend auto-discovers modules by fetching manifest.json from each URL
# in MODULE_REGISTRY_URLS on startup. Append this module's frontend service URL
# to the ConfigMap (idempotent) then restart the backend to trigger re-discovery.
MODULE_URL="http://${MODULE}.${NAMESPACE}.svc.cluster.local"
CURRENT_URLS=$(kubectl get configmap spin-core-config -n "${NAMESPACE}" \
  -o jsonpath='{.data.MODULE_REGISTRY_URLS}' 2>/dev/null || echo "")

if [[ "$CURRENT_URLS" != *"$MODULE_URL"* ]]; then
  echo "→ Registering ${MODULE_URL} in MODULE_REGISTRY_URLS..."
  if [[ -z "$CURRENT_URLS" ]]; then
    NEW_URLS="$MODULE_URL"
  else
    NEW_URLS="${CURRENT_URLS},${MODULE_URL}"
  fi
  kubectl patch configmap spin-core-config -n "${NAMESPACE}" \
    --type merge \
    -p "{\"data\":{\"MODULE_REGISTRY_URLS\":\"${NEW_URLS}\"}}"
  echo "→ Restarting core backend to pick up new registry URL..."
  kubectl rollout restart deployment/backend -n "${NAMESPACE}"
  kubectl rollout status deployment/backend -n "${NAMESPACE}" --timeout=60s
else
  echo "→ ${MODULE_URL} already in MODULE_REGISTRY_URLS — skipping configmap patch."
fi

echo ""
echo "Module '${MODULE}' is live in ${NAMESPACE}."
echo "  Frontend (MF remote): http://<node-ip>:$(kubectl get svc "${MODULE}" -n "${NAMESPACE}" -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo 'N/A')"
