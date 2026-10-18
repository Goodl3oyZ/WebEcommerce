import { z } from "zod";

const text = (max) => z.string().trim().max(max);
const fields = {
  name: text(255).min(1),
  description: text(2000).optional().nullable(),
  address: text(500).optional().nullable(),
  city: text(100).optional().nullable(),
  state: text(100).optional().nullable(),
  country: text(100).optional().nullable(),
  postalCode: text(20).optional().nullable(),
  phone: z.string().trim().regex(/^[0-9+\-() ]{6,20}$/, "Invalid phone number").optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  logo: text(500).optional().nullable().describe("Key or URL returned by /api/uploads/store"),
  isActive: z.boolean().optional(),
};

const settings = z
  .record(z.any())
  .describe("Free-form settings merged into the stored ones, e.g. { openingHours: { mon: '09:00-18:00' } }");

export const storeDto = {
  createStore: z.object({ ...fields, settings: settings.optional() }).strict(),
  updateStore: z
    .object(fields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided for update" }),
  updateSettings: settings,
  availability: z.object({
    items: z
      .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }))
      .min(1)
      .max(50),
  }),
  listQuery: z.object({
    search: z.string().trim().max(100).optional().describe("Name or city"),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),
  ordersQuery: z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
  }),
  analyticsQuery: z.object({
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
  }),
};
