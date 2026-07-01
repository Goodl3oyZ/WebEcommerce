import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { inventoryController } from "../controllers/inventoryController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { inventoryDto } from "../dtos/inventory.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);
router.use(authMiddleware);
router.use(requireAdmin);

// Static paths before /:id
router.get("/low-stock", inventoryController.getLowStockItems);
router.get("/product/:productId", inventoryController.getInventoryByProduct);
router.get("/location/:location", inventoryController.getInventoryByLocation);

router.get("/", inventoryController.getAllInventoryItems);
router.post(
  "/",
  validationMiddleware(inventoryDto.createInventoryItem),
  inventoryController.createInventoryItem
);

router.post(
  "/:id/adjust",
  validationMiddleware(inventoryDto.adjustInventory),
  inventoryController.adjustInventory
);
router.post(
  "/:id/transfer",
  validationMiddleware(inventoryDto.transferInventory),
  inventoryController.transferInventory
);
router.get("/:id", inventoryController.getInventoryItemById);
router.put(
  "/:id",
  validationMiddleware(inventoryDto.updateInventoryItem),
  inventoryController.updateInventoryItem
);

export default router;
