import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
// import { requireRole, ROLES } from "../middlewares/roleMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { orderController } from "../controllers/orderController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { orderDto } from "../dtos/order.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all order routes
router.use(apiRateLimiter);

// All order routes require authentication
router.use(authMiddleware);

// Public routes (authenticated users)
router.get("/", orderController.getOrders);
router.get("/:orderId", orderController.getOrder);
router.get("/:orderId/status", orderController.getOrderStatus);
router.get("/:orderId/tracking", orderController.getOrderTracking);

// Create order (checkout)
router.post(
  "/checkout",
  validationMiddleware(orderDto.checkout),
  orderController.createOrder
);

// Order actions
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

// User: Update order status (must be authenticated)
router.patch(
  "/:orderId/status",
  validationMiddleware(orderDto.updateOrderStatus),
  orderController.updateOrderStatus
);

// Admin routes
router.get(
  "/admin/all",
  requireRole(ROLES.ADMIN),
  orderController.getAllOrders
);
router.get(
  "/admin/stats",
  requireRole(ROLES.ADMIN),
  orderController.getOrderStats
);
router.put(
  "/admin/:orderId/status",
  requireRole(ROLES.ADMIN),
  validationMiddleware(orderDto.updateOrderStatus),
  orderController.updateOrderStatus
);
router.put(
  "/admin/:orderId/shipping",
  requireRole(ROLES.ADMIN),
  validationMiddleware(orderDto.updateShippingInfo),
  orderController.updateShippingInfo
);

export default router;
