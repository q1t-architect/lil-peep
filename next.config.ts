import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/lil-peep",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "api.mapbox.com", pathname: "/**" },
      { protocol: "https", hostname: "*.mapbox.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
