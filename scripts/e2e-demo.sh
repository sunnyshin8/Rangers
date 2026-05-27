#!/usr/bin/env bash
# End-to-end demo (requires all services running)
set -euo pipefail
BFF="${BFF_URL:-http://localhost:4000}"

TOKEN=$(curl -s -X POST "$BFF/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"demo-admin"}' | jq -r .token)

echo "Logged in. Triggering demo leak..."
curl -s -X POST "$BFF/api/test/demo-leak" -H "Authorization: Bearer $TOKEN" | jq .

sleep 3
echo "Incidents:"
curl -s "$BFF/api/incidents?status=open" -H "Authorization: Bearer $TOKEN" | jq .
