#!/usr/bin/env bash
# Generates API reference docs for frontend (TypeDoc → docs/frontend/) and backend (pdoc → docs/backend/).
# Auto-installs TypeDoc and pdoc if missing. Override the Python binary with PYTHON=python3.x.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_FRONTEND="$REPO_ROOT/docs/frontend"
DOCS_BACKEND="$REPO_ROOT/docs/backend"

echo "==> spin-core doc generator"

# ── Frontend (TypeDoc) ──────────────────────────────────────────────────────

echo ""
echo "[frontend] Generating docs → $DOCS_FRONTEND"
FRONTEND="$REPO_ROOT/frontend"
# Use local typedoc if available, otherwise download on-demand via npx
if [[ -x "$FRONTEND/node_modules/.bin/typedoc" ]]; then
  "$FRONTEND/node_modules/.bin/typedoc" --options "$REPO_ROOT/typedoc.json"
else
  npx --yes typedoc --options "$REPO_ROOT/typedoc.json"
fi
echo "[frontend] Done."

# ── Backend (pdoc) ─────────────────────────────────────────────────────────

echo ""
echo "[backend] Checking pdoc..."
PYTHON="${PYTHON:-python3}"

if ! "$PYTHON" -m pdoc --version &>/dev/null 2>&1; then
  echo "[backend] Installing pdoc..."
  "$PYTHON" -m pip install --quiet pdoc
fi

echo "[backend] Generating docs → $DOCS_BACKEND"
"$PYTHON" -m pdoc \
  "$REPO_ROOT/backend/app" \
  --output-dir "$DOCS_BACKEND" \
  --docformat google
echo "[backend] Done."

# ── Summary ────────────────────────────────────────────────────────────────

echo ""
echo "Documentation generated:"
echo "  Frontend → $DOCS_FRONTEND/index.html"
echo "  Backend  → $DOCS_BACKEND/app.html"
