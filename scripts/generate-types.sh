#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Use the backend venv python if available, otherwise fall back to python3
PYTHON="$BACKEND_DIR/.venv/bin/python"
if [ ! -f "$PYTHON" ]; then
  PYTHON=python3
fi

echo "→ Extracting OpenAPI spec from FastAPI..."
cd "$BACKEND_DIR"
"$PYTHON" -c "
from app.main import app
import json
spec = app.openapi()
with open('$FRONTEND_DIR/src/api/openapi.json', 'w') as f:
    json.dump(spec, f, indent=2)
print('  openapi.json written')
"

echo "→ Generating TypeScript types..."
cd "$FRONTEND_DIR"
npx openapi-typescript src/api/openapi.json -o src/api/types.generated.ts

echo "✓ Types generated successfully"
