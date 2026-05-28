import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "jsonwebtoken";

const ORG_URL = process.env.ORG_URL || "http://localhost:8081";
const DLP_URL = process.env.DLP_URL || "http://localhost:8083";
const INGESTOR_URL = process.env.INGESTOR_URL || "http://localhost:8082";
const JWT_SECRET =
  process.env.JWT_SECRET || "leak-radar-dev-secret-change-in-production-min-32-chars";
const ALERT_URL = process.env.ALERT_URL || "http://localhost:8085";
const ALERT_DEFAULT_SLACK_WEBHOOK =
  process.env.ALERT_DEFAULT_SLACK_WEBHOOK || "";

// Local interactive memory store for Zero-Dependency fallback demo mode
const localDemoStore = {
  alertRoutes: [
    {
      id: "demo-route-1",
      name: "Security Operations Slack",
      channel_type: "slack",
      config: { url: "https://example.invalid/slack-webhook" },
      severity_threshold: "high",
      enabled: true,
      created_at: new Date().toISOString()
    },
    {
      id: "demo-route-2",
      name: "Compliance Email Alerts",
      channel_type: "email",
      config: { recipient: "compliance-security@company.local" },
      severity_threshold: "critical",
      enabled: false,
      created_at: new Date().toISOString()
    }
  ],
  integrations: [
    { provider: "github", status: "configured" }
  ],
  watchlists: [
    { keyword: "leakradar" },
    { keyword: "aws-credentials" }
  ],
  policies: [
    {
      id: "demo-policy-1",
      name: "Block Sensitive Filenames",
      enabled: true,
      rules: [
        { type: "filename", pattern: "(?i)(id_rsa|id_dsa|\.pem$|\.key$|secrets?\.yml)$", severity: "critical" }
      ],
      severity_map: { filename_sensitive: "critical" },
      allowlist: [{ path: "**/docs/**" }]
    },
    {
      id: "demo-policy-2",
      name: "Large File Guardrail",
      enabled: true,
      rules: [{ type: "size", max_bytes: 5242880, severity: "medium" }],
      severity_map: { oversized_file: "medium" },
      allowlist: [{ path: "**/*.png" }, { path: "**/*.jpg" }]
    },
    {
      id: "demo-policy-3",
      name: "Executable Format Restriction",
      enabled: true,
      rules: [{ type: "format", blocked_extensions: ["exe", "dll", "bin", "apk"], severity: "high" }],
      severity_map: { executable_format: "high" },
      allowlist: []
    },
    {
      id: "demo-policy-4",
      name: "Credit Card Number Detection",
      enabled: true,
      rules: [{ type: "content_regex", pattern: "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b", severity: "critical" }],
      severity_map: { credit_card: "critical" },
      allowlist: []
    },
    {
      id: "demo-policy-5",
      name: "API Key Pattern Detection",
      enabled: true,
      rules: [{ type: "secret", pattern: "api_key|x-api-key|sk_live|AKIA", severity: "critical" }],
      severity_map: { api_key: "critical" },
      allowlist: [{ path: "**/*.md" }]
    },
    {
      id: "demo-policy-6",
      name: "Private Key Material Detection",
      enabled: true,
      rules: [{ type: "content_regex", pattern: "-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----", severity: "critical" }],
      severity_map: { private_key: "critical" },
      allowlist: []
    },
    {
      id: "demo-policy-7",
      name: "Database Connection String Leak",
      enabled: true,
      rules: [{ type: "content_regex", pattern: "postgres(ql)?:\\/\\/[^\\s]+:[^\\s]+@", severity: "high" }],
      severity_map: { db_connection_secret: "high" },
      allowlist: []
    },
    {
      id: "demo-policy-8",
      name: "ENV File Exposure",
      enabled: true,
      rules: [{ type: "filename", pattern: "(?i)^(.*/)?\\.env(\\..+)?$", severity: "high" }],
      severity_map: { env_file: "high" },
      allowlist: [{ path: "**/.env.example" }]
    },
    {
      id: "demo-policy-9",
      name: "Token in URL Query",
      enabled: true,
      rules: [{ type: "content_regex", pattern: "[?&](token|access_token|auth)=", severity: "medium" }],
      severity_map: { token_in_url: "medium" },
      allowlist: []
    },
    {
      id: "demo-policy-10",
      name: "Suspicious Archive Upload",
      enabled: true,
      rules: [{ type: "format", blocked_extensions: ["zip", "7z", "rar"], severity: "low" }],
      severity_map: { archive_upload: "low" },
      allowlist: [{ path: "**/fixtures/**" }]
    },
    {
      id: "demo-policy-11",
      name: "High Entropy String Detection",
      enabled: true,
      rules: [{ type: "entropy", threshold: 4.5, min_length: 24, severity: "high" }],
      severity_map: { high_entropy_secret: "high" },
      allowlist: []
    },
    {
      id: "demo-policy-12",
      name: "Webhook URL Secret Exposure",
      enabled: true,
      rules: [{ type: "content_regex", pattern: "https://hooks\\.slack\\.com/services/", severity: "high" }],
      severity_map: { slack_webhook: "high" },
      allowlist: []
    }
  ],
  auditLogs: [
    {
      id: crypto.randomUUID(),
      user_id: "admin@demo.local",
      action: "INCIDENT_CREATED",
      resource_type: "incident",
      resource_id: "demo-incident-1",
      metadata: { severity: "critical", source: "github" },
      created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: "admin@demo.local",
      action: "POLICY_SYNCED",
      resource_type: "policy",
      resource_id: "demo-policy-1",
      metadata: { mode: "fallback" },
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: "system",
      action: "ALERT_DISPATCHED",
      resource_type: "alert",
      resource_id: "demo-alert-1",
      metadata: { channel: "slack", status: "sent" },
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
  ],
  incidents: [
    {
      id: "demo-incident-1",
      title: "AWS Access Key Exposed in payments-api config.ts",
      severity: "critical",
      status: "open",
      source: "github",
      source_url: "https://github.com/demo-org/payments-api",
      summary: "An active AWS Access Key (AKIA...) was detected in the commit history of the payments-api repository at src/config.ts.",
      notes: "Assigned to the platform team for rotation and session audit.",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
      candidates: [
        {
          file_path: "src/config.ts",
          masked_snippet: "export const config = { apiKey: \"AKIA0DEMO0LEAK0KEY0\" };",
          rule_id: "aws_key",
          confidence: 0.95,
          ml_label: "active_secret"
        }
      ],
      externalCandidates: []
    },
    {
      id: "demo-incident-2",
      title: "Leaked Database Password on Public Web Snippet",
      severity: "high",
      status: "open",
      source: "web",
      source_url: "https://gist.github.com/anonymous/8f4c28b9ae30",
      summary: "A database configuration URL containing a password matching our internal hostname patterns was discovered via an external search engine scan.",
      notes: "Verifying if this endpoint is exposed publicly or restricted to internal VPC.",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago (yesterday)
      candidates: [],
      externalCandidates: [
        {
          url: "https://gist.github.com/anonymous/8f4c28b9ae30",
          masked_snippet: "DATABASE_URL=postgresql://leakradar:****@db.leakradar.internal/prod",
          severity: "high"
        }
      ]
    },
    {
      id: "demo-incident-3",
      title: "GitHub PAT Leaked in auth-service application.yml",
      severity: "high",
      status: "open",
      source: "github",
      source_url: "https://github.com/demo-org/auth-service/blob/main/src/main/resources/application.yml",
      summary: "A GitHub Personal Access Token (ghp_...) was committed directly into the security identity parameters of the auth-service workspace.",
      notes: "Triggering automated token revocation via GitHub Checks.",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
      candidates: [
        {
          file_path: "src/main/resources/application.yml",
          masked_snippet: "github:\n  oauth:\n    token: \"ghp_ZDEMO0OAUTH0SECRET0KEY0TOKEN012345\"",
          rule_id: "github_pat",
          confidence: 0.92,
          ml_label: "active_secret"
        }
      ],
      externalCandidates: []
    },
    {
      id: "demo-incident-4",
      title: "Slack Webhook committed to payments-api deploy.sh",
      severity: "high",
      status: "resolved",
      source: "github",
      source_url: "https://github.com/demo-org/payments-api/blob/main/scripts/deploy.sh",
      summary: "An incoming Slack integration Webhook URL was accidentally left in a shell deployment script committed to main.",
      notes: "Slack URL was deactivated and rotated immediately. Closing incident.",
      created_at: new Date(Date.now() - 3600000 * 72).toISOString(), // 3 days ago
      candidates: [
        {
          file_path: "scripts/deploy.sh",
          masked_snippet: "curl -X POST -H 'Content-type: application/json' --data '{\"text\":\"Deploy successful\"}' https://hooks.slack.com/services/T0000/B0000/XXXX",
          rule_id: "slack_webhook",
          confidence: 0.99,
          ml_label: "revoked_secret"
        }
      ],
      externalCandidates: []
    },
    {
      id: "demo-incident-5",
      title: "Live Stripe API Secret Key Leaked on Pastebin",
      severity: "critical",
      status: "open",
      source: "web",
      source_url: "https://pastebin.com/raw/u9e7yHba",
      summary: "A live Stripe API Secret Key (sk_live...) matching our workspace patterns was found on a public paste-bin snippet by our Bright Data Serp monitor.",
      notes: "Escalated to Billing & Accounts team for Stripe Dashboard deactivation.",
      created_at: new Date(Date.now() - 3600000 * 96).toISOString(), // 4 days ago
      candidates: [],
      externalCandidates: [
        {
          url: "https://pastebin.com/raw/u9e7yHba",
          masked_snippet: "STRIPE_SECRET_KEY=sk_live_51N****CD",
          severity: "critical"
        }
      ]
    },
    {
      id: "demo-incident-6",
      title: "Google Maps API Key exposed in public Gist",
      severity: "medium",
      status: "false_positive",
      source: "web",
      source_url: "https://gist.github.com/anonymous/62aef91280fc",
      summary: "An API key resembling a Google Maps Javascript Client key was detected on a public Gist.",
      notes: "Confirmed to be a restricted, client-side only key with strictly bound HTTP referrer limits. Benign.",
      created_at: new Date(Date.now() - 3600000 * 120).toISOString(), // 5 days ago
      candidates: [],
      externalCandidates: [
        {
          url: "https://gist.github.com/anonymous/62aef91280fc",
          masked_snippet: "const gmapsKey = 'AIzaSyA****BC';",
          severity: "medium"
        }
      ]
    }
  ]
};

const app = Fastify({ logger: true });
await app.register(cors, { origin: true, credentials: true });

function authHook(requiredRole) {
  return async (request, reply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      request.user = {
        id: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        role: payload.role,
      };
      if (requiredRole && request.user.role !== requiredRole) {
        return reply.code(403).send({ error: "Forbidden" });
      }
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  };
}

async function proxyGet(url, user) {
  try {
    const res = await fetch(url, {
      headers: {
        "X-Tenant-Id": user.tenantId,
        "X-User-Id": user.id,
        "X-User-Role": user.role,
      },
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  } catch (error) {
    app.log.error({ error, url }, "Upstream service fetch failed");
    return { 
      status: 503, 
      body: { error: `Service at ${url} is currently offline. Connection refused.` } 
    };
  }
}

async function proxySend(url, user, method, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Id": user.tenantId,
        "X-User-Id": user.id,
        "X-User-Role": user.role,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return { status: 204, body: null };
    return { status: res.status, body: await res.json().catch(() => ({})) };
  } catch (error) {
    app.log.error({ error, url, method }, "Upstream write service failed");
    return { 
      status: 503, 
      body: { error: `Service at ${url} is currently offline. Connection refused.` } 
    };
  }
}

function listLocalIncidents(status) {
  if (!status || status === "all") return localDemoStore.incidents;
  return localDemoStore.incidents.filter((i) => i.status === status);
}

function isEmptyIncidentList(body) {
  return Array.isArray(body) && body.length === 0;
}

function statsHaveNoSignal(body) {
  if (!body || typeof body !== "object") return true;
  const severity = Array.isArray(body.bySeverity) ? body.bySeverity : [];
  const source = Array.isArray(body.bySource) ? body.bySource : [];
  const status = Array.isArray(body.byStatus) ? body.byStatus : [];

  const total = [...severity, ...source, ...status].reduce((sum, entry) => {
    const value = Number(entry?.count);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return total <= 0;
}

function buildLocalIncidentStats() {
  const byStatusMap = new Map();
  const bySeverityMap = new Map();
  const bySourceMap = new Map();
  for (const i of localDemoStore.incidents) {
    byStatusMap.set(i.status, (byStatusMap.get(i.status) || 0) + 1);
    bySeverityMap.set(i.severity, (bySeverityMap.get(i.severity) || 0) + 1);
    bySourceMap.set(i.source, (bySourceMap.get(i.source) || 0) + 1);
  }
  return {
    byStatus: [...byStatusMap.entries()].map(([status, count]) => ({ status, count: String(count) })),
    bySeverity: [...bySeverityMap.entries()].map(([severity, count]) => ({ severity, count: String(count) })),
    bySource: [...bySourceMap.entries()].map(([source, count]) => ({ source, count: String(count) })),
    coverage: [
      {
        repo_id: "demo-org/payments-api",
        files_scanned: 184,
        files_skipped: 7,
      },
    ],
  };
}

function addAuditLog(entry) {
  localDemoStore.auditLogs.unshift({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    metadata: {},
    user_id: "system",
    resource_type: null,
    resource_id: null,
    ...entry,
  });
  localDemoStore.auditLogs = localDemoStore.auditLogs.slice(0, 200);
}

app.post("/api/auth/login", async (request, reply) => {
  const body = request.body || {};
  try {
    const res = await fetch(`${ORG_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let respBody;
    try {
      respBody = text ? JSON.parse(text) : {};
    } catch {
      respBody = res.ok ? {} : { error: text || `Auth service returned ${res.status}` };
    }
    return reply.code(res.status).send(respBody);
  } catch (error) {
    request.log.error({ error }, "Auth login proxy failed");
    return reply.code(503).send({ error: "Auth service is currently offline" });
  }
});

app.get("/api/auth/me", { preHandler: authHook() }, async (request, reply) => {
  return reply.send(request.user);
});

app.get("/api/incidents", { preHandler: authHook() }, async (request, reply) => {
  const status = request.query.status || "open";
  try {
    const { status: code, body } = await proxyGet(
      `${DLP_URL}/api/incidents?status=${status}`,
      request.user
    );
    if (code >= 500 || isEmptyIncidentList(body)) {
      request.log.warn({ code, body }, "DLP incidents failed, using local demo incidents");
      return reply.send(listLocalIncidents(status));
    }
    return reply.code(code).send(body);
  } catch (error) {
    request.log.warn({ error }, "DLP service unavailable, returning empty incident list");
    return reply.send(listLocalIncidents(status));
  }
});

app.get("/api/incidents/stats", { preHandler: authHook("admin") }, async (request, reply) => {
  try {
    const { status: code, body } = await proxyGet(`${DLP_URL}/api/incidents/stats`, request.user);
    if (code >= 500 || statsHaveNoSignal(body)) {
      request.log.warn({ code, body }, "DLP stats failed, using local demo stats");
      return reply.send(buildLocalIncidentStats());
    }
    return reply.code(code).send(body);
  } catch (error) {
    request.log.warn({ error }, "DLP service unavailable, returning empty stats");
    return reply.send(buildLocalIncidentStats());
  }
});

app.get("/api/incidents/:id", { preHandler: authHook() }, async (request, reply) => {
  const { status: code, body } = await proxyGet(
    `${DLP_URL}/api/incidents/${request.params.id}`,
    request.user
  );
  if (code >= 500 || code === 404) {
    const found = localDemoStore.incidents.find((i) => i.id === request.params.id);
    if (found) return reply.send(found);
  }
  return reply.code(code).send(body);
});

app.patch("/api/incidents/:id", { preHandler: authHook() }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${DLP_URL}/api/incidents/${request.params.id}`,
    request.user,
    "PATCH",
    request.body
  );
  if (code >= 500 || code === 404) {
    const idx = localDemoStore.incidents.findIndex((i) => i.id === request.params.id);
    if (idx >= 0) {
      const updates = request.body || {};
      localDemoStore.incidents[idx] = {
        ...localDemoStore.incidents[idx],
        ...(typeof updates === "object" ? updates : {}),
      };
      return reply.send(localDemoStore.incidents[idx]);
    }
  }
  if (code === 204) return reply.code(204).send();
  return reply.code(code).send(body);
});

app.get("/api/policies", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(`${DLP_URL}/api/policies`, request.user);
  if (code >= 500 || code === 404) {
    return reply.send(localDemoStore.policies);
  }
  return reply.code(code).send(body);
});

app.post("/api/policies", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${DLP_URL}/api/policies`,
    request.user,
    "POST",
    request.body
  );
  if (code >= 500 || code === 404) {
    const next = {
      id: `demo-policy-${Date.now()}`,
      ...(request.body || {}),
    };
    localDemoStore.policies.unshift(next);
    addAuditLog({
      user_id: request.user.email,
      action: "POLICY_CREATED",
      resource_type: "policy",
      resource_id: next.id,
      metadata: { name: next.name },
    });
    return reply.code(201).send(next);
  }
  if (code === 204) return reply.code(204).send();
  return reply.code(code).send(body);
});

app.put("/api/policies/:id", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${DLP_URL}/api/policies/${request.params.id}`,
    request.user,
    "PUT",
    request.body
  );
  if (code >= 500 || code === 404) {
    const idx = localDemoStore.policies.findIndex((p) => p.id === request.params.id);
    if (idx >= 0) {
      localDemoStore.policies[idx] = {
        ...localDemoStore.policies[idx],
        ...(request.body || {}),
      };
      addAuditLog({
        user_id: request.user.email,
        action: "POLICY_UPDATED",
        resource_type: "policy",
        resource_id: request.params.id,
      });
      return reply.send(localDemoStore.policies[idx]);
    }
  }
  return reply.code(code).send(body);
});

app.delete("/api/policies/:id", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${DLP_URL}/api/policies/${request.params.id}`,
    request.user,
    "DELETE"
  );
  if (code >= 500 || code === 404) {
    const before = localDemoStore.policies.length;
    localDemoStore.policies = localDemoStore.policies.filter((policy) => policy.id !== request.params.id);
    if (before !== localDemoStore.policies.length) {
      addAuditLog({
        user_id: request.user.email,
        action: "POLICY_DELETED",
        resource_type: "policy",
        resource_id: request.params.id,
      });
    }
    return reply.code(204).send();
  }
  if (code === 204) return reply.code(204).send();
  return reply.code(code).send(body);
});

app.get("/api/alert-routes", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(`${ORG_URL}/api/alert-routes`, request.user);
  if (code >= 500 || code === 404 || !Array.isArray(body)) {
    return reply.send(localDemoStore.alertRoutes);
  }
  return reply.code(code).send(body);
});

app.post("/api/alert-routes", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${ORG_URL}/api/alert-routes`,
    request.user,
    "POST",
    request.body
  );
  if (code >= 500 || code === 404) {
    const payload = request.body || {};
    let parsedConfig = payload.configJson || payload.config || "{}";
    if (typeof parsedConfig === "string") {
      try {
        parsedConfig = JSON.parse(parsedConfig);
      } catch {
        parsedConfig = {};
      }
    }
    const route = {
      id: `demo-route-${Date.now()}`,
      name: payload.name || "Untitled route",
      channel_type: payload.channelType || payload.channel_type || "in_app",
      config: parsedConfig,
      severity_threshold: payload.severityThreshold || payload.severity_threshold || "medium",
      enabled: payload.enabled !== false,
      created_at: new Date().toISOString(),
    };
    localDemoStore.alertRoutes.unshift(route);
    addAuditLog({
      user_id: request.user.email,
      action: "ALERT_ROUTE_CREATED",
      resource_type: "alert_route",
      resource_id: route.id,
      metadata: { channel: route.channel_type },
    });
    return reply.code(201).send(route);
  }
  return reply.code(code).send(body);
});

