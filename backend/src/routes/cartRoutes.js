import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { cartController } from "../controllers/cartController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { cartDto } from "../dtos/cart.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("itemId", uuidParam("Cart item not found"));

// Apply rate limiter to all cart routes
router.use(apiRateLimiter);

// All cart routes require authentication
router.use(authMiddleware);

// Cart management routes
router.get("/", cartController.getCart);
router.post(
  "/items",
  validationMiddleware(cartDto.addItem),
  cartController.addItem
);
router.put(
  "/items/:itemId",
  validationMiddleware(cartDto.updateItem),
  cartController.updateItem
);
router.delete("/items/:itemId", cartController.removeItem);
router.delete("/items", cartController.clearCart);

// Cart operations — prefer POST /api/orders/checkout for new clients
router.post(
  "/checkout",
  validationMiddleware(cartDto.checkout),
  cartController.checkout
);
router.post(
  "/merge",
  validationMiddleware(cartDto.mergeGuestCart),
  cartController.mergeGuestCart
);

export default router;
