import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { productController } from "../controllers/productController.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { productDto } from "../dtos/product.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all product routes
router.use(apiRateLimiter);

// Public routes
router.get("/", productController.getProducts);
router.get("/search", productController.searchProducts);
router.get("/category/:categoryId", productController.getProductsByCategory);
router.get("/:id", productController.getProductById);

// Protected routes (auth required)
router.use(authMiddleware);

// User routes
router.post(
  "/:id/review",
  validationMiddleware(productDto.createReview),
  productController.createReview
);
router.put(
  "/:id/review/:reviewId",
  validationMiddleware(productDto.updateReview),
  productController.updateReview
);
router.delete("/:id/review/:reviewId", productController.deleteReview);

// Admin only routes
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(productDto.createProduct),
  productController.createProduct
);
router.put(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(productDto.updateProduct),
  productController.updateProduct
);
router.delete(
  "/:id",
  requireRole(ROLES.ADMIN),
  productController.deleteProduct
);

router.post(
  "/:id/variants",
  requireRole(ROLES.ADMIN),
  validationMiddleware(productDto.createVariant),
  productController.createVariant
);
router.put(
  "/:id/variants/:variantId",
  requireRole(ROLES.ADMIN),
  validationMiddleware(productDto.updateVariant),
  productController.updateVariant
);
router.delete(
  "/:id/variants/:variantId",
  requireRole(ROLES.ADMIN),
  productController.deleteVariant
);

export default router;
