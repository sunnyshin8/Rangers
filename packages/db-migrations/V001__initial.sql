-- MVP 1 core schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'github',
    external_id TEXT,
    full_name TEXT NOT NULL,
    default_branch TEXT DEFAULT 'main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, full_name)
);

CREATE TABLE internal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    repo_id UUID REFERENCES repos(id),
    event_type TEXT NOT NULL,
    commit_sha TEXT,
    branch TEXT,
    author TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leak_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'false_positive')),
    source TEXT NOT NULL CHECK (source IN ('internal', 'external', 'correlated')),
    repo_id UUID REFERENCES repos(id),
    summary TEXT,
    remediation TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leak_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES leak_incidents(id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    candidate_type TEXT NOT NULL,
    rule_id TEXT,
    confidence DOUBLE PRECISION NOT NULL,
    severity TEXT NOT NULL,
    repo_id UUID REFERENCES repos(id),
    file_path TEXT,
    line_start INT,
    line_end INT,
    masked_snippet TEXT,
    fingerprint TEXT NOT NULL,
    commit_sha TEXT,
    external_url TEXT,
    event_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_tenant_status ON leak_incidents(tenant_id, status);
CREATE INDEX idx_candidates_fingerprint ON leak_candidates(tenant_id, fingerprint);
CREATE INDEX idx_candidates_incident ON leak_candidates(incident_id);

-- Demo tenant bootstrap
INSERT INTO tenants (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Org');

INSERT INTO users (id, tenant_id, email, password_hash, role, display_name) VALUES
('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'admin@demo.local',
 '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQMRrkIG2vqHfJglj0KxP8KxQxQxQx', 'admin', 'Demo Admin'),
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'user@demo.local',
 '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQMRrkIG2vqHfJglj0KxP8KxQxQxQx', 'user', 'Demo User');

INSERT INTO repos (id, tenant_id, full_name) VALUES
('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'demo-org/payments-api');
