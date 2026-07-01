import { notificationService } from "../services/notificationService.js";
import { catchAsync } from "../utils/catchAsync.js";

const isAdminNotificationPath = (req) => req.path.startsWith("/admin/");

const getUserNotifications = catchAsync(async (req, res) => {
  const notifications = await notificationService.getUserNotifications(
    req.user.id
  );
  res.json(notifications);
});

const getNotificationById = catchAsync(async (req, res) => {
  const userId = isAdminNotificationPath(req) ? null : req.user.id;
  const notification = await notificationService.getNotificationById(
    req.params.id,
    userId
  );
  res.json(notification);
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.params.id,
    req.user.id
  );
  res.json(notification);
});

const markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.json({ message: "All notifications marked as read" });
});

const deleteNotification = catchAsync(async (req, res) => {
  const userId = isAdminNotificationPath(req) ? null : req.user.id;
  await notificationService.deleteNotification(req.params.id, userId);
  res.json({ message: "Notification deleted successfully" });
});

const createNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.createNotification({
    ...req.body,
    userId: req.body.userId ?? req.body.recipients?.[0] ?? req.user.id,
  });
  res.status(201).json(notification);
});

const updateNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.updateNotification(
    req.params.id,
    req.body,
    null
  );
  res.json(notification);
});

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
