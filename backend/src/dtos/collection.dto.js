import { z } from "zod";

const productIds = z.array(z.string().uuid()).max(500);

const fields = {
  name: z.string().trim().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean(),
  products: productIds.describe("Product ids; on update this replaces the whole list"),
};

export const collectionDto = {
  createCollection: z.object({ ...fields, isActive: fields.isActive.default(true), products: fields.products.optional() }).strict(),
  updateCollection: z
    .object(fields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
  addProducts: z.object({ productIds: productIds.min(1) }).strict(),
  removeProducts: z.object({ productIds: productIds.min(1) }).strict(),
  listQuery: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
    search: z.string().trim().max(100).optional(),
  }),
};
