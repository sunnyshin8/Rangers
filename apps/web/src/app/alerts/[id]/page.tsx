"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type IncidentDetail = {
  id: string;
  title: string;
  severity: string;
  status: string;
  source: string;
  summary: string;
  notes: string;
  source_url?: string;
  candidates: Array<{
    masked_snippet: string;
    file_path: string;
    rule_id: string;
    confidence: number;
    ml_label?: string;
    source_url?: string;
    patch?: string;
    evidence_key?: string;
  }>;
  externalCandidates: Array<{
    url: string;
    masked_snippet: string;
    severity: string;
    evidence_key?: string;
  }>;
};

function computeRiskAssessment(incident: IncidentDetail) {
  const severityScore: Record<string, number> = {
    critical: 40,
    high: 30,
    medium: 20,
    low: 10,
  };
  const sourceScore: Record<string, number> = {
    github: 15,
    web: 20,
  };

  const score = Math.min(
    100,
    (severityScore[incident.severity.toLowerCase()] || 15) +
      (sourceScore[incident.source.toLowerCase()] || 10) +
      (incident.candidates.length > 0 ? 15 : 0) +
      (incident.externalCandidates.length > 0 ? 20 : 0) +
      (incident.status === "open" ? 10 : incident.status === "resolved" ? -5 : 0)
  );

  const reasons = [
    `Severity is ${incident.severity.toLowerCase()}, which increases the response priority.`,
    incident.source === "github"
      ? "The source is version-controlled code, so the exposure may propagate into forks, caches, or build artifacts."
      : "The source is public web data, so the exposure can spread without a normal repo rollback path.",
    incident.candidates.length > 0
      ? `There are ${incident.candidates.length} internal evidence match(es) with sanitized snippets attached.`
      : "No internal file evidence was attached, so the investigation leans on external context and metadata.",
    incident.externalCandidates.length > 0
      ? `There are ${incident.externalCandidates.length} external evidence snapshot(s) with source links.`
      : "No external evidence snapshot was attached for this incident.",
  ];

  const nextSteps = [
    "Confirm ownership and rotate any exposed credentials or tokens.",
    "Attach a remediation note and mark the incident resolved only after validation.",
    "Review whether the leak came from source control, build artifacts, or an external source.",
  ];

  return {
    score,
    reasons,
    nextSteps,
    label:
      score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 35 ? "Medium" : "Low",
  };
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [showPatch, setShowPatch] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api<IncidentDetail>(`/incidents/${id}`)
      .then((d) => {
        setIncident(d);
        setNotes(d.notes || "");
      })
      .catch((err) => {
        setIncident(null);
        setError(err instanceof Error ? err.message : "Unable to load incident");
      });
  }, [id]);

  async function update(status: string) {
    try {
      setError("");
      await api(`/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      });
      const updated = await api<IncidentDetail>(`/incidents/${id}`);
      setIncident(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update incident");
    }
  }

  if (!incident) {
    return (
      <>
        <Nav />
        <main style={{ padding: "1.5rem" }}>
          {error || "Loading…"}
        </main>
      </>
    );
  }

  const assessment = computeRiskAssessment(incident);

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem" }}>
        <h1>{incident.title}</h1>
        {error && <p style={{ color: "var(--critical)", marginTop: 0 }}>{error}</p>}
        <p style={{ display: "flex", gap: "0.75rem", alignItems: "center", margin: "0.5rem 0 1.25rem 0" }}>
          <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>{" "}
          <span style={{ color: "var(--muted)", textTransform: "capitalize" }}>Source:</span>
          {incident.source_url ? (
            <a href={incident.source_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
              {incident.source} ↗
            </a>
          ) : (
            <span style={{ fontWeight: 600 }}>{incident.source}</span>
          )}
        </p>
        <div className="card">
          <h3>Summary</h3>
          <p>{incident.summary}</p>
        </div>
        <div className="card" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Risk assessment</h3>
            <span className={`badge badge-${incident.severity}`}>{assessment.label} risk</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "1rem", marginTop: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 18, minHeight: 110, background: "linear-gradient(145deg, #fff, #f5f8ff)", border: "1px solid var(--border)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800 }}>{assessment.score}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>score / 100</div>
              </div>
            </div>
            <div>
              <p style={{ marginTop: 0, color: "var(--muted)" }}>Why this matters</p>
              <ul style={{ marginTop: 0 }}>
                {assessment.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <strong>What to do next</strong>
            <ol style={{ marginBottom: 0 }}>
              {assessment.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Evidence (sanitized)</h3>
          {incident.candidates?.map((c, idx) => (
            <div key={idx} style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700 }}>{c.file_path}</div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {c.source_url && (
                    <a href={c.source_url} target="_blank" rel="noopener noreferrer">View file ↗</a>
                  )}
                  {c.evidence_key && (
                    <>
                      <a href={`/evidence/${c.evidence_key}`} target="_blank" rel="noopener noreferrer">View snapshot</a>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            navigator.clipboard?.writeText(c.evidence_key || "");
                            setCopied(c.evidence_key || null);
                            setTimeout(() => setCopied(null), 2000);
                          } catch {}
                        }}
                        className="secondary"
                      >
                        {copied === c.evidence_key ? "Copied" : "Copy key"}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPatch((s) => ({ ...s, [idx]: !s[idx] }))}
                    className="secondary"
                  >
                    {showPatch[idx] ? "Hide diff" : "Show diff"}
                  </button>
                </div>
              </div>
              <pre style={{ background: "var(--bg)", padding: "0.5rem", marginTop: "0.25rem" }}>{c.masked_snippet} ({c.rule_id}, conf {c.confidence}{c.ml_label ? `, ${c.ml_label}` : ""})</pre>
              {showPatch[idx] && c.patch && (
                <pre style={{ background: "#0b1220", color: "#d6f8d6", padding: "0.75rem", borderRadius: 6, overflow: "auto", marginTop: "0.5rem" }}>
                  {c.patch}
                </pre>
              )}
            </div>
          ))}
          {incident.externalCandidates?.map((e, idx) => (
            <div key={idx} style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <a href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span className={`badge badge-${e.severity}`}>{e.severity}</span>
                  {e.evidence_key && (
                    <>
                      <a href={`/evidence/${e.evidence_key}`} target="_blank" rel="noopener noreferrer">View snapshot</a>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            navigator.clipboard?.writeText(e.evidence_key || "");
                            setCopied(e.evidence_key || null);
                            setTimeout(() => setCopied(null), 2000);
                          } catch {}
                        }}
                        className="secondary"
                      >
                        {copied === e.evidence_key ? "Copied" : "Copy key"}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <pre style={{ background: "var(--bg)", padding: "0.5rem" }}>{e.masked_snippet}</pre>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Notes</h3>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="button" onClick={() => update("resolved")}>
              Mark resolved
            </button>
            <button type="button" className="secondary" onClick={() => update("false_positive")}>
              False positive
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
