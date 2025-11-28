/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // VERY IMPORTANT:
  // Do NOT use: output: "export"
  // We need the default server build so .next/routes-manifest.json is created.
};

module.exports = nextConfig;