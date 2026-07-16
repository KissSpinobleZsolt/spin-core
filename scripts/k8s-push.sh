#!/usr/bin/env bash
set -euo pipefail

REGISTRY=ghcr.io/kissspinoblezsolt
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

SERVICES=(
  "backend:./backend"
  "frontend:./frontend"
  "hello-world:./modules/hello-world"
)

for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  context="${entry##*:}"
  image="${REGISTRY}/spin-core-${name}"

  echo "→ Building ${image}:${IMAGE_TAG}..."
  # :latest is the static fallback in kustomization.yaml images block; SHA is the traceable deploy handle
  docker build -t "${image}:${IMAGE_TAG}" -t "${image}:latest" "${context}"

  echo "→ Pushing ${image}..."
  docker push "${image}:${IMAGE_TAG}"
  docker push "${image}:latest"
done

echo ""
echo "Push complete. Deploy with:"
echo "  IMAGE_TAG=${IMAGE_TAG} bash scripts/k8s-deploy.sh"
