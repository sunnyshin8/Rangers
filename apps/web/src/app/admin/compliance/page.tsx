"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type ComplianceFeed = {
  regulatorySignals: Array<{
    id: string;
    category: string;
    title: string;
    status: string;
    impact: string;
    summary: string;
    action: string;
  }>;
  vendorRisk: Array<{
    vendor: string;
    score: number;
    posture: string;
    rationale: string;
    source: string;
  }>;
  watchlistSignals: Array<{
    keyword: string;
    severity: string;
    status: string;
    reason: string;
  }>;
  evidenceSnapshots: Array<{
    id: string;
    title: string;
    source: string;
    source_url?: string;
    created_at: string;
    evidence: Array<{
      file_path: string;
      snippet: string;
    }>;
  }>;
  sourceCoverage: Array<{
    source: string;
    status: string;
    coverage: string;
  }>;
};

const severityColor: Record<string, string> = {
  high: "var(--critical)",
  medium: "var(--high)",
  low: "var(--low)",
  active: "var(--accent)",
  review: "var(--medium)",
  monitoring: "var(--accent)",
};

export default function CompliancePage() {
  const [feed, setFeed] = useState<ComplianceFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api<ComplianceFeed>("/compliance")
      .then(setFeed)
      .catch((err) => {
        setFeed(null);
        setError(err instanceof Error ? err.message : "Unable to load compliance feed");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "1.5rem" }}>
        <div
          className="card"
          style={{
            marginBottom: "1rem",
            background: "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(247,250,255,0.8))",
            backdropFilter: "blur(14px)",
          }}
        >
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700 }}>
            Compliance monitoring
          </div>
          <h1 style={{ marginBottom: "0.35rem" }}>Security & Compliance signals</h1>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            A single view for regulatory changes, vendor exposure, watchlist coverage, and evidence snapshots.
          </p>
        </div>

        {loading && <p style={{ margin: "0 0 1rem 0" }}>Loading compliance signals...</p>}
        {error && <p style={{ color: "var(--critical)", margin: "0 0 1rem 0" }}>{error}</p>}

        {feed && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              {feed.sourceCoverage.map((item) => (
                <div key={item.source} className="card" style={{ background: "rgba(255,255,255,0.8)" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>{item.source}</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.25rem" }}>{item.status}</div>
                  <p style={{ marginBottom: 0, color: "var(--muted)" }}>{item.coverage}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="card" style={{ padding: "1rem 1.1rem" }}>
                <h3 style={{ marginTop: 0 }}>Regulatory signals</h3>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {feed.regulatorySignals.map((signal) => (
                    <div key={signal.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "0.85rem", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                        <strong>{signal.title}</strong>
                        <span className={`badge badge-${signal.impact === "high" ? "critical" : signal.impact === "medium" ? "medium" : "low"}`}>
                          {signal.impact}
                        </span>
                      </div>
                      <p style={{ margin: "0.35rem 0", color: "var(--muted)" }}>{signal.summary}</p>
                      <p style={{ margin: 0 }}><strong>Action:</strong> {signal.action}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: "1rem 1.1rem" }}>
                <h3 style={{ marginTop: 0 }}>Vendor risk</h3>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {feed.vendorRisk.map((vendor) => (
                    <div key={vendor.vendor} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "0.85rem", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                        <strong>{vendor.vendor}</strong>
                        <span style={{ color: severityColor[vendor.posture] || "var(--muted)", fontWeight: 700 }}>{vendor.score}/100</span>
                      </div>
                      <p style={{ margin: "0.35rem 0", color: "var(--muted)" }}>{vendor.rationale}</p>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>{vendor.source}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="card" style={{ padding: "1rem 1.1rem" }}>
                <h3 style={{ marginTop: 0 }}>Watchlist exposure</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
                  {feed.watchlistSignals.map((item) => (
                    <div key={item.keyword} style={{ border: "1px solid var(--border)", borderRadius: 999, padding: "0.55rem 0.75rem", background: "#fff" }}>
                      <strong>{item.keyword}</strong> <span style={{ color: severityColor[item.severity] || "var(--muted)" }}>{item.severity}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.9rem" }}>
                  {feed.watchlistSignals.map((item) => (
                    <div key={`${item.keyword}-detail`} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "0.85rem", background: "#fff" }}>
                      <strong>{item.keyword}</strong>
                      <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: "1rem 1.1rem" }}>
                <h3 style={{ marginTop: 0 }}>Evidence snapshots</h3>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {feed.evidenceSnapshots.map((snapshot) => (
                    <div key={snapshot.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "0.85rem", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                        <strong>{snapshot.title}</strong>
                        <span style={{ color: "var(--muted)" }}>{snapshot.source}</span>
                      </div>
                      {snapshot.source_url && (
                        <a href={snapshot.source_url} target="_blank" rel="noreferrer">
                          Open source link
                        </a>
                      )}
                      <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.4rem" }}>
                        {snapshot.evidence.map((entry) => (
                          <div key={entry.file_path} style={{ padding: "0.55rem 0.65rem", borderRadius: 10, background: "var(--bg)" }}>
                            <strong>{entry.file_path}</strong>
                            <div style={{ fontFamily: "monospace", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>{entry.snippet}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
