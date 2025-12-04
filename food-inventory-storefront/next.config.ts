import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Especificar el directorio raíz para evitar el warning de múltiples lockfiles
  outputFileTracingRoot: path.join(__dirname),

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
