/**
 * Stores are physical branches (pickup points with their own inventory), not
 * marketplace sellers: products and orders link to a store through
 * store_inventory and store_pickups.
 */
import { db } from "../config/db.js";
import {
  stores,
  products,
  productVariants,
  orders,
  orderItems,
  storeSettings,
  storeReviews,
  storeInventory,
  storePickups,
  users,
} from "../models/schema.js";
import { eq, and, desc, asc, sql, gte, lte, ilike, or, inArray } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { getFileUrl, toStoredKey, BUCKETS } from "../config/minio.js";
import { paginationMeta } from "../utils/pagination.js";

const STORE_FIELDS = ["name", "description", "address", "city", "state", "country", "postalCode", "phone", "email", "website", "isActive"];
const present = (store) => store && { ...store, logo: store.logo ? getFileUrl(BUCKETS.STORES, store.logo) : null };
const PAID = ["completed", "partially_refunded", "refunded"];

const pickupOrderIds = (storeId) =>
  db.select({ id: storePickups.orderId }).from(storePickups).where(eq(storePickups.storeId, storeId));

export const storeService = {
  async getAllStores({ search, includeInactive }, pagination) {
    const conditions = [];
    if (!includeInactive) conditions.push(eq(stores.isActive, true));
    if (search) conditions.push(or(ilike(stores.name, `%${search}%`), ilike(stores.city, `%${search}%`)));
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, total] = await Promise.all([
      db.query.stores.findMany({ where, orderBy: [asc(stores.name)], limit: pagination.limit, offset: pagination.offset }),
      db.select({ count: sql`count(*)::int` }).from(stores).where(where),
    ]);
    const meta = paginationMeta(total[0].count, pagination);
    return { items: rows.map(present), ...meta, pagination: meta };
  },

  async getStoreById(storeId, { includeInactive = false } = {}) {
    const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId) });
    if (!store || (!store.isActive && !includeInactive)) throw ApiError.notFound("Store not found");
    return present(store);
  },

  async createStore(data) {
    const values = Object.fromEntries(STORE_FIELDS.filter((k) => data[k] !== undefined).map((k) => [k, data[k]]));
    return db.transaction(async (tx) => {
      const [store] = await tx
        .insert(stores)
        .values({ ...values, logo: data.logo ? toStoredKey(BUCKETS.STORES, data.logo) : null })
        .returning();
      await tx.insert(storeSettings).values({ storeId: store.id, settings: data.settings ?? {} });
      return present(store);
    });
  },

  async updateStore(storeId, data) {
    await this.getStoreById(storeId, { includeInactive: true });
    const changes = Object.fromEntries(STORE_FIELDS.filter((k) => data[k] !== undefined).map((k) => [k, data[k]]));
    if (data.logo !== undefined) changes.logo = data.logo ? toStoredKey(BUCKETS.STORES, data.logo) : null;
    const [store] = await db
      .update(stores)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return present(store);
  },

  /** Stores are deactivated, not deleted: pickups and history reference them. */
  async deleteStore(storeId) {
    await this.getStoreById(storeId, { includeInactive: true });
    const [store] = await db
      .update(stores)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning();
    return present(store);
  },

  /** Products in stock at this branch. */
  async getStoreProducts(storeId, pagination) {
    await this.getStoreById(storeId);
    const where = and(
      eq(storeInventory.storeId, storeId),
      sql`${storeInventory.quantity} > 0`,
      eq(products.isActive, true)
    );
    const [rows, total] = await Promise.all([
      db
        .select({
          inventoryId: storeInventory.id,
          quantity: storeInventory.quantity,
          product: { id: products.id, name: products.name, price: products.price, imageUrl: products.imageUrl },
          variant: { id: productVariants.id, color: productVariants.color, size: productVariants.size, sku: productVariants.sku, price: productVariants.price },
        })
        .from(storeInventory)
        .innerJoin(products, eq(storeInventory.productId, products.id))
        .leftJoin(productVariants, eq(storeInventory.variantId, productVariants.id))
        .where(where)
        .orderBy(asc(products.name))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db
        .select({ count: sql`count(*)::int` })
        .from(storeInventory)
        .innerJoin(products, eq(storeInventory.productId, products.id))
        .where(where),
    ]);
    const { resolveImages } = await import("./productService.js");
    return {
      products: rows.map((r) => ({ ...r, product: { ...r.product, imageUrl: resolveImages(r.product.imageUrl) } })),
      pagination: paginationMeta(total[0].count, pagination),
    };
  },

  async getStoreReviews(storeId, pagination) {
    await this.getStoreById(storeId);
    const where = eq(storeReviews.storeId, storeId);
    const [rows, total, [summary]] = await Promise.all([
      db
        .select({
          id: storeReviews.id,
          rating: storeReviews.rating,
          comment: storeReviews.comment,
          createdAt: storeReviews.createdAt,
          user: { id: users.id, name: users.name },
        })
        .from(storeReviews)
        .leftJoin(users, eq(storeReviews.userId, users.id))
        .where(where)
        .orderBy(desc(storeReviews.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db.select({ count: sql`count(*)::int` }).from(storeReviews).where(where),
      db.select({ rating: sql`coalesce(avg(${storeReviews.rating}), 0)::float` }).from(storeReviews).where(where),
    ]);
    return {
      reviews: rows,
      averageRating: Number(summary.rating.toFixed(2)),
      pagination: paginationMeta(total[0].count, pagination),
    };
  },

  /** Orders collected at this branch. */
  async getStoreOrders(storeId, { status }, pagination) {
    await this.getStoreById(storeId, { includeInactive: true });
    const where = and(inArray(orders.id, pickupOrderIds(storeId)), status ? eq(orders.status, status) : undefined);
    const [rows, total] = await Promise.all([
      db
        .select({ order: orders, pickup: { status: storePickups.status, pickupDate: storePickups.pickupDate } })
        .from(orders)
        .innerJoin(storePickups, and(eq(storePickups.orderId, orders.id), eq(storePickups.storeId, storeId)))
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db.select({ count: sql`count(*)::int` }).from(orders).where(where),
    ]);
    return {
      orders: rows.map(({ order, pickup }) => ({ ...order, pickup })),
      pagination: paginationMeta(total[0].count, pagination),
    };
  },

  /** Paid pickup orders in a date range (default: last 30 days). */
  async getStoreAnalytics(storeId, { startDate, endDate }) {
    await this.getStoreById(storeId, { includeInactive: true });
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const where = and(
      inArray(orders.id, pickupOrderIds(storeId)),
      inArray(orders.paymentStatus, PAID),
      gte(orders.createdAt, start),
      lte(orders.createdAt, end)
    );
    const [[totals], topProducts] = await Promise.all([
      db
        .select({
          totalOrders: sql`count(*)::int`,
          totalSales: sql`coalesce(sum(${orders.total}), 0)`,
          averageOrderValue: sql`coalesce(avg(${orders.total}), 0)`,
        })
        .from(orders)
        .where(where),
      db
        .select({
          productId: orderItems.productId,
          name: products.name,
          quantity: sql`sum(${orderItems.quantity})::int`,
          revenue: sql`sum(${orderItems.subtotal})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(where)
        .groupBy(orderItems.productId, products.name)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),
    ]);
    return {
      period: { start, end },
      totalOrders: totals.totalOrders,
      totalSales: Number(totals.totalSales),
      averageOrderValue: Number(Number(totals.averageOrderValue).toFixed(2)),
      topProducts: topProducts.map((p) => ({ ...p, revenue: Number(p.revenue) })),
    };
  },

  /** Merge into the store's settings (opening hours, pickup rules, ...). */
  async updateStoreSettings(storeId, settings) {
    await this.getStoreById(storeId, { includeInactive: true });
    const existing = await db.query.storeSettings.findFirst({ where: eq(storeSettings.storeId, storeId) });
    const merged = { ...(existing?.settings ?? {}), ...settings };
    if (existing) {
      const [updated] = await db
        .update(storeSettings)
        .set({ settings: merged, updatedAt: new Date() })
        .where(eq(storeSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(storeSettings).values({ storeId, settings: merged }).returning();
    return created;
  },
};
