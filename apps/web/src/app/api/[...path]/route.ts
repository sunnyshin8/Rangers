import { NextRequest, NextResponse } from "next/server";

type Incident = {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "resolved" | "false_positive";
  source: string;
  created_at: string;
  source_url?: string;
  notes?: string;
  summary?: string;
  candidates?: Array<{
    masked_snippet: string;
    file_path: string;
    rule_id: string;
    confidence: number;
    ml_label?: string;
    source_url?: string;
    evidence_key?: string;
    patch?: string;
  }>;
  externalCandidates?: Array<{
    url: string;
    masked_snippet: string;
    severity: string;
    evidence_key?: string;
  }>;
};

const now = new Date();
const demoIncidents: Incident[] = [
  {
    id: "inc-demo-1",
    title: "Leaked AWS access key found in pasted snippet",
    severity: "critical",
    status: "open",
    source: "web",
    created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    source_url: "https://example.com/paste/123",
    summary: "An AWS-like key pattern was detected in an externally indexed snippet.",
    notes: "Rotate exposed key and verify IAM policy scope.",
    candidates: [
      {
        masked_snippet: "AK****YZ",
        file_path: "external/paste.txt",
        rule_id: "aws_key",
        confidence: 0.92,
        ml_label: "likely_secret",
        evidence_key: "ev-demo-aws-1",
      },
    ],
    externalCandidates: [
      {
        url: "https://example.com/paste/123",
        masked_snippet: "AK****YZ",
        severity: "critical",
        evidence_key: "ev-demo-aws-1",
      },
    ],
  },
  {
    id: "inc-demo-2",
    title: "GitHub PAT-like token in commit diff",
    severity: "high",
    status: "open",
    source: "github",
    created_at: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
    source_url: "https://github.com/example/repo/commit/abc123",
    summary: "Token-shaped string detected in modified config file.",
    notes: "Revoke token and remove from git history if needed.",
    candidates: [
      {
        masked_snippet: "gh****9x",
        file_path: "apps/bff/.env",
        rule_id: "github_pat",
        confidence: 0.86,
        ml_label: "likely_secret",
        evidence_key: "ev-demo-gh-2",
      },
    ],
    externalCandidates: [],
  },
];

function byStatus(status: string | null): Incident[] {
  if (!status || status === "all") return demoIncidents;
  return demoIncidents.filter((i) => i.status === status);
}

function statsPayload() {
  const bySeverity = new Map<string, number>();
  const byStatusMap = new Map<string, number>();
  const bySource = new Map<string, number>();

  for (const i of demoIncidents) {
    bySeverity.set(i.severity, (bySeverity.get(i.severity) || 0) + 1);
    byStatusMap.set(i.status, (byStatusMap.get(i.status) || 0) + 1);
    bySource.set(i.source, (bySource.get(i.source) || 0) + 1);
  }

  return {
    bySeverity: Array.from(bySeverity.entries()).map(([severity, count]) => ({ severity, count: String(count) })),
    byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count: String(count) })),
    bySource: Array.from(bySource.entries()).map(([source, count]) => ({ source, count: String(count) })),
    coverage: [],
  };
}

function compliancePayload() {
  return {
    regulatorySignals: [
      {
        id: "reg-1",
        category: "security",
        title: "Credential handling policy refresh",
        status: "active",
        impact: "medium",
        summary: "Updated internal guidance for token storage and rotation.",
        action: "Review policy mappings for API keys and PATs.",
      },
    ],
    vendorRisk: [
      {
        vendor: "GitHub",
        score: 81,
        posture: "monitoring",
        rationale: "Public repo activity is healthy but token hygiene should be enforced.",
        source: "Demo signal",
      },
    ],
    watchlistSignals: [
      {
        keyword: "leak-radar",
        severity: "low",
        status: "monitoring",
        reason: "Keyword appeared in non-sensitive public context.",
      },
    ],
    evidenceSnapshots: [
      {
        id: "ev-demo-aws-1",
        title: "External snippet evidence",
        source: "web",
        source_url: "https://example.com/paste/123",
        created_at: new Date().toISOString(),
        evidence: [
          {
            file_path: "external/paste.txt",
            snippet: "AK****YZ",
          },
        ],
      },
    ],
    sourceCoverage: [
      { source: "GitHub", status: "Active", coverage: "Webhook + polling" },
      { source: "External Web", status: "Monitoring", coverage: "SERP + page snapshots" },
    ],
  };
}

function readPath(req: NextRequest): string[] {
  const pathname = req.nextUrl.pathname;
  const prefix = "/api/";
  if (!pathname.startsWith(prefix)) return [];
  return pathname.slice(prefix.length).split("/").filter(Boolean);
}

export async function GET(req: NextRequest) {
  const path = readPath(req);

  if (path[0] === "incidents" && path[1] === "stats") {
    return NextResponse.json(statsPayload());
  }

  if (path[0] === "incidents" && path.length === 1) {
    const status = req.nextUrl.searchParams.get("status");
    return NextResponse.json(byStatus(status));
  }

  if (path[0] === "incidents" && path[1]) {
    const incident = demoIncidents.find((i) => i.id === path[1]) || demoIncidents[0];
    return NextResponse.json(incident);
  }

  if (path[0] === "integrations") {
    return NextResponse.json([
      { provider: "github", status: "demo-connected" },
      { provider: "bright-data", status: "demo-connected" },
    ]);
  }

  if (path[0] === "watchlists") {
    return NextResponse.json([{ keyword: "leak-radar" }, { keyword: "internal.company.local" }]);
  }

  if (path[0] === "alert-routes") {
    return NextResponse.json([]);
  }

  if (path[0] === "audit") {
    return NextResponse.json([
      {
        id: "audit-1",
        user_id: "demo-admin",
        action: "policy.updated",
        resource_type: "policy",
        resource_id: "demo-policy-1",
        metadata: { mode: "demo" },
        created_at: new Date().toISOString(),
      },
    ]);
  }

  if (path[0] === "compliance") {
    return NextResponse.json(compliancePayload());
  }

  if (path[0] === "policies") {
    return NextResponse.json([]);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest) {
  const path = readPath(req);

  if (path[0] === "auth" && path[1] === "login") {
    let email = "user@demo.local";
    try {
      const body = await req.json();
      if (body?.email) email = String(body.email);
    } catch {}
    const role = email.toLowerCase().includes("admin") ? "admin" : "user";
    return NextResponse.json({ token: "demo-token", user: { role } });
  }

  if (path[0] === "test" && path[1] === "demo-leak") {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  if (
    path[0] === "integrations" ||
    path[0] === "watchlists" ||
    path[0] === "alert-routes" ||
    path[0] === "policies"
  ) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ ok: true, mode: "demo" });
}

export async function PATCH(req: NextRequest) {
  const path = readPath(req);
  if (path[0] === "incidents" && path[1]) {
    const base = demoIncidents.find((i) => i.id === path[1]) || demoIncidents[0];
    let status = base.status;
    let notes = base.notes || "";
    try {
      const body = await req.json();
      if (body?.status) status = body.status;
      if (typeof body?.notes === "string") notes = body.notes;
    } catch {}
    return NextResponse.json({ ...base, status, notes });
  }
  return NextResponse.json({ ok: true, mode: "demo" });
}

export async function DELETE() {
  return NextResponse.json({ ok: true, mode: "demo" });
}
