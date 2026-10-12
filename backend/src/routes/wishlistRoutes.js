import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole, ROLES } from "../middlewares/authorizationMiddleware.js";
import { wishlistController } from "../controllers/wishlistController.js";
import { validationMiddleware } from "../middlewares/validationMiddleware.js";
import { wishlistDto } from "../dtos/wishlist.dto.js";
import { apiRateLimiter } from "../middlewares/rateLimiter.js";
import { uuidParam } from "../middlewares/uuidParam.js";

const router = express.Router();
router.param("id", uuidParam("Wishlist item not found"));
router.param("userId", uuidParam("User not found"));
router.param("productId", uuidParam("Product not found"));
const requireAdmin = requireRole(ROLES.ADMIN);

router.use(apiRateLimiter);
router.use(authMiddleware);

// Own wishlist
router.get("/", wishlistController.getUserWishlist);
router.post("/", validationMiddleware(wishlistDto.addToWishlist), wishlistController.addToWishlist);
router.put("/:id", validationMiddleware(wishlistDto.updateWishlistItem), wishlistController.updateWishlistItem);
router.delete("/:id", wishlistController.removeFromWishlist);
router.post("/:id/move-to-cart", validationMiddleware(wishlistDto.moveToCart), wishlistController.moveToCart);

// Admin
router.get(
  "/admin/all",
  requireAdmin,
  validationMiddleware(wishlistDto.adminListQuery, "query"),
  wishlistController.getAllWishlists
);
router.get("/admin/user/:userId", requireAdmin, wishlistController.getUserWishlistAdmin);
router.get("/admin/product/:productId", requireAdmin, wishlistController.getProductWishlists);

export default router;
