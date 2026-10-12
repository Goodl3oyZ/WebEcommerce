import express from "express";
import { inventoryController } from "../controllers/inventoryController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { inventoryDto } from "../dtos/inventory.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Inventory item not found"));
router.param("productId", uuidParam("Product not found"));
router.param("location", uuidParam("Store not found"));

router.use(apiRateLimiter);
router.use(authMiddleware);
router.use(requireRole(ROLES.ADMIN));

const listQuery = validationMiddleware(inventoryDto.listQuery, "query");

router.get("/low-stock", validationMiddleware(inventoryDto.lowStockQuery, "query"), inventoryController.getLowStockItems);
router.get("/product/:productId", listQuery, inventoryController.getInventoryByProduct);
// :location is a store id (kept for compatibility with the original path).
router.get("/location/:location", listQuery, inventoryController.getInventoryByLocation);
router.get("/", listQuery, inventoryController.getAllInventoryItems);
router.post("/", validationMiddleware(inventoryDto.createInventoryItem), inventoryController.createInventoryItem);
router.post("/:id/adjust", validationMiddleware(inventoryDto.adjustInventory), inventoryController.adjustInventory);
router.post("/:id/transfer", validationMiddleware(inventoryDto.transferInventory), inventoryController.transferInventory);
router.get("/:id", inventoryController.getInventoryItemById);
router.put("/:id", validationMiddleware(inventoryDto.updateInventoryItem), inventoryController.updateInventoryItem);

export default router;
