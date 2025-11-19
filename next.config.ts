import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  experimental: {
    scrollRestoration: true, // 🚀 Browser-native back button restore
  },

  outputFileTracingRoot: path.join(__dirname),

  compiler: isProd
    ? {
        removeConsole: {
          exclude: ["error"],
        },
      }
    : {},

  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
