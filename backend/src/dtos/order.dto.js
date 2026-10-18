import { z } from "zod";
import { ORDER_STATUSES } from "../utils/orderStatus.js";

const id = () => z.string().uuid();

export const orderDto = {
  // Checkout. Money fields the client used to send (shippingCost,
  // paymentAmount, ...) are accepted for compatibility but ignored: the server
  // computes every amount.
  checkout: z.object({
    shippingAddressId: id().optional().describe("Required for delivery"),
    billingAddressId: id().optional().describe("Defaults to the shipping address"),
    shippingMethodId: id().optional().describe("Required for delivery"),
    pickupStoreId: id()
      .optional()
      .describe("Collect at this branch instead of delivery: no address, shipping method or fee; stock comes from the branch"),
    paymentMethodId: id(),
    items: z
      .array(
        z.object({
          productId: id(),
          variantId: id(),
          quantity: z.number().int().min(1).max(99),
        })
      )
      .min(1)
      .max(50),
    couponCode: z.string().trim().min(1).max(50).optional(),
    notes: z.string().max(500).optional(),
    omiseToken: z.string().optional().describe("Card token from Omise.js (credit card only)"),
    idempotencyKey: z
      .string()
      .trim()
      .min(8)
      .max(100)
      .optional()
      .describe("Same as the Idempotency-Key header: repeating a checkout with it returns the first order"),
    shippingCost: z.number().optional().describe("Ignored: computed by the server"),
    paymentAmount: z.number().optional().describe("Ignored: computed by the server"),
  }).refine((data) => data.pickupStoreId || (data.shippingAddressId && data.shippingMethodId), {
    message: "Choose a pickup branch, or a shipping address and shipping method",
    path: ["shippingAddressId"],
  }),

  listQuery: z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),

  adminListQuery: z.object({
    status: z
      .enum([...ORDER_STATUSES, "to_ship"])
      .optional()
      .describe('"to_ship" = paid, confirmed or processing (waiting to be shipped)'),
    search: z.string().optional().describe("Order number or id"),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),

  statsQuery: z.object({
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
  }),

  // Admin status change ("paid" is set by the payment flow, not by hand).
  updateOrderStatus: z
    .object({
      status: z.enum(ORDER_STATUSES.filter((s) => s !== "paid" && s !== "pending")),
      trackingNumber: z.string().optional(),
      notes: z.string().max(1000).optional(),
    })
    .strict(),

  // Customer: the only status change a customer can make is confirming delivery.
  confirmDelivery: z.object({ status: z.literal("delivered") }).strict(),

  cancelOrder: z.object({
    reason: z.string().trim().min(1).max(500),
  }),

  updateShippingInfo: z.object({
    trackingNumber: z.string().trim().min(1).max(100),
    carrier: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["pending", "processing", "shipped", "delivered"]).optional(),
    estimatedDelivery: z.string().datetime({ offset: true }).optional(),
  }),

  updatePickup: z.object({
    status: z.enum(["ready", "collected"]).describe("ready = waiting at the branch (customer notified); collected = handed over"),
  }),

  refundOrder: z
    .object({
      amount: z.number().positive().optional().describe("Defaults to the order total"),
      reason: z.string().trim().min(1).max(1000),
      notes: z.string().max(1000).optional(),
    })
    .strict(),
};
