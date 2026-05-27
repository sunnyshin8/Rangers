-- MVP 5: alerts & CI
CREATE TABLE alert_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'slack', 'webhook', 'in_app')),
    config JSONB NOT NULL DEFAULT '{}',
    severity_threshold TEXT DEFAULT 'medium',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES leak_incidents(id) ON DELETE CASCADE,
    route_id UUID REFERENCES alert_routes(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'acknowledged')),
    channel_type TEXT NOT NULL,
    recipient TEXT,
    dedup_key TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pipeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    repo_id UUID REFERENCES repos(id),
    pipeline_id TEXT,
    run_id TEXT,
    status TEXT,
    log_excerpt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO alert_routes (tenant_id, name, channel_type, config) VALUES
('00000000-0000-0000-0000-000000000001', 'In-App Default', 'in_app', '{}');
