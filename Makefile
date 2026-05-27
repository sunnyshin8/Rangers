.PHONY: infra migrate build-java npm-install

infra:
	cd infra && docker compose up -d

migrate:
	./scripts/migrate.sh

build-java:
	cd services && mvn -q -pl source-ingestor,internal-scanner,dlp-engine,org-identity -am package -DskipTests

npm-install:
	cd apps/bff && npm install
	cd apps/web && npm install
