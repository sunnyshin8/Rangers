-- MVP 4: ML classification & feedback
CREATE TABLE classification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL,
    candidate_source TEXT NOT NULL,
    label TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    remediation TEXT,
    model_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feedback_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES leak_incidents(id),
    user_id UUID REFERENCES users(id),
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('false_positive', 'confirmed', 'severity_adjust')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES leak_incidents(id) ON DELETE CASCADE,
    internal_candidate_id UUID REFERENCES leak_candidates(id),
    external_candidate_id UUID REFERENCES external_candidates(id),
    correlation_type TEXT NOT NULL,
    score DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scanner_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    repo_id UUID REFERENCES repos(id),
    files_scanned INT DEFAULT 0,
    files_skipped INT DEFAULT 0,
    last_scan_at TIMESTAMPTZ,
    blind_spots JSONB DEFAULT '[]'
);

ALTER TABLE leak_candidates ADD COLUMN IF NOT EXISTS ml_label TEXT;
ALTER TABLE leak_candidates ADD COLUMN IF NOT EXISTS ml_confidence DOUBLE PRECISION;
