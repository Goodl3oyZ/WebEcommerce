import { z } from "zod";

const fields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  logo: z.string().max(500).optional().nullable().describe("Key or URL returned by /api/uploads/brand"),
  website: z.string().url().max(255).optional().nullable().or(z.literal("")),
  isActive: z.boolean(),
};

export const brandDto = {
  createBrand: z.object({ ...fields, isActive: fields.isActive.default(true) }),
  updateBrand: z
    .object(fields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
  listQuery: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
    search: z.string().trim().max(100).optional(),
  }),
};
