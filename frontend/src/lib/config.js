// NO ONE CALL THIS FILE DIRECTLY
const apiRoot = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const config = {
  api: {
    baseURL: `${apiRoot}/api`,
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000", 10),
  },
  oauth: {
    /** OAuth routes live at /oauth/* (not /api/oauth). Callbacks: /oauth/{provider}/callback */
    startUrl: (provider) => `${apiRoot}/oauth/${provider}`,
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
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  console.log("🔧 Config initialized:", config);
}

export { config };
