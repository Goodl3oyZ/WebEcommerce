import { db } from "../config/db.js";
import {
  wishlistItems,
  products,
  productVariants,
} from "../models/schema.js";
import { eq, and, desc, isNull } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { cartService } from "./cartService.js";

const wishlistWith = {
  product: {
    with: {
      category: true,
      brand: true,
    },
  },
  variant: true,
};

const getUserWishlist = async (userId) => {
  return db.query.wishlistItems.findMany({
    where: eq(wishlistItems.userId, userId),
    with: wishlistWith,
    orderBy: [desc(wishlistItems.createdAt)],
  });
};

const addToWishlist = async (userId, productId, variantId = null) => {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  if (variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId)
      ),
    });

    if (!variant) {
      throw ApiError.notFound("Product variant not found");
    }
  }

  const variantCondition = variantId
    ? eq(wishlistItems.variantId, variantId)
    : isNull(wishlistItems.variantId);

  const existingItem = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.userId, userId),
      eq(wishlistItems.productId, productId),
      variantCondition
    ),
  });

  if (existingItem) {
    return existingItem;
  }

  const [created] = await db
    .insert(wishlistItems)
    .values({
      userId,
      productId,
      variantId: variantId ?? null,
    })
    .returning();

  return created;
};

const removeFromWishlist = async (userId, wishlistItemId) => {
  const wishlistItem = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.id, wishlistItemId),
      eq(wishlistItems.userId, userId)
    ),
  });

  if (!wishlistItem) {
    throw ApiError.notFound("Wishlist item not found");
  }

  await db
    .delete(wishlistItems)
    .where(eq(wishlistItems.id, wishlistItemId));
};

const moveToCart = async (userId, wishlistItemId, quantity = 1) => {
  const wishlistItem = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.id, wishlistItemId),
      eq(wishlistItems.userId, userId)
    ),
  });

  if (!wishlistItem) {
    throw ApiError.notFound("Wishlist item not found");
  }

  const cart = await cartService.addItem(userId, {
    productId: wishlistItem.productId,
    variantId: wishlistItem.variantId,
    quantity,
  });

  await db
    .delete(wishlistItems)
    .where(eq(wishlistItems.id, wishlistItemId));

  return cart;
};

const clearWishlist = async (userId) => {
  await db
    .delete(wishlistItems)
    .where(eq(wishlistItems.userId, userId));
};

const getWishlistItemById = async (userId, wishlistItemId) => {
  const wishlistItem = await db.query.wishlistItems.findFirst({
    where: and(
      eq(wishlistItems.id, wishlistItemId),
      eq(wishlistItems.userId, userId)
    ),
    with: wishlistWith,
  });

  if (!wishlistItem) {
    throw ApiError.notFound("Wishlist item not found");
  }

  return wishlistItem;
};

const getWishlistItemsByProduct = async (userId, productId) => {
  return db.query.wishlistItems.findMany({
    where: and(
      eq(wishlistItems.userId, userId),
      eq(wishlistItems.productId, productId)
    ),
    with: wishlistWith,
  });
};

const updateWishlistItem = async (wishlistItemId, userId, updateData = {}) => {
  const item = await getWishlistItemById(userId, wishlistItemId);

  if (updateData.variantId === undefined) {
    return item;
  }

  if (updateData.variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, updateData.variantId),
        eq(productVariants.productId, item.productId)
      ),
    });

    if (!variant) {
      throw ApiError.notFound("Product variant not found");
    }
  }

  const [updated] = await db
    .update(wishlistItems)
    .set({ variantId: updateData.variantId ?? null })
    .where(eq(wishlistItems.id, wishlistItemId))
    .returning();

  return db.query.wishlistItems.findFirst({
    where: eq(wishlistItems.id, updated.id),
    with: wishlistWith,
  });
};

const getAllWishlists = async () => {
  return db.query.wishlistItems.findMany({
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      product: wishlistWith.product,
      variant: true,
    },
    orderBy: [desc(wishlistItems.createdAt)],
  });
};

const getProductWishlists = async (productId) => {
  return db.query.wishlistItems.findMany({
    where: eq(wishlistItems.productId, productId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      product: wishlistWith.product,
      variant: true,
    },
    orderBy: [desc(wishlistItems.createdAt)],
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
  updateWishlistItem,
  getAllWishlists,
  getProductWishlists,
};
