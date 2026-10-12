import { z } from "zod";

export const brandDto = {
  createBrand: z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    logo: z.string().optional(),
    website: z.string().optional(),
    isActive: z.boolean().default(true),
  }),

  updateBrand: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    logo: z.string().optional(),
    website: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
};
