import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { supplierController } from "../controllers/supplierController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { supplierDto } from "../dtos/supplier.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Supplier not found"));
router.param("productId", uuidParam("Supplier product not found"));

// Apply rate limiter to all supplier routes
router.use(apiRateLimiter);

// Protected routes (auth required)
router.use(authMiddleware);

// Admin routes
router.get(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(supplierDto.listQuery, "query"),
  supplierController.getAllSuppliers
);
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validationMiddleware(supplierDto.createSupplier),
  supplierController.createSupplier
);

// Supplier products (before /:id)
router.get(
  "/:id/products",
  requireRole(ROLES.ADMIN),
  supplierController.getSupplierProducts
);
router.post(
  "/:id/products",
  requireRole(ROLES.ADMIN),
  validationMiddleware(supplierDto.addSupplierProduct),
  supplierController.addSupplierProduct
);
router.put(
  "/:id/products/:productId",
  requireRole(ROLES.ADMIN),
  validationMiddleware(supplierDto.updateSupplierProduct),
  supplierController.updateSupplierProduct
);
router.delete(
  "/:id/products/:productId",
  requireRole(ROLES.ADMIN),
  supplierController.removeSupplierProduct
);

router.get(
  "/:id",
  requireRole(ROLES.ADMIN),
  supplierController.getSupplierById
);
router.put(
  "/:id",
  requireRole(ROLES.ADMIN),
  validationMiddleware(supplierDto.updateSupplier),
  supplierController.updateSupplier
);
router.delete(
  "/:id",
  requireRole(ROLES.ADMIN),
  supplierController.deleteSupplier
);

export default router;
