import express from "express";
import { reportController } from "../controllers/reportController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { reportDto } from "../dtos/report.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.use(apiRateLimiter);
router.use(authMiddleware);
router.use(requireRole(ROLES.ADMIN));

router.get("/sales", validationMiddleware(reportDto.salesQuery, "query"), reportController.generateSalesReport);
router.get("/orders", validationMiddleware(reportDto.ordersQuery, "query"), reportController.generateOrdersReport);
router.get("/inventory", validationMiddleware(reportDto.inventoryQuery, "query"), reportController.generateInventoryReport);
router.get("/customer", validationMiddleware(reportDto.customerQuery, "query"), reportController.generateCustomerReport);
router.get("/supplier", validationMiddleware(reportDto.supplierQuery, "query"), reportController.generateSupplierReport);

export default router;
