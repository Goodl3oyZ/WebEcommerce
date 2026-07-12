/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Disable Pages Router
  pageExtensions: ["jsx", "js", "ts", "tsx"],
  experimental: {
    // appDir: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/profiles/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/products/**",
      },
      {
        protocol: "http",
        hostname: "**",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],

    domains: [
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
      "platform-lookaside.fbsbx.com",
      "graph.facebook.com",
      "minio",
      "localhost",
    ],
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
