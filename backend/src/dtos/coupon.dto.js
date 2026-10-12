import { z } from "zod";

// Coupon DTOs
export const couponDto = {
  // Create coupon
  createCoupon: z
    .object({
      code: z.string().min(1),
      type: z.enum(["percentage", "fixed", "fixed_amount"]),
      value: z.coerce.number().min(0),
      minPurchase: z.number().min(0).optional(),
      maxDiscount: z.number().min(0).optional(),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      usageLimit: z.number().min(0).optional(),
      perUserLimit: z.number().min(0).optional(),
      isActive: z.boolean().default(true),
      conditions: z
        .object({
          categories: z.array(z.string().uuid()).optional(),
          products: z.array(z.string().uuid()).optional(),
          users: z.array(z.string().uuid()).optional(),
          userGroups: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .strict(),

  // Update coupon
  updateCoupon: z
    .object({
      code: z.string().min(1).optional(),
      type: z.enum(["percentage", "fixed", "fixed_amount"]).optional(),
      value: z.coerce.number().min(0).optional(),
      minPurchase: z.number().min(0).optional(),
      maxDiscount: z.number().min(0).optional(),
      startDate: z.string().min(1).optional(),
      endDate: z.string().min(1).optional(),
      usageLimit: z.number().min(0).optional(),
      perUserLimit: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
      conditions: z
        .object({
          categories: z.array(z.string().uuid()).optional(),
          products: z.array(z.string().uuid()).optional(),
          users: z.array(z.string().uuid()).optional(),
          userGroups: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Apply coupon
  applyCoupon: z.object({
    code: z.string().min(1),
    orderAmount: z.number().min(0),
  }),
};
