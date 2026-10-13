import { z } from "zod";
import { ALL_PROVINCES } from "../utils/provinceZones.js";

const SHIPMENT_STATUSES = ["pending", "processing", "shipped", "in_transit", "out_for_delivery", "delivered", "failed", "returned"];
const atLeastOne = { message: "At least one field must be provided for update" };
const dateTime = () => z.string().datetime({ offset: true });

const methodFields = {
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(50),
  description: z.string().max(500).optional().nullable(),
  price: z.coerce.number().min(0),
  shippingZoneId: z.string().uuid().describe("The method is offered to addresses in this zone"),
  isActive: z.boolean().optional(),
};

const zoneFields = {
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  baseCost: z.coerce.number().min(0),
  provinces: z
    .array(z.enum(ALL_PROVINCES))
    .max(ALL_PROVINCES.length)
    .optional()
    .describe("Thai province names served by this zone; a province is moved here from any other zone"),
  isActive: z.boolean().optional(),
};

export const shippingDto = {
  createShippingMethod: z.object(methodFields),
  updateShippingMethod: z.object(methodFields).partial().refine((d) => Object.keys(d).length > 0, atLeastOne),
  createShippingZone: z.object(zoneFields),
  updateShippingZone: z.object(zoneFields).partial().refine((d) => Object.keys(d).length > 0, atLeastOne),

  calculate: z.object({
    addressId: z.string().uuid(),
    items: z.array(z.any()).optional().describe("Accepted for compatibility; cost depends on the address zone"),
  }),
  methodsQuery: z.object({
    addressId: z.string().uuid().optional().describe("Only methods available for this address (yours)"),
  }),

  createShipment: z
    .object({
      orderId: z.string().uuid(),
      carrier: z.string().trim().min(1).max(100),
      trackingNumber: z.string().trim().min(1).max(100).optional().describe("Generated when omitted"),
      status: z.enum(SHIPMENT_STATUSES).optional(),
      estimatedDelivery: dateTime().optional(),
    })
    .strict(),
  updateShipment: z
    .object({
      status: z.enum(SHIPMENT_STATUSES).optional(),
      location: z.string().max(255).optional().nullable(),
      description: z.string().max(500).optional().describe("Shown in the tracking history"),
      trackingNumber: z.string().trim().min(1).max(100).optional(),
      carrier: z.string().trim().min(1).max(100).optional(),
      estimatedDelivery: dateTime().optional().nullable(),
    })
    .strict()
    .refine((d) => Object.keys(d).length > 0, atLeastOne),
  listQuery: z.object({
    status: z.enum(SHIPMENT_STATUSES).optional(),
    search: z.string().trim().max(100).optional().describe("Tracking or order number"),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional().describe("Max 100 (larger values are capped)"),
  }),
};