app.put("/api/alert-routes/:id", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${ORG_URL}/api/alert-routes/${request.params.id}`,
    request.user,
    "PUT",
    request.body
  );
  if (code >= 500 || code === 404) {
    const idx = localDemoStore.alertRoutes.findIndex((r) => r.id === request.params.id);
    if (idx >= 0) {
      const payload = request.body || {};
      let parsedConfig = payload.configJson || payload.config || localDemoStore.alertRoutes[idx].config || {};
      if (typeof parsedConfig === "string") {
        try {
          parsedConfig = JSON.parse(parsedConfig);
        } catch {
          parsedConfig = localDemoStore.alertRoutes[idx].config || {};
        }
      }
      localDemoStore.alertRoutes[idx] = {
        ...localDemoStore.alertRoutes[idx],
        name: payload.name ?? localDemoStore.alertRoutes[idx].name,
        channel_type: payload.channelType ?? payload.channel_type ?? localDemoStore.alertRoutes[idx].channel_type,
        config: parsedConfig,
        severity_threshold: payload.severityThreshold ?? payload.severity_threshold ?? localDemoStore.alertRoutes[idx].severity_threshold,
        enabled: payload.enabled ?? localDemoStore.alertRoutes[idx].enabled,
      };
      addAuditLog({
        user_id: request.user.email,
        action: "ALERT_ROUTE_UPDATED",
        resource_type: "alert_route",
        resource_id: request.params.id,
      });
      return reply.send(localDemoStore.alertRoutes[idx]);
    }
  }
  return reply.code(code).send(body);
});

app.delete("/api/alert-routes/:id", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${ORG_URL}/api/alert-routes/${request.params.id}`,
    request.user,
    "DELETE"
  );
  if (code >= 500 || code === 404) {
    const before = localDemoStore.alertRoutes.length;
    localDemoStore.alertRoutes = localDemoStore.alertRoutes.filter((r) => r.id !== request.params.id);
    if (before !== localDemoStore.alertRoutes.length) {
      addAuditLog({
        user_id: request.user.email,
        action: "ALERT_ROUTE_DELETED",
        resource_type: "alert_route",
        resource_id: request.params.id,
      });
    }
    return reply.code(204).send();
  }
  return reply.code(code).send(body);
});

