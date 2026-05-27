"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/login");
  }

  const links =
    role === "admin"
      ? [
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/integrations", label: "Integrations" },
          { href: "/admin/policies", label: "Policies" },
          { href: "/alerts", label: "Incidents" },
        ]
      : [{ href: "/alerts", label: "My Alerts" }];

  return (
    <header
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0.75rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <nav style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
        <strong>Leak Radar</strong>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontWeight: pathname.startsWith(l.href) ? 600 : 400,
              color: pathname.startsWith(l.href) ? "var(--accent)" : "var(--text)",
            }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <button type="button" className="secondary" onClick={logout}>
        Sign out
      </button>
    </header>
  );
}
