import { z } from "zod";

// Auth DTOs for validation
export const authDto = {
  // Login - only essential fields
  login: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    deviceInfo: z
      .object({
        userAgent: z.string().optional(),
        deviceId: z.string().optional(),
        ipAddress: z.string().optional(),
      })
      .optional(),
  }),

  // Register - includes all necessary fields for user creation
  register: z
    .object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: z.string().email("Invalid email format"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
      confirmPassword: z.string(),
      deviceInfo: z
        .object({
          userAgent: z.string().optional(),
          deviceId: z.string().optional(),
          ipAddress: z.string().optional(),
        })
        .optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),

  // Password reset request
  forgotPassword: z.object({
    email: z.string().email("Invalid email format"),
  }),

  // Password reset with token
  resetPassword: z
    .object({
      token: z.string(),
      newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
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

  // Change password (for authenticated users)
  changePassword: z
    .object({
      currentPassword: z
        .string()
        .min(6, "Current password must be at least 6 characters"),
      newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
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

  // Verify email
  verifyEmail: z.object({
    token: z.string(),
  }),

  // Refresh token
  refreshToken: z.object({
    refreshToken: z.string(),
    deviceInfo: z
      .object({
        userAgent: z.string().optional(),
        deviceId: z.string().optional(),
        ipAddress: z.string().optional(),
      })
      .optional(),
  }),

  // Logout
  logout: z.object({}),
};

// Response DTOs
export const authResponseDto = {
  // Login response
  login: z.object({
    user: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      isVerified: z.boolean(),
      isActive: z.boolean(),
    }),
    tokens: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number(),
    }),
  }),

  // Register response
  register: z.object({
    user: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      isVerified: z.boolean(),
      isActive: z.boolean(),
    }),
    tokens: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number(),
    }),
  }),

  // Token refresh response
  refreshToken: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  }),

  // Password reset response
  resetPassword: z.object({
    message: z.string(),
  }),

  // Email verification response
  verifyEmail: z.object({
    message: z.string(),
  }),
};
