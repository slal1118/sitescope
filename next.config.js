const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence "multiple lockfiles" warning when repo is nested under a parent directory
  outputFileTracingRoot: path.join(__dirname, '../'),
  // Next.js 15: moved out of experimental
  serverExternalPackages: ['cheerio', '@react-pdf/renderer', 'pdfkit'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
