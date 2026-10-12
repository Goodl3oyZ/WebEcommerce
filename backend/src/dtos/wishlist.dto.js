import { z } from "zod";

export const wishlistDto = {
  addToWishlist: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable().optional(),
  }),

  // Change or clear (null) the chosen variant.
  updateWishlistItem: z.object({ variantId: z.string().uuid().nullable() }),

  moveToCart: z.object({
    quantity: z.number().int().min(1).max(99).default(1),
  }),

  adminListQuery: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),
};
