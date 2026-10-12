import { z } from "zod";

const fields = {
  name: z.string().trim().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
};

export const categoryDto = {
  createCategory: z.object(fields).strict(),
  updateCategory: z
    .object(fields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
