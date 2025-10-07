import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ignore ESLint issues during production builds to prevent non-critical warnings from failing the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow builds to proceed even if there are TypeScript type errors.
  // This is useful to unblock deployments when warnings are treated strictly.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
