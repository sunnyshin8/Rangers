# Leak Ranger

Leak Ranger is an MVP security monitoring platform for code and secret leaks. It combines repo scanning, external signal collection, policy management, alert routing, audit logs, and an admin dashboard so teams can spot and triage exposure quickly.

## What It Does

- Detects likely secrets and risky files in code and external sources.
- Tracks incidents by severity, source, and status.
- Routes alerts to configurable channels such as Slack/webhooks.
- Lets admins manage prevention policies and watchlists.
- Keeps an audit trail for policy and routing changes.
- Falls back to local demo data when upstream services are unavailable so the UI stays usable.

## Project Layout

- [apps/web](apps/web) - Next.js UI for the landing page, alerts, admin dashboard, policies, integrations, and audit views.
- [apps/bff](apps/bff) - Fastify backend-for-frontend that handles auth, aggregation, and fallback demo data.
- [services](services) - Java and Python services for ingestion, scanning, identity, alerting, and related backend work.
- [infra](infra) - Docker Compose and Kubernetes manifests.
- [packages/db-migrations](packages/db-migrations) - PostgreSQL migrations.
- [docs](docs) - Architecture notes and remaining work.

## Local Development

### Prerequisites

- Node.js 18+ for the web app and BFF.
- Java 21 + Maven for the Java services.
- Python 3.11+ for the Python services.
- PostgreSQL, Redis, and Kafka if you are running the full stack locally.

### Start the stack

```bash
# Start infrastructure
cd infra
docker compose up -d

# Run database migrations from the repo root
psql "$DATABASE_URL" -f packages/db-migrations/V001__initial.sql
psql "$DATABASE_URL" -f packages/db-migrations/V002__mvp2_policies.sql
psql "$DATABASE_URL" -f packages/db-migrations/V003__mvp3_external.sql
psql "$DATABASE_URL" -f packages/db-migrations/V004__mvp4_ml.sql
psql "$DATABASE_URL" -f packages/db-migrations/V005__mvp5_alerts.sql

# Build Java services
cd services
mvn -q -pl source-ingestor,internal-scanner,dlp-engine,org-identity -am package

# Run BFF and web UI
cd ../apps/bff
npm install
npm run dev

cd ../web
npm install
npm run dev
```

### Default URLs

- Landing page: http://localhost:3000
- Web UI: http://localhost:3000
- BFF API: http://localhost:4000
- Org Identity: http://localhost:8081
- DLP Engine: http://localhost:8083

### Demo Accounts

- Admin: admin@demo.local / demo-admin
- User: user@demo.local / demo-user

## Main Screens

- Home landing page: product overview and MVP feature summary.
- Alerts: incident feed and demo leak trigger.
- Admin dashboard: totals, severity mix, source spread, and recent incidents.
- Compliance: regulatory signals, vendor risk, watchlist exposure, and evidence snapshots.
- Integrations: GitHub, Bright Data, and watchlist setup.
- Alert routing: alert channel management.
- Prevention policies: catalog, editor, and CRED rule templates.
- Audit log: recorded admin actions and routing changes.
- Incident detail: sanitized evidence, source links, and risk assessment guidance.

## Policy Model

Leak Ranger ships with a baseline of 12 prevention policies covering common leak patterns:

- Sensitive filenames such as private keys and env files.
- Oversized files.
- Blocked executable/archive formats.
- Credit card patterns.
- API keys and tokens.
- Private key material.
- Database connection strings.
- Token leaks in URLs.
- High-entropy strings.
- Slack webhook exposure.

These policies are meant to give the MVP immediate value without requiring custom rules to be authored first.

## Monitoring Data

The admin dashboard summarizes:

- Total fetched incidents.
- Today, this week, and last 30 days windows.
- Severity distribution.
- Source distribution.
- Recent incidents with labels.
- Scanner coverage when available.

The compliance view adds:

- Regulatory/compliance signals tied to security exposure.
- Vendor risk scoring.
- Watchlist keyword monitoring.
- Evidence snapshots with structured source links.

## Fallback Behavior

The BFF returns local demo data if upstream services are offline, return errors, or return empty data. This keeps the UI useful during development and demos, and it is also why the dashboard and admin pages still render even if the backend is partially unavailable.

## Configuration

Common environment variables include:

- `DATABASE_URL`
- `JWT_SECRET`
- `ORG_URL`
- `DLP_URL`
- `INGESTOR_URL`
- `ALERT_URL`
- `ALERT_DEFAULT_SLACK_WEBHOOK`

Keep secrets out of the repository and use environment variables or local `.env` files.

## Packaged Archive

To create `leak-radar.zip` in the parent directory of this repository, run:

```bash
python3 scripts/make-zip.py
```

The archive excludes the paths listed in [`.gitignore`](.gitignore).

## Reference Docs

- [Architecture](docs/architecture.md)
- [Remaining Work](docs/remaining-work.md)
