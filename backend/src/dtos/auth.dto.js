import { z } from "zod";

// Emails are stored lowercase; normalise input so lookups are case-insensitive.
const email = () =>
  z.string().trim().toLowerCase().pipe(z.string().email("Invalid email format"));

// Auth DTOs for validation
export const authDto = {
  // Login - only essential fields
  login: z
    .object({
      email: email(),
      password: z.string().min(6, "Password must be at least 6 characters"),
      deviceInfo: z
        .object({
          userAgent: z.string().optional(),
          deviceId: z.string().optional(),
          ipAddress: z.string().optional(),
        })
        .optional(),
    })
    .strict(),

  // Register - includes all necessary fields for user creation
  register: z
    .object({
      name: z.string().min(2, "Name must be at least 2 characters"),
      email: email(),
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
    .strict()
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),

  // Password reset request
  forgotPassword: z
    .object({
      email: email(),
    })
    .strict(),

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
    .strict()
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
    .strict()
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),

  // Verify email
  verifyEmail: z
    .object({
      token: z.string(),
    })
    .strict(),

  // Refresh token
  // Body token is optional: browsers send it as an httpOnly cookie.
  refreshToken: z
    .object({
    refreshToken: z.string().optional(),
    deviceInfo: z
      .object({
        userAgent: z.string().optional(),
        deviceId: z.string().optional(),
        ipAddress: z.string().optional(),
      })
      .optional(),
    })
    .strict(),

  // Logout (API clients may pass their refresh token)
  logout: z.object({ refreshToken: z.string().optional() }).strict(),
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
