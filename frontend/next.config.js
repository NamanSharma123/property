/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Reduces output size for faster deployment
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Disable source maps in production to speed up build
  productionBrowserSourceMaps: false,
};

export default nextConfig;