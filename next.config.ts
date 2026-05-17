import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  output: 'standalone',
  /* config options here */
};

export default nextConfig;
