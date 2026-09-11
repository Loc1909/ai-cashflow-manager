import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA will be added via next-pwa wrapper
  experimental: {},
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