app.get("/api/integrations", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(`${ORG_URL}/api/integrations`, request.user);
  return reply.code(code).send(body);
});

app.post("/api/integrations", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${ORG_URL}/api/integrations`,
    request.user,
    "POST",
    request.body
  );
  return reply.code(code).send(body);
});

app.get("/api/integrations/bright-data", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(
    `${ORG_URL}/api/integrations/bright-data`,
    request.user
  );
  return reply.code(code).send(body);
});

app.put("/api/integrations/bright-data", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${ORG_URL}/api/integrations/bright-data`,
    request.user,
    "PUT",
    request.body
  );
  return reply.code(code).send(body);
});

app.get("/api/watchlists", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(
    `${ORG_URL}/api/integrations/watchlists`,
    request.user
  );
  return reply.code(code).send(body);
});

app.post("/api/watchlists", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${ORG_URL}/api/integrations/watchlists`,
    request.user,
    "POST",
    request.body
  );
  return reply.code(code).send(body);
});

app.post("/api/test/ingest", { preHandler: authHook() }, async (request, reply) => {
  const res = await fetch(`${INGESTOR_URL}/api/test/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.body),
  });
  return reply.code(res.status).send(await res.json());
});

app.post("/api/test/demo-leak", { preHandler: authHook() }, async (request, reply) => {
  const event = {
    eventId: crypto.randomUUID(),
    tenantId: request.user.tenantId,
    repoId: "00000000-0000-0000-0000-000000000020",
    repoFullName: "demo-org/payments-api",
    eventType: "push",
    branch: "main",
    commitSha: crypto.randomUUID().slice(0, 7),
    author: request.user.email,
    commitMessage: "Demo leak injection",
    timestamp: new Date().toISOString(),
    files: [
      {
        path: "src/config.ts",
        content: 'export const config = { apiKey: "AKIA0DEMO0LEAK0KEY0" };\n',
        changeType: "modified",
      },
    ],
  };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(`${INGESTOR_URL}/api/test/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const body = await res.json().catch(() => ({}));
    if (res.status >= 500) {
      throw new Error("Ingestor returned server error");
    }
    addAuditLog({
      user_id: request.user.email,
      action: "DEMO_LEAK_TRIGGERED",
      resource_type: "incident",
      resource_id: event.eventId,
      metadata: { mode: "upstream" },
    });
    return reply.code(res.status).send(body);
  } catch (error) {
    request.log.warn({ error }, "Ingest service unavailable, accepting demo leak locally");
    const now = new Date().toISOString();
    const localIncident = {
      id: `demo-incident-${Date.now()}`,
      title: "Demo leak injected from UI",
      severity: "critical",
      status: "open",
      source: "github",
      source_url: "https://github.com/demo-org/payments-api/blob/main/src/config.ts",
      summary: "UI demo leak fallback created because upstream ingest service is unavailable.",
      notes: "Generated by BFF fallback path.",
      created_at: now,
      candidates: [
        {
          file_path: "src/config.ts",
          masked_snippet: 'export const config = { apiKey: "AKIA0DEMO0LEAK0KEY0" };',
          rule_id: "aws_key",
          confidence: 0.95,
          ml_label: "active_secret",
        },
      ],
      externalCandidates: [],
    };
    localDemoStore.incidents.unshift(localIncident);
    addAuditLog({
      user_id: request.user.email,
      action: "DEMO_LEAK_TRIGGERED",
      resource_type: "incident",
      resource_id: localIncident.id,
      metadata: { mode: "fallback", severity: localIncident.severity },
    });
    if (ALERT_DEFAULT_SLACK_WEBHOOK) {
      try {
        await fetch(ALERT_DEFAULT_SLACK_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `Leak Ranger Alert: CRITICAL - ${localIncident.title}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `:rotating_light: *Leak Ranger Alert*\\n*Severity:* CRITICAL\\n*Title:* ${localIncident.title}\\n*Source:* ${localIncident.source}`,
                },
              },
            ],
          }),
        });
      } catch (notifyError) {
        request.log.warn({ notifyError }, "Failed to send fallback Slack notification");
      }
    }
    return reply.code(202).send({ ok: true, demo: true, incident: localIncident });
  }
});

