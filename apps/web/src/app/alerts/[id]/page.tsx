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
  candidates: Array<{
    masked_snippet: string;
    file_path: string;
    rule_id: string;
    confidence: number;
    ml_label?: string;
  }>;
  externalCandidates: Array<{
    url: string;
    masked_snippet: string;
    severity: string;
  }>;
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    api<IncidentDetail>(`/incidents/${id}`).then((d) => {
      setIncident(d);
      setNotes(d.notes || "");
    });
  }, [id]);

  async function update(status: string) {
    await api(`/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    });
    const updated = await api<IncidentDetail>(`/incidents/${id}`);
    setIncident(updated);
  }

  if (!incident) {
    return (
      <>
        <Nav />
        <main style={{ padding: "1.5rem" }}>Loading…</main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem" }}>
        <h1>{incident.title}</h1>
        <p>
          <span className={`badge badge-${incident.severity}`}>{incident.severity}</span>{" "}
          <span style={{ color: "var(--muted)" }}>{incident.source}</span>
        </p>
        <div className="card">
          <h3>Summary</h3>
          <p>{incident.summary}</p>
        </div>
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>Evidence (sanitized)</h3>
          {incident.candidates?.map((c, idx) => (
            <pre
              key={idx}
              style={{
                background: "var(--bg)",
                padding: "0.75rem",
                borderRadius: 6,
                overflow: "auto",
              }}
            >
              {c.file_path}: {c.masked_snippet} ({c.rule_id}, conf {c.confidence}
              {c.ml_label ? `, ${c.ml_label}` : ""})
            </pre>
          ))}
          {incident.externalCandidates?.map((e, idx) => (
            <div key={idx} style={{ marginTop: "0.5rem" }}>
              <a href={e.url} target="_blank" rel="noopener noreferrer">
                {e.url}
              </a>
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
