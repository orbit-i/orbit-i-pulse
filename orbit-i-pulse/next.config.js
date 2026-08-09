/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable font optimization — we load Google Fonts via a plain <link>
  // tag in layout.tsx. Next.js font optimization tries to download and
  // inline the font CSS at build time, which fails in sandboxed/restricted
  // environments. Vercel serves the font from Google's CDN directly.
  optimizeFonts: false,
};

module.exports = nextConfig;
