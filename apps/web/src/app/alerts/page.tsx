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
};

export default function AlertsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Incident[]>(`/incidents?status=${status}`)
      .then(setIncidents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  async function runDemo() {
    await api("/test/demo-leak", { method: "POST" });
    setLoading(true);
    setTimeout(() => {
      api<Incident[]>(`/incidents?status=${status}`).then(setIncidents).finally(() => setLoading(false));
    }, 2000);
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>My Alerts</h1>
          <button type="button" onClick={runDemo}>
            Simulate leak
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
                    <td>{i.source}</td>
                    <td>{i.status}</td>
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
