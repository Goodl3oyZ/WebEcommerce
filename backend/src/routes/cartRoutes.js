import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { cartController } from "../controllers/cartController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { cartDto } from "../dtos/cart.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

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

// Cart operations
router.post("/checkout", cartController.checkout);
router.post(
  "/merge",
  validationMiddleware(cartDto.mergeGuestCart),
  cartController.mergeGuestCart
);

export default router;
