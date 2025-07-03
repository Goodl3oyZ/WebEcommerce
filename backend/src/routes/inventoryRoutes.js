import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { inventoryController } from "../controllers/inventoryController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { inventoryDto } from "../dtos/inventory.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all inventory routes
router.use(apiRateLimiter);

// Protected routes (auth required)
router.use(authMiddleware);

// Admin routes
router.get(
  "/",
  requireRole(ROLES.ADMIN),
  inventoryController.getAllInventoryItems
);
router.get(
  "/:id",
  requireRole(ROLES.ADMIN),
  inventoryController.getInventoryItemById
);
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(inventoryDto.createInventoryItem),
  inventoryController.createInventoryItem
);
router.put(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(inventoryDto.updateInventoryItem),
  inventoryController.updateInventoryItem
);
router.post(
  "/:id/adjust",
  requireRole(ROLES.ADMIN),
  validationMiddleware(inventoryDto.adjustInventory),
  inventoryController.adjustInventory
);
router.post(
  "/:id/transfer",
  requireRole(ROLES.ADMIN),
  validationMiddleware(inventoryDto.transferInventory),
  inventoryController.transferInventory
);
router.get(
  "/product/:productId",
  requireRole(ROLES.ADMIN),
  inventoryController.getProductInventory
);
router.get(
  "/location/:location",
  requireRole(ROLES.ADMIN),
  inventoryController.getLocationInventory
);
router.get(
  "/low-stock",
  requireRole(ROLES.ADMIN),
  inventoryController.getLowStockItems
);

export default router;
