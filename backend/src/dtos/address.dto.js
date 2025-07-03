import { z } from "zod";

const addressBaseSchema = z.object({
  type: z.enum(["shipping", "billing", "both"]),

  fullName: z.string().min(1, "fullName is required"),

  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(),

  // Global location fields
  country: z.string().min(1, "Country is required"),
  city: z.string().optional(), // ยืดหยุ่นสำหรับประเทศที่ไม่มีเมือง
  state: z.string().optional(), // เช่น USA / CA
  province: z.string().optional(), // จังหวัดไทย
  district: z.string().optional(), // เขต/อำเภอไทย
  subdistrict: z.string().optional(), // ตำบล/แขวงไทย

  postalCode: z.string().min(1, "Postal code is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),

  isDefault: z.boolean().default(false),
  label: z.string().optional(),
  instructions: z.string().optional(),
});

// Address DTOs
export const addressDto = {
  // Create address
  createAddress: addressBaseSchema.extend({
    type: z.enum(["shipping", "billing", "both"]).default("shipping"),
  }),

  // Update address
  updateAddress: addressBaseSchema
    .partial({
      type: z.enum(["shipping", "billing", "both"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
