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

type PolicyDraft = {
  id?: string;
  name: string;
  enabled: boolean;
  rulesJson: string;
  severityJson: string;
  allowlistJson: string;
};

const emptyDraft: PolicyDraft = {
  name: "",
  enabled: true,
  rulesJson: "[]",
  severityJson: "{}",
  allowlistJson: "[]",
};

const DEMO_POLICY_STORAGE_KEY = "demo-prevention-policies";

const CRED_RULE_TEMPLATES: Array<{ name: string; rules: unknown[]; severity: Record<string, string> }> = [
  {
    name: "CRED: API Keys & Tokens",
    rules: [
      { type: "secret", pattern: "AKIA|sk_live|x-api-key|api_key", severity: "critical" },
      { type: "secret", pattern: "github_pat|ghp_", severity: "high" },
    ],
    severity: {
      api_key: "critical",
      github_pat: "high",
    },
  },
  {
    name: "CRED: Credit Cards",
    rules: [
      { type: "content_regex", pattern: "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b", severity: "critical" },
    ],
    severity: {
      credit_card: "critical",
    },
  },
  {
    name: "CRED: Filenames & Formats",
    rules: [
      { type: "filename", pattern: "(?i)(id_rsa|\\.pem$|\\.key$|\\.env)$", severity: "high" },
      { type: "format", blocked_extensions: ["exe", "dll", "apk", "bin"], severity: "medium" },
      { type: "size", max_bytes: 5242880, severity: "low" },
    ],
    severity: {
      sensitive_filename: "high",
      restricted_format: "medium",
      oversized_file: "low",
    },
  },
];

const DEMO_POLICY_SEEDS: Policy[] = [
  {
    id: "demo-policy-1",
    name: "Block Sensitive Filenames",
    enabled: true,
    rules: [
      { type: "filename", pattern: "(?i)(id_rsa|id_dsa|\\.pem$|\\.key$|secrets?\\.yml)$", severity: "critical" },
    ],
    severity_map: {
      filename_sensitive: "critical",
    },
    allowlist: [{ path: "**/docs/**" }],
  },
  {
    id: "demo-policy-2",
    name: "Large File Guardrail",
    enabled: true,
    rules: [
      { type: "size", max_bytes: 5242880, severity: "medium" },
    ],
    severity_map: {
      oversized_file: "medium",
    },
    allowlist: [{ path: "**/*.png" }, { path: "**/*.jpg" }],
  },
  {
    id: "demo-policy-3",
    name: "Executable Format Restriction",
    enabled: true,
    rules: [
      { type: "format", blocked_extensions: ["exe", "dll", "bin", "apk"], severity: "high" },
    ],
    severity_map: {
      executable_format: "high",
    },
    allowlist: [],
  },
  {
    id: "demo-policy-4",
    name: "Credit Card Number Detection",
    enabled: true,
    rules: [
      { type: "content_regex", pattern: "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b", severity: "critical" },
    ],
    severity_map: {
      credit_card: "critical",
    },
    allowlist: [],
  },
  {
    id: "demo-policy-5",
    name: "API Key Pattern Detection",
    enabled: true,
    rules: [
      { type: "secret", pattern: "api_key|x-api-key|sk_live|AKIA", severity: "critical" },
    ],
    severity_map: {
      api_key: "critical",
    },
    allowlist: [{ path: "**/*.md" }],
  },
  {
    id: "demo-policy-6",
    name: "Private Key Material Detection",
    enabled: true,
    rules: [
      { type: "content_regex", pattern: "-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----", severity: "critical" },
    ],
    severity_map: {
      private_key: "critical",
    },
    allowlist: [],
  },
  {
    id: "demo-policy-7",
    name: "Database Connection String Leak",
    enabled: true,
    rules: [
      { type: "content_regex", pattern: "postgres(ql)?:\\/\\/[^\\s]+:[^\\s]+@", severity: "high" },
    ],
    severity_map: {
      db_connection_secret: "high",
    },
    allowlist: [],
  },
  {
    id: "demo-policy-8",
    name: "ENV File Exposure",
    enabled: true,
    rules: [
      { type: "filename", pattern: "(?i)^(.*/)?\\.env(\\..+)?$", severity: "high" },
    ],
    severity_map: {
      env_file: "high",
    },
    allowlist: [{ path: "**/.env.example" }],
  },
  {
    id: "demo-policy-9",
    name: "Token in URL Query",
    enabled: true,
    rules: [
      { type: "content_regex", pattern: "[?&](token|access_token|auth)=", severity: "medium" },
    ],
    severity_map: {
      token_in_url: "medium",
    },
    allowlist: [],
  },
  {
    id: "demo-policy-10",
    name: "Suspicious Archive Upload",
    enabled: true,
    rules: [
      { type: "format", blocked_extensions: ["zip", "7z", "rar"], severity: "low" },
    ],
    severity_map: {
      archive_upload: "low",
    },
    allowlist: [{ path: "**/fixtures/**" }],
  },
  {
    id: "demo-policy-11",
    name: "High Entropy String Detection",
    enabled: true,
    rules: [
      { type: "entropy", threshold: 4.5, min_length: 24, severity: "high" },
    ],
    severity_map: {
      high_entropy_secret: "high",
    },
    allowlist: [],
  },
  {
    id: "demo-policy-12",
    name: "Webhook URL Secret Exposure",
    enabled: true,
    rules: [
      { type: "content_regex", pattern: "https://hooks\\.slack\\.com/services/", severity: "high" },
    ],
    severity_map: {
      slack_webhook: "high",
    },
    allowlist: [],
  },
];

