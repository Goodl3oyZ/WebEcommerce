import { db } from "../config/db.js";
import { wishlistItems, products, productVariants } from "../models/schema.js";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { cartService } from "./cartService.js";
import { presentProduct } from "./productService.js";
import { paginationMeta } from "../utils/pagination.js";

const itemWith = {
  product: { with: { category: true, brand: true, variants: true } },
  variant: true,
};
const userColumns = { columns: { id: true, name: true, email: true } };

const present = (item) => item && { ...item, product: presentProduct(item.product) };

async function findOwn(userId, itemId) {
  const item = await db.query.wishlistItems.findFirst({
    where: and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)),
    with: itemWith,
  });
  if (!item) throw ApiError.notFound("Wishlist item not found");
  return item;
}

async function assertVariantOf(productId, variantId) {
  const variant = await db.query.productVariants.findFirst({
    where: and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)),
  });
  if (!variant) throw ApiError.notFound("Product variant not found");
}

export const wishlistService = {
  async getUserWishlist(userId) {
    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.userId, userId),
      with: itemWith,
      orderBy: [desc(wishlistItems.createdAt)],
    });
    return items.map(present);
  },

  /** Idempotent: adding the same product/variant twice returns the existing item. */
  async addToWishlist(userId, productId, variantId = null) {
    const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
    if (!product || !product.isActive) throw ApiError.notFound("Product not found");
    if (variantId) await assertVariantOf(productId, variantId);

    const existing = await db.query.wishlistItems.findFirst({
      where: and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.productId, productId),
        variantId ? eq(wishlistItems.variantId, variantId) : isNull(wishlistItems.variantId)
      ),
    });
    const id =
      existing?.id ??
      (await db.insert(wishlistItems).values({ userId, productId, variantId }).returning())[0].id;
    return { created: !existing, item: present(await findOwn(userId, id)) };
  },

  /** Change (or clear) the chosen variant. */
  async updateWishlistItem(userId, itemId, { variantId }) {
    const item = await findOwn(userId, itemId);
    if (variantId) await assertVariantOf(item.productId, variantId);
    await db.update(wishlistItems).set({ variantId: variantId ?? null }).where(eq(wishlistItems.id, itemId));
    return present(await findOwn(userId, itemId));
  },

  async removeFromWishlist(userId, itemId) {
    await findOwn(userId, itemId);
    await db.delete(wishlistItems).where(eq(wishlistItems.id, itemId));
  },

  /** Adds to the cart (stock is checked there) and removes it from the wishlist. */
  async moveToCart(userId, itemId, quantity = 1) {
    const item = await findOwn(userId, itemId);
    const cart = await cartService.addItem(userId, {
      productId: item.productId,
      variantId: item.variantId,
      quantity,
    });
    await db.delete(wishlistItems).where(eq(wishlistItems.id, itemId));
    return cart;
  },

  // --- Admin ---------------------------------------------------------------
  async getAllWishlists(pagination) {
    const [items, total] = await Promise.all([
      db.query.wishlistItems.findMany({
        with: { ...itemWith, user: userColumns },
        orderBy: [desc(wishlistItems.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(wishlistItems),
    ]);
    return { items: items.map(present), pagination: paginationMeta(total[0].count, pagination) };
  },

  /** Who wants this product (demand signal for restocking). */
  async getProductWishlists(productId) {
    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.productId, productId),
      with: { variant: true, user: userColumns },
      orderBy: [desc(wishlistItems.createdAt)],
    });
    return { productId, count: items.length, items };
  },
};
