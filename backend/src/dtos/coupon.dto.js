import { z } from "zod";

// Coupon DTOs
export const couponDto = {
  // Create coupon
  createCoupon: z.object({
    code: z.string().min(1),
    type: z.enum(["percentage", "fixed"]),
    value: z.number().min(0),
    minPurchase: z.number().min(0).optional(),
    maxDiscount: z.number().min(0).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    usageLimit: z.number().min(0).optional(),
    perUserLimit: z.number().min(0).optional(),
    isActive: z.boolean().default(true),
    conditions: z
      .object({
        categories: z.array(z.number()).optional(),
        products: z.array(z.number()).optional(),
        users: z.array(z.number()).optional(),
        userGroups: z.array(z.string()).optional(),
      })
      .optional(),
  }),

  // Update coupon
  updateCoupon: z
    .object({
      code: z.string().min(1).optional(),
      type: z.enum(["percentage", "fixed"]).optional(),
      value: z.number().min(0).optional(),
      minPurchase: z.number().min(0).optional(),
      maxDiscount: z.number().min(0).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      usageLimit: z.number().min(0).optional(),
      perUserLimit: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
      conditions: z
        .object({
          categories: z.array(z.number()).optional(),
          products: z.array(z.number()).optional(),
          users: z.array(z.number()).optional(),
          userGroups: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Apply coupon
  applyCoupon: z.object({
    code: z.string().min(1),
    orderAmount: z.number().min(0),
  }),
};
