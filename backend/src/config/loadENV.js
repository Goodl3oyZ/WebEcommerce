import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// JWT Configuration
export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET,
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ACCESS_EXPIRATION: parseInt(process.env.JWT_ACCESS_EXPIRATION) || 86400,
  REFRESH_EXPIRATION: parseInt(process.env.JWT_REFRESH_EXPIRATION) || 2592000,
};

// Database Configuration
export const DB_CONFIG = {
  URL: process.env.DATABASE_URL,
};

// Redis Configuration
export const REDIS_CONFIG = {
  URL: process.env.REDIS_URL,
};

// Minio Configuration
export const MINIO_CONFIG = {
  HOST: process.env.MINIO_HOST || "localhost",
  ROOT_USER: process.env.MINIO_ROOT_USER,
  ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD,
  API_PORT: parseInt(process.env.MINIO_API_PORT) || 9000,
  CONSOLE_PORT: parseInt(process.env.MINIO_CONSOLE_PORT) || 9001,
  USE_SSL: process.env.MINIO_USE_SSL === "true",
  // Browser-facing base URL for objects, e.g. https://shop.example.com/media
  PUBLIC_URL: process.env.MINIO_PUBLIC_URL?.replace(/\/+$/, "") || "",
};

// PgAdmin Configuration
export const PGADMIN_CONFIG = {
  DEFAULT_EMAIL: process.env.PGADMIN_DEFAULT_EMAIL,
  DEFAULT_PASSWORD: process.env.PGADMIN_DEFAULT_PASSWORD,
  PORT: parseInt(process.env.PGADMIN_PORT) || 8080,
};

// Server Configuration
export const SERVER_CONFIG = {
  PORT: parseInt(process.env.BACKEND_PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || "",
  ALLOWED_ORIGINS:
    process.env.ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) || [],
  // Number of reverse proxies in front of the app (Caddy/nginx/load balancer).
  TRUST_PROXY: parseInt(process.env.TRUST_PROXY, 10) || 0,
  API_URL: process.env.API_URL || "",
  HOST: process.env.BACKEND_HOST || "localhost",
  FRONTEND_URL: process.env.FRONTEND_URL || "",
};

// Email Configuration
function cleanEnv(value) {
  if (!value) return undefined;
  return value.trim().replace(/^['"]|['"]$/g, "").trim() || undefined;
}

export const EMAIL_CONFIG = {
  HOST: cleanEnv(process.env.EMAIL_HOST),
  PORT: parseInt(process.env.EMAIL_PORT) || 587,
  USER: cleanEnv(process.env.EMAIL_USER),
  // Gmail app passwords are 16 chars; Google displays them with spaces.
  PASSWORD: cleanEnv(process.env.EMAIL_APP_PASSWORD)?.replace(/\s+/g, "") || undefined,
};

// Security Configuration
export const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 10,
  LOCKOUT_DURATION: parseInt(process.env.LOCKOUT_DURATION) || 300,
  PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(",").map((t) => t.trim()) || [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
};

// Validate required environment variables
const requiredEnvVars = {
  JWT_SECRET: JWT_CONFIG.SECRET,
  JWT_REFRESH_SECRET: JWT_CONFIG.REFRESH_SECRET,
  DATABASE_URL: DB_CONFIG.URL,
  REDIS_URL: REDIS_CONFIG.URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

if (!JWT_CONFIG.SECRET || JWT_CONFIG.SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

if (!JWT_CONFIG.REFRESH_SECRET || JWT_CONFIG.REFRESH_SECRET.length < 32) {
  throw new Error("JWT_REFRESH_SECRET must be at least 32 characters");
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters");
}
const facebookConfig = {
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
};
const googleConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
};
const githubConfig = {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
};
const sessionSecret = process.env.SESSION_SECRET;
const isProduction = SERVER_CONFIG.NODE_ENV === "production";

// No fallback keys: a made-up key only fails later with a confusing
// "authentication failure" from Omise. Required in production (checked below);
// in development card/PromptPay payments are refused until they are set.
const omisePublicKey = process.env.OMISE_PUBLIC_KEY || undefined;
const omiseSecretKey = process.env.OMISE_SECRET_KEY || undefined;
if (!isProduction && !omiseSecretKey && SERVER_CONFIG.NODE_ENV !== "test") {
  console.warn(
    "OMISE_SECRET_KEY is not set: card and PromptPay payments will fail. Add your Omise test keys to backend/.env."
  );
}

if (isProduction) {
  const missingProdVars = Object.entries({
    OMISE_PUBLIC_KEY: omisePublicKey,
    OMISE_SECRET_KEY: omiseSecretKey,
    FRONTEND_URL: SERVER_CONFIG.FRONTEND_URL,
    ALLOWED_ORIGINS: SERVER_CONFIG.ALLOWED_ORIGINS.length ? "set" : "",
    MINIO_ROOT_USER: MINIO_CONFIG.ROOT_USER,
    MINIO_ROOT_PASSWORD: MINIO_CONFIG.ROOT_PASSWORD,
    MINIO_PUBLIC_URL: MINIO_CONFIG.PUBLIC_URL,
  })
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingProdVars.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingProdVars.join(", ")}`
    );
  }
}
// Export all configurations
const callbackURL = {
  github: process.env.GITHUB_CALLBACK_URL,
  google: process.env.GOOGLE_CALLBACK_URL,
  facebook: process.env.FACEBOOK_CALLBACK_URL,
};

export const ENV = {
  OMISE_SECRET_KEY: omiseSecretKey,
  OMISE_PUBLIC_KEY: omisePublicKey,
  JWT: JWT_CONFIG,
  DB: DB_CONFIG,
  REDIS: REDIS_CONFIG,
  SERVER: SERVER_CONFIG,
  EMAIL: EMAIL_CONFIG,
  SECURITY: SECURITY_CONFIG,
  UPLOAD: UPLOAD_CONFIG,
  FBAuth: facebookConfig,
  GOOGLEAuth: googleConfig,
  GITHUBAuth: githubConfig,
  SESSION_SECRET: sessionSecret,
  MINIO: MINIO_CONFIG,
  PGADMIN: PGADMIN_CONFIG,
  CALLBACK_URL: callbackURL,
};
