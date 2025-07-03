import { db } from "../config/db.js";
import { collections, products, collectionProducts } from "../models/schema.js";
import { eq, and, like, or, desc, sql, inArray } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";

export const collectionService = {
  async getCollections({ page = 1, limit = 10, search }) {
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (search) {
      whereConditions.push(
        or(
          like(collections.name, `%${search}%`),
          like(collections.description, `%${search}%`)
        )
      );
    }

    const [collectionList, total] = await Promise.all([
      db.query.collections.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        orderBy: [desc(collections.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(collections)
        .where(
          whereConditions.length > 0 ? and(...whereConditions) : undefined
        ),
    ]);

    return {
      collections: collectionList,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async getCollectionById(id) {
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, id),
      with: {
        products: {
          with: {
            product: {
              with: {
                brand: true,
                category: true,
                variants: true,
              },
            },
          },
        },
      },
    });

    if (!collection) {
      throw new ApiError("Collection not found", 404);
    }

    return collection;
  },

  async getCollectionProducts(collectionId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const [productsList, total] = await Promise.all([
      db.query.collectionProducts.findMany({
        where: eq(collectionProducts.collectionId, collectionId),
        with: {
          product: {
            with: {
              brand: true,
              category: true,
              variants: true,
            },
          },
        },
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(collectionProducts)
        .where(eq(collectionProducts.collectionId, collectionId)),
    ]);

    return {
      products: productsList.map((cp) => cp.product),
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async createCollection(collectionData) {
    // Convert date strings to Date objects
    const processedData = {
      ...collectionData,
      startDate: collectionData.startDate
        ? new Date(collectionData.startDate)
        : undefined,
      endDate: collectionData.endDate
        ? new Date(collectionData.endDate)
        : undefined,
    };

    const [newCollection] = await db
      .insert(collections)
      .values(processedData)
      .returning();

    return newCollection;
  },

  async updateCollection(id, updates) {
    if (!updates || Object.keys(updates).length === 0) {
      throw new ApiError("No update data provided", 400);
    }

    // Convert date strings to Date objects and validate fields
    const processedUpdates = {};

    if (updates.name !== undefined) {
      processedUpdates.name = updates.name;
    }
    if (updates.description !== undefined) {
      processedUpdates.description = updates.description;
    }
    if (updates.image !== undefined) {
      processedUpdates.image = updates.image;
    }
    if (updates.startDate !== undefined) {
      processedUpdates.startDate = new Date(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      processedUpdates.endDate = new Date(updates.endDate);
    }
    if (updates.isActive !== undefined) {
      processedUpdates.isActive = updates.isActive;
    }

    if (Object.keys(processedUpdates).length === 0) {
      throw new ApiError("No valid update data provided", 400);
    }

    const [updatedCollection] = await db
      .update(collections)
      .set(processedUpdates)
      .where(eq(collections.id, id))
      .returning();

    if (!updatedCollection) {
      throw new ApiError("Collection not found", 404);
    }

    return updatedCollection;
  },

  async deleteCollection(id) {
    // Check if collection has products
    const productsCount = await db
      .select({ count: sql`count(*)` })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, id));

    if (Number(productsCount[0].count) > 0) {
      throw new ApiError(
        "Cannot delete collection with associated products",
        400
      );
    }

    const [deletedCollection] = await db
      .delete(collections)
      .where(eq(collections.id, id))
      .returning();

    if (!deletedCollection) {
      throw new ApiError("Collection not found", 404);
    }

    return deletedCollection;
  },

  async addProducts(collectionId, productIds) {
    // Verify collection exists
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection) {
      throw new ApiError("Collection not found", 404);
    }

    // Verify all products exist
    const existingProducts = await db.query.products.findMany({
      where: inArray(products.id, productIds),
    });

    if (existingProducts.length !== productIds.length) {
      throw new ApiError("One or more products not found", 404);
    }

    // Add products to collection
    const collectionProductData = productIds.map((productId) => ({
      collectionId,
      productId,
    }));

    await db.insert(collectionProducts).values(collectionProductData);

    // Return updated collection
    return this.getCollectionById(collectionId);
  },

  async removeProducts(collectionId, productIds) {
    // Verify collection exists
    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection) {
      throw new ApiError("Collection not found", 404);
    }

    // Remove products from collection
    await db
      .delete(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, collectionId),
          inArray(collectionProducts.productId, productIds)
        )
      );

    // Return updated collection
    return this.getCollectionById(collectionId);
  },
};
