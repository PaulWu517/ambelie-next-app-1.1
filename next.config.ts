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
      // 腾讯云COS原始域名
      {
        protocol: 'https',
        hostname: 'ambelie-1368352639.cos.ap-guangzhou.myqcloud.com',
        pathname: '/**',
      },
      // CDN加速域名
      {
        protocol: 'https',
        hostname: 'media.ambelie.com',
        pathname: '/**',
      },
      // 旧的Strapi后端域名（兼容性保留）
      {
        protocol: 'https',
        hostname: 'ambelie-strapi.up.railway.app',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      // 将 /favicon.ico 映射到中文文件名的头像图片，避免浏览器强制请求 /favicon.ico 时显示默认图标
      { source: '/favicon.ico', destination: '/assets/vi/%E5%A4%B4%E5%83%8F.jpg' },
    ];
  },
};

export default nextConfig;
