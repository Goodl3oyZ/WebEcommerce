import { z } from "zod";

// Loyalty DTOs
export const loyaltyDto = {
  // Create loyalty program
  createProgram: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    pointsPerCurrency: z.number().min(0),
    minimumPoints: z.number().min(0),
    expiryDays: z.number().min(0).optional(),
    tiers: z
      .array(
        z.object({
          name: z.string().min(1),
          pointsRequired: z.number().min(0),
          benefits: z.array(z.string()),
          discount: z.number().min(0).max(100).optional(),
        })
      )
      .min(1),
    isActive: z.boolean().default(true),
  }),

  // Update loyalty program
  updateProgram: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      pointsPerCurrency: z.number().min(0).optional(),
      minimumPoints: z.number().min(0).optional(),
      expiryDays: z.number().min(0).optional(),
      tiers: z
        .array(
          z.object({
            name: z.string().min(1),
            pointsRequired: z.number().min(0),
            benefits: z.array(z.string()),
            discount: z.number().min(0).max(100).optional(),
          })
        )
        .optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Add points
  addPoints: z.object({
    userId: z.number(),
    points: z.number().min(0),
    reason: z.string().min(1),
    expiryDate: z.string().datetime().optional(),
  }),

  // Redeem points
  redeemPoints: z.object({
    points: z.number().min(0),
    reward: z.string().min(1),
  }),

  redeemReward: z.object({}).strict(),

  createReward: z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
      pointsCost: z.number().min(0),
      type: z.enum(["discount", "shipping", "gift"]).optional(),
      value: z.number().min(0).optional(),
      maxRedemptions: z.number().min(0).optional(),
      userLimit: z.number().min(0).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),

  updateReward: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      pointsCost: z.number().min(0).optional(),
      type: z.enum(["discount", "shipping", "gift"]).optional(),
      value: z.number().min(0).optional(),
      maxRedemptions: z.number().min(0).optional(),
      userLimit: z.number().min(0).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    })
    .strict(),
};

// Response DTOs
export const loyaltyResponseDto = {
  // Basic loyalty info
  basic: z.object({
    id: z.string().uuid(),
    name: z.string(),
    points: z.number(),
    tier: z.string(),
  }),

  // Detailed loyalty info
  detailed: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    points: z.number(),
    tier: z.string(),
    benefits: z.array(z.string()),
    discount: z.number().optional(),
    pointsHistory: z.array(
      z.object({
        points: z.number(),
        reason: z.string(),
        date: z.string().datetime(),
      })
    ),
    nextTier: z
      .object({
        name: z.string(),
        pointsRequired: z.number(),
        pointsNeeded: z.number(),
      })
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of loyalty
  admin: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    pointsPerCurrency: z.number(),
    minimumPoints: z.number(),
    expiryDays: z.number().optional(),
    tiers: z.array(
      z.object({
        name: z.string(),
        pointsRequired: z.number(),
        benefits: z.array(z.string()),
        discount: z.number().optional(),
        memberCount: z.number(),
      })
    ),
    totalMembers: z.number(),
    totalPointsIssued: z.number(),
    totalPointsRedeemed: z.number(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
