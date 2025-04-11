/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    domains: ['localhost'],
    unoptimized: false,
  },
  // Make sure API routes work properly
  output: 'standalone',
};

module.exports = nextConfig;
