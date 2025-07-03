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
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
