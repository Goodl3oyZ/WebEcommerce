import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

const createRedisStore = (prefix) => {
  const client = getRedisClient();
  return new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
    prefix,
  });
};

const limiterOptions = (prefix, options) => ({
  ...options,
  store: createRedisStore(prefix),
});

export const apiRateLimiter = rateLimit(
  limiterOptions("rl:api:", {
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many requests, please try again later.",
    },
  })
);

export const authRateLimiter = rateLimit(
  limiterOptions("rl:auth:", {
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many authentication attempts, please try again later.",
    },
  })
);

export const loginRateLimiter = rateLimit(
  limiterOptions("rl:login:", {
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many login attempts, please try again after 15 minutes.",
    },
  })
);

export const registerRateLimiter = rateLimit(
  limiterOptions("rl:register:", {
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many registration attempts, please try again after an hour.",
    },
  })
);

export const passwordResetRateLimiter = rateLimit(
  limiterOptions("rl:password-reset:", {
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message:
        "Too many password reset attempts, please try again after an hour.",
    },
  })
);

export const refreshTokenRateLimiter = rateLimit(
  limiterOptions("rl:refresh:", {
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message:
        "Too many token refresh attempts, please try again after 15 minutes.",
    },
  })
);

export const verifyEmailRateLimiter = rateLimit(
  limiterOptions("rl:verify-email:", {
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message:
        "Too many email verification attempts, please try again after an hour.",
    },
  })
);

export const logoutRateLimiter = rateLimit(
  limiterOptions("rl:logout:", {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many logout attempts, please try again after 15 minutes.",
    },
  })
);
