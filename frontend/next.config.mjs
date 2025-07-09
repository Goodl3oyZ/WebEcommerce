/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Disable Pages Router
  pageExtensions: ["jsx", "js", "ts", "tsx"],
  experimental: {
    // appDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/profiles/**", // For profile images
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/products/**", // <-- ADD THIS LINE for product images
      },
    ],

    domains: [
      "avatars.githubusercontent.com", // GitHub
      "lh3.googleusercontent.com", // Google (Gmail)
      "platform-lookaside.fbsbx.com", // Facebook
      "graph.facebook.com", // Facebook (บางกรณีเก่า)
      "minio",
    ],
  },
  async rewrites() {
    const isDev = process.env.NODE_ENV === "development";
    const backendUrl = isDev
      ? "http://backend-dev:5000"
      : "http://localhost:5000";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
