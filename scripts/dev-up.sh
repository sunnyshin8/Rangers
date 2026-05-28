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
echo "  BRIGHT_DATA_API_KEY=... BRIGHT_DATA_MOCK=false BRIGHT_DATA_SERP_ZONE=serp_api1 BRIGHT_DATA_SERP_FORMAT=raw .venv\\Scripts\\python.exe services/external-monitor/main.py"
