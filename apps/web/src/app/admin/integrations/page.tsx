"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Array<{ provider: string; status: string }>>([]);
  const [apiKey, setApiKey] = useState("");
  const [watchKeyword, setWatchKeyword] = useState("");
  const [watchlists, setWatchlists] = useState<Array<{ keyword: string }>>([]);

  useEffect(() => {
    api<Array<{ provider: string; status: string }>>("/integrations").then(setIntegrations);
    api<Array<{ keyword: string }>>("/watchlists").then(setWatchlists).catch(() => {});
  }, []);

  async function connectGitHub() {
    await api("/integrations", { method: "POST", body: JSON.stringify({ provider: "github" }) });
    const list = await api<Array<{ provider: string; status: string }>>("/integrations");
    setIntegrations(list);
  }

  async function saveBrightData() {
    await api("/integrations/bright-data", {
      method: "PUT",
      body: JSON.stringify({ apiKey, serpEnabled: true, unlockerEnabled: true, scraperEnabled: true }),
    });
    alert("Bright Data configuration saved.");
  }

  async function addWatchlist() {
    await api("/watchlists", { method: "POST", body: JSON.stringify({ keyword: watchKeyword }) });
    setWatchlists(await api("/watchlists"));
    setWatchKeyword("");
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Integrations</h1>
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3>GitHub</h3>
          <p style={{ color: "var(--muted)" }}>
            Connect webhooks to the BFF at <code>/webhooks/github</code>
          </p>
          <button type="button" onClick={connectGitHub}>
            Mark GitHub connected
          </button>
          <ul>
            {integrations.map((i) => (
              <li key={i.provider}>
                {i.provider}: {i.status}
              </li>
            ))}
          </ul>
        </div>
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3>Bright Data</h3>
          <p style={{ color: "var(--muted)" }}>
            SERP API, Web Unlocker, and Scraping Browser for external leak monitoring.
          </p>
          <label>
            API key
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Set API key" />
          </label>
          <button type="button" style={{ marginTop: "0.5rem" }} onClick={saveBrightData}>
            Save Bright Data config
          </button>
        </div>
        <div className="card">
          <h3>Watchlist keywords</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input value={watchKeyword} onChange={(e) => setWatchKeyword(e.target.value)} placeholder="Keyword" />
            <button type="button" onClick={addWatchlist}>
              Add
            </button>
          </div>
          <ul>
            {watchlists.map((w) => (
              <li key={w.keyword}>{w.keyword}</li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
