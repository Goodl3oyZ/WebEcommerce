import express from "express";
import { paymentController } from "../controllers/paymentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { paymentDto } from "../dtos/payment.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public — Omise webhooks must not require JWT
router.post("/webhook/omise", paymentController.handleOmiseWebhook);

router.use(authMiddleware);

// Static paths first (before /:id)
router.get("/methods", paymentController.getPaymentMethods);
router.get("/history", paymentController.getPaymentHistory);
router.get("/stats", paymentController.getPaymentStats);
router.get(
  "/admin/transactions",
  requireAdmin,
  paymentController.getAllTransactions
);
router.get(
  "/admin/statistics",
  requireAdmin,
  paymentController.getPaymentStatistics
);
router.get("/order/:orderId", paymentController.getOrderPayments);
router.get("/store/:storeId", paymentController.getStorePayments);

router.post(
  "/token",
  validationMiddleware(paymentDto.createToken),
  paymentController.createToken
);
router.post(
  "/",
  validationMiddleware(paymentDto.createPayment),
  paymentController.createPayment
);
/** @deprecated use POST / */
router.post(
  "/create",
  validationMiddleware(paymentDto.createPayment),
  paymentController.createPayment
);

// Parameterized routes last
router.get("/:id/status", paymentController.getPaymentStatus);
router.post(
  "/:id/verify",
  validationMiddleware(paymentDto.verifyPayment),
  paymentController.verifyPayment
);
router.put(
  "/:id/status",
  requireAdmin,
  validationMiddleware(paymentDto.updatePaymentStatus),
  paymentController.updatePaymentStatus
);
router.post(
  "/:id/refund",
  requireAdmin,
  validationMiddleware(paymentDto.processRefund),
  paymentController.processRefund
);
router.get("/:id", paymentController.getPaymentById);

export default router;