function mergeWithDemoPolicySeeds(existing: Policy[]): Policy[] {
  const byId = new Map(existing.map((policy) => [policy.id, policy]));
  const merged = [...existing];
  for (const seed of DEMO_POLICY_SEEDS) {
    if (!byId.has(seed.id)) {
      merged.push(seed);
    }
  }
  return merged;
}

function seedPolicies(existing: Policy[]): Policy[] {
  return existing.length > 0 ? mergeWithDemoPolicySeeds(existing) : [...DEMO_POLICY_SEEDS];
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selected, setSelected] = useState<PolicyDraft>(emptyDraft);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [editorMode, setEditorMode] = useState<"view" | "edit" | "create">("create");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [useLocalStore, setUseLocalStore] = useState(false);

  function applyCredTemplate(index: number) {
    const tpl = CRED_RULE_TEMPLATES[index];
    if (!tpl) return;
    setSelected((current) => ({
      ...current,
      name: current.name || tpl.name,
      rulesJson: JSON.stringify(tpl.rules, null, 2),
      severityJson: JSON.stringify(tpl.severity, null, 2),
    }));
    setError("");
  }

  function fromPolicy(policy: Policy): PolicyDraft {
    return {
      id: policy.id,
      name: policy.name,
      enabled: policy.enabled,
      rulesJson: JSON.stringify(policy.rules ?? [], null, 2),
      severityJson: JSON.stringify(policy.severity_map ?? {}, null, 2),
      allowlistJson: JSON.stringify(policy.allowlist ?? [], null, 2),
    };
  }

  useEffect(() => {
    function readLocalPolicies(): Policy[] {
      if (typeof window === "undefined") return DEMO_POLICY_SEEDS;
      const raw = localStorage.getItem(DEMO_POLICY_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(DEMO_POLICY_STORAGE_KEY, JSON.stringify(DEMO_POLICY_SEEDS));
        return DEMO_POLICY_SEEDS;
      }
      try {
        const parsed = JSON.parse(raw) as Policy[];
        const merged = mergeWithDemoPolicySeeds(parsed);
        if (merged.length !== parsed.length) {
          localStorage.setItem(DEMO_POLICY_STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      } catch {
        localStorage.setItem(DEMO_POLICY_STORAGE_KEY, JSON.stringify(DEMO_POLICY_SEEDS));
        return DEMO_POLICY_SEEDS;
      }
    }

    api<Policy[]>("/policies")
      .then((p) => {
        const maybeMerged = seedPolicies(p);
        setPolicies(maybeMerged);
        if (maybeMerged[0]) {
          setSelected(fromPolicy(maybeMerged[0]));
          setSelectedPolicyId(maybeMerged[0].id);
          setEditorMode("view");
        }
      })
      .catch((err) => {
        setUseLocalStore(true);
        const localPolicies = readLocalPolicies();
        setPolicies(localPolicies);
        setSelected(fromPolicy(localPolicies[0] ?? DEMO_POLICY_SEEDS[0]));
        setSelectedPolicyId(localPolicies[0]?.id ?? "");
        setEditorMode(localPolicies.length ? "view" : "create");
        setError(err instanceof Error ? err.message : "Unable to load prevention policies");
      })
      .finally(() => setLoading(false));
  }, []);

  function persistLocalPolicies(nextPolicies: Policy[]) {
    setPolicies(nextPolicies);
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_POLICY_STORAGE_KEY, JSON.stringify(nextPolicies));
    }
  }

  function toPolicy(draft: PolicyDraft): Policy {
    return {
      id: draft.id ?? `demo-policy-${crypto.randomUUID()}`,
      name: draft.name.trim() || "Untitled policy",
      enabled: draft.enabled,
      rules: JSON.parse(draft.rulesJson),
      severity_map: JSON.parse(draft.severityJson),
      allowlist: JSON.parse(draft.allowlistJson),
    };
  }

  async function save() {
    try {
      const payload = toPolicy(selected);
      if (useLocalStore) {
        const nextPolicies = selected.id
          ? policies.map((policy) => (policy.id === selected.id ? { ...payload, id: selected.id } : policy))
          : [payload, ...policies];
        persistLocalPolicies(nextPolicies);
        const next = nextPolicies.find((policy) => policy.id === payload.id) ?? nextPolicies[0] ?? null;
        if (next) {
          setSelected(fromPolicy(next));
          setSelectedPolicyId(next.id);
          setEditorMode("view");
        }
      } else {
        await api(selected.id ? `/policies/${selected.id}` : "/policies", {
          method: selected.id ? "PUT" : "POST",
          body: JSON.stringify(payload),
        });
        const fresh = await api<Policy[]>("/policies");
        setPolicies(fresh);
        const next = fresh.find((policy) => policy.id === payload.id) ?? fresh.find((policy) => policy.name === payload.name) ?? fresh[0] ?? null;
        if (next) {
          setSelected(fromPolicy(next));
          setSelectedPolicyId(next.id);
          setEditorMode("view");
        } else {
          setSelected(emptyDraft);
          setSelectedPolicyId("");
          setEditorMode("create");
        }
      }
      alert(selected.id ? "Policy updated." : "Policy created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save prevention policy");
    }
  }

  async function removeSelected() {
    if (!selected.id) return;
    try {
      if (useLocalStore) {
        const nextPolicies = policies.filter((policy) => policy.id !== selected.id);
        persistLocalPolicies(nextPolicies);
        const next = nextPolicies[0] ?? null;
        if (next) {
          setSelected(fromPolicy(next));
          setSelectedPolicyId(next.id);
          setEditorMode("view");
        } else {
          setSelected(emptyDraft);
          setSelectedPolicyId("");
          setEditorMode("create");
        }
      } else {
        await api(`/policies/${selected.id}`, { method: "DELETE" });
        const fresh = await api<Policy[]>("/policies");
        setPolicies(fresh);
        if (fresh[0]) {
          setSelected(fromPolicy(fresh[0]));
          setSelectedPolicyId(fresh[0].id);
          setEditorMode("view");
        } else {
          setSelected(emptyDraft);
          setSelectedPolicyId("");
          setEditorMode("create");
        }
      }
      alert("Policy deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete prevention policy");
    }
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Prevention Policies</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Rules that govern how Leak Ranger detects, classifies, and responds to risky content.
        </p>
        {error && (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <strong>Policy data unavailable</strong>
            <p style={{ marginBottom: 0, color: "var(--muted)" }}>{error}</p>
          </div>
        )}
        {useLocalStore && (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <strong>Demo mode</strong>
            <p style={{ marginBottom: 0, color: "var(--muted)" }}>
              The Java policy service is offline, so policies are stored locally in this browser for now.
            </p>
          </div>
        )}
        {loading ? (
          <div className="card">Loading prevention policies…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1rem" }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Policy Catalog</h3>
              {policies.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No policies found.</p>
              ) : (
                <div style={{ display: "grid", gap: "0.6rem" }}>
                  <label>
                    Select policy
                    <select
                      value={selectedPolicyId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSelectedPolicyId(nextId);
                        const found = policies.find((policy) => policy.id === nextId);
                        if (found) {
                          setSelected(fromPolicy(found));
                          setEditorMode("view");
                        }
                      }}
                    >
                      {policies.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.enabled ? "Enabled" : "Disabled"})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        const found = policies.find((policy) => policy.id === selectedPolicyId);
                        if (found) {
                          setSelected(fromPolicy(found));
                          setEditorMode("view");
                        }
                      }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEditorMode("edit")}
                      disabled={!selected.id}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={removeSelected}
                      disabled={!selected.id}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setSelected(emptyDraft);
                    setSelectedPolicyId("");
                    setEditorMode("create");
                  }}
                >
                  New policy
                </button>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>
                {editorMode === "create" ? "Create Policy" : editorMode === "edit" ? "Edit Policy" : "View Policy"}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {CRED_RULE_TEMPLATES.map((template, index) => (
                  <button key={template.name} type="button" className="secondary" onClick={() => applyCredTemplate(index)}>
                    {template.name}
                  </button>
                ))}
              </div>

              <label>
                Policy name
                <input
                  value={selected.name}
                  onChange={(e) => setSelected((current) => ({ ...current, name: e.target.value }))}
                  placeholder="Default DLP"
                  disabled={editorMode === "view"}
                />
              </label>
              {!selected.name && <p style={{ color: "var(--muted)" }}>Create a new policy or pick one from catalog.</p>}
              <label>
                Enabled
                <input
                  type="checkbox"
                  checked={selected.enabled}
                  onChange={(e) => setSelected((current) => ({ ...current, enabled: e.target.checked }))}
                  style={{ marginLeft: "0.5rem" }}
                  disabled={editorMode === "view"}
                />
              </label>
              <label>
                Rules (JSON)
                <textarea
                  rows={6}
                  value={selected.rulesJson}
                  onChange={(e) => setSelected((current) => ({ ...current, rulesJson: e.target.value }))}
                  disabled={editorMode === "view"}
                />
              </label>
              <label>
                Severity map (JSON)
                <textarea
                  rows={6}
                  value={selected.severityJson}
                  onChange={(e) => setSelected((current) => ({ ...current, severityJson: e.target.value }))}
                  disabled={editorMode === "view"}
                />
              </label>
              <label>
                Allowlist (JSON)
                <textarea
                  rows={6}
                  value={selected.allowlistJson}
                  onChange={(e) => setSelected((current) => ({ ...current, allowlistJson: e.target.value }))}
                  disabled={editorMode === "view"}
                />
              </label>
              {editorMode === "view" ? null : (
                <button type="button" onClick={save} style={{ marginTop: "0.5rem" }}>
                  {selected.id ? "Save policy" : "Create policy"}
                </button>
              )}
            </div>
          </div>
        )}
        <div style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              persistLocalPolicies(DEMO_POLICY_SEEDS);
              setUseLocalStore(true);
              setPolicies(DEMO_POLICY_SEEDS);
              setSelected(fromPolicy(DEMO_POLICY_SEEDS[0]));
              setSelectedPolicyId(DEMO_POLICY_SEEDS[0].id);
              setEditorMode("view");
              setError("");
            }}
          >
            Reset demo policies
          </button>
        </div>
      </main>
    </>
  );
}
