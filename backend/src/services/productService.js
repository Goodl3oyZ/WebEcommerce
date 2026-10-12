import { db } from "../config/db.js";
import {
  products,
  productVariants,
  productAttributes,
  productReviews,
} from "../models/schema.js";
import { eq, ilike, and, or, desc, asc, sql, gte, lte, inArray, exists } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { getFileUrl, toStoredKey, BUCKETS } from "../config/minio.js";
import { paginationMeta } from "../utils/pagination.js";

const reviewer = { columns: { id: true, name: true, avatar: true } };

/** Product images are stored as keys; responses carry public URLs. */
export function resolveImages(value) {
  const url = (img) => (img ? getFileUrl(BUCKETS.PRODUCTS, img) : null);
  if (Array.isArray(value)) return value.map(url);
  if (typeof value === "string") return url(value);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, Array.isArray(v) ? v.map(url) : typeof v === "string" ? url(v) : v])
    );
  }
  return value ?? null;
}

/** Inverse of resolveImages: our public URLs become keys before saving. */
function toStoredImages(value) {
  const key = (img) => toStoredKey(BUCKETS.PRODUCTS, img);
  if (Array.isArray(value)) return value.filter(Boolean).map(key);
  if (typeof value === "string") return key(value);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, Array.isArray(v) ? v.map(key) : typeof v === "string" ? key(v) : v])
    );
  }
  return value ?? null;
}

/** Response shape: image URLs, total stock and rating summary. */
export function presentProduct(product, ratings) {
  if (!product) return product;
  const variants = product.variants ?? [];
  const summary = ratings?.get(product.id);
  const reviews = product.reviews;
  return {
    ...product,
    imageUrl: resolveImages(product.imageUrl),
    stock: variants.reduce((sum, v) => sum + (v.stock ?? 0), 0),
    rating: summary ? summary.rating : reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
    reviewCount: summary ? summary.count : reviews?.length ?? 0,
  };
}

/** Kept for callers that only need image URLs. */
export const withPresignedImageUrl = async (product) =>
  product && { ...product, imageUrl: resolveImages(product.imageUrl) };

async function ratingSummaries(productIds) {
  if (productIds.length === 0) return new Map();
  const rows = await db
    .select({
      productId: productReviews.productId,
      rating: sql`avg(${productReviews.rating})::float`,
      count: sql`count(*)::int`,
    })
    .from(productReviews)
    .where(inArray(productReviews.productId, productIds))
    .groupBy(productReviews.productId);
  return new Map(rows.map((r) => [r.productId, { rating: Number(r.rating.toFixed(2)), count: r.count }]));
}

const SORTS = {
  newest: desc(products.createdAt),
  oldest: asc(products.createdAt),
  price_asc: asc(products.price),
  price_desc: desc(products.price),
  name_asc: asc(products.name),
  name_desc: desc(products.name),
};

/**
 * The one product listing query (catalog, search, category, brand, collection).
 * Inactive products are only included when the caller is an admin.
 */
export async function listProducts(filters, pagination) {
  const conditions = [];
  if (!filters.includeInactive) conditions.push(eq(products.isActive, true));
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.brandId) conditions.push(eq(products.brandId, filters.brandId));
  if (filters.productIds) conditions.push(inArray(products.id, filters.productIds));
  if (filters.minPrice != null) conditions.push(gte(products.price, String(filters.minPrice)));
  if (filters.maxPrice != null) conditions.push(lte(products.price, String(filters.maxPrice)));
  if (filters.search) {
    conditions.push(or(ilike(products.name, `%${filters.search}%`), ilike(products.description, `%${filters.search}%`)));
  }
  if (filters.inStock) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(productVariants)
          .where(and(eq(productVariants.productId, products.id), sql`${productVariants.stock} > 0`))
      )
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db.query.products.findMany({
      where,
      with: { category: true, brand: true, variants: true },
      orderBy: [SORTS[filters.sort] ?? SORTS.newest, asc(products.id)],
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    db.select({ count: sql`count(*)::int` }).from(products).where(where),
  ]);
  const ratings = await ratingSummaries(rows.map((p) => p.id));
  return {
    products: rows.map((p) => presentProduct(p, ratings)),
    pagination: paginationMeta(total[0].count, pagination),
  };
}

async function getVisibleProduct(id, { includeInactive = false } = {}) {
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product || (!product.isActive && !includeInactive)) {
    throw new ApiError("Product not found", 404, null, "PRODUCT_NOT_FOUND");
  }
  return product;
}

async function replaceAttributes(tx, productId, attributes) {
  await tx.delete(productAttributes).where(eq(productAttributes.productId, productId));
  const rows = Object.entries(attributes ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([name, value]) => ({ productId, name, value: String(value) }));
  if (rows.length) await tx.insert(productAttributes).values(rows);
}

