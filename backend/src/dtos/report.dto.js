import { z } from "zod";

// Accepts "2026-10-01" (as the admin panel sends) or a full ISO datetime.
const date = () =>
  z
    .string()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional();

const range = {
  startDate: date().describe("Default: 30 days before endDate"),
  endDate: date().describe("Default: now (a plain date includes that whole day)"),
};

export const reportDto = {
  salesQuery: z.object({ ...range, groupBy: z.enum(["day", "week", "month", "year"]).optional() }),
  ordersQuery: z.object({ ...range, groupBy: z.enum(["day", "week", "month", "year"]).optional() }),
  inventoryQuery: z.object({
    storeId: z.string().uuid().optional().describe("Report one branch's stock instead of online stock"),
    categoryId: z.string().uuid().optional(),
    threshold: z.coerce.number().int().min(0).optional().describe("Low-stock threshold (default 5)"),
  }),
  customerQuery: z.object(range),
  supplierQuery: z.object({ status: z.enum(["active", "inactive", "pending"]).optional() }),
};
