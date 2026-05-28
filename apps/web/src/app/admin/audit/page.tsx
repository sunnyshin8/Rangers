"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AuditLog[]>("/audit")
      .then(setLogs)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load audit log"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Audit Log</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Recent admin and security actions across the tenant.
        </p>
        {error && <div className="card" style={{ marginBottom: "1rem" }}>{error}</div>}
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: "1rem" }}>Loading audit entries…</p>
          ) : logs.length === 0 ? (
            <p style={{ padding: "1rem", color: "var(--muted)" }}>No audit events found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.action}</td>
                    <td>
                      {log.resource_type || "-"}
                      {log.resource_id ? ` / ${log.resource_id}` : ""}
                    </td>
                    <td>{log.user_id || "system"}</td>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
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