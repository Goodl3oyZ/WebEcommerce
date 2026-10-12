/**
 * Per-branch stock (store_inventory). Online stock lives on product_variants;
 * this tracks what each physical store holds.
 */
import { db } from "../config/db.js";
import { storeInventory, products, productVariants, stores } from "../models/schema.js";
import { eq, and, lte, desc, asc, sql, gte } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { paginationMeta } from "../utils/pagination.js";

export const LOW_STOCK_THRESHOLD = 5;

const itemRelations = {
  store: { columns: { id: true, name: true, city: true, isActive: true } },
  product: { columns: { id: true, name: true, isActive: true } },
  variant: { columns: { id: true, sku: true, color: true, size: true } },
};

async function getItem(itemId, txOrDb = db) {
  const item = await txOrDb.query.storeInventory.findFirst({
    where: eq(storeInventory.id, itemId),
    with: itemRelations,
  });
  if (!item) throw ApiError.notFound("Inventory item not found");
  return item;
}

async function assertStore(storeId, txOrDb = db) {
  const store = await txOrDb.query.stores.findFirst({ where: eq(stores.id, storeId) });
  if (!store) throw ApiError.badRequest("Store not found");
}

const list = (where, pagination, orderBy = [desc(storeInventory.updatedAt)]) =>
  Promise.all([
    db.query.storeInventory.findMany({
      where,
      with: itemRelations,
      orderBy,
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    db.select({ count: sql`count(*)::int` }).from(storeInventory).where(where),
  ]).then(([items, total]) => ({ items, pagination: paginationMeta(total[0].count, pagination) }));

export const inventoryService = {
  getAllInventoryItems(pagination) {
    return list(undefined, pagination);
  },

  getInventoryItemById(itemId) {
    return getItem(itemId);
  },

  async getInventoryByLocation(storeId, pagination) {
    await assertStore(storeId);
    return list(eq(storeInventory.storeId, storeId), pagination);
  },

  async getInventoryByProduct(productId, pagination) {
    const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
    if (!product) throw ApiError.notFound("Product not found");
    return list(eq(storeInventory.productId, productId), pagination);
  },

  getLowStockItems(threshold, pagination) {
    return list(lte(storeInventory.quantity, threshold), pagination, [asc(storeInventory.quantity)]);
  },

  /** One row per store + variant. */
  async createInventoryItem({ storeId, productId, variantId, quantity = 0 }) {
    await assertStore(storeId);
    const variant = await db.query.productVariants.findFirst({
      where: and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)),
    });
    if (!variant) throw ApiError.notFound("Product variant not found");
    const existing = await db.query.storeInventory.findFirst({
      where: and(eq(storeInventory.storeId, storeId), eq(storeInventory.variantId, variantId)),
    });
    if (existing) {
      throw new ApiError("This store already tracks this variant; adjust it instead", 409, null, "INVENTORY_EXISTS");
    }
    const [created] = await db
      .insert(storeInventory)
      .values({ storeId, productId, variantId, quantity })
      .returning();
    return getItem(created.id);
  },

  /** Set the counted quantity (e.g. after a stock take). */
  async updateInventoryItem(itemId, { quantity }) {
    await getItem(itemId);
    await db
      .update(storeInventory)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(storeInventory.id, itemId));
    return getItem(itemId);
  },

  /** Add or remove stock atomically; refuses to go below zero. */
  async adjustInventory(itemId, { quantity }) {
    await getItem(itemId);
    const [updated] = await db
      .update(storeInventory)
      .set({ quantity: sql`${storeInventory.quantity} + ${quantity}`, updatedAt: new Date() })
      .where(and(eq(storeInventory.id, itemId), gte(storeInventory.quantity, -quantity)))
      .returning();
    if (!updated) throw ApiError.badRequest("Not enough stock to remove that quantity");
    return getItem(itemId);
  },

  /** Move stock between stores in one transaction. */
  async transferInventory(sourceId, toStoreId, quantity) {
    return db.transaction(async (tx) => {
      const source = await getItem(sourceId, tx);
      if (source.storeId === toStoreId) throw ApiError.badRequest("Source and destination store are the same");
      await assertStore(toStoreId, tx);

      const [taken] = await tx
        .update(storeInventory)
        .set({ quantity: sql`${storeInventory.quantity} - ${quantity}`, updatedAt: new Date() })
        .where(and(eq(storeInventory.id, sourceId), gte(storeInventory.quantity, quantity)))
        .returning();
      if (!taken) throw ApiError.badRequest("Insufficient inventory quantity");

      const destination = await tx.query.storeInventory.findFirst({
        where: and(eq(storeInventory.storeId, toStoreId), eq(storeInventory.variantId, source.variantId)),
      });
      let destinationId = destination?.id;
      if (destination) {
        await tx
          .update(storeInventory)
          .set({ quantity: sql`${storeInventory.quantity} + ${quantity}`, updatedAt: new Date() })
          .where(eq(storeInventory.id, destination.id));
      } else {
        [{ id: destinationId }] = await tx
          .insert(storeInventory)
          .values({ storeId: toStoreId, productId: source.productId, variantId: source.variantId, quantity })
          .returning({ id: storeInventory.id });
      }
      return { source: await getItem(sourceId, tx), destination: await getItem(destinationId, tx) };
    });
  },
};
