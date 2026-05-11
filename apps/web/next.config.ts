import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Monorepo: workspace package'larını transpile et
  transpilePackages: ['@niyet/core', '@niyet/db', '@niyet/graphql', '@niyet/ai'],
  // Server Component'lerde Prisma'yı external olarak işaretle (bundling sorunlarını önler)
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Niyet logo'su, mock merchant ikonları için
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
  typedRoutes: true,
};

export default nextConfig;
