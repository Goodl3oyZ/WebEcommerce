import { z } from "zod";

export const loyaltyDto = {
  historyQuery: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),
  statisticsQuery: z.object({
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
  }),
  // Accepted for documentation; these endpoints answer 501 (catalog is fixed in code).
  reward: z.record(z.any()),
  tier: z.record(z.any()),
};
