import { z } from "zod";

const page = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
};

export const inventoryDto = {
  createInventoryItem: z
    .object({
      storeId: z.string().uuid(),
      productId: z.string().uuid(),
      variantId: z.string().uuid(),
      quantity: z.number().int().min(0).default(0),
    })
    .strict(),
  updateInventoryItem: z
    .object({ quantity: z.number().int().min(0).describe("The counted quantity") })
    .strict(),
  adjustInventory: z.object({
    quantity: z
      .number()
      .int()
      .refine((n) => n !== 0, "quantity must not be 0")
      .describe("Positive to add, negative to remove"),
    reason: z.string().trim().min(1).max(500),
  }),
  transferInventory: z.object({
    toStoreId: z.string().uuid(),
    quantity: z.number().int().min(1),
    reason: z.string().trim().max(500).optional(),
  }),
  listQuery: z.object(page),
  lowStockQuery: z.object({
    ...page,
    threshold: z.coerce.number().int().min(0).optional().describe("Default 5"),
  }),
};
