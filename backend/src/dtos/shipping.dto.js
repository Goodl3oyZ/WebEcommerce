import { z } from "zod";

// Create Shipping Zone DTO
export const CreateShippingZoneDto = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  countries: z.array(z.string().length(2)), // ISO country codes
  states: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  postalCodes: z.array(z.string()).optional(),
  baseCost: z.number().positive(),
  additionalCost: z.number().min(0).default(0),
  minOrderValue: z.number().positive().optional(),
  maxOrderValue: z.number().positive().optional(),
  estimatedDays: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

// Update Shipping Zone DTO
export const UpdateShippingZoneDto = CreateShippingZoneDto.partial();

// Shipping Zone Response DTO
export const ShippingZoneResponseDto = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  countries: z.array(z.string()),
  states: z.array(z.string()).nullable(),
  cities: z.array(z.string()).nullable(),
  postalCodes: z.array(z.string()).nullable(),
  isActive: z.boolean(),
  baseCost: z.number(),
  additionalCost: z.number(),
  minOrderValue: z.number().nullable(),
  maxOrderValue: z.number().nullable(),
  estimatedDays: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Calculate Shipping Cost DTO
export const CalculateShippingCostDto = z.object({
  address: z.object({
    country: z.string().length(2),
    state: z.string().optional(),
    city: z.string(),
    postalCode: z.string(),
  }),
  items: z.array(
    z.object({
      quantity: z.number().int().positive(),
      weight: z.number().positive().optional(),
      dimensions: z
        .object({
          length: z.number().positive(),
          width: z.number().positive(),
          height: z.number().positive(),
        })
        .optional(),
    })
  ),
  orderValue: z.number().positive(),
});

// Shipping Cost Response DTO
export const ShippingCostResponseDto = z.object({
  zoneId: z.number().int().positive(),
  zoneName: z.string(),
  baseCost: z.number(),
  additionalCost: z.number(),
  totalCost: z.number(),
  estimatedDays: z.number().int().positive(),
  currency: z.string().length(3),
});

// Shipping DTOs
export const shippingDto = {
  // Create shipping address
  createAddress: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().min(1),
    postalCode: z.string().min(1),
    isDefault: z.boolean().default(false),
    notes: z.string().optional(),
  }),

  // Update shipping address
  updateAddress: z
    .object({
      name: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      address: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      state: z.string().min(1).optional(),
      country: z.string().min(1).optional(),
      postalCode: z.string().min(1).optional(),
      isDefault: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Calculate shipping cost
  calculateShipping: z.object({
    address: z.object({
      city: z.string().min(1),
      state: z.string().min(1),
      country: z.string().min(1),
      postalCode: z.string().min(1),
    }),
    items: z.array(
      z.object({
        weight: z.number().min(0),
        dimensions: z.object({
          length: z.number().min(0),
          width: z.number().min(0),
          height: z.number().min(0),
        }),
        quantity: z.number().min(1),
      })
    ),
    shippingMethod: z.enum(["standard", "express", "overnight"]),
  }),

  // Update shipping status
  updateShippingStatus: z.object({
    status: z.enum([
      "pending",
      "processing",
      "shipped",
      "in_transit",
      "delivered",
      "failed",
      "returned",
    ]),
    trackingNumber: z.string().optional(),
    carrier: z.string().optional(),
    estimatedDelivery: z.string().datetime().optional(),
    notes: z.string().optional(),
  }),

  createShippingMethod: z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(50),
    description: z.string().optional(),
    price: z.coerce.number().min(0),
    isActive: z.boolean().default(true),
    shippingZoneId: z.string().uuid().optional(),
  }),

  updateShippingMethod: z
    .object({
      name: z.string().min(1).max(100).optional(),
      code: z.string().min(1).max(50).optional(),
      description: z.string().optional(),
      price: z.coerce.number().min(0).optional(),
      isActive: z.boolean().optional(),
      shippingZoneId: z.string().uuid().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  createShippingZone: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    baseCost: z.coerce.number().min(0),
    isActive: z.boolean().optional(),
  }),
  updateShippingZone: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      baseCost: z.coerce.number().min(0).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  createShipment: z.object({
    orderId: z.string().uuid(),
    trackingNumber: z.string().optional(),
    carrier: z.string().optional(),
    status: z
      .enum([
        "pending",
        "processing",
        "shipped",
        "in_transit",
        "delivered",
        "failed",
        "returned",
      ])
      .default("pending"),
    estimatedDelivery: z.string().datetime().optional(),
    location: z.string().optional(),
  }),

  updateShipment: z
    .object({
      trackingNumber: z.string().optional(),
      carrier: z.string().optional(),
      status: z
        .enum([
          "pending",
          "processing",
          "shipped",
          "in_transit",
          "delivered",
          "failed",
          "returned",
        ])
        .optional(),
      estimatedDelivery: z.string().datetime().optional(),
      actualDelivery: z.string().datetime().optional(),
      location: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Request return
  requestReturn: z.object({
    reason: z.enum([
      "wrong_item",
      "damaged",
      "quality_issue",
      "size_issue",
      "not_as_described",
      "other",
    ]),
    details: z.string().min(1),
    images: z.array(z.string().url()).optional(),
  }),
};

// Response DTOs
export const shippingResponseDto = {
  // Basic shipping info
  basic: z.object({
    id: z.number(),
    status: z.string(),
    trackingNumber: z.string().optional(),
    estimatedDelivery: z.string().datetime().optional(),
  }),

  // Detailed shipping info
  detailed: z.object({
    id: z.number(),
    orderId: z.number(),
    status: z.string(),
    trackingNumber: z.string().optional(),
    carrier: z.string().optional(),
    shippingMethod: z.string(),
    address: z.object({
      name: z.string(),
      phone: z.string(),
      address: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      postalCode: z.string(),
    }),
    estimatedDelivery: z.string().datetime().optional(),
    actualDelivery: z.string().datetime().optional(),
    shippingCost: z.number(),
    notes: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of shipping
  admin: z.object({
    id: z.number(),
    orderId: z.number(),
    userId: z.number(),
    status: z.string(),
    trackingNumber: z.string().optional(),
    carrier: z.string().optional(),
    shippingMethod: z.string(),
    address: z.object({
      name: z.string(),
      phone: z.string(),
      address: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      postalCode: z.string(),
    }),
    estimatedDelivery: z.string().datetime().optional(),
    actualDelivery: z.string().datetime().optional(),
    shippingCost: z.number(),
    statusHistory: z.array(
      z.object({
        status: z.string(),
        timestamp: z.string().datetime(),
        notes: z.string().optional(),
      })
    ),
    returnRequest: z
      .object({
        reason: z.string(),
        details: z.string(),
        status: z.string(),
        images: z.array(z.string().url()).optional(),
        createdAt: z.string().datetime(),
      })
      .optional(),
    notes: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
