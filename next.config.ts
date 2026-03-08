import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "https://kioh.jearn.site",
    "https://kazuma.jearn.site",
    "https://tamanegi.jearn.site",
    "https://www.jearn.site",
  ],

  experimental: {
    scrollRestoration: true,
    middlewareClientMaxBodySize: "100mb",
  },

  outputFileTracingRoot: path.join(__dirname),

  compiler: isProd
    ? {
        removeConsole: {
          exclude: ["error"],
        },
      }
    : {},

  /**
   * ✅ IMPORTANT: Allow production builds
   * without failing on ESLint errors
   */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /**
   * REQUIRED FOR next/image + R2 CDN
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jearn.site",
        pathname: "/**",
      },
    ],
  },

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