import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { brandController } from "../controllers/brandController.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { brandDto } from "../dtos/brand.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all brand routes
router.use(apiRateLimiter);

// Public routes
router.get("/", brandController.getBrands);
router.get("/:id", brandController.getBrandById);
router.get("/:id/products", brandController.getBrandProducts);

// Admin only routes
router.use(authMiddleware);
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(brandDto.createBrand),
  brandController.createBrand
);
router.put(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(brandDto.updateBrand),
  brandController.updateBrand
);
router.patch(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(brandDto.updateBrand),
  brandController.updateBrand
);
router.delete("/:id", requireRole(ROLES.ADMIN), brandController.deleteBrand);

export default router;
