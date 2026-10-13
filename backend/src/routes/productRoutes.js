import express from "express";
import { authMiddleware, optionalAuth } from "../middlewares/authMiddleware.js";
import { productController } from "../controllers/productController.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { productDto } from "../dtos/product.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Product not found"));
router.param("categoryId", uuidParam("Category not found"));
router.param("variantId", uuidParam("Variant not found"));
router.param("reviewId", uuidParam("Review not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public catalogue (admins additionally see hidden products).
router.get("/", optionalAuth, validationMiddleware(productDto.listQuery, "query"), productController.getProducts);
router.get(
  "/search",
  optionalAuth,
  validationMiddleware(productDto.searchQuery, "query"),
  productController.searchProducts
);
router.get(
  "/category/:categoryId",
  optionalAuth,
  validationMiddleware(productDto.listQuery, "query"),
  productController.getProductsByCategory
);
router.get(
  "/:id/reviews",
  validationMiddleware(productDto.pageQuery, "query"),
  productController.getProductReviews
);
router.get("/:id/variants", optionalAuth, productController.getProductVariants);
router.get("/:id", optionalAuth, productController.getProductById);

router.use(authMiddleware);

// Reviews (customers)
router.get("/:id/review/eligibility", productController.reviewEligibility);
router.post("/:id/review", validationMiddleware(productDto.createReview), productController.createReview);
router.put(
  "/:id/review/:reviewId",
  validationMiddleware(productDto.updateReview),
  productController.updateReview
);
router.delete("/:id/review/:reviewId", productController.deleteReview);

// Catalogue management (admins)
router.post("/", requireAdmin, validationMiddleware(productDto.createProduct), productController.createProduct);
router.put("/:id", requireAdmin, validationMiddleware(productDto.updateProduct), productController.updateProduct);
router.patch("/:id", requireAdmin, validationMiddleware(productDto.updateProduct), productController.updateProduct);
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
router.delete("/:id/variants/:variantId", requireAdmin, productController.deleteVariant);

export default router;
