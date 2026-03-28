import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ['@libsql/client', '@libsql/hrana-client', '@prisma/adapter-libsql'],
};

export default nextConfig;
