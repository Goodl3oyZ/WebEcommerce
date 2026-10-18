import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { orderController } from "../controllers/orderController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { orderDto } from "../dtos/order.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("orderId", uuidParam("Order not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);
router.use(authMiddleware);

// --- Admin -------------------------------------------------------------------
router.get(
  "/admin/all",
  requireAdmin,
  validationMiddleware(orderDto.adminListQuery, "query"),
  orderController.getAllOrders
);
router.get(
  "/admin/stats",
  requireAdmin,
  validationMiddleware(orderDto.statsQuery, "query"),
  orderController.getOrderStats
);
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
router.put(
  "/admin/:orderId/pickup",
  requireAdmin,
  validationMiddleware(orderDto.updatePickup),
  orderController.updatePickup
);

// --- Customer ----------------------------------------------------------------
router.post("/checkout", validationMiddleware(orderDto.checkout), orderController.createOrder);
router.get("/", validationMiddleware(orderDto.listQuery, "query"), orderController.getOrders);
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
// A customer can only confirm delivery; every other change is admin-only.
router.patch(
  "/:orderId/status",
  validationMiddleware(orderDto.confirmDelivery),
  orderController.confirmDelivery
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
