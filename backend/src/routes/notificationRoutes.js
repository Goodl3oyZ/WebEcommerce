import express from "express";
import { notificationController } from "../controllers/notificationController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { notificationDto } from "../dtos/notification.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Notification not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);
router.use(authMiddleware);

// Static paths first, so "read-all" is never taken for an :id.
router.put("/read-all", validationMiddleware(notificationDto.markAsRead), notificationController.markAllAsRead);
router.patch("/read-all", validationMiddleware(notificationDto.markAsRead), notificationController.markAllAsRead);

// Admin
router.get(
  "/admin/all",
  requireAdmin,
  validationMiddleware(notificationDto.adminListQuery, "query"),
  notificationController.getAllNotifications
);
router.get("/admin/:id", requireAdmin, notificationController.getNotificationByIdAdmin);
router.delete("/admin/:id", requireAdmin, notificationController.deleteNotificationAdmin);
router.post("/", requireAdmin, validationMiddleware(notificationDto.createNotification), notificationController.createNotification);
router.put("/:id", requireAdmin, validationMiddleware(notificationDto.updateNotification), notificationController.updateNotification);
router.patch("/:id", requireAdmin, validationMiddleware(notificationDto.updateNotification), notificationController.updateNotification);

// Own notifications
router.get("/", validationMiddleware(notificationDto.listQuery, "query"), notificationController.getUserNotifications);
router.put("/:id/read", notificationController.markAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);
router.get("/:id", notificationController.getNotificationById);

export default router;
