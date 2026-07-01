// Service มักจะใช้กับ endpoints ที่ไม่ใช่ GET และรับผิดชอบในการจัดการลอจิกธุรกิจของแอปพลิเคชัน
// เช่น การสร้างข้อมูลใหม่ (POST), การอัปเดตข้อมูล (PUT/PATCH), หรือการลบข้อมูล (DELETE)
// services/userService.js
import { db } from "../config/db.js";
import {
  users,
  userRoles,
  userPreferences,
  orders as ordersTable,
  pointsHistory,
} from "../models/schema.js";
import { eq, and, like, or, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { hashPassword } from "../utils/hashPassword.js"; // ฟังก์ชันแฮชรหัสผ่าน
import { ApiError } from "../utils/ApiError.js";

export const userService = {
  async createUser(userData) {
    try {
      // ตรวจสอบว่าผู้ใช้มีอยู่ในระบบหรือไม่
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, userData.email),
      });
      if (existingUser) {
        throw new ApiError(
          "User with this email already exists",
          409,
          "DUPLICATE_EMAIL"
        );
      }

      // Map username to name if provided
      const name = userData.username || userData.name;
      if (!name) {
        throw new ApiError("Name is required", 400, "VALIDATION_ERROR");
      }

      // แฮชรหัสผ่านก่อนบันทึก
      const hashedPassword = await hashPassword(userData.password);

      // Create user data object
      const userInsertData = {
        name,
        email: userData.email,
        password: hashedPassword,
        isActive: true,
        isVerified: false,
        lastPasswordChange: new Date(),
        failedLoginAttempts: 0,
      };

      // สร้างผู้ใช้ใหม่ในฐานข้อมูล
      const [newUser] = await db
        .insert(users)
        .values(userInsertData)
        .returning();
      // เพิ่มบทบาท (role) ให้ผู้ใช้ใหม่
      const role = userData.role || "user";

      await db.insert(userRoles).values({
        userId: newUser.id,
        role,
      });

      const { password: _, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Error creating user: ${error.message}`,
        500,
        "INTERNAL_SERVER_ERROR"
      );
    }
  },

  async authenticateUser(email, password) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
          points: true,
          isVerified: true,
          isActive: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new ApiError("User not found", 404);
      }

      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new ApiError("Invalid credentials", 401);
      }

      // สร้าง JWT Token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );

      // อัปเดต lastLoginAt
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          points: user.points,
          isVerified: user.isVerified,
          isActive: user.isActive,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error) {
      throw new ApiError(`Authentication failed: ${error.message}`, 500);
    }
  },

  async getAllUsers() {
    try {
      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return allUsers;
    } catch (error) {
      throw new ApiError(`Error fetching users: ${error.message}`, 500);
    }
  },

  async getUserById(userId) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!user) {
        throw new ApiError("User not found", 404);
      }
      return user;
    } catch (error) {
      throw new ApiError(`Error fetching user: ${error.message}`, 500);
    }
  },

  async updateUser(userId, updateData) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!user) {
        throw new ApiError("User not found", 404);
      }

      // ถ้ามีการอัปเดตรหัสผ่าน ให้แฮชก่อนบันทึก
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }

      // อัปเดตข้อมูล
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      const { password: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      throw new ApiError(`Error updating user: ${error.message}`, 500);
    }
  },

  async deleteUser(userId) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (!user) {
        throw new ApiError("User not found", 404);
      }

      await db.delete(users).where(eq(users.id, userId));
      return { message: "User successfully deleted" };
    } catch (error) {
      throw new ApiError(`Error deleting user: ${error.message}`, 500);
    }
  },

  async getProfile(userId) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new ApiError("User not found", 404, "USER_NOT_FOUND");
      }

      // Convert dates to ISO strings to prevent circular references
      const serializedUser = {
        ...user,
        createdAt: user.createdAt?.toISOString(),
        updatedAt: user.updatedAt?.toISOString(),
      };

      return {
        success: true,
        data: {
          user: serializedUser,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Error fetching user profile: ${error.message}`,
        500,
        "INTERNAL_SERVER_ERROR"
      );
    }
  },

  async updateProfile(userId, updates) {
    try {
      // Don't allow updating sensitive fields
      const sensitiveFields = [
        "password",
        "email",
        "role",
        "isAdmin",
        "isVerified",
        "failedLoginAttempts",
        "lastPasswordChange",
      ];
      const { ...safeUpdates } = updates;

      // Remove any sensitive fields that might have been included
      sensitiveFields.forEach((field) => {
        delete safeUpdates[field];
      });

      // Convert datetime strings to Date objects if present
      const dateFields = [
        "dateOfBirth",
        "lastLoginAt",
        "lastLogoutAt",
        "lastActivityAt",
      ];
      dateFields.forEach((field) => {
        if (safeUpdates[field]) {
          try {
            safeUpdates[field] = new Date(safeUpdates[field]);
          } catch (error) {
            // If date conversion fails, remove the field
            delete safeUpdates[field];
          }
        }
      });

      const [updatedUser] = await db
        .update(users)
        .set({
          ...safeUpdates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new ApiError("User not found", 404);
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      throw new ApiError(`Error updating profile: ${error.message}`, 500);
    }
  },

  async getPreferences(userId) {
    const preferences = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return preferences || {};
  },

  async updatePreferences(userId, updates) {
    const [preferences] = await db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.userId, userId))
      .returning();

    if (!preferences) {
      // Create preferences if they don't exist
      const [newPreferences] = await db
        .insert(userPreferences)
        .values({
          userId,
          ...updates,
        })
        .returning();
      return newPreferences;
    }

    return preferences;
  },

  async getUserOrders(userId, { page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        db
          .select({
            id: ordersTable.id,
            userId: ordersTable.userId,
            status: ordersTable.status,
            total: ordersTable.total,
            createdAt: ordersTable.createdAt,
            updatedAt: ordersTable.updatedAt,
          })
          .from(ordersTable)
          .where(eq(ordersTable.userId, userId))
          .orderBy(desc(ordersTable.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql`count(*)` })
          .from(ordersTable)
          .where(eq(ordersTable.userId, userId)),
      ]);

      return {
        orders,
        pagination: {
          total: Number(total[0].count),
          page,
          limit,
          pages: Math.ceil(Number(total[0].count) / limit),
        },
      };
    } catch (error) {
      throw new ApiError(`Error fetching user orders: ${error.message}`, 500);
    }
  },

  async getUserPoints(userId) {
    const user = await db
      .select({
        points: users.points,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.length === 0) {
      throw new ApiError("User not found", 404);
    }

    return { points: user[0].points };
  },

  async getPointsHistory(userId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const [history, total] = await Promise.all([
      db.query.pointsHistory.findMany({
        where: eq(pointsHistory.userId, userId),
        orderBy: [desc(pointsHistory.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(pointsHistory)
        .where(eq(pointsHistory.userId, userId)),
    ]);

    return {
      history,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async getUsers({ page = 1, limit = 10, search }) {
    const offset = (page - 1) * limit;
    let whereClause = undefined;

    if (search) {
      whereClause = or(
        like(users.username, `%${search}%`),
        like(users.email, `%${search}%`)
      );
    }

    const [usersList, total] = await Promise.all([
      db.query.users.findMany({
        where: whereClause,
        columns: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [desc(users.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(whereClause),
    ]);

    return {
      users: usersList,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },
};
