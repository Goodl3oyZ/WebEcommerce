import { wishlistService } from "../services/wishlistService.js";

// Get user's wishlist
export const getUserWishlist = async (req, res, next) => {
  try {
    const wishlist = await wishlistService.getUserWishlist(req.user.id);
    res.json(wishlist);
  } catch (error) {
    next(error);
  }
};

// Add item to wishlist
export const addToWishlist = async (req, res, next) => {
  try {
    const item = await wishlistService.addToWishlist(
      req.user.id,
      req.body.productId,
      req.body.variantId
    );
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// Update wishlist item
const updateWishlistItem = async (req, res, next) => {
  try {
    const wishlistItem = await wishlistService.updateWishlistItem(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json(wishlistItem);
  } catch (error) {
    next(error);
  }
};

// Remove item from wishlist
export const removeFromWishlist = async (req, res, next) => {
  try {
    await wishlistService.removeFromWishlist(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Move item from wishlist to cart
export const moveToCart = async (req, res, next) => {
  try {
    const cartItem = await wishlistService.moveToCart(
      req.user.id,
      req.params.id,
      req.body.quantity
    );
    res.json(cartItem);
  } catch (error) {
    next(error);
  }
};

// Admin: Get all wishlists
const getAllWishlists = async (req, res, next) => {
  try {
    const wishlists = await wishlistService.getAllWishlists();
    res.json(wishlists);
  } catch (error) {
    next(error);
  }
};

// Admin: Get user's wishlist
const getUserWishlistAdmin = async (req, res, next) => {
  try {
    const wishlist = await wishlistService.getUserWishlist(req.params.userId);
    res.json(wishlist);
  } catch (error) {
    next(error);
  }
};

// Admin: Get product wishlists
const getProductWishlists = async (req, res, next) => {
  try {
    const wishlists = await wishlistService.getProductWishlists(
      req.params.productId
    );
    res.json(wishlists);
  } catch (error) {
    next(error);
  }
};

export const wishlistController = {
  getUserWishlist,
  addToWishlist,
  updateWishlistItem,
  removeFromWishlist,
  moveToCart,
  getAllWishlists,
  getUserWishlistAdmin,
  getProductWishlists,
};
