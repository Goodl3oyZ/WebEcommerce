import { cartService } from "../services/cartService.js";
import { ApiError } from "../utils/ApiError.js";

export const cartController = {
  // Get user's cart
  async getCart(req, res, next) {
    try {
      const userId = req.user.id;
      const cart = await cartService.getCart(userId);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  },

  // Add item to cart
  async addItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { productId, variantId, quantity } = req.body;
      const cart = await cartService.addItem(userId, {
        productId,
        variantId,
        quantity,
      });
      res.json(cart);
    } catch (error) {
      next(error);
    }
  },

  // Update cart item
  async updateItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;
      const { quantity } = req.body;
      const cart = await cartService.updateItem(userId, itemId, quantity);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  },

  // Remove item from cart
  async removeItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;
      const cart = await cartService.removeItem(userId, itemId);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  },

  // Clear cart
  async clearCart(req, res, next) {
    try {
      const userId = req.user.id;
      await cartService.clearCart(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  // Checkout
  async checkout(req, res, next) {
    try {
      const userId = req.user.id;
      const checkoutData = req.body;
      const order = await cartService.checkout(userId, checkoutData);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  },

  // Merge guest cart with user cart
  async mergeGuestCart(req, res, next) {
    try {
      const userId = req.user.id;
      const { items } = req.body;
      const cart = await cartService.mergeGuestCart(userId, items);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  },
};
