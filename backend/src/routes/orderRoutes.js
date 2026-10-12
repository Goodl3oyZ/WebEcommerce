import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { orderController } from "../controllers/orderController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { orderDto } from "../dtos/order.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);
router.use(authMiddleware);

// Admin routes (static paths before /:orderId)
router.get("/admin/all", requireAdmin, orderController.getAllOrders);
router.get("/admin/stats", requireAdmin, orderController.getOrderStats);
router.put(
  "/admin/:orderId/status",
  requireAdmin,
  validationMiddleware(orderDto.updateOrderStatus),
  orderController.updateOrderStatus
);
router.patch(
  "/admin/:orderId/status",
  requireAdmin,
  validationMiddleware(orderDto.updateOrderStatus),
  orderController.updateOrderStatus
);
router.put(
  "/admin/:orderId/shipping",
  requireAdmin,
  validationMiddleware(orderDto.updateShippingInfo),
  orderController.updateShippingInfo
);

// Checkout (canonical order creation)
router.post(
  "/checkout",
  validationMiddleware(orderDto.checkout),
  orderController.createOrder
);

// User order collection
router.get("/", orderController.getOrders);

// Order instance routes
router.get("/:orderId/status", orderController.getOrderStatus);
router.get("/:orderId/tracking", orderController.getOrderTracking);
router.post(
  "/:orderId/cancel",
  validationMiddleware(orderDto.cancelOrder),
  orderController.cancelOrder
);
router.post(
  "/:orderId/refund",
  validationMiddleware(orderDto.refundOrder),
  orderController.refundOrder
);
router.patch(
  "/:orderId/status",
  validationMiddleware(orderDto.updateOrderStatus),
  orderController.updateOrderStatus
);
router.get("/:orderId", orderController.getOrder);
router.delete("/:orderId", (req, res) => {
  res.status(400).json({
    success: false,
    status: "error",
    message: "ไม่สามารถลบข้อมูลคำสั่งซื้อได้ โปรดใช้การยกเลิกหรือคืนเงินแทน",
    code: "HARD_DELETE_PROHIBITED",
  });
});

export default router;
