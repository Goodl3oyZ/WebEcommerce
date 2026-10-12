import express from "express";
import { settingsController } from "../controllers/settingsController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { settingsDto } from "../dtos/settings.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

router.get("/public", settingsController.getPublicSettings);
router.get("/", authMiddleware, requireAdmin, settingsController.getSettings);
router.put("/", authMiddleware, requireAdmin, validationMiddleware(settingsDto.updateSettings), settingsController.updateSettings);
router.patch("/", authMiddleware, requireAdmin, validationMiddleware(settingsDto.updateSettings), settingsController.updateSettings);

export default router;
