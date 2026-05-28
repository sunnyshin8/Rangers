# Code & Secret Leak Ranger — Architecture

See the implementation plan in the repository README and the original design doc.

## Services

| Service | Port | Tech | Responsibility |
|---------|------|------|----------------|
| web | 3000 | Next.js | Admin & user UI |
| bff | 4000 | Node/Fastify | API gateway, auth proxy |
| org-identity | 8081 | Java | Tenants, users, JWT, integrations |
| source-ingestor | 8082 | Java | GitHub/CI webhooks → Kafka |
| policy-engine | 8083 | Java | Policies, incidents, correlation |
| internal-scanner | 8084 | Java | Secret/code scanning |
| alert-service | 8085 | Python | Notifications, SSE |
| external-monitor | — | Python | Bright Data external scans |
| ml-classifier | — | Python | Stage-2 classification |

## Kafka topics

- `internal.events` → Internal Scanner
- `policy.candidates` → ML (optional) or DLP Engine
- `policy.candidates.classified` → DLP Engine (when ML enabled)
- `policy.external.candidates` → DLP Engine
- `policy.incidents` → Alert Service

## MVP phases

1. **MVP 1** — Internal Git → scan → incident → UI triage
2. **MVP 2** — Policies, RBAC, admin integrations
3. **MVP 3** — Bright Data external monitoring
4. **MVP 4** — ML classification & correlation
5. **MVP 5** — Slack/SSE alerts, CI pipeline ingest
