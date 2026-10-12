import { z } from "zod";

export const ROLE_VALUES = ["user", "moderator", "admin", "super_admin"];

const email = () =>
  z.string().trim().toLowerCase().pipe(z.string().email("Invalid email format"));

// DTOs for user operations. Fields match the users / user_preferences tables.
export const userDto = {
  // Admin creates a user. Granting admin/super_admin needs super_admin (service check).
  adminCreateUser: z
    .object({
      name: z.string().trim().min(2).max(255),
      email: email(),
      password: z.string().min(8, "Password must be at least 8 characters"),
      role: z.enum(ROLE_VALUES).optional(),
    })
    .strict(),

  // Own profile. Sent as multipart/form-data (optional `avatar` file), so every
  // field is an optional string; email changes are not allowed here.
  updateProfile: z
    .object({
      name: z.string().trim().min(2).max(255).optional(),
      phone: z
        .string()
        .trim()
        .max(20)
        .regex(/^[0-9+\-() ]*$/, "Phone may only contain digits, spaces and + - ( )")
        .optional(),
    })
    .strip(),

  updatePreferences: z
    .object({
      language: z.enum(["th", "en"]).optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
      notifications: z.record(z.boolean()).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  updateRole: z
    .object({
      role: z.enum(ROLE_VALUES),
    })
    .strict(),

  setUserActive: z
    .object({
      isActive: z.boolean(),
    })
    .strict(),
};
