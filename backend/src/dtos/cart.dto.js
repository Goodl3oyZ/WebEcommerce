import { z } from "zod";

// Cart DTOs
export const cartDto = {
  // GET cart - no validation needed
  getCart: z.object({}),

  // Add item to cart
  addItem: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable(),
    quantity: z.number().min(1),
    options: z.record(z.any()).optional(),
  }),

  // Update cart item
  updateItem: z.object({
    quantity: z.number().min(1),
    options: z.record(z.any()).optional(),
  }),

  // Remove item from cart
  removeItem: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable(),
  }),

  // Clear cart
  clearCart: z.object({}),

  // Apply coupon
  applyCoupon: z.object({
    code: z.string(),
  }),

  // Remove coupon
  removeCoupon: z.object({}),

  checkout: z.object({
    shippingAddressId: z.string().uuid(),
    billingAddressId: z.string().uuid(),
    paymentMethodId: z.string().uuid(),
    couponCode: z.string().optional(),
    notes: z.string().max(500).optional(),
  }),

  mergeGuestCart: z.object({
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable(),
        quantity: z.number().min(1),
        price: z.number().min(0),
      })
    ),
  }),
};
