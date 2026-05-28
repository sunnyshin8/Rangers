import Link from "next/link";

const featureCards = [
  {
    title: "Detect secrets fast",
    text: "Scan repos and external sources for API keys, tokens, private keys, credentials, and risky file patterns.",
  },
  {
    title: "Route alerts cleanly",
    text: "Send incidents to Slack or other channels with severity-based routing and simple admin controls.",
  },
  {
    title: "Audit every change",
    text: "Track policy edits, alert routing changes, and incident actions so the security workflow stays accountable.",
  },
  {
    title: "Tune policies quickly",
    text: "Use prevention templates for filename, format, size, credit card, and secret rules without rebuilding the stack.",
  },
  {
    title: "Monitor what matters",
    text: "See totals, severity mix, source spread, and recent incidents in one place to keep triage focused.",
  },
  {
    title: "MVP-friendly by design",
    text: "Lean UI, local fallback data, and env-driven integrations keep the product usable while the backend is being expanded.",
  },
];

const mvpPoints = [
  "One product surface for detection, routing, and policy control.",
  "Readable cards and charts instead of buried raw logs.",
  "Built-in fallback behavior so the demo still works when services are offline.",
  "Low-friction onboarding with only the essential integration inputs.",
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(61, 107, 158, 0.24), transparent 32%), radial-gradient(circle at top right, rgba(180, 35, 24, 0.12), transparent 28%), linear-gradient(180deg, #f7f9fc 0%, #eef3f9 52%, #f7f8fb 100%)",
        color: "var(--text)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "1.25rem 1.5rem 4rem" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "0.85rem 1rem",
            border: "1px solid rgba(255,255,255,0.7)",
            borderRadius: 18,
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
              Leak Ranger
            </div>
            <strong style={{ fontSize: "1rem" }}>Security leak monitoring for teams that need signal, not noise.</strong>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/login" className="btn" style={{ textDecoration: "none" }}>
              Sign in
            </Link>
            <Link href="/admin" className="btn secondary" style={{ textDecoration: "none" }}>
              Open dashboard
            </Link>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: "1rem",
            marginTop: "1.25rem",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.7)",
              borderRadius: 28,
              background: "linear-gradient(145deg, rgba(255,255,255,0.78), rgba(255,255,255,0.44))",
              backdropFilter: "blur(18px)",
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
              padding: "2rem",
            }}
          >
            <div className="badge badge-high" style={{ marginBottom: "0.9rem" }}>
              MVP security intelligence
            </div>
            <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", lineHeight: 0.95, margin: 0, letterSpacing: "-0.05em" }}>
              Leak Ranger
            </h1>
            <p style={{ maxWidth: 680, fontSize: "1.1rem", color: "var(--muted)", marginTop: "1rem", marginBottom: "1.5rem" }}>
              A glossy, focused leak-monitoring MVP that helps teams spot exposed secrets, route alerts, and keep a clean policy trail without drowning in tooling.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/admin" className="btn" style={{ textDecoration: "none" }}>
                Go to admin
              </Link>
              <Link href="/alerts" className="btn secondary" style={{ textDecoration: "none" }}>
                View incidents
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginTop: "1.5rem" }}>
              {[
                { label: "Detection", value: "Secrets + files" },
                { label: "Routing", value: "Slack + webhooks" },
                { label: "Policy", value: " CRUD baseline rules" },
                { label: "Audit", value: "Change history" },
              ].map((item) => (
                <div key={item.label} className="card" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(10px)" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "0.25rem" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.7)",
              borderRadius: 28,
              background: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.34))",
              backdropFilter: "blur(18px)",
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.06)",
              padding: "1.5rem",
              display: "grid",
              gap: "0.85rem",
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700 }}>
              Why this MVP works
            </div>
            {mvpPoints.map((point) => (
              <div
                key={point}
                style={{
                  padding: "0.9rem 1rem",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(226,229,235,0.9)",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
                }}
              >
                {point}
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "1rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
            <div>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", fontWeight: 700 }}>
                Product features
              </div>
              <h2 style={{ margin: "0.25rem 0 0", fontSize: "clamp(1.6rem, 4vw, 2.35rem)" }}>Useful pieces, not filler</h2>
            </div>
            <p style={{ maxWidth: 520, margin: 0, color: "var(--muted)" }}>
              These are the parts that make Leak Ranger practical for an MVP: visibility, control, fast response, and enough polish to demo well.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>
            {featureCards.map((feature, index) => (
              <article
                key={feature.title}
                className="card"
                style={{
                  minHeight: 180,
                  background:
                    index % 3 === 0
                      ? "linear-gradient(145deg, rgba(255,255,255,0.8), rgba(240,248,255,0.72))"
                      : index % 3 === 1
                      ? "linear-gradient(145deg, rgba(255,255,255,0.8), rgba(247,255,244,0.72))"
                      : "linear-gradient(145deg, rgba(255,255,255,0.8), rgba(255,247,242,0.72))",
                  backdropFilter: "blur(14px)",
                  borderRadius: 24,
                  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
                }}
              >
                <div className="badge badge-low" style={{ marginBottom: "0.75rem" }}>
                  0{index + 1}
                </div>
                <h3 style={{ marginTop: 0, marginBottom: "0.45rem" }}>{feature.title}</h3>
                <p style={{ margin: 0, color: "var(--muted)" }}>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
