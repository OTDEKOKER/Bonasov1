/** @type {import('next').NextConfig} */
const backendApiBase =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000/api'

const normalizedBackendApiBase = backendApiBase.replace(/\/+$/, '')

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
  // In production set BACKEND_API_URL (or NEXT_PUBLIC_API_URL) to your deployed backend URL.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${normalizedBackendApiBase}/:path*/`,
      },
    ]
  },
}

export default nextConfig
