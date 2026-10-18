import { orderService } from "../services/orderService.js";
import { parsePagination } from "../utils/pagination.js";
import { isAdminRole } from "../utils/roles.js";

const asAdmin = (req) => ({ isAdmin: isAdminRole(req.user.role) });

export const orderController = {
  async getOrders(req, res) {
    const result = await orderService.getOrders(
      req.user.id,
      { status: req.query.status },
      parsePagination(req.query)
    );
    res.json({ success: true, data: result });
  },

  async getOrder(req, res) {
    const order = await orderService.getOrderById(req.user.id, req.params.orderId, undefined, asAdmin(req));
    res.json({ success: true, data: order });
  },

  async createOrder(req, res) {
    const order = await orderService.createOrder(req.user.id, {
      ...req.body,
      idempotencyKey: req.get("Idempotency-Key") ?? req.body.idempotencyKey,
    });
    // 202: the order exists but the payment outcome is still being confirmed.
    // 200: a repeated request (same Idempotency-Key) returning the first order.
    const status = order.paymentUncertain ? 202 : order.replayed ? 200 : 201;
    res.status(status).json({ success: true, data: order });
  },

  async cancelOrder(req, res) {
    const order = await orderService.cancelOrder(req.user.id, req.params.orderId, req.body.reason);
    res.json({ success: true, data: order });
  },

  async getOrderStatus(req, res) {
    const status = await orderService.getOrderStatus(req.user.id, req.params.orderId, asAdmin(req));
    res.json({ success: true, data: status });
  },

  async getOrderTracking(req, res) {
    const tracking = await orderService.getOrderTracking(req.user.id, req.params.orderId, asAdmin(req));
    res.json({ success: true, data: tracking });
  },

  async refundOrder(req, res) {
    const order = await orderService.requestRefund(req.user.id, req.params.orderId, req.body);
    res.json({ success: true, data: order, message: "Refund requested. An admin will review it." });
  },

  async confirmDelivery(req, res) {
    const order = await orderService.confirmDelivery(req.user.id, req.params.orderId);
    res.json({ success: true, data: order });
  },

  // --- Admin ---------------------------------------------------------------
  async getAllOrders(req, res) {
    const { status, search } = req.query;
    res.json(await orderService.getAllOrders({ status, search }, parsePagination(req.query)));
  },

  async getOrderStats(req, res) {
    res.json(await orderService.getOrderStats(req.query));
  },

  async updateOrderStatus(req, res) {
    const { status, notes, trackingNumber } = req.body;
    const order = await orderService.updateOrderStatus(req.params.orderId, {
      status,
      notes,
      trackingNumber,
      actorId: req.user.id,
    });
    res.json({ success: true, data: order });
  },

  async updateShippingInfo(req, res) {
    const order = await orderService.updateShippingInfo(req.params.orderId, req.body, req.user.id);
    res.json({ success: true, data: order });
  },

  async updatePickup(req, res) {
    const order = await orderService.updatePickup(req.params.orderId, req.body, req.user.id);
    res.json({ success: true, data: order });
  },
};
