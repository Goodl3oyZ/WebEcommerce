import { z } from "zod";

export const storeDto = {
  createStore: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    address: z.object({
      street: z.string().min(5).max(200),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      country: z.string().length(2),
      postalCode: z.string().min(3).max(20),
    }),
    contact: z.object({
      phone: z.string().min(10).max(15),
      email: z.string().email(),
    }),
    hours: z.record(
      z.object({
        open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      })
    ),
    isActive: z.boolean().optional(),
  }),

  updateStore: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    address: z
      .object({
        street: z.string().min(5).max(200),
        city: z.string().min(1).max(100),
        state: z.string().min(1).max(100),
        country: z.string().length(2),
        postalCode: z.string().min(3).max(20),
      })
      .optional(),
    contact: z
      .object({
        phone: z.string().min(10).max(15),
        email: z.string().email(),
      })
      .optional(),
    hours: z
      .record(
        z.object({
          open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        })
      )
      .optional(),
    isActive: z.boolean().optional(),
  }),

  findNearbyStores: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().positive().max(100), // in kilometers
  }),

  updateStoreInventory: z.object({
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(0),
        price: z.number().positive().optional(),
      })
    ),
  }),
};
