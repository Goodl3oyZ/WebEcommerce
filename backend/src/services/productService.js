import { db } from "../config/db.js";
import {
  products,
  productVariants,
  productAttributes,
  productReviews,
  inventoryMovements,
  orders,
  orderItems,
} from "../models/schema.js";
import { eq, ilike, and, or, desc, asc, sql, gte, lte, inArray, exists } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { getFileUrl, toStoredKey, BUCKETS } from "../config/minio.js";
import { paginationMeta } from "../utils/pagination.js";
import { branchStockByVariant, heldAtABranch } from "./branchStock.js";
import {
  loyaltyService,
  REVIEW_REWARD_POINTS,
  REVIEW_REWARD_MIN_LENGTH,
  reviewEarnsPoints,
} from "./loyaltyService.js";

// Orders whose goods reached the customer: only these can be reviewed.
const RECEIVED = ["delivered", "refund_requested", "refunded"];

/** Did this customer receive this product in some order? */
async function hasReceived(userId, productId) {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, userId), eq(orderItems.productId, productId), inArray(orders.status, RECEIVED)))
    .limit(1);
  return Boolean(row);
}

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

const actorNote = (actorId) => (actorId ? `by user ${actorId}` : null);

/**
 * Response shape: image URLs, total stock and rating summary. `stock` is the
 * online (delivery) stock; with `branchStock` (variantId -> most units at one
 * open branch) each variant also says what can be bought for branch pickup.
 */
