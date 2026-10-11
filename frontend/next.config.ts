import type { NextConfig } from "next";

// In production the browser calls the API directly at NEXT_PUBLIC_API_BASE_URL (CORS-allowed).
// For local development without that variable, /api is proxied to the backend instead.
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const devBackend = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    if (apiBase) return [];
    return [{ source: "/api/:path*", destination: `${devBackend}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The screening flow needs the camera and the pharmacy finder needs location.
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
