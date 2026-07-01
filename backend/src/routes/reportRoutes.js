import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { reportController } from "../controllers/reportController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { reportDto } from "../dtos/report.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);
router.use(authMiddleware);
router.use(requireAdmin);

router.get(
  "/sales",
  validationMiddleware(reportDto.generateSalesReport, "query"),
  reportController.generateSalesReport
);
router.get(
  "/orders",
  validationMiddleware(reportDto.generateSalesReport, "query"),
  reportController.generateSalesReport
);
router.get(
  "/inventory",
  validationMiddleware(reportDto.generateInventoryReport, "query"),
  reportController.generateInventoryReport
);
router.get(
  "/customer",
  validationMiddleware(reportDto.generateCustomerReport, "query"),
  reportController.generateCustomerReport
);
router.get(
  "/supplier",
  validationMiddleware(reportDto.generateSupplierReport, "query"),
  reportController.generateSupplierReport
);

export default router;
