import { z } from "zod";

const baseProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  stock: z.number().min(0),
  categoryId: z.string().uuid(),
  brandId: z.string().uuid().optional(),
  imageUrl: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z
    .object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
});
export const baseReviewSchema = z.object({
  rating: z.number().int().min(1).max(5), // ตรวจสอบตาม constraint check
  comment: z.string().optional(), // ไม่จำเป็นต้องใส่ comment
});

export const baseVariantSchema = z.object({
  color: z.string().min(1).max(50),
  size: z.string().min(1).max(10),
  sku: z.string().min(1).max(100), // ไม่สามารถ enforce unique ได้ใน Zod, ทำใน DB แทน
  stock: z.number().int().nonnegative(), // stock ≥ 0
});

// Product DTOs
export const productDto = {
  // product / review / varaint
  // Create product
  createProduct: baseProductSchema,
  updateProduct: baseProductSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Add product review
  createReview: baseReviewSchema,
  updateReview: baseReviewSchema.partial().refine(
    (data) => {
      // At least one field must be provided for update
      return Object.keys(data).length > 0;
    },
    {
      message: "At least one field must be provided for update",
    }
  ),

  createVariant: baseVariantSchema,
  updateVariant: baseVariantSchema.partial().refine((data) => {
    // At least one field must be provided for update
    return Object.keys(data).length > 0;
  }),
};
