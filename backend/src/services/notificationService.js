import { db } from "../config/db.js";
import { notifications } from "../models/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { AppError } from "../utils/appError.js";

// Get all notifications for a user
const getUserNotifications = async (userId) => {
  return await db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: desc(notifications.createdAt),
  });
};

// Get unread notifications count
const getUnreadCount = async (userId) => {
  return await db.query.notifications.count({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ),
  });
};

// Mark a notification as read
const markAsRead = async (notificationId, userId) => {
  const notification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId)
    ),
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return await db.query.notifications.update({
    where: eq(notifications.id, notificationId),
    data: { isRead: true },
  });
};

// Mark all notifications as read
const markAllAsRead = async (userId) => {
  return await db.query.notifications.updateMany({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ),
    data: { isRead: true },
  });
};

// Delete a notification
const deleteNotification = async (notificationId, userId) => {
  const notification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId)
    ),
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  await db.query.notifications.delete({
    where: eq(notifications.id, notificationId),
  });
};

// Create a new notification
const createNotification = async (notificationData) => {
  return await db.query.notifications.create({
    data: {
      ...notificationData,
      isRead: false,
    },
  });
};

// Get notification by ID
const getNotificationById = async (notificationId, userId) => {
  const notification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId)
    ),
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return notification;
};

// Update notification
const updateNotification = async (notificationId, userId, updateData) => {
  const notification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId)
    ),
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return await db.query.notifications.update({
    where: eq(notifications.id, notificationId),
    data: updateData,
  });
};

// Get notifications by type
const getNotificationsByType = async (userId, type) => {
  return await db.query.notifications.findMany({
    where: and(eq(notifications.userId, userId), eq(notifications.type, type)),
    orderBy: desc(notifications.createdAt),
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
};
