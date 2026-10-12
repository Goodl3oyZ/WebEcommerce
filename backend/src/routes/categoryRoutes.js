import express from "express";
import { authMiddleware, optionalAuth } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { categoryController } from "../controllers/categoryController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { categoryDto } from "../dtos/category.dto.js";
import { productDto } from "../dtos/product.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Category not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);
router.get(
  "/:id/products",
  optionalAuth,
  validationMiddleware(productDto.listQuery, "query"),
  categoryController.getCategoryProducts
);

router.use(authMiddleware);

router.post("/", requireAdmin, validationMiddleware(categoryDto.createCategory), categoryController.createCategory);
router.put("/:id", requireAdmin, validationMiddleware(categoryDto.updateCategory), categoryController.updateCategory);
router.patch("/:id", requireAdmin, validationMiddleware(categoryDto.updateCategory), categoryController.updateCategory);
router.delete("/:id", requireAdmin, categoryController.deleteCategory);

export default router;
