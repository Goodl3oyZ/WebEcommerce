// services/userService.js
import { db } from "../config/db.js";
import {
  users,
  userRoles,
  userPreferences,
  userSessions,
  orders as ordersTable,
  pointsHistory,
  addresses,
} from "../models/schema.js";
import { eq, and, ilike, or, desc, sql, inArray, isNull } from "drizzle-orm";
import { hashPassword } from "../utils/hashPassword.js";
import { ApiError } from "../utils/ApiError.js";
import { getHighestRole, ROLE_HIERARCHY } from "../utils/roles.js";
import { paginationMeta } from "../utils/pagination.js";
import { FileService } from "./fileService.js";

const PRIVILEGED_ROLES = ["admin", "super_admin"];
const DEFAULT_PREFERENCES = { language: "th", theme: "light", notifications: {} };

const isRemoteUrl = (value) => typeof value === "string" && /^https?:\/\//.test(value);

/** Public shape of a user: never includes the password hash; avatar is a URL. */
export const toSafeUser = (user) => {
  if (!user) return user;
  const { password: _password, failedLoginAttempts: _attempts, ...safe } = user;
  if (safe.avatar) safe.avatar = FileService.getFileUrl("profiles", safe.avatar);
  return safe;
};

const roleOf = async (userId) =>
  getHighestRole(
    await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId))
  );

/**
 * Only super_admin may grant, remove or act on admin-level accounts, and
 * nobody may change their own role or status (no self-escalation/lockout).
 */
function assertCanManage(actor, targetId, targetRole, newRole) {
  if (actor.id === targetId) {
    throw ApiError.badRequest("You cannot change your own role or status");
  }
  const touchesPrivileged =
    PRIVILEGED_ROLES.includes(targetRole) || PRIVILEGED_ROLES.includes(newRole);
  if (touchesPrivileged && actor.role !== "super_admin") {
    throw ApiError.forbidden("Only a super admin can manage admin accounts");
  }
}

