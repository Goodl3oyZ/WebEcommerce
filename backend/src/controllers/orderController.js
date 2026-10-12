import { orderService } from "../services/orderService.js";
import { ApiError } from "../utils/ApiError.js";

export const orderController = {
  // Get user's orders
  async getOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const result = await orderService.getOrders(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get order by ID
  async getOrderById(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      const order = await orderService.getOrderById(userId, orderId);
      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  // Create order (checkout)
  async createOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const orderData = req.body;
      let order;
      try {
        // Create order (รวมตรวจสอบสินค้า, คำนวณราคา, สร้างออเดอร์, เรียก Omise, อัปเดตสถานะ)
        order = await orderService.createOrder(userId, orderData);
      } catch (err) {
        // ถ้า error เกี่ยวกับ Omise หรือจ่ายเงินไม่สำเร็จ ให้ยกเลิกออเดอร์ (ถ้ามี orderId)
        if (
          err.message &&
          err.message.includes("Omise payment failed") &&
          err.orderId
        ) {
          try {
            await orderService.updateOrderStatus(err.orderId, {
              status: "cancelled",
              notes: "Payment failed",
            });
          } catch (e) {
            /* ignore */
          }
        }
        return res
          .status(400)
          .json({ success: false, message: err.message || "Checkout failed" });
      }
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get order details
  async getOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;

      const order = await orderService.getOrderById(userId, orderId);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get user's orders
  async getUserOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const orders = await orderService.getUserOrders(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  },

  // Cancel order
  async cancelOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(userId, orderId, reason);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get order status
  async getOrderStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;

      const status = await orderService.getOrderStatus(userId, orderId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get order tracking
  async getOrderTracking(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;

      const tracking = await orderService.getOrderTracking(userId, orderId);

      res.json({
        success: true,
        data: tracking,
      });
    } catch (error) {
      next(error);
    }
  },

  // Request refund
  async refundOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      const refundData = req.body;
      const refund = await orderService.refundOrder(
        userId,
        orderId,
        refundData
      );
      res.json(refund);
    } catch (error) {
      next(error);
    }
  },

  // Admin: Get all orders
  async getAllOrders(req, res, next) {
    try {
      const { page = 1, limit = 10, status, search } = req.query;
      const orders = await orderService.getAllOrders({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        search,
      });
      res.json(orders);
    } catch (error) {
      next(error);
    }
  },

  // Admin: Get order statistics
  async getOrderStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await orderService.getOrderStats({ startDate, endDate });
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },

  // Update order status (user or admin)
  async updateOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;
      // เช็คว่าเป็น admin หรือ user route
      // ถ้า path มี /admin/ แปลว่า admin, ไม่งั้นคือ user
      const isAdmin = req.originalUrl.includes("/admin/");
      let order;
      if (isAdmin) {
        order = await orderService.updateOrderStatus(orderId, {
          status,
          notes,
          actorId: req.user.id,
        });
      } else {
        // user ต้องเป็นเจ้าของ order
        const userId = req.user.id;
        order = await orderService.updateOrderStatus(orderId, {
          status,
          notes,
          userId,
        });
      }
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  // Admin: Update shipping information
  async updateShippingInfo(req, res, next) {
    try {
      const { orderId } = req.params;
      const shippingInfo = req.body;
      const order = await orderService.updateShippingInfo(
        orderId,
        shippingInfo
      );
      res.json(order);
    } catch (error) {
      next(error);
    }
  },
};
