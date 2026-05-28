.PHONY: infra migrate build-java npm-install bright-data-env

infra:
	cd infra && docker compose up -d

migrate:
	./scripts/migrate.sh

build-java:
	cd services && mvn -q -pl source-ingestor,internal-scanner,policy-engine,org-identity -am package -DskipTests

npm-install:
	cd apps/bff && npm install
	cd apps/web && npm install

bright-data-env:
	@echo BRIGHT_DATA_API_KEY=f617213b-a4ad-4617-8608-810f9fac5f71
	@echo BRIGHT_DATA_MOCK=false
	@echo BRIGHT_DATA_SERP_ZONE=serp_api1
	@echo BRIGHT_DATA_SERP_FORMAT=raw
