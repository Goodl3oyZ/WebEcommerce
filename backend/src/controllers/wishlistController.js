import { wishlistService } from "../services/wishlistService.js";
import { userService } from "../services/userService.js";
import { parsePagination } from "../utils/pagination.js";

export const wishlistController = {
  async getUserWishlist(req, res) {
    res.json(await wishlistService.getUserWishlist(req.user.id));
  },

  async addToWishlist(req, res) {
    const { created, item } = await wishlistService.addToWishlist(
      req.user.id,
      req.body.productId,
      req.body.variantId ?? null
    );
    res.status(created ? 201 : 200).json(item);
  },

  async updateWishlistItem(req, res) {
    res.json(await wishlistService.updateWishlistItem(req.user.id, req.params.id, req.body));
  },

  async removeFromWishlist(req, res) {
    await wishlistService.removeFromWishlist(req.user.id, req.params.id);
    res.status(204).send();
  },

  async moveToCart(req, res) {
    res.json(await wishlistService.moveToCart(req.user.id, req.params.id, req.body.quantity));
  },

  // --- Admin ---------------------------------------------------------------
  async getAllWishlists(req, res) {
    res.json(await wishlistService.getAllWishlists(parsePagination(req.query)));
  },

  async getUserWishlistAdmin(req, res) {
    await userService.getUserById(req.params.userId); // 404 for unknown users
    res.json(await wishlistService.getUserWishlist(req.params.userId));
  },

  async getProductWishlists(req, res) {
    res.json(await wishlistService.getProductWishlists(req.params.productId));
  },
};
