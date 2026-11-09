import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared rules engine ships as TypeScript source; let Next compile it.
  transpilePackages: ["@turtle-party/rules"],
};

export default nextConfig;
