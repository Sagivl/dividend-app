/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Rewrite /etoro-api/* to the eToro public API (for client-side compatibility)
  // The actual API key injection happens in the API route
  async rewrites() {
    return [
      {
        source: '/etoro-api/:path*',
        destination: '/api/etoro/:path*',
      },
    ];
  },

  // Allow images from eToro CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.etoro.com',
      },
    ],
  },

  // Transpile Base44 SDK if needed
  transpilePackages: ['@base44/sdk'],
};

module.exports = nextConfig;
