import { z } from "zod";

// Base user schema that matches the database schema
const baseUserSchema = {
  name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  avatar: z.string().url().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  bio: z.string().optional(),
  socialLinks: z.record(z.string()).optional(),
};

// Create User DTO
export const CreateUserDto = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  bio: z.string().optional(),
  socialLinks: z.record(z.string()).optional(),
});

// Update User DTO
export const UpdateUserDto = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  bio: z.string().optional(),
  socialLinks: z.record(z.string()).optional(),
});

// Login DTO
export const LoginDto = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Change Password DTO
export const ChangePasswordDto = z
  .object({
    currentPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Reset Password DTO
export const ResetPasswordDto = z
  .object({
    token: z.string(),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Forgot Password DTO
export const ForgotPasswordDto = z.object({
  email: z.string().email("Invalid email format"),
});

// DTOs for user operations
export const userDto = {
  // Create user - only includes necessary fields for registration
  createUser: z
    .object({
      name: z.string().min(2).max(255),
      email: z.string().email(),
      password: z
        .string()
        .min(8)
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    })
    .strict(),

  // Update profile - excludes sensitive fields
  updateProfile: z
    .object({
      name: z.string().min(2).max(255).optional(),
      phone: z.string().max(20).optional(),
      avatar: z.string().url().optional(),
      dateOfBirth: z.string().datetime().optional(),
      gender: z
        .enum(["male", "female", "other", "prefer_not_to_say"])
        .optional(),
      bio: z.string().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    })
    .strict(),

  // Update address - separate from profile for better organization
  updateAddress: z
    .object({
      address: z.string().optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    })
    .strict(),

  // Update social links
  updateSocialLinks: z.object({
    platform: z.string().min(2).max(50),
    url: z.string().url(),
    isPublic: z.boolean().default(true),
  }),

  // Update preferences
  updatePreferences: z
    .object({
      // Shopping Preferences
      preferredSize: z.string().max(10).optional(),
      preferredColor: z.string().max(50).optional(),
      preferredBrands: z.array(z.number()).optional(),
      preferredCategories: z.array(z.number()).optional(),

      // Communication Preferences
      newsletterSubscription: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
      orderUpdates: z.boolean().optional(),
      promotionalOffers: z.boolean().optional(),

      // Display Preferences
      language: z.enum(["en", "th"]).optional(),
      currency: z.enum(["THB", "USD", "EUR"]).optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),

      // Notification Preferences
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),

      // Privacy Preferences
      showEmail: z.boolean().optional(),
      showPhone: z.boolean().optional(),
      showAddress: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    })
    .strict(),

  // Change password
  changePassword: z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z
        .string()
        .min(8)
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),

  // Update role (admin only)
  updateRole: z
    .object({
      role: z.enum(["user", "admin", "super_admin", "moderator"]),
    })
    .strict(),
};

// Response DTOs - carefully exclude sensitive data
export const userResponseDto = {
  // Basic user info for public display
  public: z.object({
    id: z.number(),
    name: z.string(),
    avatar: z.string().url().optional(),
    bio: z.string().optional(),
    socialLinks: z.record(z.string()).optional(),
  }),

  // Extended user info for authenticated user's own profile
  private: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    avatar: z.string().url().optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    bio: z.string().optional(),
    socialLinks: z.record(z.string()).optional(),
    preferences: z
      .object({
        preferredSize: z.string().optional(),
        preferredColor: z.string().optional(),
        preferredBrands: z.array(z.number()).optional(),
        preferredCategories: z.array(z.number()).optional(),
        newsletterSubscription: z.boolean(),
        marketingEmails: z.boolean(),
        orderUpdates: z.boolean(),
        promotionalOffers: z.boolean(),
        language: z.string(),
        currency: z.string(),
        theme: z.string(),
        emailNotifications: z.boolean(),
        pushNotifications: z.boolean(),
        smsNotifications: z.boolean(),
        showEmail: z.boolean(),
        showPhone: z.boolean(),
        showAddress: z.boolean(),
      })
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Admin view of user (includes sensitive data)
  admin: z.object({
    ...baseUserSchema,
    id: z.number(),
    isVerified: z.boolean(),
    isActive: z.boolean(),
    failedLoginAttempts: z.number(),
    lastPasswordChange: z.string().datetime().optional(),
    lastLoginAt: z.string().datetime().optional(),
    lastLogoutAt: z.string().datetime().optional(),
    lastActivityAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
};
