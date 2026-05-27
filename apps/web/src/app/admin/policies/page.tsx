"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

type Policy = {
  id: string;
  name: string;
  enabled: boolean;
  rules: unknown;
  severity_map: Record<string, string>;
  allowlist: unknown;
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [severityJson, setSeverityJson] = useState("");

  useEffect(() => {
    api<Policy[]>("/policies").then((p) => {
      setPolicies(p);
      if (p[0]) {
        setSelected(p[0]);
        setSeverityJson(JSON.stringify(p[0].severity_map, null, 2));
      }
    });
  }, []);

  async function save() {
    if (!selected) return;
    await api(`/policies/${selected.id}`, {
      method: "PUT",
      body: JSON.stringify({
        severity_map: JSON.parse(severityJson),
        enabled: selected.enabled,
      }),
    });
    alert("Policy updated.");
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem" }}>
        <h1>DLP Policies</h1>
        {selected && (
          <div className="card">
            <h3>{selected.name}</h3>
            <label>
              Severity map (JSON)
              <textarea rows={8} value={severityJson} onChange={(e) => setSeverityJson(e.target.value)} />
            </label>
            <button type="button" onClick={save} style={{ marginTop: "0.5rem" }}>
              Save policy
            </button>
          </div>
        )}
        {policies.length > 1 && (
          <div style={{ marginTop: "1rem" }}>
            {policies.map((p) => (
              <button
                key={p.id}
                type="button"
                className="secondary"
                style={{ marginRight: "0.5rem" }}
                onClick={() => {
                  setSelected(p);
                  setSeverityJson(JSON.stringify(p.severity_map, null, 2));
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
