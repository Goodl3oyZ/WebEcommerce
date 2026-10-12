import { db } from "../config/db.js";
import { coupons, orderCoupons, orders, users } from "../models/schema.js";
import { eq, and, desc, sql, gte, lte, ilike, ne } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { toSatang, fromSatang, percentOf } from "../utils/money.js";
import { paginationMeta } from "../utils/pagination.js";

export const normalizeCouponCode = (code) => String(code ?? "").trim().toUpperCase();
const normalizeType = (type) => (type === "fixed" ? "fixed_amount" : type);

function isCouponActive(coupon, now = new Date()) {
  if (!coupon.isActive) return false;
  if (coupon.startDate && new Date(coupon.startDate) > now) return false;
  if (coupon.endDate && new Date(coupon.endDate) < now) return false;
  return true;
}

/** Discount in satang for an amount in satang; never more than the amount. */
function discountSatang(coupon, amountSatang) {
  const minPurchase = toSatang(coupon.minPurchase);
  if (amountSatang < minPurchase) {
    throw ApiError.badRequest(`Minimum purchase amount is ${fromSatang(minPurchase)}`);
  }
  let discount =
    coupon.type === "percentage"
      ? percentOf(amountSatang, coupon.value)
      : toSatang(coupon.value);
  if (coupon.maxDiscount != null) discount = Math.min(discount, toSatang(coupon.maxDiscount));
  return Math.min(discount, amountSatang);
}

/** Uses that count against limits: orders that were not cancelled. */
async function countUses(couponId, userId, txOrDb) {
  const base = and(eq(orderCoupons.couponId, couponId), ne(orders.status, "cancelled"));
  const query = (where) =>
    txOrDb
      .select({ count: sql`count(*)::int` })
      .from(orderCoupons)
      .innerJoin(orders, eq(orderCoupons.orderId, orders.id))
      .where(where);
  const [[total], [mine]] = await Promise.all([
    query(base),
    userId ? query(and(base, eq(orders.userId, userId))) : [{ count: 0 }],
  ]);
  return { total: total.count, mine: mine.count };
}

const publicCoupon = (coupon) => ({
  id: coupon.id,
  code: coupon.code,
  type: coupon.type,
  value: Number(coupon.value),
  minPurchase: coupon.minPurchase != null ? Number(coupon.minPurchase) : null,
  maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
  endDate: coupon.endDate,
});

