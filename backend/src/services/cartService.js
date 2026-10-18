import { db } from "../config/db.js";
import { carts, cartItems, productVariants } from "../models/schema.js";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { FileService } from "./fileService.js";
import { BUCKETS } from "../config/minio.js";
import { toSatang, fromSatang } from "../utils/money.js";
import { branchStockByVariant } from "./branchStock.js";

export const MAX_QUANTITY_PER_ITEM = 99;

const resolveImages = (images) => {
  const list = Array.isArray(images) ? images : images ? [images] : [];
  return list.filter(Boolean).map((img) => FileService.getFileUrl(BUCKETS.PRODUCTS, img));
};

async function getOrCreateCart(userId, txOrDb = db) {
  const cart = await txOrDb.query.carts.findFirst({ where: eq(carts.userId, userId) });
  if (cart) return cart;
  const [created] = await txOrDb.insert(carts).values({ userId }).returning();
  return created;
}

/** The variant to buy, with its product; must exist, belong to the product and be on sale. */
async function getPurchasableVariant(productId, variantId) {
  if (!variantId) {
    throw ApiError.badRequest("Please choose a size/colour (variantId) for this product");
  }
  const variant = await db.query.productVariants.findFirst({
    where: and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)),
    with: { product: true },
  });
  if (!variant || variant.product?.isActive === false) {
    throw ApiError.notFound("Product variant not found");
  }
  return variant;
}

/**
 * Most units of a variant one order can get: online stock (delivery) or what a
 * single open branch holds (pickup), whichever is more. Checkout then checks
 * the chosen way of receiving.
 */
async function sellableStock(variant) {
  const atBranch = (await branchStockByVariant([variant.id])).get(variant.id) ?? 0;
  return Math.max(variant.stock, atBranch);
}

async function assertStock(variant, quantity) {
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    throw ApiError.badRequest(`At most ${MAX_QUANTITY_PER_ITEM} of one item per order`);
  }
  const available = await sellableStock(variant);
  if (quantity > available) {
    throw new ApiError(
      `Only ${available} left in stock for ${variant.product.name} (${variant.color} ${variant.size})`,
      409,
      null,
      "INSUFFICIENT_STOCK"
    );
  }
}

export const cartService = {
  /**
   * Cart with current prices and stock (prices are never taken from the client).
   * `variant.stock` is online stock and `variant.branchStock` the most at one
   * open branch; `deliverable` says whether the line can be shipped.
   */
  async getCart(userId) {
    const cart = await getOrCreateCart(userId);
    const items = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cart.id),
      with: { product: true, variant: true },
      orderBy: (item, { asc }) => [asc(item.createdAt)],
    });

    const branchStock = await branchStockByVariant(items.map((item) => item.variantId));
    let subtotal = 0;
    const lines = items.map((item) => {
      const online = item.variant?.stock ?? 0;
      const atBranch = branchStock.get(item.variantId) ?? 0;
      const currentPrice = toSatang(item.variant?.price ?? item.product?.price);
      subtotal += currentPrice * item.quantity;
      return {
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: fromSatang(currentPrice),
        priceChanged: currentPrice !== toSatang(item.price),
        inStock: item.variant ? Math.max(online, atBranch) >= item.quantity : false,
        deliverable: item.variant ? online >= item.quantity : false,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: item.product && {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          price: item.product.price,
          isActive: item.product.isActive,
          imageUrl: resolveImages(item.product.imageUrl),
        },
        variant: item.variant && {
          id: item.variant.id,
          color: item.variant.color,
          size: item.variant.size,
          sku: item.variant.sku,
          stock: item.variant.stock,
          branchStock: atBranch,
          images: resolveImages(item.variant.imageUrl),
        },
      };
    });

    return { ...cart, items: lines, subtotal: Number(fromSatang(subtotal)) };
  },

  async addItem(userId, { productId, variantId, quantity }) {
    const variant = await getPurchasableVariant(productId, variantId);
    const cart = await getOrCreateCart(userId);
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)),
    });
    const newQuantity = (existing?.quantity ?? 0) + quantity;
    await assertStock(variant, newQuantity);

    if (existing) {
      await db
        .update(cartItems)
        .set({ quantity: newQuantity, price: variant.price, updatedAt: new Date() })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId,
        variantId,
        quantity,
        price: variant.price,
      });
    }
    return this.getCart(userId);
  },

  async updateItem(userId, itemId, quantity) {
    const cart = await getOrCreateCart(userId);
    const item = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)),
    });
    if (!item) {
      throw ApiError.notFound("Cart item not found");
    }
    const variant = await getPurchasableVariant(item.productId, item.variantId);
    await assertStock(variant, quantity);

    await db
      .update(cartItems)
      .set({ quantity, price: variant.price, updatedAt: new Date() })
      .where(eq(cartItems.id, item.id));
    return this.getCart(userId);
  },

  async removeItem(userId, itemId) {
    const cart = await getOrCreateCart(userId);
    const [deleted] = await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();
    if (!deleted) {
      throw ApiError.notFound("Cart item not found");
    }
    return this.getCart(userId);
  },

  /** Idempotent: clearing an empty or missing cart succeeds. */
  async clearCart(userId) {
    const cart = await db.query.carts.findFirst({ where: eq(carts.userId, userId) });
    if (cart) await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
  },

  /** Items to check out, from the current cart. */
  async getCheckoutItems(userId) {
    const cart = await this.getCart(userId);
    if (cart.items.length === 0) {
      throw ApiError.badRequest("Cart is empty");
    }
    return cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));
  },

  /**
   * Merge a guest (browser) cart after login. Prices from the client are
   * ignored; invalid items are skipped and quantities are capped at stock.
   */
  /**
   * Fold a cart built before signing in into the account's cart. A product
   * already in the account keeps the larger of the two quantities (merging
   * twice, or a cart left over from this account, never doubles it); others
   * are added. Quantities are capped at stock. `skipped` lists lines that
   * could not be added and `limited` the ones that were reduced.
   */
  async mergeGuestCart(userId, items) {
    const cart = await getOrCreateCart(userId);
    const skipped = [];
    const limited = [];
    for (const { productId, variantId, quantity } of items) {
      let variant;
      try {
        variant = await getPurchasableVariant(productId, variantId);
      } catch {
        skipped.push({ productId, variantId, reason: "not available" });
        continue;
      }
      const existing = await db.query.cartItems.findFirst({
        where: and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)),
      });
      const wanted = Math.max(existing?.quantity ?? 0, quantity);
      const allowed = Math.min(wanted, await sellableStock(variant), MAX_QUANTITY_PER_ITEM);
      if (allowed <= 0) {
        skipped.push({ productId, variantId, reason: "out of stock" });
        continue;
      }
      if (allowed < wanted) limited.push({ productId, variantId, requested: wanted, quantity: allowed });
      if (existing) {
        await db
          .update(cartItems)
          .set({ quantity: allowed, price: variant.price, updatedAt: new Date() })
          .where(eq(cartItems.id, existing.id));
      } else {
        await db
          .insert(cartItems)
          .values({ cartId: cart.id, productId, variantId, quantity: allowed, price: variant.price });
      }
    }
    return { ...(await this.getCart(userId)), skipped, limited };
  },
};
