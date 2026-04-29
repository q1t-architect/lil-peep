import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "api.mapbox.com", pathname: "/**" },
      { protocol: "https", hostname: "*.mapbox.com", pathname: "/**" },
      { protocol: "https", hostname: "uitguktdrkhjpepkzrhe.supabase.co", pathname: "/**" },
    ],
  },
};

export default nextConfig;
