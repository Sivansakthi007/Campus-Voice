/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'https://campus-voice-backend-8sn7.onrender.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}



export default nextConfig
