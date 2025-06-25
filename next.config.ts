import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // 暂时禁用图片优化以解决超时问题
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ambelie-backend-production.up.railway.app',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
