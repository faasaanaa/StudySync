/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for production builds; dev mode needs dynamic route support
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig;
