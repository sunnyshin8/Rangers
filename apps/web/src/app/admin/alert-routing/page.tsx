"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { api } from "@/lib/api";

interface AlertRoute {
  id: string;
  name: string;
  channel_type: string;
  config: Record<string, any> | string;
  severity_threshold: string;
  enabled: boolean;
  created_at: string;
}

export default function AlertRoutingPage() {
  const [routes, setRoutes] = useState<AlertRoute[]>([]);
  const [name, setName] = useState("");
  const [channelType, setChannelType] = useState("slack");
  const [severityThreshold, setSeverityThreshold] = useState("medium");
  const [recipient, setRecipient] = useState("");
  const [slackUrl, setSlackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchRoutes();
  }, []);

  async function fetchRoutes() {
    try {
      const data = await api<AlertRoute[]>("/alert-routes");
      setRoutes(data);
    } catch (err: any) {
      setError("Failed to fetch alert routes: " + err.message);
    }
  }

  async function addRoute(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    let configJson = "{}";
    if (channelType === "email") {
      if (!recipient) {
        setError("Email recipient is required");
        return;
      }
      configJson = JSON.stringify({ recipient });
    } else if (channelType === "slack") {
      const cleanUrl = slackUrl.trim().replace(/^["']|["']$/g, "");
      if (!cleanUrl) {
        setError("Slack Webhook URL is required");
        return;
      }
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        setError("Slack Webhook URL must be a valid URL starting with http:// or https://");
        return;
      }
      configJson = JSON.stringify({ url: cleanUrl });
    } else if (channelType === "webhook") {
      const cleanUrl = webhookUrl.trim().replace(/^["']|["']$/g, "");
      if (!cleanUrl) {
        setError("Webhook URL is required");
        return;
      }
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        setError("Webhook URL must be a valid URL starting with http:// or https://");
        return;
      }
      configJson = JSON.stringify({ url: cleanUrl });
    }

    try {
      await api("/alert-routes", {
        method: "POST",
        body: JSON.stringify({
          name,
          channelType,
          configJson,
          severityThreshold,
          enabled: true,
        }),
      });
      setSuccess("Alert route created successfully.");
      setName("");
      setRecipient("");
      setSlackUrl("");
      setWebhookUrl("");
      fetchRoutes();
    } catch (err: any) {
      setError("Failed to create route: " + err.message);
    }
  }

  async function toggleRoute(route: AlertRoute) {
    setError("");
    setSuccess("");
    try {
      let configStr = "{}";
      if (typeof route.config === "object") {
        configStr = JSON.stringify(route.config);
      } else if (typeof route.config === "string") {
        configStr = route.config;
      }
      await api(`/alert-routes/${route.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: route.name,
          channelType: route.channel_type,
          configJson: configStr,
          severityThreshold: route.severity_threshold,
          enabled: !route.enabled,
        }),
      });
      fetchRoutes();
    } catch (err: any) {
      setError("Failed to update status: " + err.message);
    }
  }

  async function deleteRoute(id: string) {
    if (!confirm("Are you sure you want to delete this alert route?")) return;
    setError("");
    setSuccess("");
    try {
      await api(`/alert-routes/${id}`, { method: "DELETE" });
      setSuccess("Alert route deleted successfully.");
      fetchRoutes();
    } catch (err: any) {
      setError("Failed to delete route: " + err.message);
    }
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1>Alert Routing</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>Configure outbound notification pipelines</p>
        </div>

        {error && (
          <div style={{ padding: "0.75rem", background: "#fde8e6", color: "var(--critical)", borderRadius: "6px", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "0.75rem", background: "#edf7ed", color: "#1e4620", borderRadius: "6px", marginBottom: "1rem" }}>
            {success}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", alignItems: "start" }}>
          {/* Routes List */}
          <div className="card">
            <h3>Active Pipelines</h3>
            {routes.length === 0 ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem 0" }}>No alert routing channels configured yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Channel</th>
                    <th>Threshold</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => {
                    let detail = "";
                    try {
                      const cfg = typeof route.config === "string" ? JSON.parse(route.config) : route.config;
                      detail = cfg?.recipient || cfg?.url || "";
                    } catch (e) {}

                    return (
                      <tr key={route.id}>
                        <td>
                          <strong>{route.name}</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", wordBreak: "break-all" }}>{detail}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.85rem", textTransform: "capitalize" }}>{route.channel_type}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${route.severity_threshold}`}>
                            {route.severity_threshold}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: route.enabled ? "#e6f4ea" : "#f1f3f5", color: route.enabled ? "#137333" : "var(--muted)", border: "none" }}
                            onClick={() => toggleRoute(route)}
                          >
                            {route.enabled ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "var(--critical)", border: "1px solid var(--border)" }}
                            onClick={() => deleteRoute(route.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* New Route Form */}
          <div className="card">
            <h3>Add Route</h3>
            <form noValidate onSubmit={addRoute} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>
                Route Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Platform Slack Devs"
                  required
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>
                Channel Type
                <select value={channelType} onChange={(e) => setChannelType(e.target.value)}>
                  <option value="in_app">In-App Alerts</option>
                  <option value="email">Email</option>
                  <option value="slack">Slack Webhook</option>
                  <option value="webhook">Custom Webhook</option>
                </select>
              </label>

              {channelType === "email" && (
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>
                  Recipient Email
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="security@company.com"
                    required
                  />
                </label>
              )}

              {channelType === "slack" && (
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>
                  Slack Webhook URL
                  <input
                    type="text"
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    onBlur={(e) => setSlackUrl(e.target.value.trim().replace(/^['"]|['"]$/g, ""))}
                    placeholder="https://hooks.slack.com/services/..."
                    required
                  />
                </label>
              )}

              {channelType === "webhook" && (
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>
                  Webhook URL
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    onBlur={(e) => setWebhookUrl(e.target.value.trim().replace(/^['"]|['"]$/g, ""))}
                    placeholder="https://api.yourdomain.com/alert"
                    required
                  />
                </label>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>
                Severity Threshold
                <select value={severityThreshold} onChange={(e) => setSeverityThreshold(e.target.value)}>
                  <option value="critical">Critical</option>
                  <option value="high">High & above</option>
                  <option value="medium">Medium & above</option>
                  <option value="low">Low & above</option>
                </select>
              </label>

              <button type="submit" style={{ marginTop: "0.5rem", fontWeight: 500 }}>
                Enable Pipeline
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
