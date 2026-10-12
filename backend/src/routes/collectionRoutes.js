import express from "express";
import { authMiddleware, optionalAuth } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { collectionController } from "../controllers/collectionController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { collectionDto } from "../dtos/collection.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Collection not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public (admins additionally see hidden collections and products).
router.get(
  "/",
  optionalAuth,
  validationMiddleware(collectionDto.listQuery, "query"),
  collectionController.getCollections
);
router.get("/:id", optionalAuth, collectionController.getCollectionById);
router.get(
  "/:id/products",
  optionalAuth,
  validationMiddleware(collectionDto.listQuery, "query"),
  collectionController.getCollectionProducts
);

router.use(authMiddleware);

router.post("/", requireAdmin, validationMiddleware(collectionDto.createCollection), collectionController.createCollection);
router.put("/:id", requireAdmin, validationMiddleware(collectionDto.updateCollection), collectionController.updateCollection);
router.delete("/:id", requireAdmin, collectionController.deleteCollection);
router.post("/:id/products", requireAdmin, validationMiddleware(collectionDto.addProducts), collectionController.addProducts);
router.delete(
  "/:id/products",
  requireAdmin,
  validationMiddleware(collectionDto.removeProducts),
  collectionController.removeProducts
);

export default router;
