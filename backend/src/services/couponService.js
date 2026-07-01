import { db } from "../config/db.js";
import { coupons, orderCoupons, orders, users } from "../models/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";

function isCouponActive(coupon, now = new Date()) {
  if (!coupon.isActive) return false;
  if (coupon.startDate && new Date(coupon.startDate) > now) return false;
  if (coupon.endDate && new Date(coupon.endDate) < now) return false;
  return true;
}

function calculateDiscount(coupon, amount) {
  const numericAmount = Number(amount);
  const value = Number(coupon.value);
  const minPurchase = coupon.minPurchase ? Number(coupon.minPurchase) : 0;
  const maxDiscount = coupon.maxDiscount ? Number(coupon.maxDiscount) : null;

  if (numericAmount < minPurchase) {
    throw ApiError.badRequest(`Minimum purchase amount is ${minPurchase}`);
  }

  let discount =
    coupon.type === "percentage"
      ? numericAmount * (value / 100)
      : value;

  if (maxDiscount != null && discount > maxDiscount) {
    discount = maxDiscount;
  }

  return discount;
}

export const couponService = {
  async validateCoupon(code, amount) {
    if (!code || amount == null) {
      throw ApiError.badRequest("Coupon code and amount are required");
    }

    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
    });

    if (!coupon || !isCouponActive(coupon)) {
      throw ApiError.badRequest("Invalid or expired coupon");
    }

    const discount = calculateDiscount(coupon, amount);

    return {
      valid: true,
      discount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minPurchase: coupon.minPurchase ? Number(coupon.minPurchase) : null,
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      },
    };
  },

  async getAvailableCoupons() {
    const now = new Date();
    const all = await db.query.coupons.findMany({
      where: eq(coupons.isActive, true),
      orderBy: [desc(coupons.createdAt)],
    });

    return all.filter((coupon) => isCouponActive(coupon, now));
  },

  async getCoupons() {
    return db.query.coupons.findMany({
      orderBy: [desc(coupons.createdAt)],
    });
  },

  async getCouponById(id) {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.id, id),
    });

    if (!coupon) {
      throw ApiError.notFound("Coupon not found");
    }

    return coupon;
  },

  async createCoupon(data) {
    const [coupon] = await db
      .insert(coupons)
      .values({
        code: data.code,
        type: data.type,
        value: String(data.value),
        minPurchase:
          data.minPurchase != null ? String(data.minPurchase) : null,
        maxDiscount:
          data.maxDiscount != null ? String(data.maxDiscount) : null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive ?? true,
      })
      .returning();

    return coupon;
  },

  async updateCoupon(id, data) {
    await this.getCouponById(id);

    const updates = {};
    if (data.type != null) updates.type = data.type;
    if (data.value != null) updates.value = String(data.value);
    if (data.minPurchase != null) {
      updates.minPurchase = String(data.minPurchase);
    }
    if (data.maxDiscount != null) {
      updates.maxDiscount = String(data.maxDiscount);
    }
    if (data.startDate != null) updates.startDate = new Date(data.startDate);
    if (data.endDate != null) updates.endDate = new Date(data.endDate);
    if (data.isActive != null) updates.isActive = data.isActive;
    updates.updatedAt = new Date();

    const [coupon] = await db
      .update(coupons)
      .set(updates)
      .where(eq(coupons.id, id))
      .returning();

    return coupon;
  },

  async deleteCoupon(id) {
    const coupon = await this.getCouponById(id);
    await db.delete(coupons).where(eq(coupons.id, id));
    return coupon;
  },

  async activateCoupon(id) {
    const [coupon] = await db
      .update(coupons)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning();

    if (!coupon) {
      throw ApiError.notFound("Coupon not found");
    }

    return coupon;
  },

  async deactivateCoupon(id) {
    const [coupon] = await db
      .update(coupons)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning();

    if (!coupon) {
      throw ApiError.notFound("Coupon not found");
    }

    return coupon;
  },

  async getCouponStatistics({ startDate, endDate } = {}) {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(coupons.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(coupons.createdAt, new Date(endDate)));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [stats] = await db
      .select({
        totalCoupons: sql`count(*)::int`,
        activeCoupons: sql`count(*) filter (where ${coupons.isActive} = true)::int`,
      })
      .from(coupons)
      .where(whereClause);

    const couponList = await this.getCoupons();

    return {
      ...stats,
      coupons: couponList,
    };
  },

  async getCouponUsage(id, { page = 1, limit = 10 } = {}) {
    await this.getCouponById(id);
    const offset = (page - 1) * limit;

    const [usage, total] = await Promise.all([
      db
        .select({
          id: orderCoupons.id,
          orderId: orderCoupons.orderId,
          couponId: orderCoupons.couponId,
          discountAmount: orderCoupons.discountAmount,
          createdAt: orderCoupons.createdAt,
          userEmail: users.email,
        })
        .from(orderCoupons)
        .innerJoin(orders, eq(orderCoupons.orderId, orders.id))
        .innerJoin(users, eq(orders.userId, users.id))
        .where(eq(orderCoupons.couponId, id))
        .orderBy(desc(orderCoupons.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql`count(*)::int` })
        .from(orderCoupons)
        .where(eq(orderCoupons.couponId, id)),
    ]);

    return {
      items: usage,
      total: total[0]?.count ?? 0,
      page: parseInt(page, 10),
    };
  },
};