app.get("/api/audit", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(`${ORG_URL}/api/audit`, request.user);
  if (code >= 500 || code === 404 || !Array.isArray(body)) {
    return reply.send(localDemoStore.auditLogs);
  }
  if (Array.isArray(body) && body.length === 0 && localDemoStore.auditLogs.length > 0) {
    return reply.send(localDemoStore.auditLogs);
  }
  return reply.code(code).send(body);
});

app.post("/api/pipeline/events", { preHandler: authHook("admin") }, async (request, reply) => {
  const res = await fetch(`${INGESTOR_URL}/api/pipeline/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.body),
  });
  return reply.code(res.status).send(await res.json());
});

app.post("/webhooks/github", async (request, reply) => {
  const res = await fetch(`${INGESTOR_URL}/webhooks/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": request.headers["x-github-event"] || "",
      "X-Hub-Signature-256": request.headers["x-hub-signature-256"] || "",
    },
    body: JSON.stringify(request.body),
  });
  return reply.code(res.status).send();
});

app.get("/api/events/stream", { preHandler: authHook() }, async (request, reply) => {
  const tenantId = request.user.tenantId;
  const upstream = await fetch(`${ALERT_URL}/sse/${tenantId}`);
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    reply.raw.write(decoder.decode(value));
  }
});

const port = Number(process.env.PORT || 4000);
await app.listen({ port, host: "0.0.0.0" });
