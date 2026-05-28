"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Array<{ provider: string; status: string }>>([]);
  const [githubToken, setGithubToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [watchKeyword, setWatchKeyword] = useState("");
  const [watchlists, setWatchlists] = useState<Array<{ keyword: string }>>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const hasGitHubToken = githubToken.trim().length > 0;
  const hasBrightDataKey = apiKey.trim().length > 0;
  const hasWatchKeyword = watchKeyword.trim().length > 0;

  useEffect(() => {
    setError("");
    api<Array<{ provider: string; status: string }>>("/integrations")
      .then(setIntegrations)
      .catch((err) => {
        setIntegrations([]);
        setError(err instanceof Error ? err.message : "Unable to load integrations");
      });
    api<Array<{ keyword: string }>>("/watchlists")
      .then(setWatchlists)
      .catch(() => {
        setWatchlists([]);
      });
  }, []);

  async function connectGitHub() {
    try {
      if (!hasGitHubToken) {
        setError("GitHub PAT is required.");
        return;
      }
      setSaving(true);
      setError("");
      setMessage("");
      await api("/integrations", {
        method: "POST",
        body: JSON.stringify({ provider: "github", config: githubToken }),
      });
      const list = await api<Array<{ provider: string; status: string }>>("/integrations");
      setIntegrations(list);
      setGithubToken("");
      setMessage("GitHub integration configuration saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save GitHub integration");
    } finally {
      setSaving(false);
    }
  }

  async function saveBrightData() {
    try {
      if (!hasBrightDataKey) {
        setError("Bright Data API key is required.");
        return;
      }
      setSaving(true);
      setError("");
      setMessage("");
      await api("/integrations/bright-data", {
        method: "PUT",
        body: JSON.stringify({ apiKey, serpEnabled: true, unlockerEnabled: true, scraperEnabled: true }),
      });
      setMessage("Bright Data configuration saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save Bright Data configuration");
    } finally {
      setSaving(false);
    }
  }

  async function addWatchlist() {
    try {
      if (!hasWatchKeyword) {
        setError("Watchlist keyword is required.");
        return;
      }
      setSaving(true);
      setError("");
      setMessage("");
      await api("/watchlists", { method: "POST", body: JSON.stringify({ keyword: watchKeyword }) });
      setWatchlists(await api("/watchlists"));
      setWatchKeyword("");
      setMessage("Watchlist keyword added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add watchlist keyword");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="card" style={{ backdropFilter: "blur(12px)", background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.85))" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700 }}>Integrations</div>
            <h1 style={{ marginTop: "0.35rem", marginBottom: "0.5rem" }}>Connect the monitoring stack</h1>
            <p style={{ marginTop: 0, color: "var(--muted)" }}>
              GitHub webhooks, Bright Data enrichment, and watchlists are the minimum inputs required to keep Leak Ranger moving.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <span className="badge badge-high">Required: GitHub PAT</span>
              <span className="badge badge-medium">Required: Bright Data key</span>
              <span className="badge badge-low">Optional: watchlist keywords</span>
            </div>
          </div>
          <div className="card" style={{ backdropFilter: "blur(12px)", background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(247,251,255,0.85))" }}>
            <h3 style={{ marginTop: 0 }}>Current status</h3>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {integrations.length === 0 ? (
                <p style={{ color: "var(--muted)", margin: 0 }}>No integration records yet.</p>
              ) : (
                integrations.map((item) => (
                  <div key={item.provider} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", padding: "0.55rem 0.75rem", border: "1px solid var(--border)", borderRadius: 12, background: "rgba(255,255,255,0.75)" }}>
                    <strong style={{ textTransform: "capitalize" }}>{item.provider}</strong>
                    <span style={{ color: "var(--muted)" }}>{item.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {error && <p style={{ color: "var(--critical)", marginTop: 0 }}>{error}</p>}
        {message && <p style={{ color: "var(--muted)", marginTop: 0 }}>{message}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <div className="card" style={{ backdropFilter: "blur(10px)", background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(240,248,255,0.82))" }}>
            <h3 style={{ marginTop: 0 }}>GitHub</h3>
            <p style={{ color: "var(--muted)" }}>
              Required. Connect webhooks to the BFF at /webhooks/github.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
              Personal Access Token (required)
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
              />
            </label>
            <button type="button" onClick={connectGitHub} disabled={saving || !hasGitHubToken}>
              {saving ? "Saving..." : "Save GitHub config"}
            </button>
          </div>

          <div className="card" style={{ backdropFilter: "blur(10px)", background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(246,255,251,0.82))" }}>
            <h3 style={{ marginTop: 0 }}>Bright Data</h3>
            <p style={{ color: "var(--muted)" }}>
              Required. SERP API, Web Unlocker, and Scraping Browser help discover external leak signals.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
              API key (required)
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Set API key" />
            </label>
            <button type="button" onClick={saveBrightData} disabled={saving || !hasBrightDataKey}>
              {saving ? "Saving..." : "Save Bright Data config"}
            </button>
          </div>

          <div className="card" style={{ backdropFilter: "blur(10px)", background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,248,245,0.82))" }}>
            <h3 style={{ marginTop: 0 }}>Watchlist keywords</h3>
            <p style={{ color: "var(--muted)" }}>
              Optional. Use this to track brand names, repo names, or high-risk terms.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input value={watchKeyword} onChange={(e) => setWatchKeyword(e.target.value)} placeholder="Keyword" />
              <button type="button" onClick={addWatchlist} disabled={saving || !hasWatchKeyword}>
                Add
              </button>
            </div>
            <ul style={{ marginBottom: 0 }}>
              {watchlists.map((w) => (
                <li key={w.keyword}>{w.keyword}</li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
