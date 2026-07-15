#!/usr/bin/env bash
# Usage:
#   bash scripts/restart.sh                      # restart all core services (no rebuild)
#   bash scripts/restart.sh backend              # restart one service
#   bash scripts/restart.sh backend clickhouse   # restart several services
#   bash scripts/restart.sh --rebuild            # rebuild then restart all core services
#   bash scripts/restart.sh --rebuild backend    # rebuild then restart one service
set -euo pipefail

REBUILD=0
SERVICES=()

for arg in "$@"; do
  if [[ "$arg" == "--rebuild" ]]; then
    REBUILD=1
  else
    SERVICES+=("$arg")
  fi
done

# Default: restart all named services (databases + backend + frontend)
if [[ ${#SERVICES[@]} -eq 0 ]]; then
  SERVICES=(postgres clickhouse ollama backend hello-world frontend-dev)
fi

if [[ $REBUILD -eq 1 ]]; then
  echo "→ Rebuilding and restarting: ${SERVICES[*]}"
  docker compose up --build -d "${SERVICES[@]}"
else
  echo "→ Restarting (no rebuild): ${SERVICES[*]}"
  docker compose restart "${SERVICES[@]}"
fi

echo ""
echo "→ Current service status:"
docker compose ps "${SERVICES[@]}"
