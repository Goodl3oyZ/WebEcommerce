import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { productController } from "../controllers/productController.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { productDto } from "../dtos/product.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public — static paths before /:id
router.get("/", productController.getProducts);
router.get("/search", productController.searchProducts);
router.get("/category/:categoryId", productController.getProductsByCategory);
router.get("/:id/reviews", productController.getProductReviews);
router.get("/:id/variants", productController.getProductVariants);
router.get("/:id", productController.getProductById);

router.use(authMiddleware);

// User — reviews
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

// Admin — products & variants
router.post(
  "/",
  requireAdmin,
  validationMiddleware(productDto.createProduct),
  productController.createProduct
);
router.put(
  "/:id",
  requireAdmin,
  validationMiddleware(productDto.updateProduct),
  productController.updateProduct
);
router.patch(
  "/:id",
  requireAdmin,
  validationMiddleware(productDto.updateProduct),
  productController.updateProduct
);
router.delete("/:id", requireAdmin, productController.deleteProduct);

router.post(
  "/:id/variants",
  requireAdmin,
  validationMiddleware(productDto.createVariant),
  productController.createVariant
);
router.put(
  "/:id/variants/:variantId",
  requireAdmin,
  validationMiddleware(productDto.updateVariant),
  productController.updateVariant
);
router.patch(
  "/:id/variants/:variantId",
  requireAdmin,
  validationMiddleware(productDto.updateVariant),
  productController.updateVariant
);
router.delete(
  "/:id/variants/:variantId",
  requireAdmin,
  productController.deleteVariant
);

export default router;