export const couponService = {
  /**
   * Resolve a coupon for an amount (satang): checks active window, minimum
   * purchase and usage limits. Shared by /coupons/validate and checkout.
   */
  async resolve(code, amountSatang, userId, txOrDb = db) {
    const coupon = await txOrDb.query.coupons.findFirst({
      where: eq(coupons.code, normalizeCouponCode(code)),
    });
    if (!coupon || !isCouponActive(coupon)) {
      throw ApiError.badRequest("Invalid or expired coupon");
    }
    if (coupon.usageLimit != null || coupon.perUserLimit != null) {
      const uses = await countUses(coupon.id, userId, txOrDb);
      if (coupon.usageLimit != null && uses.total >= coupon.usageLimit) {
        throw ApiError.badRequest("This coupon has reached its usage limit");
      }
      if (coupon.perUserLimit != null && uses.mine >= coupon.perUserLimit) {
        throw ApiError.badRequest("You have already used this coupon");
      }
    }
    return { coupon, discountSatang: discountSatang(coupon, amountSatang) };
  },

  async validateCoupon(code, amount, userId) {
    if (!code || amount == null || Number.isNaN(Number(amount))) {
      throw ApiError.badRequest("Coupon code and amount are required");
    }
    const { coupon, discountSatang: discount } = await this.resolve(
      code,
      toSatang(amount),
      userId
    );
    return { valid: true, discount: Number(fromSatang(discount)), coupon: publicCoupon(coupon) };
  },

  async getAvailableCoupons() {
    const now = new Date();
    const active = await db.query.coupons.findMany({
      where: and(eq(coupons.isActive, true), lte(coupons.startDate, now), gte(coupons.endDate, now)),
      orderBy: [desc(coupons.createdAt)],
    });
    return active.map(publicCoupon);
  },

  async getCoupons({ search } = {}) {
    const where = search ? ilike(coupons.code, `%${search}%`) : undefined;
    return db.query.coupons.findMany({ where, orderBy: [desc(coupons.createdAt)] });
  },

  async getCouponById(id) {
    const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
    if (!coupon) {
      throw ApiError.notFound("Coupon not found");
    }
    return coupon;
  },

  async assertCodeAvailable(code, exceptId) {
    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
    if (existing && existing.id !== exceptId) {
      throw ApiError.conflict("รหัสคูปองนี้ถูกใช้แล้ว");
    }
  },

  async createCoupon(data) {
    const code = normalizeCouponCode(data.code);
    await this.assertCodeAvailable(code);
    const [coupon] = await db
      .insert(coupons)
      .values({
        code,
        type: normalizeType(data.type),
        value: String(data.value),
        minPurchase: data.minPurchase != null ? String(data.minPurchase) : null,
        maxDiscount: data.maxDiscount != null ? String(data.maxDiscount) : null,
        usageLimit: data.usageLimit ?? null,
        perUserLimit: data.perUserLimit ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive ?? true,
      })
      .returning();
    return coupon;
  },

  async updateCoupon(id, data) {
    const current = await this.getCouponById(id);

    const updates = { updatedAt: new Date() };
    if (data.code != null) {
      updates.code = normalizeCouponCode(data.code);
      await this.assertCodeAvailable(updates.code, id);
    }
    if (data.type != null) updates.type = normalizeType(data.type);
    if (data.value != null) updates.value = String(data.value);
    if (data.minPurchase !== undefined) {
      updates.minPurchase = data.minPurchase === null ? null : String(data.minPurchase);
    }
    if (data.maxDiscount !== undefined) {
      updates.maxDiscount = data.maxDiscount === null ? null : String(data.maxDiscount);
    }
    if (data.usageLimit !== undefined) updates.usageLimit = data.usageLimit;
    if (data.perUserLimit !== undefined) updates.perUserLimit = data.perUserLimit;
    if (data.startDate != null) updates.startDate = new Date(data.startDate);
    if (data.endDate != null) updates.endDate = new Date(data.endDate);
    if (data.isActive != null) updates.isActive = data.isActive;

    // Rules that span fields are checked against the merged result.
    const merged = { ...current, ...updates };
    if (merged.type === "percentage" && Number(merged.value) > 100) {
      throw ApiError.badRequest("A percentage discount cannot exceed 100");
    }
    if (new Date(merged.endDate) <= new Date(merged.startDate)) {
      throw ApiError.badRequest("endDate must be after startDate");
    }

    const [coupon] = await db.update(coupons).set(updates).where(eq(coupons.id, id)).returning();
    return coupon;
  },

  /** Coupons are never hard-deleted (orders reference them); they are disabled. */
  async deleteCoupon(id) {
    await this.getCouponById(id);
    const [usage] = await db
      .select({ count: sql`count(*)::int` })
      .from(orderCoupons)
      .where(eq(orderCoupons.couponId, id));

    const [updated] = await db
      .update(coupons)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning();

    return { ...updated, disabledInsteadOfDeleted: true, usageCount: usage?.count ?? 0 };
  },

  async setActive(id, isActive) {
    const [coupon] = await db
      .update(coupons)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning();
    if (!coupon) {
      throw ApiError.notFound("Coupon not found");
    }
    return coupon;
  },

  async getCouponStatistics() {
    const now = new Date();
    const [stats] = await db
      .select({
        totalCoupons: sql`count(*)::int`,
        activeCoupons: sql`(count(*) filter (where ${coupons.isActive} = true and ${coupons.startDate} <= ${now} and ${coupons.endDate} >= ${now}))::int`,
      })
      .from(coupons);
    const [usage] = await db
      .select({
        timesUsed: sql`count(*)::int`,
        totalDiscount: sql`coalesce(sum(${orderCoupons.discountAmount}), 0)`,
      })
      .from(orderCoupons)
      .innerJoin(orders, eq(orderCoupons.orderId, orders.id))
      .where(ne(orders.status, "cancelled"));

    return {
      ...stats,
      timesUsed: usage.timesUsed,
      totalDiscount: Number(usage.totalDiscount),
      coupons: await this.getCoupons(),
    };
  },

  async getCouponUsage(id, pagination) {
    await this.getCouponById(id);
    const [items, total] = await Promise.all([
      db
        .select({
          id: orderCoupons.id,
          orderId: orderCoupons.orderId,
          orderNumber: orders.orderNumber,
          orderStatus: orders.status,
          couponId: orderCoupons.couponId,
          discountAmount: orderCoupons.discountAmount,
          createdAt: orderCoupons.createdAt,
          userEmail: users.email,
        })
        .from(orderCoupons)
        .innerJoin(orders, eq(orderCoupons.orderId, orders.id))
        .leftJoin(users, eq(orders.userId, users.id))
        .where(eq(orderCoupons.couponId, id))
        .orderBy(desc(orderCoupons.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db.select({ count: sql`count(*)::int` }).from(orderCoupons).where(eq(orderCoupons.couponId, id)),
    ]);

    return { items, total: total[0].count, ...paginationMeta(total[0].count, pagination) };
  },
};
