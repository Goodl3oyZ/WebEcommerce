import { db } from "../config/db.js";
import { notifications, users } from "../models/schema.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { paginationMeta } from "../utils/pagination.js";
import { publishNotification } from "./orderNotifications.js";

/** Priority has no column; it lives in metadata. */
const withPriority = (n) => n && { ...n, priority: n.metadata?.priority ?? "medium" };

async function findOne(notificationId, userId) {
  const notification = await db.query.notifications.findFirst({
    where: and(eq(notifications.id, notificationId), userId ? eq(notifications.userId, userId) : undefined),
  });
  if (!notification) throw ApiError.notFound("Notification not found");
  return notification;
}

export const notificationService = {
  async getUserNotifications(userId, { unreadOnly }, pagination) {
    const where = and(eq(notifications.userId, userId), unreadOnly ? eq(notifications.isRead, false) : undefined);
    const [items, total, [unread]] = await Promise.all([
      db.query.notifications.findMany({
        where,
        orderBy: [desc(notifications.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(notifications).where(where),
      db
        .select({ count: sql`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
    ]);
    return {
      notifications: items.map(withPriority),
      unreadCount: unread.count,
      pagination: paginationMeta(total[0].count, pagination),
    };
  },

  async getNotificationById(notificationId, userId) {
    return withPriority(await findOne(notificationId, userId));
  },

  async markAsRead(notificationId, userId) {
    await findOne(notificationId, userId);
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();
    return withPriority(updated);
  },

  /** All, or only the given ids (still limited to the user's own). */
  async markAllAsRead(userId, notificationIds) {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          notificationIds?.length ? inArray(notifications.id, notificationIds) : undefined
        )
      )
      .returning({ id: notifications.id });
    return { updated: result.length };
  },

  async deleteNotification(notificationId, userId) {
    await findOne(notificationId, userId);
    await db.delete(notifications).where(eq(notifications.id, notificationId));
  },

  /**
   * Send to explicit recipients, or to every active user with broadcast=true.
   * Recipients are de-duplicated; unknown ids are rejected.
   */
  async createNotification({ type, title, message, priority = "medium", metadata, userId, recipients, broadcast }) {
    let recipientIds = [...new Set([userId, ...(recipients ?? [])].filter(Boolean))];
    if (broadcast) {
      const active = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
      recipientIds = active.map((u) => u.id);
    } else if (recipientIds.length === 0) {
      throw ApiError.badRequest("Give userId/recipients, or broadcast: true to notify everyone");
    } else {
      const found = await db.select({ id: users.id }).from(users).where(inArray(users.id, recipientIds));
      if (found.length !== recipientIds.length) throw ApiError.badRequest("One or more recipients do not exist");
    }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      type,
      metadata: { ...(metadata ?? {}), priority },
      isRead: false,
    };
    const created = recipientIds.length
      ? await db.insert(notifications).values(recipientIds.map((id) => ({ ...payload, userId: id }))).returning()
      : [];
    // Tell open tabs to refresh (payloads are capped at 8 KB, so ids go in chunks).
    if (broadcast) await publishNotification(db, { all: true });
    else {
      for (let i = 0; i < recipientIds.length; i += 100) {
        await publishNotification(db, { userIds: recipientIds.slice(i, i + 100) });
      }
    }
    return { sent: created.length, notifications: created.map(withPriority) };
  },

  async updateNotification(notificationId, { title, message, isRead, priority, metadata }) {
    const existing = await findOne(notificationId);
    const changes = {};
    if (title !== undefined) changes.title = title.trim();
    if (message !== undefined) changes.message = message.trim();
    if (isRead !== undefined) changes.isRead = isRead;
    if (priority !== undefined || metadata !== undefined) {
      changes.metadata = { ...(existing.metadata ?? {}), ...(metadata ?? {}), ...(priority && { priority }) };
    }
    const [updated] = await db
      .update(notifications)
      .set(changes)
      .where(eq(notifications.id, notificationId))
      .returning();
    return withPriority(updated);
  },

  async getAllNotifications({ type, userId }, pagination) {
    const where = and(type ? eq(notifications.type, type) : undefined, userId ? eq(notifications.userId, userId) : undefined);
    const [items, total] = await Promise.all([
      db.query.notifications.findMany({
        where,
        with: { user: { columns: { id: true, name: true, email: true } } },
        orderBy: [desc(notifications.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(notifications).where(where),
    ]);
    return { notifications: items.map(withPriority), pagination: paginationMeta(total[0].count, pagination) };
  },
};
