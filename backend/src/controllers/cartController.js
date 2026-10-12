import { cartService } from "../services/cartService.js";
import { orderService } from "../services/orderService.js";

export const cartController = {
  async getCart(req, res) {
    res.json(await cartService.getCart(req.user.id));
  },

  async addItem(req, res) {
    res.json(await cartService.addItem(req.user.id, req.body));
  },

  async updateItem(req, res) {
    res.json(await cartService.updateItem(req.user.id, req.params.itemId, req.body.quantity));
  },

  async removeItem(req, res) {
    res.json(await cartService.removeItem(req.user.id, req.params.itemId));
  },

  async clearCart(req, res) {
    await cartService.clearCart(req.user.id);
    res.status(204).send();
  },

  /** Check out the whole cart through the same path as POST /api/orders/checkout. */
  async checkout(req, res) {
    const items = await cartService.getCheckoutItems(req.user.id);
    const order = await orderService.createOrder(req.user.id, { ...req.body, items });
    res.status(201).json({ success: true, data: order });
  },

  async mergeGuestCart(req, res) {
    res.json(await cartService.mergeGuestCart(req.user.id, req.body.items));
  },
};
