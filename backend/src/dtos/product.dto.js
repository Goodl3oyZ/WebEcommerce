import { z } from "zod";

const uuidOrNull = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().uuid().optional()
);

const baseProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0),
  categoryId: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().uuid()
  ),
  brandId: uuidOrNull,
  imageUrl: z.union([z.array(z.string()), z.string(), z.record(z.any())]).optional().nullable(),
  attributes: z.record(z.any()).optional().nullable(),
  variants: z.array(z.record(z.any())).optional(),
  hasVariants: z.boolean().optional(),
  stock: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
});
export const baseReviewSchema = z.object({
  rating: z.number().int().min(1).max(5), // ตรวจสอบตาม constraint check
  comment: z.string().optional(), // ไม่จำเป็นต้องใส่ comment
});

// เพิ่ม price เข้าไปใน schema
export const baseVariantSchema = z.object({
  color: z.string().min(1).max(50),
  size: z.string().min(1).max(10),
  sku: z.string().min(1).max(100),
  stock: z.coerce.number().int().nonnegative(),
  price: z.coerce.number().nonnegative(),
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
