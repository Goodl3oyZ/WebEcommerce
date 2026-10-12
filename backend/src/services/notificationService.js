import { db } from "../config/db.js";
import { notifications, users } from "../models/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";

const getUserNotifications = async (userId) => {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
  });
};

const getUnreadCount = async (userId) => {
  const [result] = await db
    .select({ count: sql`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
  return result?.count ?? 0;
};

const getNotificationById = async (notificationId, userId) => {
  const conditions = [eq(notifications.id, notificationId)];
  if (userId) {
    conditions.push(eq(notifications.userId, userId));
  }

  const notification = await db.query.notifications.findFirst({
    where: and(...conditions),
  });

  if (!notification) {
    throw ApiError.notFound("Notification not found");
  }

  return notification;
};

const markAsRead = async (notificationId, userId) => {
  await getNotificationById(notificationId, userId);

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    )
    .returning();

  return updated;
};

const markAllAsRead = async (userId) => {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );
};

const deleteNotification = async (notificationId, userId) => {
  await getNotificationById(notificationId, userId);
  const conditions = [eq(notifications.id, notificationId)];
  if (userId) conditions.push(eq(notifications.userId, userId));
  await db.delete(notifications).where(and(...conditions));
};

const createNotification = async (notificationData) => {
  const payload = {
    title: String(notificationData.title || "").trim(),
    message: String(notificationData.message || "").trim(),
    type: notificationData.type,
    metadata: {
      ...(notificationData.metadata || {}),
      priority: notificationData.priority || "medium",
    },
    isRead: false,
  };

  const recipientIds = [
    ...(notificationData.userId ? [notificationData.userId] : []),
    ...(notificationData.recipients || []),
  ].filter(Boolean);

  if (recipientIds.length === 0) {
    const allUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isActive, true));
    recipientIds.push(...allUsers.map((u) => u.id));
  }

  if (recipientIds.length === 0) {
    throw ApiError.badRequest("ไม่มีผู้รับการแจ้งเตือน");
  }

  const rows = recipientIds.map((userId) => ({ ...payload, userId }));
  return db.insert(notifications).values(rows).returning();
};

const updateNotification = async (notificationId, updateData, userId = null) => {
  await getNotificationById(notificationId, userId);

  const conditions = [eq(notifications.id, notificationId)];
  if (userId) {
    conditions.push(eq(notifications.userId, userId));
  }

  const [updated] = await db
    .update(notifications)
    .set(updateData)
    .where(and(...conditions))
    .returning();

  return updated;
};

const getNotificationsByType = async (userId, type) => {
  return db.query.notifications.findMany({
    where: and(eq(notifications.userId, userId), eq(notifications.type, type)),
    orderBy: [desc(notifications.createdAt)],
  });
};

const getAllNotifications = async () => {
  return db.query.notifications.findMany({
    orderBy: [desc(notifications.createdAt)],
  });
};

export const notificationService = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getNotificationById,
  updateNotification,
  getNotificationsByType,
  getAllNotifications,
};
