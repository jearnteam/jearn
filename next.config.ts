import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ["https://tamanegi.jearn.site", "https://ssh.jearn.site"],
};

export default nextConfig;