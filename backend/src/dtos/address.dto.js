import { z } from "zod";

const text = (max) => z.string().trim().max(max);

// Fields match the addresses table. Extra fields older clients send (type,
// label, instructions) are ignored.
const fields = {
  fullName: text(100).min(1, "fullName is required"),
  phoneNumber: text(20).regex(/^[0-9+\-() ]{6,20}$/, "Invalid phone number"),
  addressLine1: text(255).min(1, "Address Line 1 is required"),
  addressLine2: text(255).optional().nullable(),
  country: text(100).min(1).default("TH"),
  province: text(100).optional().nullable().describe("Thai province name; determines the shipping zone"),
  district: text(100).optional().nullable(),
  subdistrict: text(100).optional().nullable(),
  city: text(100).optional().nullable(),
  state: text(100).optional().nullable(),
  postalCode: text(20).min(1, "Postal code is required"),
  isDefault: z.boolean().optional(),
};

export const addressDto = {
  createAddress: z.object(fields),
  updateAddress: z
    .object(fields)
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
  adminListQuery: z.object({
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),
};
