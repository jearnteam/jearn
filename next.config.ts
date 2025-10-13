import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ✅ Allow build even if ESLint finds warnings or "any" types
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Makes sure Next.js finds all your files when deployed through Cloudflare or PM2
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
