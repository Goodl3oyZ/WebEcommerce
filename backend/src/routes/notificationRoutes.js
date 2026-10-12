import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { notificationController } from "../controllers/notificationController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { notificationDto } from "../dtos/notification.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);
router.use(authMiddleware);

// Admin static paths (before /:id)
router.get("/admin/all", requireAdmin, notificationController.getAllNotifications);
router.get("/admin/:id", requireAdmin, notificationController.getNotificationById);
router.delete(
  "/admin/:id",
  requireAdmin,
  notificationController.deleteNotification
);

router.get("/", notificationController.getUserNotifications);
router.put(
  "/read-all",
  validationMiddleware(notificationDto.markAsRead),
  notificationController.markAllAsRead
);
router.patch(
  "/read-all",
  validationMiddleware(notificationDto.markAsRead),
  notificationController.markAllAsRead
);

router.post(
  "/",
  requireAdmin,
  validationMiddleware(notificationDto.createNotification),
  notificationController.createNotification
);

router.put(
  "/:id/read",
  validationMiddleware(notificationDto.markAsRead),
  notificationController.markAsRead
);
router.patch(
  "/:id/read",
  validationMiddleware(notificationDto.markAsRead),
  notificationController.markAsRead
);
router.put(
  "/:id",
  requireAdmin,
  validationMiddleware(notificationDto.updateNotification),
  notificationController.updateNotification
);
router.patch(
  "/:id",
  requireAdmin,
  validationMiddleware(notificationDto.updateNotification),
  notificationController.updateNotification
);
router.delete("/:id", notificationController.deleteNotification);
router.get("/:id", notificationController.getNotificationById);

export default router;
