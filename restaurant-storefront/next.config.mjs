/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Permitir imágenes externas (logos, heroImages de cualquier CDN/S3/etc.)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // cualquier dominio HTTPS — los tenants pueden alojar imágenes donde quieran
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
