import express from "express";
import { paymentController } from "../controllers/paymentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { paymentDto } from "../dtos/payment.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("ไม่พบรายการชำระเงิน"));
router.param("orderId", uuidParam("Order not found"));
router.param("storeId", uuidParam("Store not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);

// Public: Omise calls this. The payload is only used to look up the charge,
// which is then fetched from Omise (see paymentService.handleWebhook).
router.post("/webhook/omise", paymentController.handleOmiseWebhook);

router.use(authMiddleware);

router.get("/methods", paymentController.getPaymentMethods);
router.get(
  "/history",
  validationMiddleware(paymentDto.historyQuery, "query"),
  paymentController.getPaymentHistory
);
router.get(
  "/stats",
  requireAdmin,
  validationMiddleware(paymentDto.statsQuery, "query"),
  paymentController.getPaymentStatistics
);
router.get(
  "/admin/transactions",
  requireAdmin,
  validationMiddleware(paymentDto.adminListQuery, "query"),
  paymentController.getAllTransactions
);
router.get(
  "/admin/statistics",
  requireAdmin,
  validationMiddleware(paymentDto.statsQuery, "query"),
  paymentController.getPaymentStatistics
);
router.get("/order/:orderId", paymentController.getOrderPayments);
router.get(
  "/store/:storeId",
  requireAdmin,
  validationMiddleware(paymentDto.storeQuery, "query"),
  paymentController.getStorePayments
);
router.post("/", validationMiddleware(paymentDto.createPayment), paymentController.createPayment);
/** @deprecated use POST / */
router.post(
  "/create",
  validationMiddleware(paymentDto.createPayment),
  paymentController.createPayment
);
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
router.delete("/:id", (req, res) => {
  res.status(400).json({
    success: false,
    status: "error",
    message: "ไม่สามารถลบข้อมูลธุรกรรมการชำระเงินได้ โปรดใช้การคืนเงิน (Refund) แทน",
    code: "HARD_DELETE_PROHIBITED",
  });
});

export default router;
