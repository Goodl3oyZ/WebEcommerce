import { db } from "../config/db.js";
import {
  stores,
  products,
  orders,
  storeSettings,
  storeReviews,
} from "../models/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

export const storeService = {
  async createStore(userId, storeData) {
    // Check if user already has a store
    const existingStore = await db.query.stores.findFirst({
      where: eq(stores.ownerId, userId),
    });

    if (existingStore) {
      throw new Error("User already has a store");
    }

    // Create store
    const [store] = await db
      .insert(stores)
      .values({
        ownerId: userId,
        name: storeData.name,
        description: storeData.description,
        logo: storeData.logo,
        banner: storeData.banner,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    // Create default store settings
    await db.insert(storeSettings).values({
      storeId: store.id,
      currency: "USD",
      language: "en",
      timezone: "UTC",
      notifications: true,
      autoApproveReviews: false,
    });

    return store;
  },

  async getAllStores({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const items = await db.query.stores.findMany({
      limit: parseInt(limit, 10),
      offset,
      orderBy: [desc(stores.createdAt)],
    });
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(stores);
    return {
      items,
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
  },

  async getStoreById(storeId) {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new Error("Store not found");
    }

    return store;
  },

  async updateStore(userId, storeId, storeData) {
    const store = await this.getStoreById(storeId);

    // Check if user is authorized to update store
    if (store.ownerId !== userId) {
      throw new Error("Not authorized to update store");
    }

    // Update store
    const [updatedStore] = await db
      .update(stores)
      .set({
        name: storeData.name,
        description: storeData.description,
        logo: storeData.logo,
        banner: storeData.banner,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, storeId))
      .returning();

    return updatedStore;
  },

  async deleteStore(userId, storeId) {
    const store = await this.getStoreById(storeId);

    // Check if user is authorized to delete store
    if (store.ownerId !== userId) {
      throw new Error("Not authorized to delete store");
    }

    // Delete store and related data
    await db.delete(stores).where(eq(stores.id, storeId));
  },

  async getStoreProducts(storeId, { page = 1, limit = 10 }) {
    const store = await this.getStoreById(storeId);
    const offset = (page - 1) * limit;

    const [products, total] = await Promise.all([
      db.query.products.findMany({
        where: eq(products.storeId, storeId),
        orderBy: [desc(products.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(products)
        .where(eq(products.storeId, storeId)),
    ]);

    return {
      products,
      pagination: {
        total: total[0].count,
        page,
        limit,
        pages: Math.ceil(total[0].count / limit),
      },
    };
  },

  async getStoreOrders(userId, storeId, { page = 1, limit = 10 }) {
    const store = await this.getStoreById(storeId);

    // Check if user is authorized to view store orders
    if (store.ownerId !== userId) {
      throw new Error("Not authorized to view store orders");
    }

    const offset = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      db.query.orders.findMany({
        where: eq(orders.storeId, storeId),
        orderBy: [desc(orders.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(orders)
        .where(eq(orders.storeId, storeId)),
    ]);

    return {
      orders,
      pagination: {
        total: total[0].count,
        page,
        limit,
        pages: Math.ceil(total[0].count / limit),
      },
    };
  },

  async getStoreAnalytics(userId, storeId, { startDate, endDate }) {
    const store = await this.getStoreById(storeId);

    // Check if user is authorized to view store analytics
    if (store.ownerId !== userId) {
      throw new Error("Not authorized to view store analytics");
    }

    // Get date range
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get analytics data
    const [totalSales, totalOrders, averageOrderValue, topProducts] =
      await Promise.all([
        db
          .select({ total: sql`sum(total)` })
          .from(orders)
          .where(
            and(
              eq(orders.storeId, storeId),
              sql`created_at >= ${start}`,
              sql`created_at <= ${end}`
            )
          ),
        db
          .select({ count: sql`count(*)` })
          .from(orders)
          .where(
            and(
              eq(orders.storeId, storeId),
              sql`created_at >= ${start}`,
              sql`created_at <= ${end}`
            )
          ),
        db
          .select({ avg: sql`avg(total)` })
          .from(orders)
          .where(
            and(
              eq(orders.storeId, storeId),
              sql`created_at >= ${start}`,
              sql`created_at <= ${end}`
            )
          ),
        db.query.products.findMany({
          where: eq(products.storeId, storeId),
          orderBy: [desc(products.salesCount)],
          limit: 5,
        }),
      ]);

    return {
      totalSales: totalSales[0].total || 0,
      totalOrders: totalOrders[0].count,
      averageOrderValue: averageOrderValue[0].avg || 0,
      topProducts,
    };
  },

  async updateStoreSettings(userId, storeId, settings) {
    const store = await this.getStoreById(storeId);

    // Check if user is authorized to update store settings
    if (store.ownerId !== userId) {
      throw new Error("Not authorized to update store settings");
    }

    // Update store settings
    const [updatedSettings] = await db
      .update(storeSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.storeId, storeId))
      .returning();

    return updatedSettings;
  },

  async getStoreReviews(storeId, { page = 1, limit = 10 }) {
    const store = await this.getStoreById(storeId);
    const offset = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      db.query.storeReviews.findMany({
        where: eq(storeReviews.storeId, storeId),
        orderBy: [desc(storeReviews.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(storeReviews)
        .where(eq(storeReviews.storeId, storeId)),
    ]);

    return {
      reviews,
      pagination: {
        total: total[0].count,
        page,
        limit,
        pages: Math.ceil(total[0].count / limit),
      },
    };
  },
};
