import express from "express";
import { storeController } from "../controllers/storeController.js";
import { authMiddleware, optionalAuth } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { storeDto } from "../dtos/store.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Store not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public: branches, what they stock, and their reviews.
router.get("/", optionalAuth, validationMiddleware(storeDto.listQuery, "query"), storeController.getAllStores);
router.get("/:id", optionalAuth, storeController.getStoreById);
router.get("/:id/products", validationMiddleware(storeDto.listQuery, "query"), storeController.getStoreProducts);
router.get("/:id/reviews", validationMiddleware(storeDto.listQuery, "query"), storeController.getStoreReviews);

router.use(authMiddleware);
router.use(requireAdmin);

router.post("/", validationMiddleware(storeDto.createStore), storeController.createStore);
router.put("/:id", validationMiddleware(storeDto.updateStore), storeController.updateStore);
router.patch("/:id", validationMiddleware(storeDto.updateStore), storeController.updateStore);
router.delete("/:id", storeController.deleteStore);
router.get("/:id/orders", validationMiddleware(storeDto.ordersQuery, "query"), storeController.getStoreOrders);
router.get("/:id/analytics", validationMiddleware(storeDto.analyticsQuery, "query"), storeController.getStoreAnalytics);
router.put("/:id/settings", validationMiddleware(storeDto.updateSettings), storeController.updateStoreSettings);

export default router;
