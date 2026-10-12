import { z } from "zod";

const emptyToUndefined = (val) => (val === "" || val === null ? undefined : val);
const boolString = () => z.enum(["true", "false"]).optional();
const imageList = z
  .union([z.array(z.string().min(1)), z.string().min(1), z.record(z.any())])
  .nullable()
  .optional()
  .describe("Storage keys or public URLs returned by /api/uploads/product");

const productFields = {
  name: z.string().trim().min(1).max(255),
  description: z.string().max(20000).optional().nullable(),
  price: z.coerce.number().min(0).describe("Base/display price; each variant has its own price"),
  categoryId: z.string().uuid(),
  brandId: z.preprocess(emptyToUndefined, z.string().uuid().nullable().optional()),
  imageUrl: imageList,
  attributes: z
    .record(z.union([z.string(), z.number(), z.boolean()]).nullable())
    .optional()
    .describe("Name/value pairs, e.g. { material: 'Cotton' }; replaces all attributes"),
  isActive: z.boolean(),
};

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  sort: z.enum(["newest", "oldest", "price_asc", "price_desc", "name_asc", "name_desc"]).optional(),
  category: z.string().uuid().optional().describe("Category id"),
  brand: z.string().uuid().optional().describe("Brand id"),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().trim().max(100).optional(),
  inStock: boolString().describe("Only products with at least one variant in stock"),
  includeInactive: boolString().describe("Admins see hidden products unless this is false; ignored for others"),
});

const reviewFields = {
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
};

const variantFields = {
  color: z.string().trim().min(1).max(50),
  size: z.string().trim().min(1).max(10),
  sku: z.string().trim().min(1).max(100),
  stock: z.coerce.number().int().nonnegative(),
  price: z.coerce.number().nonnegative(),
};

const atLeastOne = { message: "At least one field must be provided for update" };

export const productDto = {
  listQuery,
  searchQuery: listQuery.extend({ q: z.string().trim().min(1).max(100) }),
  pageQuery: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
  }),

  // Unknown fields the admin UI sends (stock, variants, hasVariants) are
  // ignored: stock lives on variants, which have their own endpoints.
  createProduct: z.object({ ...productFields, isActive: productFields.isActive.default(true) }),
  updateProduct: z
    .object(productFields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, atLeastOne),

  createReview: z.object(reviewFields).strict(),
  updateReview: z
    .object(reviewFields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, atLeastOne),

  createVariant: z.object(variantFields),
  updateVariant: z
    .object(variantFields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, atLeastOne),
};
