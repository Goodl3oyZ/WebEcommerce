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

const SORTS = ["newest", "oldest", "price_asc", "price_desc", "name_asc", "name_desc"];

/**
 * Also accept the column style some clients send (sort=createdAt|price|name
 * with order=asc|desc) and map it to the sort values above.
 */
function normaliseSort(query) {
  if (!query || typeof query !== "object" || SORTS.includes(query.sort)) return query;
  const descending = String(query.order ?? "desc").toLowerCase() !== "asc";
  const legacy = {
    createdAt: descending ? "newest" : "oldest",
    created_at: descending ? "newest" : "oldest",
    price: descending ? "price_desc" : "price_asc",
    name: descending ? "name_desc" : "name_asc",
  };
  const { order: _order, ...rest } = query;
  return legacy[query.sort] ? { ...rest, sort: legacy[query.sort] } : query;
}

const listFields = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  sort: z.enum(SORTS).optional(),
  order: z.enum(["asc", "desc"]).optional().describe("Only with the column-style sort (createdAt|price|name)"),
  category: z.string().uuid().optional().describe("Category id"),
  brand: z.string().uuid().optional().describe("Brand id"),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().trim().max(100).optional(),
  inStock: boolString().describe("Only products with at least one variant in stock"),
  includeInactive: boolString().describe("Admins see hidden products unless this is false; ignored for others"),
});

export const listQuery = z.preprocess(normaliseSort, listFields);

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
  searchQuery: z.preprocess(normaliseSort, listFields.extend({ q: z.string().trim().min(1).max(100) })),
  adminReviewsQuery: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    search: z.string().trim().max(100).optional().describe("Product name, reviewer name or comment"),
  }),

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
