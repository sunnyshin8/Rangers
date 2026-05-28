"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  source: string;
  created_at: string;
  source_url?: string;
};

export default function AlertsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  async function loadIncidents(nextStatus: string) {
    setLoading(true);
    setError("");
    try {
      const data = await api<Incident[]>(`/incidents?status=${nextStatus}`);
      setIncidents(data);
    } catch (err) {
      setIncidents([]);
      setError(err instanceof Error ? err.message : "Unable to load incidents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents(status);
  }, [status]);

  async function runDemo() {
    try {
      setIsSimulating(true);
      setError("");
      await api("/test/demo-leak", { method: "POST" });
      await loadIncidents(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to simulate leak");
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>My Alerts</h1>
          <button type="button" onClick={runDemo} disabled={isSimulating || loading}>
            {isSimulating ? "Simulating..." : "Simulate leak"}
          </button>
        </div>
        <div style={{ margin: "1rem 0" }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto" }}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False positive</option>
            <option value="all">All</option>
          </select>
        </div>
        {error && <p style={{ color: "var(--critical)", margin: "0 0 1rem 0" }}>{error}</p>}
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: "1rem" }}>Loading…</p>
          ) : incidents.length === 0 ? (
            <p style={{ padding: "1rem", color: "var(--muted)" }}>No incidents found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/alerts/${i.id}`}>{i.title}</Link>
                    </td>
                    <td>
                      <span className={`badge badge-${i.severity}`}>{i.severity}</span>
                    </td>
                    <td>
                      {i.source_url ? (
                        <a href={i.source_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                          {i.source} ↗
                        </a>
                      ) : (
                        <span style={{ textTransform: "capitalize" }}>{i.source}</span>
                      )}
                    </td>
                    <td>
                      <span style={{ textTransform: "capitalize", fontSize: "0.85rem" }}>{i.status.replace("_", " ")}</span>
                    </td>
                    <td>{new Date(i.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
