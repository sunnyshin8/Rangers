# Code & Secret Leak Radar

Detect, correlate, and triage code and secret leaks across internal repos and the web.

## Quick start

```bash
# Start infrastructure
cd infra && docker compose up -d

# Run DB migrations (from repo root)
psql "$DATABASE_URL" -f packages/db-migrations/V001__initial.sql
psql "$DATABASE_URL" -f packages/db-migrations/V002__mvp2_policies.sql
psql "$DATABASE_URL" -f packages/db-migrations/V003__mvp3_external.sql
psql "$DATABASE_URL" -f packages/db-migrations/V004__mvp4_ml.sql
psql "$DATABASE_URL" -f packages/db-migrations/V005__mvp5_alerts.sql

# Java services (requires JDK 21 + Maven)
cd services && mvn -q -pl source-ingestor,internal-scanner,dlp-engine,org-identity -am package

# BFF + Web
cd apps/bff && npm install && npm run dev
cd apps/web && npm install && npm run dev
```

Default URLs:
- Web UI: http://localhost:3000
- BFF API: http://localhost:4000
- Org Identity: http://localhost:8081
- DLP Engine: http://localhost:8083

Demo login: `admin@demo.local` / `demo-admin` (Admin) or `user@demo.local` / `demo-user` (User)

## Architecture

See [docs/architecture.md](docs/architecture.md).

## Remaining work

See [docs/remaining-work.md](docs/remaining-work.md) for gaps vs the full MVP plan.

## Packaged archive

Create `leak-radar.zip` in the **parent** directory of `leak-radar/` (next to this folder), excluding paths from [`.gitignore`](.gitignore):

```bash
python3 scripts/make-zip.py
```