export function presentProduct(product, ratings, branchStock) {
  if (!product) return product;
  const variants = branchStock
    ? (product.variants ?? []).map((v) => ({ ...v, branchStock: branchStock.get(v.id) ?? 0 }))
    : product.variants ?? [];
  const summary = ratings?.get(product.id);
  const reviews = product.reviews;
  return {
    ...product,
    ...(branchStock && { variants, branchStock: variants.reduce((sum, v) => sum + v.branchStock, 0) }),
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
/** Minimum pg_trgm word similarity for a typo to still match ("clasic" → "Classic"). */
const FUZZY_THRESHOLD = 0.3;
let trigramReady;

/** pg_trgm powers typo-tolerant search; without it search falls back to substring matching. */
function trigramAvailable() {
  trigramReady ??= db
    .execute(sql`create extension if not exists pg_trgm`)
    .then(() => true)
    .catch(async () => {
      // Another process may have created it concurrently, or we lack the privilege.
      const res = await db.execute(sql`select 1 from pg_extension where extname = 'pg_trgm'`).catch(() => null);
      return Boolean((res?.rows ?? res ?? []).length);
    });
  return trigramReady;
}

/** Treat the user's text literally inside ILIKE (no % or _ wildcards). */
const escapeLike = (text) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listProducts(filters, pagination) {
  const conditions = [];
  if (!filters.includeInactive) conditions.push(eq(products.isActive, true));
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.brandId) conditions.push(eq(products.brandId, filters.brandId));
  if (filters.productIds) conditions.push(inArray(products.id, filters.productIds));
  if (filters.minPrice != null) conditions.push(gte(products.price, String(filters.minPrice)));
  if (filters.maxPrice != null) conditions.push(lte(products.price, String(filters.maxPrice)));
  let relevance = null;
  const term = filters.search?.trim();
  if (term) {
    const like = `%${escapeLike(term)}%`;
    const brandLike = sql`${products.brandId} in (select id from brands where name ilike ${like})`;
    const substring = or(ilike(products.name, like), ilike(products.description, like), brandLike);
    if (await trigramAvailable()) {
      const q = term.toLowerCase();
      const nameScore = sql`word_similarity(${q}, lower(${products.name}))`;
      const brandScore = sql`coalesce((select word_similarity(${q}, lower(b.name)) from brands b where b.id = ${products.brandId}), 0)`;
      conditions.push(or(substring, sql`${nameScore} >= ${FUZZY_THRESHOLD}`, sql`${brandScore} >= ${FUZZY_THRESHOLD}`));
      // Exact substring hits first, then the closest typo matches.
      relevance = sql`greatest(case when ${products.name} ilike ${like} then 1 else 0 end, ${nameScore}, ${brandScore}) desc`;
    } else {
      conditions.push(substring);
    }
  }
  if (filters.inStock) {
    // Online stock, or a branch that can hand it over (pickup).
    conditions.push(
      or(
        heldAtABranch(products.id),
        exists(
          db
            .select({ one: sql`1` })
            .from(productVariants)
            .where(and(eq(productVariants.productId, products.id), sql`${productVariants.stock} > 0`))
        )
      )
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db.query.products.findMany({
      where,
      with: { category: true, brand: true, variants: true },
      // A search without an explicit sort is ordered by relevance.
      orderBy: [...(relevance && !filters.sort ? [relevance] : []), SORTS[filters.sort] ?? SORTS.newest, asc(products.id)],
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    db.select({ count: sql`count(*)::int` }).from(products).where(where),
  ]);
  const [ratings, branchStock] = await Promise.all([
    ratingSummaries(rows.map((p) => p.id)),
    branchStockByVariant(rows.flatMap((p) => p.variants.map((v) => v.id))),
  ]);
  return {
    products: rows.map((p) => presentProduct(p, ratings, branchStock)),
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
    const branchStock = await branchStockByVariant(product.variants.map((v) => v.id));
    return {
      ...presentProduct(product, undefined, branchStock),
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

  async createVariant(productId, data, { actorId } = {}) {
    await getVisibleProduct(productId, { includeInactive: true });
    return db.transaction(async (tx) => {
      const [variant] = await tx
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
      if (variant.stock) {
        await tx.insert(inventoryMovements).values({ variantId: variant.id, change: variant.stock, reason: "admin_initial", note: actorNote(actorId) });
      }
      return variant;
    });
  },

  /** Stock set by an admin is logged as the difference from what it was. */
  async updateVariant(productId, variantId, updates, { actorId } = {}) {
    const changes = {};
    for (const key of ["color", "size", "sku", "stock"]) {
      if (updates[key] !== undefined) changes[key] = typeof updates[key] === "string" ? updates[key].trim() : updates[key];
    }
    if (updates.price !== undefined) changes.price = String(updates.price);
    return db.transaction(async (tx) => {
      const where = and(eq(productVariants.id, variantId), eq(productVariants.productId, productId));
      // Lock the row so a checkout cannot reserve between reading and writing the stock.
      const [before] = await tx.select({ stock: productVariants.stock }).from(productVariants).where(where).for("update");
      if (!before) throw ApiError.notFound("Variant not found");
      const [variant] = await tx.update(productVariants).set(changes).where(where).returning();
      const change = variant.stock - before.stock;
      if (change) {
        await tx.insert(inventoryMovements).values({ variantId, change, reason: "admin_adjust", note: actorNote(actorId) });
      }
      return variant;
    });
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

  /** Admin: all product reviews with product and reviewer, newest first. */
  async adminListReviews({ rating, search }, pagination) {
    const conditions = [];
    if (rating) conditions.push(eq(productReviews.rating, rating));
    if (search) {
      const like = `%${search}%`;
      conditions.push(
        sql`(${productReviews.comment} ilike ${like}
          or exists (select 1 from products p where p.id = ${productReviews.productId} and p.name ilike ${like})
          or exists (select 1 from users u where u.id = ${productReviews.userId} and u.name ilike ${like}))`
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      db.query.productReviews.findMany({
        where,
        with: { user: reviewer, product: { columns: { id: true, name: true, imageUrl: true } } },
        orderBy: [desc(productReviews.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ total: sql`count(*)::int` }).from(productReviews).where(where),
    ]);
    const reviews = rows.map((r) => ({
      ...r,
      product: r.product && { ...r.product, imageUrl: resolveImages(r.product.imageUrl) },
    }));
    return { reviews, pagination: paginationMeta(total, pagination) };
  },

  /**
   * Can this customer review the product? Only after receiving it in an
   * order, once per product. Also returns their review and the reward rule.
   */
  async reviewEligibility(productId, userId) {
    await getVisibleProduct(productId);
    const [review, received] = await Promise.all([
      db.query.productReviews.findFirst({
        where: and(eq(productReviews.productId, productId), eq(productReviews.userId, userId)),
      }),
      hasReceived(userId, productId),
    ]);
    const reason = review ? "already_reviewed" : received ? null : "not_received";
    return {
      canReview: !reason,
      reason,
      review: review ?? null,
      reward: { points: REVIEW_REWARD_POINTS, minLength: REVIEW_REWARD_MIN_LENGTH },
    };
  },

  /** One review per customer per product, after receiving it; a written review earns points once. */
  async createReview(productId, userId, { rating, comment }) {
    await getVisibleProduct(productId);
    const existing = await db.query.productReviews.findFirst({
      where: and(eq(productReviews.productId, productId), eq(productReviews.userId, userId)),
    });
    if (existing) {
      throw new ApiError("You have already reviewed this product. Edit your review instead.", 409, null, "REVIEW_EXISTS");
    }
    if (!(await hasReceived(userId, productId))) {
      throw new ApiError(
        "You can review a product after you have received it.",
        403,
        null,
        "REVIEW_NOT_ALLOWED"
      );
    }
    return db.transaction(async (tx) => {
      const [review] = await tx
        .insert(productReviews)
        .values({ productId, userId, rating, comment: comment?.trim() || null })
        .returning();
      const pointsAwarded = await loyaltyService.rewardReview(tx, userId, productId, review.comment);
      return { ...review, pointsAwarded };
    });
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
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(productReviews)
        .set(changes)
        .where(eq(productReviews.id, reviewId))
        .returning();
      // Adding a comment later still earns the reward (once).
      const pointsAwarded = reviewEarnsPoints(updated.comment)
        ? await loyaltyService.rewardReview(tx, userId, productId, updated.comment)
        : 0;
      return { ...updated, pointsAwarded };
    });
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
