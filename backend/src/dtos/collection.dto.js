import { z } from "zod";

// Collection DTOs
export const collectionDto = {
  // Create collection
  createCollection: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    image: z.string().url().optional(),
    isActive: z.boolean().default(true),
    products: z.array(z.string().uuid()).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    discount: z
      .object({
        type: z.enum(["percentage", "fixed"]),
        value: z.number().min(0),
      })
      .optional(),
  }),

  // Update collection
  updateCollection: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      image: z.string().url().optional(),
      isActive: z.boolean().optional(),
      products: z.array(z.string().uuid()).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      discount: z
        .object({
          type: z.enum(["percentage", "fixed"]),
          value: z.number().min(0),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Add products to collection
  addProducts: z.object({
    productIds: z.array(z.string().uuid()).min(1),
  }),

  // Remove products from collection
  removeProducts: z.object({
    productIds: z.array(z.string().uuid()).min(1),
  }),
};

// Response DTOs
export const collectionResponseDto = {
  // Basic collection info
  basic: z.object({
    id: z.string().uuid(),
    name: z.string(),
    image: z.string().url().optional(),
    isActive: z.boolean(),
  }),

  // Detailed collection info
  detailed: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    image: z.string().url().optional(),
    isActive: z.boolean(),
    productCount: z.number(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    discount: z
      .object({
        type: z.string(),
        value: z.number(),
      })
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of collection
  admin: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    image: z.string().url().optional(),
    isActive: z.boolean(),
    products: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        price: z.number(),
        stock: z.number(),
      })
    ),
    productCount: z.number(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    discount: z
      .object({
        type: z.string(),
        value: z.number(),
      })
      .optional(),
    viewCount: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
