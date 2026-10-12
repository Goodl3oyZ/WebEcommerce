import { z } from "zod";

// Payment DTOs
export const paymentDto = {
  // Create payment
  createPayment: z
    .object({
      orderId: z.string().uuid(),
      method: z.enum(["credit_card", "promptpay", "cash_on_delivery"]),
      // Accepted for backward compatibility but ignored: the server charges order.total.
      amount: z.number().min(0).optional(),
      currency: z.enum(["THB", "USD", "EUR"]).optional(),
      paymentDetails: z.record(z.any()).optional(),
    })
    .refine(
      (data) => {
        if (data.method === "credit_card") {
          return (
            data.paymentDetails &&
            typeof data.paymentDetails.token === "string" &&
            data.paymentDetails.token.length > 0
          );
        }
        return true;
      },
      {
        message: "Missing card token in paymentDetails for credit_card payment",
        path: ["paymentDetails", "token"],
      }
    ),

  // Update payment status
  updatePaymentStatus: z.object({
    status: z.enum([
      "pending",
      "processing",
      "completed",
      "failed",
      "refunded",
      "cancelled",
    ]),
    transactionId: z.string().optional(),
    notes: z.string().optional(),
  }),

  // Process refund
  processRefund: z.object({
    amount: z.coerce.number().min(0),
    reason: z.string().min(1),
    refundDetails: z.record(z.any()).optional(),
  }),

  // Add payment method
  addPaymentMethod: z.object({
    type: z.enum(["credit_card", "bank_account"]),
    details: z.record(z.any()),
    isDefault: z.boolean().default(false),
  }),

  // Update payment method
  updatePaymentMethod: z
    .object({
      isDefault: z.boolean().optional(),
      details: z.record(z.any()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Remove payment method
  removePaymentMethod: z.object({
    paymentMethodId: z.string().uuid(),
  }),

  createToken: z
    .object({
      card: z.object({
        name: z.string().min(1),
        number: z.string().min(13),
        expiration_month: z.number().int().min(1).max(12),
        expiration_year: z.number().int().min(new Date().getFullYear()),
        security_code: z.string().min(3),
      }),
    })
    .strict(),

  verifyPayment: z
    .object({
      verificationCode: z.string().min(1),
    })
    .strict(),
};

// Response DTOs
export const paymentResponseDto = {
  // Basic payment info
  basic: z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid(),
    amount: z.number(),
    status: z.string(),
    createdAt: z.string().datetime(),
  }),

  // Detailed payment info
  detailed: z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid(),
    method: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    transactionId: z.string().optional(),
    paymentDetails: z.record(z.any()).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of payment
  admin: z.object({
    id: z.string().uuid(),
    orderId: z.string().uuid(),
    userId: z.string().uuid(),
    method: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    transactionId: z.string().optional(),
    paymentDetails: z.record(z.any()).optional(),
    refundHistory: z
      .array(
        z.object({
          amount: z.number(),
          reason: z.string(),
          status: z.string(),
          createdAt: z.string().datetime(),
        })
      )
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
