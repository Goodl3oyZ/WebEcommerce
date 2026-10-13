import { z } from "zod";

export const settingsDto = {
  updateSettings: z
    .object({
      siteName: z.string().trim().min(1).max(100).optional(),
      maintenance: z.boolean().optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
      currency: z.string().length(3).toUpperCase().optional(),
      logo: z
        .string()
        .trim()
        .max(500)
        .nullable()
        .optional()
        .describe("fileName (or url) from POST /api/uploads/site; null removes the logo"),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
