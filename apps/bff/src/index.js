import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "jsonwebtoken";

const ORG_URL = process.env.ORG_URL || "http://localhost:8081";
const DLP_URL = process.env.DLP_URL || "http://localhost:8083";
const INGESTOR_URL = process.env.INGESTOR_URL || "http://localhost:8082";
const JWT_SECRET =
  process.env.JWT_SECRET || "leak-radar-dev-secret-change-in-production-min-32-chars";
const ALERT_URL = process.env.ALERT_URL || "http://localhost:8085";

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
  const res = await fetch(url, {
    headers: {
      "X-Tenant-Id": user.tenantId,
      "X-User-Id": user.id,
      "X-User-Role": user.role,
    },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function proxySend(url, user, method, body) {
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
}

app.post("/api/auth/login", async (request, reply) => {
  const res = await fetch(`${ORG_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.body),
  });
  const body = await res.json();
  return reply.code(res.status).send(body);
});

app.get("/api/auth/me", { preHandler: authHook() }, async (request, reply) => {
  return reply.send(request.user);
});

app.get("/api/incidents", { preHandler: authHook() }, async (request, reply) => {
  const status = request.query.status || "open";
  const { status: code, body } = await proxyGet(
    `${DLP_URL}/api/incidents?status=${status}`,
    request.user
  );
  return reply.code(code).send(body);
});

app.get("/api/incidents/stats", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(`${DLP_URL}/api/incidents/stats`, request.user);
  return reply.code(code).send(body);
});

app.get("/api/incidents/:id", { preHandler: authHook() }, async (request, reply) => {
  const { status: code, body } = await proxyGet(
    `${DLP_URL}/api/incidents/${request.params.id}`,
    request.user
  );
  return reply.code(code).send(body);
});

app.patch("/api/incidents/:id", { preHandler: authHook() }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${DLP_URL}/api/incidents/${request.params.id}`,
    request.user,
    "PATCH",
    request.body
  );
  if (code === 204) return reply.code(204).send();
  return reply.code(code).send(body);
});

app.get("/api/policies", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(`${DLP_URL}/api/policies`, request.user);
  return reply.code(code).send(body);
});

app.put("/api/policies/:id", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxySend(
    `${DLP_URL}/api/policies/${request.params.id}`,
    request.user,
    "PUT",
    request.body
  );
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
  const res = await fetch(`${INGESTOR_URL}/api/test/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return reply.code(res.status).send(await res.json());
});

app.get("/api/audit", { preHandler: authHook("admin") }, async (request, reply) => {
  const { status: code, body } = await proxyGet(`${ORG_URL}/api/audit`, request.user);
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
