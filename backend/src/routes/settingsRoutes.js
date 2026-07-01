import express from "express";
import { settingsController } from "../controllers/settingsController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { settingsDto } from "../dtos/settings.dto.js";

const router = express.Router();

router.get("/public", settingsController.getPublicSettings);

router.get("/", authMiddleware, requireRole(ROLES.ADMIN), settingsController.getSettings);

router.put(
  "/",
  authMiddleware,
  requireRole(ROLES.ADMIN),
  validationMiddleware(settingsDto.updateSettings),
  settingsController.updateSettings
);
router.patch(
  "/",
  authMiddleware,
  requireRole(ROLES.ADMIN),
  validationMiddleware(settingsDto.updateSettings),
  settingsController.updateSettings
);

export default router;
