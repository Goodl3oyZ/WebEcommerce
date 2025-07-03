import express from "express";
import { paymentController } from "../controllers/paymentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { paymentDto } from "../dtos/payment.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all payment routes
router.use(apiRateLimiter);

// All payment routes require authentication
router.use(authMiddleware);

// Payment Method Routes
router.get("/methods", paymentController.getPaymentMethods);

// Payment routes
router.post(
  "/",
  validationMiddleware(paymentDto.createPayment),
  paymentController.createPayment
);
router.get("/stats", paymentController.getPaymentStats);
router.get("/:id", paymentController.getPaymentById);
router.put(
  "/:id/status",
  requireRole(ROLES.ADMIN),
  paymentController.updatePaymentStatus
);
router.post(
  "/:id/refund",
  requireRole(ROLES.ADMIN),
  paymentController.refundPayment
);
router.get("/order/:orderId", paymentController.getOrderPayments);
router.get("/store/:storeId", paymentController.getStorePayments);

// Payment History and Status
router.get("/history", paymentController.getPaymentHistory);
router.get("/:id/status", paymentController.getPaymentStatus);
router.post(
  "/:id/verify",
  validationMiddleware(paymentDto.verifyPayment),
  paymentController.verifyPayment
);

// Admin Payment Routes
router.get(
  "/admin/transactions",
  requireRole(ROLES.ADMIN),
  paymentController.getAllTransactions
);
router.get(
  "/admin/statistics",
  requireRole(ROLES.ADMIN),
  paymentController.getPaymentStatistics
);

// Create payment
router.post(
  "/create",
  validationMiddleware(paymentDto.createPayment),
  paymentController.createPayment
);

// Get payment details
router.get("/:paymentId", paymentController.getPayment);

// Process refund
router.post(
  "/:paymentId/refund",
  validationMiddleware(paymentDto.processRefund),
  paymentController.processRefund
);

// Create credit card token
router.post(
  "/token",
  validationMiddleware(paymentDto.createToken),
  paymentController.createToken
);

// เพิ่ม Omise webhook endpoint
router.post("/webhook/omise", paymentController.handleOmiseWebhook);

export default router;
