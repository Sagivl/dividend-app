/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
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

  transpilePackages: [],
};

module.exports = nextConfig;
