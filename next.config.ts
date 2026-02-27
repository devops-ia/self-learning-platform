import type { NextConfig } from "next";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// Allow disabling TLS certificate verification for environments with
// self-signed certs or corporate proxies (set INSECURE_TLS=1).
// Works in both development and production containers (e.g. docker-run-insecure).
if (process.env.INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.warn(
    `WARNING: TLS certificate verification is disabled (INSECURE_TLS=1) — NODE_ENV=${process.env.NODE_ENV}`
  );
}

const isDev = process.env.NODE_ENV !== "production";
const isInsecure = process.env.INSECURE_TLS === "1";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Apply permissive headers in development OR when INSECURE_TLS=1 is set
  // (e.g. docker-run-insecure). Prevents the browser from caching HSTS for
  // localhost and unblocks Next.js inline bootstrap scripts over plain HTTP.
  async headers() {
    if (!isDev && !isInsecure) return [];
    return [
      {
        source: "/(.*)",
        headers: [
          // Expire HSTS immediately so the browser stops upgrading HTTP→HTTPS.
          { key: "Strict-Transport-Security", value: "max-age=0" },
          // Allow unsafe-inline so Next.js inline scripts are not blocked.
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
