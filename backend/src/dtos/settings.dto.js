import { z } from "zod";

export const settingsDto = {
  updateSettings: z
    .object({
      siteName: z.string().min(1).optional(),
      maintenance: z.boolean().optional(),
      theme: z.enum(["light", "dark"]).optional(),
      currency: z.string().length(3).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
