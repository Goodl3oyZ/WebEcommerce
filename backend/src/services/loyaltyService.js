import { db } from "../config/db.js";
import {
  loyaltyPrograms,
  pointsHistory,
  users,
} from "../models/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";

const TIERS = [
  { name: "bronze", minPoints: 0, multiplier: 1 },
  { name: "silver", minPoints: 500, multiplier: 1.25 },
  { name: "gold", minPoints: 2000, multiplier: 1.5 },
];

const REWARDS = [
  {
    id: "discount-10",
    name: "10% Off Coupon",
    pointsCost: 100,
    type: "discount",
    value: 10,
  },
  {
    id: "free-shipping",
    name: "Free Shipping",
    pointsCost: 50,
    type: "shipping",
    value: 0,
  },
  {
    id: "discount-20",
    name: "20% Off Coupon",
    pointsCost: 250,
    type: "discount",
    value: 20,
  },
];

function resolveTier(points) {
  return [...TIERS]
    .reverse()
    .find((tier) => points >= tier.minPoints) ?? TIERS[0];
}

async function getOrCreateProgram(userId) {
  let program = await db.query.loyaltyPrograms.findFirst({
    where: eq(loyaltyPrograms.userId, userId),
  });

  if (program) {
    return program;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { points: true },
  });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const points = user.points ?? 0;
  const tier = resolveTier(points).name;

  [program] = await db
    .insert(loyaltyPrograms)
    .values({ userId, points, tier })
    .returning();

  return program;
}

export const loyaltyService = {
  async getLoyaltyPoints(userId) {
    const program = await getOrCreateProgram(userId);
    const tier = resolveTier(program.points ?? 0);

    return {
      points: program.points ?? 0,
      tier: program.tier ?? tier.name,
      tierName: tier.name,
      multiplier: tier.multiplier,
    };
  },

  async getPointsHistory(userId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    const [history, total] = await Promise.all([
      db.query.pointsHistory.findMany({
        where: eq(pointsHistory.userId, userId),
        orderBy: [desc(pointsHistory.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)::int` })
        .from(pointsHistory)
        .where(eq(pointsHistory.userId, userId)),
    ]);

    return {
      items: history,
      total: total[0]?.count ?? 0,
      page: parseInt(page, 10),
    };
  },

  getAvailableRewards() {
    return REWARDS;
  },

  async redeemReward(userId, rewardId) {
    const reward = REWARDS.find((r) => r.id === rewardId);
    if (!reward) {
      throw ApiError.notFound("Reward not found or inactive");
    }

    return db.transaction(async (tx) => {
      const program = await tx.query.loyaltyPrograms.findFirst({
        where: eq(loyaltyPrograms.userId, userId),
      });

      const currentPoints = program?.points ?? 0;
      if (currentPoints < reward.pointsCost) {
        throw ApiError.badRequest("Insufficient points");
      }

      const remainingPoints = currentPoints - reward.pointsCost;
      const tier = resolveTier(remainingPoints).name;

      if (program) {
        await tx
          .update(loyaltyPrograms)
          .set({ points: remainingPoints, tier, updatedAt: new Date() })
          .where(eq(loyaltyPrograms.id, program.id));
      } else {
        await tx.insert(loyaltyPrograms).values({
          userId,
          points: remainingPoints,
          tier,
        });
      }

      await tx
        .update(users)
        .set({ points: remainingPoints, updatedAt: new Date() })
        .where(eq(users.id, userId));

      const [historyEntry] = await tx
        .insert(pointsHistory)
        .values({
          userId,
          loyaltyProgramId: program?.id ?? null,
          points: -reward.pointsCost,
          type: "debit",
          description: `Redeemed reward: ${reward.name}`,
        })
        .returning();

      return {
        redemptionId: historyEntry.id,
        pointsDeducted: reward.pointsCost,
        remainingPoints,
        reward,
      };
    });
  },

  getLoyaltyTiers() {
    return TIERS;
  },

  createReward() {
    throw new ApiError(
      501,
      "Reward catalog is not persisted; use predefined rewards via GET /rewards"
    );
  },

  updateReward() {
    throw new ApiError(
      501,
      "Reward catalog is not persisted; use predefined rewards via GET /rewards"
    );
  },

  deleteReward() {
    throw new ApiError(
      501,
      "Reward catalog is not persisted; use predefined rewards via GET /rewards"
    );
  },

  createLoyaltyTier() {
    throw new ApiError(
      501,
      "Tier configuration is static; loyalty tiers are derived from points thresholds"
    );
  },

  updateLoyaltyTier() {
    throw new ApiError(
      501,
      "Tier configuration is static; loyalty tiers are derived from points thresholds"
    );
  },

  async getLoyaltyStatistics({ startDate, endDate } = {}) {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(pointsHistory.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(pointsHistory.createdAt, new Date(endDate)));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [stats] = await db
      .select({
        totalPoints: sql`coalesce(sum(${pointsHistory.points}), 0)`,
        activeUsers: sql`count(distinct ${pointsHistory.userId})::int`,
        totalEarnings: sql`count(*) filter (where ${pointsHistory.type} = 'credit')::int`,
        totalRedemptions: sql`count(*) filter (where ${pointsHistory.type} = 'debit')::int`,
      })
      .from(pointsHistory)
      .where(whereClause);

    const programs = await db.query.loyaltyPrograms.findMany({
      columns: { tier: true, points: true },
    });

    const tierDistribution = programs.reduce((acc, program) => {
      const tier = program.tier ?? resolveTier(program.points ?? 0).name;
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    }, {});

    return {
      ...stats,
      tierDistribution,
    };
  },
};
