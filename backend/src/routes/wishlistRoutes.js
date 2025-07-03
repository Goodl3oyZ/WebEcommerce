import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { wishlistController } from "../controllers/wishlistController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { wishlistDto } from "../dtos/wishlist.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// Apply rate limiter to all wishlist routes
router.use(apiRateLimiter);

// Protected routes (auth required)
router.use(authMiddleware);

// User routes
router.get("/", wishlistController.getUserWishlist);
router.post(
  "/",
  validationMiddleware(wishlistDto.addToWishlist),
  wishlistController.addToWishlist
);
router.put(
  "/:id",
  validationMiddleware(wishlistDto.updateWishlistItem),
  wishlistController.updateWishlistItem
);
router.delete(
  "/:id",
  validationMiddleware(wishlistDto.removeFromWishlist),
  wishlistController.removeFromWishlist
);
router.post(
  "/:id/move-to-cart",
  validationMiddleware(wishlistDto.moveToCart),
  wishlistController.moveToCart
);

// Admin routes
router.get(
  "/admin/all",
  requireRole(ROLES.ADMIN),
  wishlistController.getAllWishlists
);
router.get(
  "/admin/user/:userId",
  requireRole(ROLES.ADMIN),
  wishlistController.getUserWishlist
);
router.get(
  "/admin/product/:productId",
  requireRole(ROLES.ADMIN),
  wishlistController.getProductWishlists
);

export default router;
