import { z } from "zod";

// Supplier DTOs
export const supplierDto = {
  // Create supplier
  createSupplier: z.object({
    name: z.string().min(1),
    contactPerson: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().min(1),
    }),
    taxId: z.string().optional(),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["active", "inactive", "pending"]).default("active"),
  }),

  // Update supplier
  updateSupplier: z
    .object({
      name: z.string().min(1).optional(),
      contactPerson: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(1).optional(),
      address: z
        .object({
          street: z.string().min(1),
          city: z.string().min(1),
          state: z.string().min(1),
          postalCode: z.string().min(1),
          country: z.string().min(1),
        })
        .optional(),
      taxId: z.string().optional(),
      paymentTerms: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["active", "inactive", "pending"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  // Add product to supplier
  addSupplierProduct: z.object({
    supplierId: z.number(),
    productId: z.number(),
    sku: z.string().min(1),
    cost: z.number().min(0),
    leadTime: z.number().min(0),
    minimumOrder: z.number().min(1),
    notes: z.string().optional(),
  }),

  // Update supplier product
  updateSupplierProduct: z
    .object({
      sku: z.string().min(1).optional(),
      cost: z.number().min(0).optional(),
      leadTime: z.number().min(0).optional(),
      minimumOrder: z.number().min(1).optional(),
      notes: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};

// Response DTOs
export const supplierResponseDto = {
  // Basic supplier info
  basic: z.object({
    id: z.string().uuid(),
    name: z.string(),
    contactPerson: z.string(),
    email: z.string(),
    phone: z.string(),
    status: z.string(),
  }),

  // Detailed supplier info
  detailed: z.object({
    id: z.string().uuid(),
    name: z.string(),
    contactPerson: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
    }),
    taxId: z.string().optional(),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
    status: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of supplier
  admin: z.object({
    id: z.string().uuid(),
    name: z.string(),
    contactPerson: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
    }),
    taxId: z.string().optional(),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
    status: z.string(),
    products: z.array(
      z.object({
        productId: z.string().uuid(),
        sku: z.string(),
        cost: z.number(),
        leadTime: z.number(),
        minimumOrder: z.number(),
        notes: z.string().optional(),
      })
    ),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
