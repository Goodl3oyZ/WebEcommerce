import { z } from "zod";

// Order DTOs
export const orderDto = {
  // Create order (checkout)
  checkout: z.object({
    shippingAddressId: z.string().uuid(),
    billingAddressId: z.string().uuid(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().min(1),
      })
    ),
    shippingMethodId: z.string().uuid(),
    shippingCost: z.number().min(0),
    shippingNotes: z.string().optional(),
    deliveryInstructions: z.string().optional(),
    paymentMethodId: z.string().uuid(),
    paymentDetails: z.record(z.any()).optional(),
    paymentAmount: z.number().min(0),
    couponCode: z.string().optional(),
    notes: z.string().optional(),
    gift: z.boolean().optional(),
    giftMessage: z.string().optional(),
  }),

  // Update order status (admin only)
  updateOrderStatus: z.object({
    status: z.enum([
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ]),
    trackingNumber: z.string().optional(),
    notes: z.string().optional(),
  }),

  // Cancel order
  cancelOrder: z.object({
    reason: z.string().min(1),
  }),

  // Update shipping info
  updateShippingInfo: z.object({
    trackingNumber: z.string().min(1),
    carrier: z.string().min(1),
    status: z.enum(["pending", "processing", "shipped", "delivered"]),
    estimatedDelivery: z.string().datetime().optional(),
  }),

  // Add order review
  addReview: z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().min(1),
    images: z.array(z.string().url()).optional(),
  }),
};

// Response DTOs
export const orderResponseDto = {
  // Basic order info
  basic: z.object({
    id: z.string().uuid(),
    orderNumber: z.string(),
    status: z.string(),
    totalAmount: z.number(),
    createdAt: z.string().datetime(),
  }),

  // Detailed order info
  detailed: z.object({
    id: z.string().uuid(),
    orderNumber: z.string(),
    status: z.string(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
        options: z.record(z.any()).optional(),
      })
    ),
    shippingAddress: z.object({
      address: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      postalCode: z.string(),
    }),
    paymentMethod: z.string(),
    subtotal: z.number(),
    shippingCost: z.number(),
    tax: z.number(),
    totalAmount: z.number(),
    notes: z.string().optional(),
    trackingNumber: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of order
  admin: z.object({
    id: z.string().uuid(),
    orderNumber: z.string(),
    userId: z.string().uuid(),
    status: z.string(),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
        options: z.record(z.any()).optional(),
      })
    ),
    shippingAddress: z.object({
      address: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      postalCode: z.string(),
    }),
    paymentMethod: z.string(),
    paymentStatus: z.string(),
    subtotal: z.number(),
    shippingCost: z.number(),
    tax: z.number(),
    totalAmount: z.number(),
    notes: z.string().optional(),
    trackingNumber: z.string().optional(),
    statusHistory: z.array(
      z.object({
        status: z.string(),
        timestamp: z.string().datetime(),
        notes: z.string().optional(),
      })
    ),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
