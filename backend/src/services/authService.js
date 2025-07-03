import { db } from "../config/db.js";
import { users, userRoles, userSessions } from "../models/schema.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { eq, and, lt, gte } from "drizzle-orm";
import { redis } from "../config/redis.js";
import { ENV } from "../config/loadENV.js";
// import { getMaxListeners } from "nodemailer/lib/xoauth2/index.js";

// Custom error classes
class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

// Environment variables validation
const JWT_REFRESH_SECRET = ENV.JWT.REFRESH_SECRET;
const JWT_ACCESS_EXPIRATION = ENV.JWT.ACCESS_EXPIRATION;
const JWT_REFRESH_EXPIRATION = ENV.JWT.REFRESH_EXPIRATION;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds

if (
  !ENV.JWT.SECRET ||
  !JWT_REFRESH_SECRET ||
  !JWT_ACCESS_EXPIRATION ||
  !JWT_REFRESH_EXPIRATION
) {
  throw new Error(
    "Missing required environment variables for JWT configuration"
  );
}

export const authService = {
  async register({ email, password, name, deviceInfo = {} }) {
    try {
      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        throw new AuthError("Email already exists", "EMAIL_EXISTS");
      }

      // Hash password with strong algorithm
      const hashedPassword = await hashPassword(password);

      // Create user with additional security fields
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          password: hashedPassword,
          isVerified: false,
          isActive: true,
          lastPasswordChange: new Date(),
        })
        .returning();

      // Create default user role

      await db.insert(userRoles).values({
        userId: newUser.id,
        role: newUser.email === "panudetzx2@gmail.com" ? "admin" : "user",
      });

      return newUser;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError("Registration failed", "REGISTRATION_FAILED");
    }
  },

  async login(email, password, deviceInfo = {}) {
    try {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        throw new AuthError("User not found", "USER_NOT_FOUND");
      }

      // Check if account is locked
      const lockoutKey = `lockout:${user.id}`;
      const isLocked = await redis.get(lockoutKey);

      if (isLocked) {
        throw new AuthError("Account is temporarily locked", "ACCOUNT_LOCKED");
      }

      if (!user.isActive) {
        throw new AuthError("Account is deactivated", "ACCOUNT_DEACTIVATED");
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password);

      if (!isValidPassword) {
        throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS");
      }

      // Clean up expired sessions
      await db
        .delete(userSessions)
        .where(lt(userSessions.expiresAt, new Date()));

      // 👇 ดึง role จากตาราง user_roles
      const userRoleRecord = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, user.id))
        .limit(1);

      const role = userRoleRecord?.[0]?.role || "user"; // fallback ถ้าไม่มี role
      // สร้าง JWT
      const accessToken = generateToken(
        {
          id: user.id,
          email: user.email,
          role: user.email === "panudetzx2@gmail.com" ? "admin" : role, // เอามาจาก user_roles table
        },
        JWT_ACCESS_EXPIRATION
      );

      const refreshToken = generateRefreshToken(
        {
          id: user.id,
          email: user.email,
        },
        JWT_REFRESH_EXPIRATION
      );

      // Create session with enhanced tracking
      const [session] = await db
        .insert(userSessions)
        .values({
          userId: user.id,
          refreshToken,
          accessToken,
          deviceInfo,
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          expiresAt: new Date(
            Date.now() + parseInt(JWT_REFRESH_EXPIRATION) * 1000
          ),
          lastActivity: new Date(),
        })
        .returning();

      // Update user's last login and activity
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return { user, accessToken, refreshToken, session };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError("Login failed", "LOGIN_FAILED");
    }
  },

  async refreshToken(refreshToken, deviceInfo = {}) {
    try {
      const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);

      // ดึง role ของ user
      const userRoleRecord = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, decoded.id))
        .limit(1);

      const role = userRoleRecord?.[0]?.role || "user";

      const accessToken = generateToken(
        {
          id: decoded.id,
          email: decoded.email,
          role,
        },
        JWT_ACCESS_EXPIRATION
      );

      const newRefreshToken = generateRefreshToken(
        {
          id: decoded.id,
          email: decoded.email,
          role,
        },
        JWT_REFRESH_EXPIRATION
      );

      // Update session
      const [updatedSession] = await db
        .update(userSessions)
        .set({
          refreshToken: newRefreshToken,
          accessToken,
          deviceInfo,
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          expiresAt: new Date(
            Date.now() + parseInt(JWT_REFRESH_EXPIRATION) * 1000
          ),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userSessions.refreshToken, refreshToken),
            eq(userSessions.isActive, true)
          )
        )
        .returning();

      if (!updatedSession) {
        throw new AuthError("No active session found", "NO_ACTIVE_SESSION");
      }

      return { accessToken, newRefreshToken };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError("Token refresh failed", "REFRESH_FAILED");
    }
  },

  async logout(refreshToken, accessToken, userId) {
    try {
      if (!refreshToken && !accessToken) {
        throw new AuthError("No tokens provided for logout", "NO_TOKENS");
      }
      let decodedRefresh = null;
      if (refreshToken) {
        decodedRefresh = verifyRefreshToken(refreshToken);
      }

      let decodedAccess = null;
      if (accessToken) {
        decodedAccess = verifyToken(accessToken, ENV.JWT.SECRET);
      }

      // กำหนด userId ถ้ายังไม่มี โดยดึงจาก token
      if (!userId) {
        userId = decodedRefresh?.id || decodedAccess?.id;
      }

      // Handle refresh token blacklisting
      if (refreshToken) {
        try {
          const decodedRefresh = verifyRefreshToken(refreshToken);
          const isBlacklisted = await redis.get(
            `blacklist:${decodedRefresh.id}`
          );

          if (isBlacklisted) {
            console.warn("Refresh token already revoked, ignoring");
            // ไม่ throw error ให้ logout ผ่านไป
          } else {
            await redis.set(`blacklist:${decodedRefresh.id}`, "1", { EX: 60 });
            await db
              .update(userSessions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(
                and(
                  eq(userSessions.refreshToken, refreshToken),
                  eq(userSessions.userId, decodedRefresh.id)
                )
              );
          }
        } catch (error) {
          console.warn("Invalid refresh token during logout:", error.message);
          // อาจไม่ throw เพื่อให้ logout สำเร็จแม้ token invalid
          // หรือจะ throw ก็ได้ถ้าต้องการ strict มาก
        }
      }

      // Handle access token blacklisting
      if (accessToken) {
        try {
          const decodedAccess = verifyToken(accessToken, ENV.JWT.SECRET);
          const isBlacklisted = await redis.get(
            `blacklist:${decodedAccess.id}`
          );

          if (isBlacklisted) {
            console.warn("Access token already revoked, ignoring");
          } else {
            await redis.set(`blacklist:${decodedAccess.id}`, "1", { EX: 60 });
          }
        } catch (error) {
          console.warn("Invalid access token during logout:", error.message);
        }
      }

      if (userId) {
        await db
          .update(users)
          .set({ lastLogoutAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      return true;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError("Logout failed", "LOGOUT_FAILED");
    }
  },
  async logoutAllSessions(userId) {
    try {
      // Get all active sessions for the user
      const sessions = await db.query.userSessions.findMany({
        where: and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        ),
      });

      // Blacklist all tokens
      for (const session of sessions) {
        await redis.set(`blacklist:${session.userId}`, "1", { EX: 60 });
      }

      // Deactivate all sessions
      await db
        .update(userSessions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(eq(userSessions.userId, userId), eq(userSessions.isActive, true))
        );

      // Update user's last logout
      await db
        .update(users)
        .set({
          lastLogoutAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      throw new AuthError("Failed to logout all sessions", "LOGOUT_ALL_FAILED");
    }
  },

  async forgotPassword(email) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate password reset token
    const resetToken = generateToken({ id: user.id }, ENV.JWT.RESET_EXPIRATION);

    return resetToken;
  },

  async resetPassword(token, newPassword) {
    // Verify token
    const decoded = verifyToken(token, ENV.JWT.RESET_SECRET);

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, decoded.id));

    return true;
  },

  async verifyEmail(token) {
    try {
      console.log("Verifying email with token:", token);
      const decoded = verifyToken(token, ENV.JWT.SECRET);
      console.log("Decoded token:", decoded);

      if (!decoded) {
        throw new AuthError("Invalid or expired token", "INVALID_TOKEN");
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
      });

      if (!user) {
        throw new AuthError("User not found", "USER_NOT_FOUND");
      }

      if (user.isVerified) {
        return true; // Already verified
      }

      await db
        .update(users)
        .set({
          isVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, decoded.id));

      return true;
    } catch (error) {
      console.error("Verify email error:", error);

      if (error.name === "JWTError") {
        throw new AuthError(error.message, error.code);
      }

      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError("Error verifying email", "VERIFICATION_ERROR");
    }
  },

  async generateTokens(
    user,
    { userAgent = null, deviceInfo = {}, ipAddress = null } = {}
  ) {
    try {
      const roleResult = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, user.id))
        .limit(1);

      const role = roleResult?.[0]?.role || "user";

      const accessToken = generateToken(
        {
          id: user.id,
          email: user.email,
          role,
          provider: user.provider,
          providerId: user.providerId,
        },
        JWT_ACCESS_EXPIRATION
      );

      const refreshToken = generateRefreshToken(
        {
          id: user.id,
          email: user.email,
          role,
          provider: user.provider,
          providerId: user.providerId,
        },
        JWT_REFRESH_EXPIRATION
      );

      const [session] = await db
        .insert(userSessions)
        .values({
          userId: user.id,
          refreshToken,
          accessToken,
          deviceInfo,
          ipAddress,
          userAgent,
          expiresAt: new Date(
            Date.now() + parseInt(JWT_REFRESH_EXPIRATION) * 1000
          ),
          lastActivity: new Date(),
        })
        .returning();

      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return { accessToken, refreshToken };
    } catch (error) {
      throw new AuthError(
        "Failed to generate tokens",
        "TOKEN_GENERATION_FAILED"
      );
    }
  },

  async findUserById(id) {
    try {
      return await db.query.users.findFirst({
        where: eq(users.id, id),
      });
    } catch (error) {
      throw new AuthError("User lookup failed", "USER_LOOKUP_FAILED");
    }
  },

  async findOrCreateOAuthUser(profile, provider) {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email)
        throw new AuthError(`No email provided by ${provider}`, "NO_EMAIL");

      const name =
        profile.displayName || profile.username || email.split("@")?.[0];
      const avatar = profile.photos?.[0]?.value || null;
      const providerId = profile.id;

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        await db
          .update(users)
          .set({
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
            provider,
            providerId,
          })
          .where(eq(users.id, existingUser.id));
        return { ...existingUser, provider, providerId };
      }

      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name,
          avatar: avatar,
          password: "",
          isVerified: true,
          isActive: true,
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
          provider,
          providerId,
        })
        .returning();

      await db.insert(userRoles).values({
        userId: newUser.id,
        role: newUser.email === "panudetzx2@gmail.com" ? "admin" : "user",
      });

      return newUser;
    } catch (error) {
      throw new AuthError("OAuth user handling failed", "OAUTH_USER_FAILED");
    }
  },
};
