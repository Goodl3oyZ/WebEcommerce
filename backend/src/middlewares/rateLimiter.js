import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

// Helper function to create Redis store with proper configuration
const createRedisStore = (prefix) => {
  const client = getRedisClient();
  return new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
    prefix,
  });
};

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
});

// Stricter rate limiter for auth routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 50 to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again later.",
  },
});

// Login rate limiter
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased from 5 to 20 login attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many login attempts, please try again after 15 minutes.",
  },
});

// Register rate limiter
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased from 3 to 10 registration attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many registration attempts, please try again after an hour.",
  },
});

// Password reset rate limiter
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased from 3 to 10 password reset attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many password reset attempts, please try again after an hour.",
  },
});

// Refresh token rate limiter
export const refreshTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased from 10 to 50 refresh token attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many token refresh attempts, please try again after 15 minutes.",
  },
});

// Verify email rate limiter
export const verifyEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased from 5 to 20 email verification attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many email verification attempts, please try again after an hour.",
  },
});

// Logout rate limiter
export const logoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased from 20 to 100 logout attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many logout attempts, please try again after 15 minutes.",
  },
});
