import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { categoryController } from "../controllers/categoryController.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { categoryDto } from "../dtos/category.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all category routes
router.use(apiRateLimiter);

// Public routes
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);
router.get("/:id/products", categoryController.getCategoryProducts);

// Admin only routes
router.use(authMiddleware);
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(categoryDto.createCategory),
  categoryController.createCategory
);
router.put(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(categoryDto.updateCategory),
  categoryController.updateCategory
);
router.patch(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(categoryDto.updateCategory),
  categoryController.updateCategory
);
router.delete(
  "/:id",
  requireRole(ROLES.ADMIN),
  categoryController.deleteCategory
);

export default router;