export const productService = {
  resolveImages,
  presentProduct,
  withPresignedImageUrl,
  listProducts,

  async getProducts(filters, pagination) {
    return listProducts(filters, pagination);
  },

  async searchProducts(query, filters, pagination) {
    return listProducts({ ...filters, search: query }, pagination);
  },

  async getProductsByCategory(categoryId, filters, pagination) {
    return listProducts({ ...filters, categoryId }, pagination);
  },

  async getProductById(id, { includeInactive = false } = {}) {
    await getVisibleProduct(id, { includeInactive });
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        category: true,
        brand: true,
        variants: { orderBy: [asc(productVariants.size), asc(productVariants.color)] },
        attributes: true,
        reviews: { with: { user: reviewer }, orderBy: [desc(productReviews.createdAt)] },
      },
    });
    return {
      ...presentProduct(product),
      attributes: Object.fromEntries((product.attributes ?? []).map((a) => [a.name, a.value])),
    };
  },

  async createProduct(data) {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(products)
        .values({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          price: String(data.price),
          imageUrl: toStoredImages(data.imageUrl) ?? null,
          categoryId: data.categoryId,
          brandId: data.brandId ?? null,
          isActive: data.isActive ?? true,
        })
        .returning();
      if (data.attributes) await replaceAttributes(tx, created.id, data.attributes);
      return presentProduct({ ...created, variants: [] });
    });
  },

  /** Basic fields and attributes. Variants have their own endpoints. */
  async updateProduct(id, updates) {
    await getVisibleProduct(id, { includeInactive: true });
    return db.transaction(async (tx) => {
      const changes = {};
      for (const key of ["name", "description", "categoryId", "brandId", "isActive"]) {
        if (updates[key] !== undefined) changes[key] = updates[key];
      }
      if (updates.price !== undefined) changes.price = String(updates.price);
      if (updates.imageUrl !== undefined) changes.imageUrl = toStoredImages(updates.imageUrl);
      if (Object.keys(changes).length) {
        await tx.update(products).set(changes).where(eq(products.id, id));
      }
      if (updates.attributes !== undefined) await replaceAttributes(tx, id, updates.attributes);

      const updated = await tx.query.products.findFirst({
        where: eq(products.id, id),
        with: { category: true, brand: true, variants: true, attributes: true },
      });
      return {
        ...presentProduct(updated),
        attributes: Object.fromEntries(updated.attributes.map((a) => [a.name, a.value])),
      };
    });
  },

  /** Soft delete: the product stays referenced by past orders. */
  async deleteProduct(id) {
    await getVisibleProduct(id, { includeInactive: true });
    const [deleted] = await db.update(products).set({ isActive: false }).where(eq(products.id, id)).returning();
    return deleted;
  },

  async getProductVariants(productId, { includeInactive = false } = {}) {
    await getVisibleProduct(productId, { includeInactive });
    return db.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
      orderBy: [asc(productVariants.size), asc(productVariants.color)],
    });
  },

  async createVariant(productId, data) {
    await getVisibleProduct(productId, { includeInactive: true });
    const [variant] = await db
      .insert(productVariants)
      .values({
        productId,
        color: data.color.trim(),
        size: data.size.trim(),
        sku: data.sku.trim(),
        stock: data.stock,
        price: String(data.price),
      })
      .returning();
    return variant;
  },

  async updateVariant(productId, variantId, updates) {
    const changes = {};
    for (const key of ["color", "size", "sku", "stock"]) {
      if (updates[key] !== undefined) changes[key] = typeof updates[key] === "string" ? updates[key].trim() : updates[key];
    }
    if (updates.price !== undefined) changes.price = String(updates.price);
    const [variant] = await db
      .update(productVariants)
      .set(changes)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
      .returning();
    if (!variant) throw ApiError.notFound("Variant not found");
    return variant;
  },

  /** Variants that were ever ordered cannot be deleted (set stock to 0 instead). */
  async deleteVariant(productId, variantId) {
    const [deleted] = await db
      .delete(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
      .returning();
    if (!deleted) throw ApiError.notFound("Variant not found");
    return deleted;
  },

  async getProductReviews(productId, pagination) {
    await getVisibleProduct(productId);
    const where = eq(productReviews.productId, productId);
    const [reviews, total, [summary]] = await Promise.all([
      db.query.productReviews.findMany({
        where,
        with: { user: reviewer },
        limit: pagination.limit,
        offset: pagination.offset,
        orderBy: [desc(productReviews.createdAt)],
      }),
      db.select({ count: sql`count(*)::int` }).from(productReviews).where(where),
      db.select({ rating: sql`coalesce(avg(${productReviews.rating}), 0)::float` }).from(productReviews).where(where),
    ]);
    return {
      reviews,
      averageRating: Number(summary.rating.toFixed(2)),
      pagination: paginationMeta(total[0].count, pagination),
    };
  },

  /** One review per customer per product. */
  async createReview(productId, userId, { rating, comment }) {
    await getVisibleProduct(productId);
    const existing = await db.query.productReviews.findFirst({
      where: and(eq(productReviews.productId, productId), eq(productReviews.userId, userId)),
    });
    if (existing) {
      throw new ApiError("You have already reviewed this product. Edit your review instead.", 409, null, "REVIEW_EXISTS");
    }
    const [review] = await db
      .insert(productReviews)
      .values({ productId, userId, rating, comment: comment?.trim() || null })
      .returning();
    return review;
  },

  async updateReview(productId, reviewId, userId, updates) {
    const review = await db.query.productReviews.findFirst({
      where: and(eq(productReviews.id, reviewId), eq(productReviews.productId, productId)),
    });
    if (!review) throw ApiError.notFound("Review not found");
    if (review.userId !== userId) throw ApiError.forbidden("You can only edit your own review");

    const changes = {};
    if (updates.rating !== undefined) changes.rating = updates.rating;
    if (updates.comment !== undefined) changes.comment = updates.comment?.trim() || null;
    const [updated] = await db
      .update(productReviews)
      .set(changes)
      .where(eq(productReviews.id, reviewId))
      .returning();
    return updated;
  },

  /** Authors delete their own review; moderators and admins can remove any. */
  async deleteReview(productId, reviewId, actor) {
    const review = await db.query.productReviews.findFirst({
      where: and(eq(productReviews.id, reviewId), eq(productReviews.productId, productId)),
    });
    if (!review) throw ApiError.notFound("Review not found");
    const canModerate = ["moderator", "admin", "super_admin"].includes(actor.role);
    if (review.userId !== actor.id && !canModerate) {
      throw ApiError.forbidden("You can only delete your own review");
    }
    await db.delete(productReviews).where(eq(productReviews.id, reviewId));
  },
};
