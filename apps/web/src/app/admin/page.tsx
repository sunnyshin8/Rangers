"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type Stats = {
  byStatus: Array<{ status: string; count: string }>;
  bySeverity: Array<{ severity: string; count: string }>;
  bySource: Array<{ source: string; count: string }>;
  coverage: Array<{ repo_id: string; files_scanned: number; files_skipped: number }>;
};

type IncidentSummary = {
  id: string;
  title: string;
  severity: string;
  status: string;
  source: string;
  created_at: string;
};

const SEVERITY_LEVELS = ["critical", "high", "medium", "low"];
const LABEL_OPTIONS = ["Unlabeled", "Needs Review", "Escalated", "Monitoring", "False Positive"];
const SEVERITY_COLORS: Record<string, string> = {
  critical: "#d92d20",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#2563eb",
};

function toCountMap(items: Array<{ key: string; count: number }>) {
  const map: Record<string, number> = {};
  for (const item of items) map[item.key] = item.count;
  return map;
}

function getWindowCounts(incidents: IncidentSummary[]) {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * dayMs;
  const monthAgo = now - 30 * dayMs;

  let today = 0;
  let week = 0;
  let month = 0;
  for (const incident of incidents) {
    const ts = new Date(incident.created_at).getTime();
    if (Number.isNaN(ts)) continue;
    if (ts >= startOfToday.getTime()) today += 1;
    if (ts >= weekAgo) week += 1;
    if (ts >= monthAgo) month += 1;
  }

  return {
    total: incidents.length,
    today,
    week,
    month,
  };
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function buildSeveritySegments(severityCounts: Record<string, number>) {
  const entries = SEVERITY_LEVELS.map((severity) => ({
    severity,
    count: severityCounts[severity] || 0,
    color: SEVERITY_COLORS[severity],
  })).filter((entry) => entry.count > 0);

  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  let cursor = 0;

  return {
    total,
    segments: entries.map((entry) => {
      const percent = total > 0 ? (entry.count / total) * 100 : 0;
      const start = cursor;
      cursor += percent;
      return {
        ...entry,
        percent,
        start,
      };
    }),
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [incidentLabels, setIncidentLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const raw = localStorage.getItem("incidentLabels");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      setIncidentLabels(parsed);
    } catch {
      setIncidentLabels({});
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.allSettled([
      api<Stats>("/incidents/stats"),
      api<IncidentSummary[]>("/incidents?status=all"),
    ])
      .then(([statsResult, incidentsResult]) => {
        const errs: string[] = [];

        if (statsResult.status === "fulfilled") {
          setStats(statsResult.value);
        } else {
          setStats(null);
          errs.push("metrics");
        }

        if (incidentsResult.status === "fulfilled") {
          setIncidents(incidentsResult.value);
        } else {
          setIncidents([]);
          errs.push("incident feed");
        }

        if (errs.length) {
          setError(`Unable to fully load: ${errs.join(" and ")}.`);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function setLabel(incidentId: string, label: string) {
    const next = {
      ...incidentLabels,
      [incidentId]: label,
    };
    setIncidentLabels(next);
    localStorage.setItem("incidentLabels", JSON.stringify(next));
  }

  const severityFromStats = toCountMap(
    (stats?.bySeverity || []).map((s) => ({ key: s.severity.toLowerCase(), count: Number(s.count) || 0 }))
  );
  const severityFromIncidents = toCountMap(
    incidents.reduce<Array<{ key: string; count: number }>>((acc, incident) => {
      const key = incident.severity.toLowerCase();
      const existing = acc.find((x) => x.key === key);
      if (existing) existing.count += 1;
      else acc.push({ key, count: 1 });
      return acc;
    }, [])
  );

  const severityCounts: Record<string, number> = {};
  for (const severity of SEVERITY_LEVELS) {
    severityCounts[severity] =
      (severityFromStats[severity] || 0) > 0 ? severityFromStats[severity] || 0 : severityFromIncidents[severity] || 0;
  }

  const windows = getWindowCounts(incidents);
  const statusCounts = (stats?.byStatus || []).reduce<Record<string, number>>((acc, item) => {
    acc[item.status.toLowerCase()] = Number(item.count) || 0;
    return acc;
  }, {});
  const resolvedCount = statusCounts.resolved || 0;
  const openCount = statusCounts.open || 0;
  const falsePositiveCount = statusCounts.false_positive || 0;
  const labeledCount = incidents.filter((incident) => (incidentLabels[incident.id] || "Unlabeled") !== "Unlabeled").length;
  const severityPie = buildSeveritySegments(severityCounts);
  const filteredIncidents = incidents
    .filter((incident) => severityFilter === "all" || incident.severity.toLowerCase() === severityFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12);

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.875rem" }}>
              Monitor total fetched volume, severity distribution, and incident labels.
            </p>
          </div>
          <div style={{ minWidth: 220 }}>
            <label style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Severity Label Filter
            </label>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="all">All Labels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        {loading && <p style={{ margin: "0 0 1rem 0" }}>Loading dashboard metrics...</p>}
        {error && <p style={{ color: "var(--critical)", margin: "0 0 1rem 0" }}>{error}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
          <div className="card" style={{ background: "linear-gradient(145deg, #f0f8ff, #ffffff)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Total Fetched</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{windows.total}</div>
          </div>
          <div className="card" style={{ background: "linear-gradient(145deg, #f7fff3, #ffffff)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Today</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{windows.today}</div>
          </div>
          <div className="card" style={{ background: "linear-gradient(145deg, #fff9f2, #ffffff)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>This Week</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{windows.week}</div>
          </div>
          <div className="card" style={{ background: "linear-gradient(145deg, #fff4fa, #ffffff)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Last 30 Days</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{windows.month}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
          <div className="card" style={{ background: "linear-gradient(145deg, #fff, #f7fbff)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Open Incidents</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{openCount}</div>
          </div>
          <div className="card" style={{ background: "linear-gradient(145deg, #fff, #f4fff8)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Resolved</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{resolvedCount}</div>
          </div>
          <div className="card" style={{ background: "linear-gradient(145deg, #fff, #fff7f4)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>False Positive</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{falsePositiveCount}</div>
          </div>
          <div className="card" style={{ background: "linear-gradient(145deg, #fff, #faf5ff)" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>Labeled</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{labeledCount}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="card" style={{ padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Severity Labels</h3>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{severityPie.total} total</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.6rem" }}>
              {SEVERITY_LEVELS.map((severity) => (
                <div key={severity} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.65rem", background: "#fff" }}>
                  <div className={`badge badge-${severity}`} style={{ marginBottom: "0.5rem" }}>{severity}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{severityCounts[severity] || 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "1rem 1.1rem" }}>
            <h3 style={{ margin: "0 0 0.75rem 0" }}>By Source</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
              {(stats?.bySource || []).map((source) => (
                <span key={source.source} style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "0.3rem 0.6rem", fontSize: "0.85rem", background: "#fff" }}>
                  {source.source}: <strong>{source.count}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Severity Mix</h3>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>share by percent</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "flex-start" }}>
                {severityPie.segments.map((segment) => (
                  <div key={segment.severity} style={{ display: "flex", alignItems: "center", gap: "0.45rem", border: "1px solid var(--border)", borderRadius: 999, padding: "0.35rem 0.65rem", background: "#fff" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: segment.color, display: "inline-block" }} />
                    <strong style={{ textTransform: "capitalize" }}>{segment.severity}</strong>
                    <span style={{ color: "var(--muted)" }}>{formatPercent(segment.percent)}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  margin: "0 auto",
                  background:
                    severityPie.total > 0
                      ? `conic-gradient(${severityPie.segments
                          .map((segment) => `${segment.color} ${segment.start}% ${segment.start + segment.percent}%`)
                          .join(", ")})`
                      : "#edf2f7",
                  border: "10px solid rgba(255,255,255,0.85)",
                  boxShadow: "inset 0 0 0 1px var(--border)",
                }}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: "1rem" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Recent Fetched Incidents</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Label option enabled per incident
            </span>
          </div>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: "1.25rem" }}>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Fetched At</th>
                <th>Label</th>
                <th style={{ paddingRight: "1.25rem" }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td style={{ paddingLeft: "1.25rem" }} colSpan={6}>No incidents available for this filter.</td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => (
                  <tr key={incident.id}>
                    <td style={{ paddingLeft: "1.25rem", maxWidth: 360 }}>{incident.title}</td>
                    <td>
                      <span className={`badge badge-${incident.severity.toLowerCase()}`}>{incident.severity}</span>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{incident.status.replace("_", " ")}</td>
                    <td>{new Date(incident.created_at).toLocaleString()}</td>
                    <td style={{ minWidth: 170 }}>
                      <select
                        value={incidentLabels[incident.id] || "Unlabeled"}
                        onChange={(e) => setLabel(incident.id, e.target.value)}
                      >
                        {LABEL_OPTIONS.map((label) => (
                          <option key={label} value={label}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ paddingRight: "1.25rem", textTransform: "uppercase" }}>{incident.source}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {stats?.coverage && stats.coverage.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0 }}>Scanner Coverage</h3>
            </div>
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1.25rem" }}>Repository Name</th>
                  <th>Files Scanned</th>
                  <th style={{ paddingRight: "1.25rem" }}>Files Skipped</th>
                </tr>
              </thead>
              <tbody>
                {stats.coverage.map((c) => (
                  <tr key={c.repo_id}>
                    <td style={{ paddingLeft: "1.25rem", fontWeight: 600 }}>{c.repo_id}</td>
                    <td>
                      <span style={{ background: "#e6f4ea", color: "#137333", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600 }}>
                        {c.files_scanned} files
                      </span>
                    </td>
                    <td style={{ paddingRight: "1.25rem" }}>
                      <span style={{ color: c.files_skipped > 0 ? "var(--medium)" : "var(--muted)", fontSize: "0.85rem" }}>
                        {c.files_skipped} skipped
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
