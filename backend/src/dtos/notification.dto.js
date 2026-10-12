import { z } from "zod";

// Notification DTOs
export const notificationDto = {
  // Create notification
  createNotification: z.object({
    type: z.enum(["order", "payment", "shipping", "system", "promotion"]),
    title: z.string().min(1),
    message: z.string().min(1),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    userId: z.string().uuid().optional(),
    recipients: z.array(z.string().uuid()).optional(),
    metadata: z.record(z.any()).optional(),
  }),

  // Update notification
  updateNotification: z
    .object({
      title: z.string().min(1).optional(),
      message: z.string().min(1).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      isRead: z.boolean().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Mark as read
  markAsRead: z
    .object({
      notificationIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),

  // Delete notification
  deleteNotification: z.object({
    notificationIds: z.array(z.string().uuid()),
  }),
};

// Response DTOs
export const notificationResponseDto = {
  // Basic notification info
  basic: z.object({
    id: z.string().uuid(),
    type: z.string(),
    title: z.string(),
    isRead: z.boolean(),
    createdAt: z.string().datetime(),
  }),

  // Detailed notification info
  detailed: z.object({
    id: z.string().uuid(),
    type: z.string(),
    title: z.string(),
    message: z.string(),
    priority: z.string(),
    isRead: z.boolean(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.string().datetime(),
    readAt: z.string().datetime().optional(),
  }),

  // Admin view of notification
  admin: z.object({
    id: z.string().uuid(),
    type: z.string(),
    title: z.string(),
    message: z.string(),
    priority: z.string(),
    recipients: z.array(z.number()),
    isRead: z.boolean(),
    metadata: z.record(z.any()).optional(),
    scheduledFor: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    readAt: z.string().datetime().optional(),
    deliveryStatus: z.object({
      total: z.number(),
      delivered: z.number(),
      failed: z.number(),
      pending: z.number(),
    }),
  }),
};
