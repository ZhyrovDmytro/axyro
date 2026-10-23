import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir:
    process.env.AXYRO_NEXT_DIST_DIR ??
    process.env.VEYRO_NEXT_DIST_DIR ??
    ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
    ];
  },
  images: {
    localPatterns: [
      { pathname: "/**", search: "" },
      {
        pathname: "/images/exercises/positions/**",
        search: "?v=2026-10-09-positions-v2",
      },
    ],
  },
};

export default nextConfig;
