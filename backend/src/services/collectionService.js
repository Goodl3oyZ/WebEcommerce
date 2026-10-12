import { db } from "../config/db.js";
import { collections, products, collectionProducts } from "../models/schema.js";
import { eq, and, ne, ilike, or, desc, sql, inArray } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { paginationMeta } from "../utils/pagination.js";
import { listProducts } from "./productService.js";

async function assertProductsExist(tx, productIds) {
  const unique = [...new Set(productIds)];
  const found = await tx.select({ id: products.id }).from(products).where(inArray(products.id, unique));
  if (found.length !== unique.length) throw ApiError.notFound("One or more products not found");
  return unique;
}

/** Link products, skipping ones already in the collection. */
async function linkProducts(tx, collectionId, productIds) {
  const unique = await assertProductsExist(tx, productIds);
  const existing = await tx
    .select({ productId: collectionProducts.productId })
    .from(collectionProducts)
    .where(and(eq(collectionProducts.collectionId, collectionId), inArray(collectionProducts.productId, unique)));
  const already = new Set(existing.map((r) => r.productId));
  const rows = unique.filter((id) => !already.has(id)).map((productId) => ({ collectionId, productId }));
  if (rows.length) await tx.insert(collectionProducts).values(rows);
}

async function memberIds(collectionId) {
  const rows = await db
    .select({ productId: collectionProducts.productId })
    .from(collectionProducts)
    .where(eq(collectionProducts.collectionId, collectionId));
  return rows.map((r) => r.productId);
}

export const collectionService = {
  async getCollections({ search, includeInactive }, pagination) {
    const conditions = [];
    if (!includeInactive) conditions.push(eq(collections.isActive, true));
    if (search) {
      conditions.push(or(ilike(collections.name, `%${search}%`), ilike(collections.description, `%${search}%`)));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, total] = await Promise.all([
      db
        .select({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          isActive: collections.isActive,
          createdAt: collections.createdAt,
          updatedAt: collections.updatedAt,
          productCount: sql`count(${collectionProducts.id})::int`,
        })
        .from(collections)
        .leftJoin(collectionProducts, eq(collectionProducts.collectionId, collections.id))
        .where(where)
        .groupBy(collections.id)
        .orderBy(desc(collections.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db.select({ count: sql`count(*)::int` }).from(collections).where(where),
    ]);
    return { collections: rows, pagination: paginationMeta(total[0].count, pagination) };
  },

  async getCollection(id, { includeInactive = false } = {}) {
    const collection = await db.query.collections.findFirst({ where: eq(collections.id, id) });
    if (!collection || (!collection.isActive && !includeInactive)) throw ApiError.notFound("Collection not found");
    return collection;
  },

  /** Collection with its (visible) products. */
  async getCollectionById(id, { includeInactive = false } = {}) {
    const collection = await this.getCollection(id, { includeInactive });
    const ids = await memberIds(id);
    const { products: items } = ids.length
      ? await listProducts({ productIds: ids, includeInactive }, { limit: 100, offset: 0, page: 1 })
      : { products: [] };
    return { ...collection, products: items };
  },

  async getCollectionProducts(collectionId, filters, pagination) {
    await this.getCollection(collectionId, { includeInactive: filters.includeInactive });
    const ids = await memberIds(collectionId);
    if (ids.length === 0) return { products: [], pagination: { total: 0, page: pagination.page, limit: pagination.limit, pages: 0 } };
    return listProducts({ ...filters, productIds: ids }, pagination);
  },

  async createCollection({ name, description, isActive, products: productIds }) {
    await this.assertNameAvailable(name);
    const collection = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(collections)
        .values({ name, description: description?.trim() || null, isActive: isActive ?? true })
        .returning();
      if (productIds?.length) await linkProducts(tx, created.id, productIds);
      return created;
    });
    return this.getCollectionById(collection.id, { includeInactive: true });
  },

  /** `products`, when given, replaces the collection's product list. */
  async updateCollection(id, updates) {
    await this.getCollection(id, { includeInactive: true });
    if (updates.name !== undefined) await this.assertNameAvailable(updates.name, id);
    await db.transaction(async (tx) => {
      const changes = { updatedAt: new Date() };
      if (updates.name !== undefined) changes.name = updates.name;
      if (updates.description !== undefined) changes.description = updates.description?.trim() || null;
      if (updates.isActive !== undefined) changes.isActive = updates.isActive;
      await tx.update(collections).set(changes).where(eq(collections.id, id));
      if (updates.products !== undefined) {
        await tx.delete(collectionProducts).where(eq(collectionProducts.collectionId, id));
        if (updates.products.length) await linkProducts(tx, id, updates.products);
      }
    });
    return this.getCollectionById(id, { includeInactive: true });
  },

  /** Deleting a collection only removes the grouping, never the products. */
  async deleteCollection(id) {
    await this.getCollection(id, { includeInactive: true });
    return db.transaction(async (tx) => {
      await tx.delete(collectionProducts).where(eq(collectionProducts.collectionId, id));
      const [deleted] = await tx.delete(collections).where(eq(collections.id, id)).returning();
      return deleted;
    });
  },

  async addProducts(collectionId, productIds) {
    await this.getCollection(collectionId, { includeInactive: true });
    await db.transaction((tx) => linkProducts(tx, collectionId, productIds));
    return this.getCollectionById(collectionId, { includeInactive: true });
  },

  async removeProducts(collectionId, productIds) {
    await this.getCollection(collectionId, { includeInactive: true });
    await db
      .delete(collectionProducts)
      .where(and(eq(collectionProducts.collectionId, collectionId), inArray(collectionProducts.productId, productIds)));
    return this.getCollectionById(collectionId, { includeInactive: true });
  },

  async assertNameAvailable(name, exceptId) {
    const existing = await db.query.collections.findFirst({
      where: exceptId ? and(eq(collections.name, name), ne(collections.id, exceptId)) : eq(collections.name, name),
    });
    if (existing) throw ApiError.conflict("A collection with this name already exists");
  },
};
