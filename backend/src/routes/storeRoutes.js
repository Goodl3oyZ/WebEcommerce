import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { storeController } from "../controllers/storeController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { storeDto } from "../dtos/store.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public
router.get("/", storeController.getAllStores);
router.get("/:id", storeController.getStoreById);
router.get("/:id/products", storeController.getStoreProducts);
router.get("/:id/reviews", storeController.getStoreReviews);

// Admin
router.use(authMiddleware);
router.use(requireAdmin);

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
router.patch(
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
