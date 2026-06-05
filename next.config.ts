import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve smaller modern formats; big win for cover/inline images.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  serverExternalPackages: ["mongoose"],
  // Strip console.* (except warn/error) from production client bundles.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    // Tree-shake these so only the icons/helpers actually used get bundled.
    optimizePackageImports: ["react-markdown", "remark-gfm", "rehype-slug"],
  },
};

export default nextConfig;
