import { z } from "zod";

// Inventory DTOs
export const inventoryDto = {
  // Create inventory item
  createInventoryItem: z.object({
    productId: z.number(),
    sku: z.string().min(1),
    quantity: z.number().min(0),
    location: z.string().min(1),
    reorderPoint: z.number().min(0),
    reorderQuantity: z.number().min(1),
    cost: z.number().min(0),
    notes: z.string().optional(),
  }),

  // Update inventory item
  updateInventoryItem: z
    .object({
      sku: z.string().min(1).optional(),
      quantity: z.number().min(0).optional(),
      location: z.string().min(1).optional(),
      reorderPoint: z.number().min(0).optional(),
      reorderQuantity: z.number().min(1).optional(),
      cost: z.number().min(0).optional(),
      notes: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Adjust inventory
  adjustInventory: z.object({
    productId: z.number(),
    quantity: z.number(),
    reason: z.string().min(1),
    notes: z.string().optional(),
  }),

  // Transfer inventory
  transferInventory: z.object({
    productId: z.number(),
    fromLocation: z.string().min(1),
    toLocation: z.string().min(1),
    quantity: z.number().min(1),
    reason: z.string().min(1),
    notes: z.string().optional(),
  }),
};

// Response DTOs
export const inventoryResponseDto = {
  // Basic inventory info
  basic: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    sku: z.string(),
    quantity: z.number(),
    location: z.string(),
  }),

  // Detailed inventory info
  detailed: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    sku: z.string(),
    quantity: z.number(),
    location: z.string(),
    reorderPoint: z.number(),
    reorderQuantity: z.number(),
    cost: z.number(),
    notes: z.string().optional(),
    lastUpdated: z.string().datetime(),
  }),

  // Admin view of inventory
  admin: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    sku: z.string(),
    quantity: z.number(),
    location: z.string(),
    reorderPoint: z.number(),
    reorderQuantity: z.number(),
    cost: z.number(),
    notes: z.string().optional(),
    lastUpdated: z.string().datetime(),
    history: z.array(
      z.object({
        type: z.string(),
        quantity: z.number(),
        reason: z.string(),
        notes: z.string().optional(),
        timestamp: z.string().datetime(),
      })
    ),
    statistics: z.object({
      totalReceived: z.number(),
      totalShipped: z.number(),
      totalAdjusted: z.number(),
      averageCost: z.number(),
    }),
  }),
};
