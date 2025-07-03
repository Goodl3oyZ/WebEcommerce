import { notificationService } from "../services/notificationService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/appError.js";

// Get all notifications for the current user
const getUserNotifications = catchAsync(async (req, res) => {
  const notifications = await notificationService.getUserNotifications(
    req.user.id
  );
  res.json(notifications);
});

// Get a specific notification by ID
const getNotificationById = catchAsync(async (req, res) => {
  const notification = await notificationService.getNotificationById(
    req.params.id,
    req.user.id
  );
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }
  res.json(notification);
});

// Mark a notification as read
const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.params.id,
    req.user.id
  );
  res.json(notification);
});

// Mark all notifications as read
const markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.json({ message: "All notifications marked as read" });
});

// Delete a notification
const deleteNotification = catchAsync(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user.id);
  res.json({ message: "Notification deleted successfully" });
});

// Admin: Create a new notification
const createNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.createNotification(req.body);
  res.status(201).json(notification);
});

// Admin: Update a notification
const updateNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.updateNotification(
    req.params.id,
    req.body
  );
  res.json(notification);
});

// Admin: Get all notifications
const getAllNotifications = catchAsync(async (req, res) => {
  const notifications = await notificationService.getAllNotifications();
  res.json(notifications);
});

export const notificationController = {
  getUserNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  updateNotification,
  getAllNotifications,
};
