#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export DATABASE_URL="${DATABASE_URL:-postgresql://leakradar:leakradar@localhost:5432/leakradar}"
for f in "$ROOT"/packages/db-migrations/V*.sql; do
  echo "Applying $f"
  psql "$DATABASE_URL" -f "$f"
done
echo "Migrations complete."
