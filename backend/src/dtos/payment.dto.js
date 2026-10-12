import { z } from "zod";

const dateTime = () => z.string().datetime({ offset: true });

export const paymentDto = {
  // Pay (or retry paying) an order. The amount is always the order total; the
  // amount/currency fields are accepted for compatibility but ignored.
  createPayment: z
    .object({
      orderId: z.string().uuid(),
      method: z.enum(["credit_card", "promptpay"]),
      cardToken: z.string().optional().describe("Omise.js card token (credit_card)"),
      paymentDetails: z
        .object({ token: z.string().optional(), cardToken: z.string().optional() })
        .passthrough()
        .optional(),
      amount: z.number().min(0).optional().describe("Ignored: the order total is charged"),
      currency: z.enum(["THB", "USD", "EUR"]).optional().describe("Ignored: always THB"),
    })
    .refine(
      (data) =>
        data.method !== "credit_card" ||
        Boolean(data.cardToken || data.paymentDetails?.token || data.paymentDetails?.cardToken),
      { message: "A card token is required for credit_card payments", path: ["cardToken"] }
    ),

  // Admin override (refunds go through the refund endpoint).
  updatePaymentStatus: z
    .object({
      status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]),
      transactionId: z.string().optional(),
      notes: z.string().optional(),
    })
    .strict(),

  processRefund: z
    .object({
      amount: z.coerce.number().positive().optional().describe("Defaults to the remaining paid amount"),
      reason: z.string().trim().min(1).max(1000),
    })
    .strict(),

  // Re-check a payment with Omise. `verificationCode` is accepted for older clients.
  verifyPayment: z.object({ verificationCode: z.string().optional() }).strict(),

  historyQuery: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),

  adminListQuery: z.object({
    status: z.string().optional(),
    startDate: dateTime().optional(),
    endDate: dateTime().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),

  statsQuery: z.object({
    storeId: z.string().uuid().optional(),
    startDate: dateTime().optional(),
    endDate: dateTime().optional(),
  }),

  storeQuery: z.object({
    status: z.string().optional(),
    startDate: dateTime().optional(),
    endDate: dateTime().optional(),
  }),
};
