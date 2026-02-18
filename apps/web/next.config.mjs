/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@chillspace/protocol", "@chillspace/game", "@chillspace/music"],
  reactStrictMode: true
};

export default nextConfig;
