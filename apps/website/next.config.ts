import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@kontafy/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "pub-3c9b20f24ae34d4d935610c014f9ba51.r2.dev",
      },
    ],
  },
};

export default nextConfig;
