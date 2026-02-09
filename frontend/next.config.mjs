/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // Match Django/DRF default trailing-slash API style to avoid redirect loops.
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // Allow accessing the dev server via LAN IP without Next blocking /_next/* assets.
  // This list is hostnames (not full URLs).
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.112', '192.168.103.4', '192.168.117.4'],

  // Proxy frontend /api/* -> Django backend /api/*.
  // This removes CORS issues and avoids hardcoding IPs in the browser.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*/',
      },
    ]
  },
}

export default nextConfig



