import { z } from "zod";

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().describe("Page number (default 1)"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Items per page (default 10, max 100)"),
});
