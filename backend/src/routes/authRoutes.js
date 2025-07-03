import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import {
  apiRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  refreshTokenRateLimiter,
  verifyEmailRateLimiter,
  logoutRateLimiter,
} from "../middlewares/rateLimiter.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { authController } from "../controllers/authController.js";
import { authDto } from "../dtos/auth.dto.js";

const router = express.Router();

// Apply general API rate limiter to all auth routes
router.use(apiRateLimiter);

// Public routes
router.post(
  "/register",
  registerRateLimiter,
  validationMiddleware(authDto.register),
  authController.register
);

router.post(
  "/login",
  loginRateLimiter,
  validationMiddleware(authDto.login),
  authController.login
);

router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  validationMiddleware(authDto.forgotPassword),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  passwordResetRateLimiter,
  validationMiddleware(authDto.resetPassword),
  authController.resetPassword
);

router.get("/verify-email", verifyEmailRateLimiter, authController.verifyEmail);

// Protected routes
router.use(authMiddleware);

router.post(
  "/change-password",
  validationMiddleware(authDto.changePassword),
  authController.changePassword
);

router.post(
  "/refresh-token",
  refreshTokenRateLimiter,
  validationMiddleware(authDto.refreshToken),
  authController.refreshToken
);

router.post(
  "/logout",
  logoutRateLimiter,
  validationMiddleware(authDto.logout),
  authController.logout
);

router.post(
  "/logout-all",
  [requireRole(ROLES.ADMIN), logoutRateLimiter],
  authController.logoutAllSessions
);

export default router;
