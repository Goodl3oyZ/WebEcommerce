/**
 * Loyalty points.
 * - The balance lives in users.points (one source of truth); loyalty_programs
 *   keeps the customer's tier.
 * - Earning: 1 point per ฿10 of a paid order, times the tier multiplier,
 *   credited once per order and reversed if the order is fully refunded.
 * - Redeeming deducts points atomically and issues a single-use coupon.
 * Tiers and rewards are fixed in code (admin create/edit answers 501).
 */
import { randomBytes } from "node:crypto";
import { db } from "../config/db.js";
import { loyaltyPrograms, pointsHistory, users, coupons } from "../models/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { toSatang } from "../utils/money.js";
import { paginationMeta } from "../utils/pagination.js";

export const TIERS = [
  { name: "bronze", minPoints: 0, multiplier: 1 },
  { name: "silver", minPoints: 500, multiplier: 1.25 },
  { name: "gold", minPoints: 2000, multiplier: 1.5 },
];

const SATANG_PER_POINT = 1000; // ฿10
const COUPON_VALID_DAYS = 30;

export const REWARDS = [
  { id: "discount-10", name: "10% Off Coupon", pointsCost: 100, coupon: { type: "percentage", value: 10, maxDiscount: 500 } },
  { id: "free-shipping", name: "Shipping credit ฿50", pointsCost: 50, coupon: { type: "fixed_amount", value: 50 } },
  { id: "discount-20", name: "20% Off Coupon", pointsCost: 250, coupon: { type: "percentage", value: 20, maxDiscount: 1000 } },
];

const NOT_SUPPORTED = (what) =>
  new ApiError(501, `${what} are fixed in code and cannot be changed through the API`, null, "NOT_SUPPORTED");

export const resolveTier = (points) => [...TIERS].reverse().find((t) => points >= t.minPoints) ?? TIERS[0];

/** Keep the tier record in step with the balance. */
async function syncTier(tx, userId, points) {
  const tier = resolveTier(points).name;
  const program = await tx.query.loyaltyPrograms.findFirst({ where: eq(loyaltyPrograms.userId, userId) });
  if (program) {
    await tx.update(loyaltyPrograms).set({ points, tier, updatedAt: new Date() }).where(eq(loyaltyPrograms.id, program.id));
    return program.id;
  }
  const [created] = await tx.insert(loyaltyPrograms).values({ userId, points, tier }).returning();
  return created.id;
}

async function adjustBalance(tx, userId, delta) {
  const [user] = await tx
    .update(users)
    .set({ points: sql`greatest(coalesce(${users.points}, 0) + ${delta}, 0)`, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ points: users.points });
  return user.points;
}

