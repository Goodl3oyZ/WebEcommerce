import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { notificationController } from "../controllers/notificationController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { notificationDto } from "../dtos/notification.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all notification routes
router.use(apiRateLimiter);

// Protected routes (auth required)
router.use(authMiddleware);

// User routes
router.get("/", notificationController.getUserNotifications);
router.get("/:id", notificationController.getNotificationById);
router.put(
  "/:id/read",
  validationMiddleware(notificationDto.markAsRead),
  notificationController.markAsRead
);
router.put(
  "/read-all",
  validationMiddleware(notificationDto.markAsRead),
  notificationController.markAllAsRead
);
router.delete(
  "/:id",
  validationMiddleware(notificationDto.deleteNotification),
  notificationController.deleteNotification
);

// Admin routes
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(notificationDto.createNotification),
  notificationController.createNotification
);
router.put(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(notificationDto.updateNotification),
  notificationController.updateNotification
);
router.delete(
  "/admin/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(notificationDto.deleteNotification),
  notificationController.deleteNotification
);
router.get(
  "/admin/all",
  requireRole(ROLES.ADMIN),
  notificationController.getAllNotifications
);
router.get(
  "/admin/:id",
  requireRole(ROLES.ADMIN),
  notificationController.getNotificationById
);

export default router;
