/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Next 16 blocks cross-origin dev-server requests by default. Without this,
  // opening the dev site as 127.0.0.1 (rather than localhost) breaks hot reload.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // Next 16 writes AGENTS.md / CLAUDE.md into the project on first run; this
  // project documents itself in its README instead.
  agentRules: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
    ],
  },
};

export default nextConfig;
