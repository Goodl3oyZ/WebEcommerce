import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { storeController } from "../controllers/storeController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { storeDto } from "../dtos/store.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all store routes
router.use(apiRateLimiter);

// Public Store Routes
router.get("/", storeController.getStoreProducts);
router.get("/:id", storeController.getStoreById);
router.get("/:id/products", storeController.getStoreProducts);
router.get("/:id/reviews", storeController.getStoreReviews);

// Admin Store Routes
router.use(authMiddleware);
router.use(requireRole(ROLES.ADMIN));

router.post(
  "/",
  validationMiddleware(storeDto.createStore),
  storeController.createStore
);
router.put(
  "/:id",
  validationMiddleware(storeDto.updateStore),
  storeController.updateStore
);
router.delete("/:id", storeController.deleteStore);
router.get("/:id/orders", storeController.getStoreOrders);
router.get("/:id/analytics", storeController.getStoreAnalytics);
router.put(
  "/:id/settings",
  validationMiddleware(storeDto.updateStore),
  storeController.updateStoreSettings
);

export default router;
