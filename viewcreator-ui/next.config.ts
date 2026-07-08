import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "viewcreator-templates.s3.us-east-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
