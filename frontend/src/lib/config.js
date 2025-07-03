// NO ONE CALL THIS FILE DIRECTLY
const config = {
  api: {
    baseURL:
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000", 10),
  },
  auth: {
    tokenKey: "accessToken",
    refreshTokenKey: "refreshToken",
  },
  storage: {
    userKey: "user",
  },
};

// Log config on initialization
if (typeof window !== "undefined") {
  console.log("🔧 Config initialized:", config);
}

export { config };
