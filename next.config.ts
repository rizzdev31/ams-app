import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Local phones on the LAN hit the dev server via its network address.
  allowedDevOrigins: ["192.168.110.162", "localhost", "127.0.0.1"],
  async redirects() {
    return [
      // Rute lama dasbor admin.
      { source: '/admin', destination: '/panitia', permanent: true },
      { source: '/admin/:path*', destination: '/panitia/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
