#!/usr/bin/env bash
# Run once after a bare spin-core clone to populate all module submodules:
#   bash scripts/setup-workspace.sh
set -euo pipefail

git submodule update --init --recursive

echo ""
echo "Workspace ready. Module submodule refs:"
git submodule status
