import { z } from "zod";

// Review DTOs
export const reviewDto = {
  // Create review
  createReview: z.object({
    productId: z.number(),
    orderId: z.number(),
    rating: z.number().min(1).max(5),
    comment: z.string().min(1),
    images: z.array(z.string().url()).optional(),
    attributes: z.record(z.number().min(1).max(5)).optional(),
  }),

  // Update review
  updateReview: z
    .object({
      rating: z.number().min(1).max(5).optional(),
      comment: z.string().min(1).optional(),
      images: z.array(z.string().url()).optional(),
      attributes: z.record(z.number().min(1).max(5)).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Delete review
  deleteReview: z.object({
    reviewId: z.number(),
  }),

  // Report review
  reportReview: z.object({
    reason: z.enum([
      "inappropriate_content",
      "fake_review",
      "offensive_language",
      "spam",
      "other",
    ]),
    details: z.string().min(1).optional(),
  }),
};

// Response DTOs
export const reviewResponseDto = {
  // Basic review info
  basic: z.object({
    id: z.string().uuid(),
    rating: z.number(),
    comment: z.string(),
    createdAt: z.string().datetime(),
  }),

  // Detailed review info
  detailed: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    userId: z.string().uuid(),
    userName: z.string(),
    userAvatar: z.string().url().optional(),
    orderId: z.string().uuid(),
    rating: z.number(),
    comment: z.string(),
    images: z.array(z.string().url()).optional(),
    attributes: z.record(z.number()).optional(),
    helpfulCount: z.number(),
    isVerified: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of review
  admin: z.object({
    id: z.number(),
    productId: z.number(),
    userId: z.number(),
    userName: z.string(),
    userAvatar: z.string().url().optional(),
    orderId: z.number(),
    rating: z.number(),
    comment: z.string(),
    images: z.array(z.string().url()).optional(),
    attributes: z.record(z.number()).optional(),
    helpfulCount: z.number(),
    reportCount: z.number(),
    isVerified: z.boolean(),
    isHidden: z.boolean(),
    reports: z
      .array(
        z.object({
          reason: z.string(),
          details: z.string().optional(),
          reportedAt: z.string().datetime(),
        })
      )
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
