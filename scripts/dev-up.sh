#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/infra" && docker compose up -d
sleep 5
"$ROOT/scripts/migrate.sh"

echo "Infrastructure ready. Start services:"
echo "  cd services && mvn -q -pl source-ingestor,internal-scanner,dlp-engine,org-identity -am spring-boot:run"
echo "  cd apps/bff && npm install && npm run dev"
echo "  cd apps/web && npm install && npm run dev"
