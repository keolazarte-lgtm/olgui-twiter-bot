import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" only for self-hosted (VPS/Docker)
  // Vercel handles its own output, so we conditionally set it
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    // Allow images from Vercel Blob and local uploads
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },
};

export default nextConfig;
