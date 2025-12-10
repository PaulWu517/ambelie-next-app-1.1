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
      // 将 /favicon.ico 映射到英文文件名的头像图片，避免编码问题
      { source: '/favicon.ico', destination: '/assets/vi/avatar.png' },
      // Proxy MediaPipe model to bypass GFW/CORS
      { 
        source: '/models/pose_landmarker_full.task', 
        destination: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task' 
      },
    ];
  },
};

export default nextConfig;
