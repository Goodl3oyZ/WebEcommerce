import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { collectionController } from "../controllers/collectionController.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { collectionDto } from "../dtos/collection.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all collection routes
router.use(apiRateLimiter);

// Public routes
router.get("/", collectionController.getCollections);
router.get("/:id", collectionController.getCollectionById);
router.get("/:id/products", collectionController.getCollectionProducts);

// Admin only routes
router.use(authMiddleware);
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(collectionDto.createCollection),
  collectionController.createCollection
);
router.put(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(collectionDto.updateCollection),
  collectionController.updateCollection
);
router.delete(
  "/:id",
  requireRole(ROLES.ADMIN),
  collectionController.deleteCollection
);

// Collection products management (Admin only)
router.post(
  "/:id/products",
  requireRole(ROLES.ADMIN),
  validationMiddleware(collectionDto.addProducts),
  collectionController.addProducts
);
router.delete(
  "/:id/products",
  requireRole(ROLES.ADMIN),
  validationMiddleware(collectionDto.removeProducts),
  collectionController.removeProducts
);

export default router;