export const userService = {
  async createUser(userData, actor) {
    const role = userData.role || "user";
    if (PRIVILEGED_ROLES.includes(role) && actor?.role !== "super_admin") {
      throw ApiError.forbidden("Only a super admin can create admin accounts");
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, userData.email),
    });
    if (existingUser) {
      throw ApiError.conflict("อีเมลนี้ถูกใช้แล้ว");
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        password: await hashPassword(userData.password),
        isActive: true,
        isVerified: false,
        lastPasswordChange: new Date(),
        failedLoginAttempts: 0,
      })
      .returning();
    await db.insert(userRoles).values({ userId: newUser.id, role });

    return { ...toSafeUser(newUser), role };
  },

  async getUserById(userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        provider: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      with: { roles: { columns: { role: true } } },
    });
    if (!user) {
      throw ApiError.notFound("ไม่พบผู้ใช้");
    }
    const { roles, ...rest } = user;
    return { ...toSafeUser(rest), role: getHighestRole(roles) };
  },

  async updateUserRole(actor, userId, role) {
    const target = await this.getUserById(userId);
    assertCanManage(actor, userId, target.role, role);

    // A user has exactly one role row.
    await db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));
      await tx.insert(userRoles).values({ userId, role });
    });
    return this.getUserById(userId);
  },

  async setUserActive(actor, userId, isActive) {
    const target = await this.getUserById(userId);
    assertCanManage(actor, userId, target.role);

    const [updated] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!isActive) {
      // Sign a deactivated user out everywhere immediately.
      await db
        .update(userSessions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(userSessions.userId, userId), eq(userSessions.isActive, true)));
    }
    return { ...toSafeUser(updated), role: target.role };
  },

  async getProfile(userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        isVerified: true,
        isActive: true,
        points: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastActivityAt: true,
        provider: true,
      },
    });
    if (!user) {
      throw new ApiError("User not found", 404, null, "USER_NOT_FOUND");
    }

    const [orderStats, addressCount, roleRows] = await Promise.all([
      db
        .select({
          totalOrders: sql`count(*)::int`,
          // Only money actually received: not cancelled, unpaid or refunded orders.
          totalSpent: sql`coalesce(sum(${ordersTable.total}) filter (where ${ordersTable.paymentStatus} in ('completed', 'partially_refunded')), 0)`,
        })
        .from(ordersTable)
        .where(eq(ordersTable.userId, userId)),
      db
        .select({ count: sql`count(*)::int` })
        .from(addresses)
        .where(and(eq(addresses.userId, userId), isNull(addresses.archivedAt))),
      db.query.userRoles.findMany({ where: eq(userRoles.userId, userId) }),
    ]);

    return {
      success: true,
      data: {
        user: { ...toSafeUser(user), role: getHighestRole(roleRows) },
        stats: {
          totalOrders: orderStats[0]?.totalOrders || 0,
          totalSpent: Number(orderStats[0]?.totalSpent || 0),
          addressCount: addressCount[0]?.count || 0,
          roles: roleRows.map((r) => r.role),
        },
      },
    };
  },

  /** Update name/phone and optionally replace the avatar image. */
  async updateProfile(userId, { name, phone }, avatarFile) {
    const current = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!current) throw ApiError.notFound("User not found");

    const changes = {};
    if (name !== undefined) changes.name = name;
    if (phone !== undefined) changes.phone = phone || null;
    if (avatarFile) {
      changes.avatar = await FileService.uploadByType(avatarFile, "profiles", userId);
    }
    if (Object.keys(changes).length === 0) {
      throw ApiError.badRequest("Nothing to update");
    }

    const [updated] = await db
      .update(users)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    // Remove the replaced upload (social-login avatars are remote URLs, not ours).
    if (avatarFile && current.avatar && !isRemoteUrl(current.avatar)) {
      await FileService.deleteFile("profiles", current.avatar).catch(() => {});
    }
    return toSafeUser(updated);
  },

  async deleteAvatar(userId) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user?.avatar) {
      throw ApiError.notFound("Profile image not found");
    }
    if (!isRemoteUrl(user.avatar)) {
      await FileService.deleteFile("profiles", user.avatar).catch(() => {});
    }
    const [updated] = await db
      .update(users)
      .set({ avatar: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return toSafeUser(updated);
  },

  async getPreferences(userId) {
    const preferences = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });
    return preferences ?? { userId, ...DEFAULT_PREFERENCES };
  },

  async updatePreferences(userId, updates) {
    const [updated] = await db
      .update(userPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    if (updated) return updated;

    const [created] = await db
      .insert(userPreferences)
      .values({ userId, ...DEFAULT_PREFERENCES, ...updates })
      .returning();
    return created;
  },

  async getUserOrders(userId, pagination) {
    const [orders, total] = await Promise.all([
      db
        .select({
          id: ordersTable.id,
          orderNumber: ordersTable.orderNumber,
          userId: ordersTable.userId,
          status: ordersTable.status,
          paymentStatus: ordersTable.paymentStatus,
          total: ordersTable.total,
          createdAt: ordersTable.createdAt,
          updatedAt: ordersTable.updatedAt,
        })
        .from(ordersTable)
        .where(eq(ordersTable.userId, userId))
        .orderBy(desc(ordersTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db
        .select({ count: sql`count(*)::int` })
        .from(ordersTable)
        .where(eq(ordersTable.userId, userId)),
    ]);

    return { orders, pagination: paginationMeta(total[0].count, pagination) };
  },

  async getUserPoints(userId) {
    const [user] = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    return { points: user.points ?? 0 };
  },

  async getPointsHistory(userId, pagination) {
    const [history, total] = await Promise.all([
      db.query.pointsHistory.findMany({
        where: eq(pointsHistory.userId, userId),
        orderBy: [desc(pointsHistory.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db
        .select({ count: sql`count(*)::int` })
        .from(pointsHistory)
        .where(eq(pointsHistory.userId, userId)),
    ]);

    return { history, pagination: paginationMeta(total[0].count, pagination) };
  },

  async getUsers({ search, role, isActive }, pagination) {
    const conditions = [];
    if (search) {
      conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
    }
    if (isActive === "true" || isActive === true) conditions.push(eq(users.isActive, true));
    if (isActive === "false" || isActive === false) conditions.push(eq(users.isActive, false));
    if (role && ROLE_HIERARCHY[role]) {
      // Filter in SQL so totals and pages are correct.
      conditions.push(
        inArray(
          users.id,
          db.select({ id: userRoles.userId }).from(userRoles).where(eq(userRoles.role, role))
        )
      );
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [usersList, total] = await Promise.all([
      db.query.users.findMany({
        where: whereClause,
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          provider: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        with: { roles: { columns: { role: true } } },
        orderBy: [desc(users.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(users).where(whereClause),
    ]);

    return {
      users: usersList.map(({ roles, ...u }) => ({
        ...toSafeUser(u),
        role: getHighestRole(roles),
      })),
      pagination: paginationMeta(total[0].count, pagination),
    };
  },
};
