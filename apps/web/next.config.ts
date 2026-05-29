import type { NextConfig } from "next";

function isPublicHttpUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
    if (host.endsWith(".local")) return false;
    if (host.startsWith("10.")) return false;
    if (host.startsWith("192.168.")) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

const nextConfig: NextConfig = {
  async rewrites() {
    const bffUrl = process.env.BFF_URL;
    if (!isPublicHttpUrl(bffUrl)) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${bffUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
