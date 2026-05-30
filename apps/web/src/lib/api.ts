// If a public BFF URL is provided at build/runtime, prefer calling it directly
// from the client. Otherwise fall back to the internal `/api` route which
// contains demo handlers when running in demo mode.
const PUBLIC_BFF = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_BFF_URL || "") : "";
const API = PUBLIC_BFF ? `${PUBLIC_BFF.replace(/\/+$/, "")}/api` : "/api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const hasBody = options.body !== undefined && options.body !== null;
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    if (res.status === 401 && typeof window !== "undefined") {
      const isLoginPage = window.location.pathname.startsWith("/login");
      if (!isLoginPage) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        window.location.replace("/login");
        return new Promise<T>(() => {});
      }
    }
    let message = err && typeof err === "object" && "error" in err
      ? String((err as { error: unknown }).error)
      : "";
    if (!message) {
      message = res.statusText || `Request failed: ${res.status}`;
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
