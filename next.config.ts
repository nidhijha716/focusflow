import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security/csp";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Applies to every route. See src/lib/security/csp.ts for rationale
        // (04_Security_and_Access.pdf §5).
        source: "/(.*)",
        headers: buildSecurityHeaders(isDev).map((header) => ({ ...header })),
      },
    ];
  },
};

export default nextConfig;
