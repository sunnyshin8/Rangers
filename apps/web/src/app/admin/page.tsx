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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/incidents/stats").then(setStats).catch(console.error);
  }, []);

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Admin Dashboard</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {stats?.byStatus?.map((s) => (
            <div key={s.status} className="card">
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{s.status}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{s.count}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>By severity</h3>
          <ul>
            {stats?.bySeverity?.map((s) => (
              <li key={s.severity}>
                {s.severity}: {s.count}
              </li>
            ))}
          </ul>
        </div>
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3>By source</h3>
          <ul>
            {stats?.bySource?.map((s) => (
              <li key={s.source}>
                {s.source}: {s.count}
              </li>
            ))}
          </ul>
        </div>
        {stats?.coverage && stats.coverage.length > 0 && (
          <div className="card" style={{ marginTop: "1rem" }}>
            <h3>Scanner coverage</h3>
            <table>
              <thead>
                <tr>
                  <th>Repo</th>
                  <th>Scanned</th>
                  <th>Skipped</th>
                </tr>
              </thead>
              <tbody>
                {stats.coverage.map((c) => (
                  <tr key={c.repo_id}>
                    <td>{c.repo_id}</td>
                    <td>{c.files_scanned}</td>
                    <td>{c.files_skipped}</td>
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
