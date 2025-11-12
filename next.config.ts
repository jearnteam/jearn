import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),

  compiler: isProd
    ? {
        removeConsole: {
          exclude: ["error"], // keep only console.error, strip log, warn, info, etc.
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
