-- MVP 3: external monitoring
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    scan_interval_hours INT NOT NULL DEFAULT 24,
    last_scan_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE external_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES leak_incidents(id),
    url TEXT NOT NULL,
    site_type TEXT,
    snippet_hash TEXT,
    masked_snippet TEXT,
    fingerprint TEXT,
    confidence DOUBLE PRECISION,
    severity TEXT,
    evidence_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bright_data_config (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    api_key_encrypted BYTEA,
    serp_enabled BOOLEAN DEFAULT true,
    unlocker_enabled BOOLEAN DEFAULT true,
    scraper_enabled BOOLEAN DEFAULT true,
    daily_query_cap INT DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO watchlists (tenant_id, keyword) VALUES
('00000000-0000-0000-0000-000000000001', 'demo-org payments-api'),
('00000000-0000-0000-0000-000000000001', 'AKIA demo-org');
