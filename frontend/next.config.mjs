import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const nextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },

  // Match Django/DRF default trailing-slash API style to avoid redirect loops.
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // Allow accessing the dev server via LAN IP without Next blocking /_next/* assets.
  // This list is hostnames (not full URLs).
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.102', '192.168.80.1', '192.168.0.108', '192.168.0.112', '192.168.103.4', '192.168.117.4'],
}

export default nextConfig

