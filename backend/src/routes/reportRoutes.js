import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { reportController } from "../controllers/reportController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { reportDto } from "../dtos/report.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all report routes
router.use(apiRateLimiter);

// Protected routes (auth required)
router.use(authMiddleware);

// Admin routes
router.get(
  "/sales",
  requireRole(ROLES.ADMIN),
  validationMiddleware(reportDto.generateSalesReport),
  reportController.generateSalesReport
);
router.get(
  "/inventory",
  requireRole(ROLES.ADMIN),
  validationMiddleware(reportDto.generateInventoryReport),
  reportController.generateInventoryReport
);
router.get(
  "/customer",
  requireRole(ROLES.ADMIN),
  validationMiddleware(reportDto.generateCustomerReport),
  reportController.generateCustomerReport
);
router.get(
  "/supplier",
  requireRole(ROLES.ADMIN),
  validationMiddleware(reportDto.generateSupplierReport),
  reportController.generateSupplierReport
);

export default router;
