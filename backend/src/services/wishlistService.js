import { db } from "../config/db.js";
import {
  wishlistItems,
  products,
  productVariants,
  cartItems,
} from "../models/schema.js";
import { eq, and } from "drizzle-orm";
import { NotFoundError } from "../middlewares/errorHandler.js";

// Get user's wishlist
const getUserWishlist = async (userId) => {
  return await db.query.wishlistItems.findMany({
    where: eq(wishlistItems.userId, userId),
    with: {
      product: {
        with: {
          images: true,
          category: true,
        },
      },
      variant: true,
    },
  });
};

// Add item to wishlist
const addToWishlist = async (userId, productId, variantId = null) => {
  // Check if product exists
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  // If variant is specified, check if it exists
  if (variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId)
      ),
    });

    if (!variant) {
      throw new NotFoundError("Product variant not found");
    }
  }

  // Check if item already exists in wishlist
  const existingItem = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.userId, userId),
      eq(wishlistItems.productId, productId),
      variantId ? eq(wishlistItems.variantId, variantId) : undefined
    ),
  });

  if (existingItem) {
    // Update existing item
    return await db.query.wishlistItems.update({
      where: eq(wishlistItems.id, existingItem.id),
      data: {
        updatedAt: new Date(),
      },
    });
  }

  // Create new wishlist item
  return await db.query.wishlistItems.create({
    data: {
      userId,
      productId,
      variantId,
    },
  });
};

// Remove item from wishlist
const removeFromWishlist = async (userId, wishlistItemId) => {
  const wishlistItem = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.id, wishlistItemId),
      eq(wishlistItems.userId, userId)
    ),
  });

  if (!wishlistItem) {
    throw new NotFoundError("Wishlist item not found");
  }

  await db.query.wishlistItems.delete({
    where: eq(wishlistItems.id, wishlistItemId),
  });
};

// Move item from wishlist to cart
const moveToCart = async (userId, wishlistItemId, quantity = 1) => {
  const wishlistItem = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.id, wishlistItemId),
      eq(wishlistItems.userId, userId)
    ),
    with: {
      product: true,
      variant: true,
    },
  });

  if (!wishlistItem) {
    throw new NotFoundError("Wishlist item not found");
  }

  // Create cart item
  const cartItem = await db.query.cartItems.create({
    data: {
      userId,
      productId: wishlistItem.productId,
      variantId: wishlistItem.variantId,
      quantity,
    },
  });

  // Remove from wishlist
  await db.query.wishlistItems.delete({
    where: eq(wishlistItems.id, wishlistItemId),
  });

  return cartItem;
};

// Clear wishlist
const clearWishlist = async (userId) => {
  await db.query.wishlistItems.deleteMany({
    where: eq(wishlistItems.userId, userId),
  });
};

// Get wishlist item by ID
const getWishlistItemById = async (userId, wishlistItemId) => {
  const wishlistItem = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.id, wishlistItemId),
      eq(wishlistItems.userId, userId)
    ),
    with: {
      product: {
        with: {
          images: true,
          category: true,
        },
      },
      variant: true,
    },
  });

  if (!wishlistItem) {
    throw new NotFoundError("Wishlist item not found");
  }

  return wishlistItem;
};

// Get wishlist items by product
const getWishlistItemsByProduct = async (userId, productId) => {
  return await db.query.wishlistItems.findMany({
    where: and(
      eq(wishlistItems.userId, userId),
      eq(wishlistItems.productId, productId)
    ),
    with: {
      product: {
        with: {
          images: true,
          category: true,
        },
      },
      variant: true,
    },
  });
};

export const wishlistService = {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  clearWishlist,
  getWishlistItemById,
  getWishlistItemsByProduct,
};
