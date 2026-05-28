"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo.local");
  const [password, setPassword] = useState("demo-admin");
  const [error, setError] = useState("");

  async function login(nextEmail: string, nextPassword: string) {
    setEmail(nextEmail);
    setPassword(nextPassword);
    setError("");
    try {
      const data = await api<{ token: string; user: { role: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email: nextEmail, password: nextPassword }) }
      );
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      router.push(data.user.role === "admin" ? "/admin" : "/alerts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await login(email, password);
  }

  return (
    <main style={{ maxWidth: 400, margin: "4rem auto", padding: "0 1rem" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Leak Ranger</h1>
        <p style={{ color: "var(--muted)" }}>
          Sign in to triage code and secret leaks.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p style={{ color: "var(--critical)", margin: 0 }}>{error}</p>}
          <button type="submit">Sign in</button>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => login("admin@demo.local", "demo-admin")}>Use admin demo</button>
            <button type="button" onClick={() => login("user@demo.local", "demo-user")}>Use user demo</button>
          </div>
        </form>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 0 }}>
          Demo: admin@demo.local / demo-admin or user@demo.local / demo-user
        </p>
      </div>
    </main>
  );
}
