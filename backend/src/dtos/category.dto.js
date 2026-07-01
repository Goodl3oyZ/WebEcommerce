import { z } from "zod";

// Category DTOs
export const categoryDto = {
  // Create category
  createCategory: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    parentId: z.string().uuid().optional(),
    image: z.string().url().optional(),
    isActive: z.boolean().default(true),
    attributes: z
      .array(
        z.object({
          name: z.string(),
          type: z.enum(["text", "number", "boolean", "select"]),
          required: z.boolean().default(false),
          options: z.array(z.string()).optional(),
        })
      )
      .optional(),
  }),

  // Update category
  updateCategory: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      parentId: z.string().uuid().optional(),
      image: z.string().url().optional(),
      isActive: z.boolean().optional(),
      attributes: z
        .array(
          z.object({
            name: z.string(),
            type: z.enum(["text", "number", "boolean", "select"]),
            required: z.boolean().default(false),
            options: z.array(z.string()).optional(),
          })
        )
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Add category attribute
  addAttribute: z.object({
    name: z.string(),
    type: z.enum(["text", "number", "boolean", "select"]),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  }),

  // Update category attribute
  updateAttribute: z
    .object({
      name: z.string().optional(),
      type: z.enum(["text", "number", "boolean", "select"]).optional(),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};

// Response DTOs
export const categoryResponseDto = {
  // Basic category info
  basic: z.object({
    id: z.string().uuid(),
    name: z.string(),
    image: z.string().url().optional(),
    isActive: z.boolean(),
  }),

  // Detailed category info
  detailed: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    parentId: z.string().uuid().optional(),
    image: z.string().url().optional(),
    isActive: z.boolean(),
    attributes: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean(),
          options: z.array(z.string()).optional(),
        })
      )
      .optional(),
    productCount: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of category
  admin: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    parentId: z.string().uuid().optional(),
    image: z.string().url().optional(),
    isActive: z.boolean(),
    attributes: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          required: z.boolean(),
          options: z.array(z.string()).optional(),
        })
      )
      .optional(),
    productCount: z.number(),
    viewCount: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
