-- MVP 2: policies, teams, integrations, audit
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE team_repos (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    repo_id UUID NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, repo_id)
);

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    config_encrypted BYTEA,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, provider)
);

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    rules JSONB NOT NULL DEFAULT '[]',
    severity_map JSONB NOT NULL DEFAULT '{}',
    allowlist JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO teams (id, tenant_id, name) VALUES ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'Platform');
INSERT INTO team_members (team_id, user_id) VALUES
('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000011');
INSERT INTO team_repos (team_id, repo_id) VALUES
('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020');
INSERT INTO policies (id, tenant_id, name, rules, severity_map, allowlist) VALUES (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000001',
    'Default DLP',
    '[{"type":"secret","pattern":"aws_key","severity":"critical"},{"type":"secret","pattern":"github_pat","severity":"high"},{"type":"config","pattern":"env_file","severity":"medium"}]'::jsonb,
    '{"aws_key":"critical","github_pat":"high","generic_secret":"high","env_file":"medium"}'::jsonb,
    '[{"path":"**/test/**"},{"path":"**/*.example"}]'::jsonb
);
