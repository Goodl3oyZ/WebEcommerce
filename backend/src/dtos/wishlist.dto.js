import { z } from "zod";

// Wishlist DTOs
export const wishlistDto = {
  // Add to wishlist
  addToWishlist: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
  }),

  // Remove from wishlist
  removeFromWishlist: z.object({
    productId: z.string().uuid(),
  }),

  // Update wishlist item
  updateWishlistItem: z
    .object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Move to cart
  moveToCart: z.object({
    productId: z.string().uuid(),
    quantity: z.number().min(1),
  }),
};

// Response DTOs
export const wishlistResponseDto = {
  // Basic wishlist item info
  basic: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    productName: z.string(),
    productPrice: z.number(),
    productImage: z.string().url(),
    addedAt: z.string().datetime(),
  }),

  // Detailed wishlist item info
  detailed: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    productName: z.string(),
    productPrice: z.number(),
    productImage: z.string().url(),
    notes: z.string().optional(),
    priority: z.string().optional(),
    addedAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of wishlist
  admin: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    productId: z.string().uuid(),
    productName: z.string(),
    productPrice: z.number(),
    productImage: z.string().url(),
    notes: z.string().optional(),
    priority: z.string().optional(),
    addedAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    lastViewedAt: z.string().datetime().optional(),
    viewCount: z.number(),
  }),
};
