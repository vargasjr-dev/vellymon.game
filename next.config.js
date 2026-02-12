/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'vellymon.game']
    }
  }
};

module.exports = nextConfig;
