import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

const path = require("path");

module.exports = {
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
