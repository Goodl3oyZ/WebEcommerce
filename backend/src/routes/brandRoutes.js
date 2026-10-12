import express from "express";
import { authMiddleware, optionalAuth } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { brandController } from "../controllers/brandController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { brandDto } from "../dtos/brand.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Brand not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public (admins additionally see disabled brands).
router.get("/", optionalAuth, validationMiddleware(brandDto.listQuery, "query"), brandController.getBrands);
router.get("/:id", optionalAuth, brandController.getBrandById);
router.get("/:id/products", optionalAuth, validationMiddleware(brandDto.listQuery, "query"), brandController.getBrandProducts);

router.use(authMiddleware);

router.post("/", requireAdmin, validationMiddleware(brandDto.createBrand), brandController.createBrand);
router.put("/:id", requireAdmin, validationMiddleware(brandDto.updateBrand), brandController.updateBrand);
router.patch("/:id", requireAdmin, validationMiddleware(brandDto.updateBrand), brandController.updateBrand);
router.delete("/:id", requireAdmin, brandController.deleteBrand);

export default router;
