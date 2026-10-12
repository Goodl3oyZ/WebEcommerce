import { z } from "zod";

const TYPES = ["order", "payment", "shipping", "system", "promotion"];
const PRIORITIES = ["low", "medium", "high"];
const page = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
};

export const notificationDto = {
  createNotification: z
    .object({
      type: z.enum(TYPES),
      title: z.string().trim().min(1).max(255),
      message: z.string().trim().min(1).max(5000),
      priority: z.enum(PRIORITIES).default("medium"),
      userId: z.string().uuid().optional(),
      recipients: z.array(z.string().uuid()).max(1000).optional(),
      broadcast: z.boolean().optional().describe("true = every active user (ignores userId/recipients)"),
      metadata: z.record(z.any()).optional(),
    })
    .strict(),

  updateNotification: z
    .object({
      title: z.string().trim().min(1).max(255).optional(),
      message: z.string().trim().min(1).max(5000).optional(),
      priority: z.enum(PRIORITIES).optional(),
      isRead: z.boolean().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  markAsRead: z
    .object({ notificationIds: z.array(z.string().uuid()).optional().describe("Only these (default: all)") })
    .strict(),

  listQuery: z.object({ ...page, unreadOnly: z.enum(["true", "false"]).optional() }),
  adminListQuery: z.object({ ...page, type: z.enum(TYPES).optional(), userId: z.string().uuid().optional() }),
};
