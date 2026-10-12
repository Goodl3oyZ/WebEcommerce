import { z } from "zod";

const quantity = () => z.number().int().min(1).max(99);

export const cartDto = {
  addItem: z.object({
    productId: z.string().uuid(),
    // Nullable so the API can explain that a size/colour must be chosen.
    variantId: z.string().uuid().nullable(),
    quantity: quantity(),
  }),

  updateItem: z.object({
    quantity: quantity(),
  }),

  // Checks out the current cart (same rules as POST /api/orders/checkout).
  checkout: z.object({
    shippingAddressId: z.string().uuid(),
    billingAddressId: z.string().uuid().optional(),
    shippingMethodId: z.string().uuid(),
    paymentMethodId: z.string().uuid(),
    couponCode: z.string().trim().min(1).max(50).optional(),
    notes: z.string().max(500).optional(),
    omiseToken: z.string().optional(),
  }),

  mergeGuestCart: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          variantId: z.string().uuid().nullable(),
          quantity: quantity(),
          price: z.number().min(0).optional().describe("Ignored: current prices are used"),
        })
      )
      .max(100),
  }),
};
