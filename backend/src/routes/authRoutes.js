import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
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
import { userController } from "../controllers/userController.js";

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
router.post(
  "/resend-verification",
  passwordResetRateLimiter,
  validationMiddleware(authDto.forgotPassword),
  authController.resendVerification
);

// Work without a valid access token: refresh exists for when it has expired,
// and logout must always be able to clear the session.
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

// Protected routes
router.use(authMiddleware);

router.get("/me", userController.getProfile);

router.post(
  "/change-password",
  validationMiddleware(authDto.changePassword),
  authController.changePassword
);

// Signs the current user out of every device.
router.post("/logout-all", logoutRateLimiter, authController.logoutAllSessions);

export default router;
