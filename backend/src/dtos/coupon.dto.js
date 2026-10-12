import { z } from "zod";

const COUPON_TYPES = ["percentage", "fixed", "fixed_amount"];
const date = (label) =>
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), `${label} must be a valid date`);
const limit = () => z.number().int().min(1).nullable().optional();
const money = () => z.coerce.number().min(0);

const couponFields = {
  code: z.string().trim().min(1).max(50),
  type: z.enum(COUPON_TYPES),
  value: money(),
  minPurchase: money().nullable().optional(),
  maxDiscount: money().nullable().optional(),
  startDate: date("startDate"),
  endDate: date("endDate"),
  usageLimit: limit().describe("Total uses across all customers (null = unlimited)"),
  perUserLimit: limit().describe("Uses per customer (null = unlimited)"),
  isActive: z.boolean(),
};

const percentageAtMost100 = (data) =>
  data.type !== "percentage" || data.value == null || data.value <= 100;
const endAfterStart = (data) =>
  !data.startDate || !data.endDate || new Date(data.endDate) > new Date(data.startDate);

export const couponDto = {
  createCoupon: z
    .object({ ...couponFields, isActive: couponFields.isActive.default(true) })
    .strict()
    .refine(percentageAtMost100, { message: "A percentage discount cannot exceed 100", path: ["value"] })
    .refine(endAfterStart, { message: "endDate must be after startDate", path: ["endDate"] }),

  // Cross-field rules against stored values are re-checked in the service.
  updateCoupon: z
    .object(Object.fromEntries(Object.entries(couponFields).map(([k, v]) => [k, v.optional()])))
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    })
    .refine(percentageAtMost100, { message: "A percentage discount cannot exceed 100", path: ["value"] })
    .refine(endAfterStart, { message: "endDate must be after startDate", path: ["endDate"] }),

  validateQuery: z.object({
    code: z.string().min(1).describe("Coupon code (case-insensitive)"),
    amount: z.coerce.number().min(0).describe("Cart subtotal in THB"),
  }),
};