export const loyaltyService = {
  async getLoyaltyPoints(userId) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { points: true } });
    if (!user) throw ApiError.notFound("User not found");
    const points = user.points ?? 0;
    const tier = resolveTier(points);
    const next = TIERS.find((t) => t.minPoints > points);
    return {
      points,
      tier: tier.name,
      multiplier: tier.multiplier,
      nextTier: next ? { name: next.name, pointsNeeded: next.minPoints - points } : null,
    };
  },

  async getPointsHistory(userId, pagination) {
    const where = eq(pointsHistory.userId, userId);
    const [items, total] = await Promise.all([
      db.query.pointsHistory.findMany({
        where,
        orderBy: [desc(pointsHistory.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(pointsHistory).where(where),
    ]);
    return { items, total: total[0].count, ...paginationMeta(total[0].count, pagination) };
  },

  getAvailableRewards() {
    return REWARDS.map(({ coupon, ...reward }) => ({ ...reward, type: coupon.type, value: coupon.value }));
  },

  getLoyaltyTiers() {
    return TIERS;
  },

  /** Credit points for a paid order (idempotent). Runs inside the payment transaction. */
  async creditForOrder(tx, order) {
    if (!order.userId) return 0;
    const already = await tx.query.pointsHistory.findFirst({
      where: and(eq(pointsHistory.orderId, order.id), eq(pointsHistory.type, "credit")),
    });
    if (already) return 0;
    const user = await tx.query.users.findFirst({ where: eq(users.id, order.userId), columns: { points: true } });
    const multiplier = resolveTier(user?.points ?? 0).multiplier;
    const earned = Math.floor((toSatang(order.total) / SATANG_PER_POINT) * multiplier);
    if (earned <= 0) return 0;

    const balance = await adjustBalance(tx, order.userId, earned);
    const programId = await syncTier(tx, order.userId, balance);
    await tx.insert(pointsHistory).values({
      userId: order.userId,
      loyaltyProgramId: programId,
      orderId: order.id,
      points: earned,
      type: "credit",
      description: `Earned from order ${order.orderNumber}`,
    });
    return earned;
  },

  /** Take back the points an order earned when it is fully refunded (idempotent). */
  async reverseForOrder(tx, order) {
    const credit = await tx.query.pointsHistory.findFirst({
      where: and(eq(pointsHistory.orderId, order.id), eq(pointsHistory.type, "credit")),
    });
    const reversed = await tx.query.pointsHistory.findFirst({
      where: and(eq(pointsHistory.orderId, order.id), eq(pointsHistory.type, "reversal")),
    });
    if (!credit || reversed) return 0;

    const balance = await adjustBalance(tx, order.userId, -credit.points);
    const programId = await syncTier(tx, order.userId, balance);
    await tx.insert(pointsHistory).values({
      userId: order.userId,
      loyaltyProgramId: programId,
      orderId: order.id,
      points: -credit.points,
      type: "reversal",
      description: `Reversed: order ${order.orderNumber} refunded`,
    });
    return credit.points;
  },

  /** Deduct points atomically and issue a single-use coupon for the reward. */
  async redeemReward(userId, rewardId) {
    const reward = REWARDS.find((r) => r.id === rewardId);
    if (!reward) throw ApiError.notFound("Reward not found");

    return db.transaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({ points: sql`${users.points} - ${reward.pointsCost}`, updatedAt: new Date() })
        .where(and(eq(users.id, userId), gte(users.points, reward.pointsCost)))
        .returning({ points: users.points });
      if (!user) throw ApiError.badRequest("Insufficient points");

      const programId = await syncTier(tx, userId, user.points);
      const now = new Date();
      const [coupon] = await tx
        .insert(coupons)
        .values({
          code: `LOYAL-${randomBytes(4).toString("hex").toUpperCase()}`,
          userId,
          type: reward.coupon.type,
          value: String(reward.coupon.value),
          maxDiscount: reward.coupon.maxDiscount != null ? String(reward.coupon.maxDiscount) : null,
          usageLimit: 1,
          perUserLimit: 1,
          startDate: now,
          endDate: new Date(now.getTime() + COUPON_VALID_DAYS * 24 * 60 * 60 * 1000),
          isActive: true,
        })
        .returning();
      const [entry] = await tx
        .insert(pointsHistory)
        .values({
          userId,
          loyaltyProgramId: programId,
          points: -reward.pointsCost,
          type: "debit",
          description: `Redeemed ${reward.name} (coupon ${coupon.code})`,
        })
        .returning();

      return {
        redemptionId: entry.id,
        pointsDeducted: reward.pointsCost,
        remainingPoints: user.points,
        reward: { id: reward.id, name: reward.name },
        coupon: { code: coupon.code, type: coupon.type, value: Number(coupon.value), expiresAt: coupon.endDate },
      };
    });
  },

  createReward() {
    throw NOT_SUPPORTED("Rewards");
  },
  updateReward() {
    throw NOT_SUPPORTED("Rewards");
  },
  deleteReward() {
    throw NOT_SUPPORTED("Rewards");
  },
  createLoyaltyTier() {
    throw NOT_SUPPORTED("Tiers");
  },
  updateLoyaltyTier() {
    throw NOT_SUPPORTED("Tiers");
  },

  async getLoyaltyStatistics({ startDate, endDate } = {}) {
    const conditions = [];
    if (startDate) conditions.push(gte(pointsHistory.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(pointsHistory.createdAt, new Date(endDate)));
    const where = conditions.length ? and(...conditions) : undefined;

    const [stats] = await db
      .select({
        pointsEarned: sql`coalesce(sum(${pointsHistory.points}) filter (where ${pointsHistory.type} = 'credit'), 0)::int`,
        pointsRedeemed: sql`coalesce(-sum(${pointsHistory.points}) filter (where ${pointsHistory.type} = 'debit'), 0)::int`,
        redemptions: sql`(count(*) filter (where ${pointsHistory.type} = 'debit'))::int`,
        activeUsers: sql`count(distinct ${pointsHistory.userId})::int`,
      })
      .from(pointsHistory)
      .where(where);
    const [balance] = await db.select({ outstanding: sql`coalesce(sum(${users.points}), 0)::int` }).from(users);
    const tiers = await db
      .select({ tier: loyaltyPrograms.tier, count: sql`count(*)::int` })
      .from(loyaltyPrograms)
      .groupBy(loyaltyPrograms.tier);

    return {
      ...stats,
      outstandingPoints: balance.outstanding,
      tierDistribution: Object.fromEntries(tiers.map((t) => [t.tier, t.count])),
    };
  },
};
