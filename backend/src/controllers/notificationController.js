import { notificationService } from "../services/notificationService.js";
import { parsePagination } from "../utils/pagination.js";

export const notificationController = {
  async getUserNotifications(req, res) {
    res.json(
      await notificationService.getUserNotifications(
        req.user.id,
        { unreadOnly: req.query.unreadOnly === "true" },
        parsePagination(req.query)
      )
    );
  },

  async getNotificationById(req, res) {
    res.json(await notificationService.getNotificationById(req.params.id, req.user.id));
  },

  async markAsRead(req, res) {
    res.json(await notificationService.markAsRead(req.params.id, req.user.id));
  },

  async markAllAsRead(req, res) {
    res.json(await notificationService.markAllAsRead(req.user.id, req.body.notificationIds));
  },

  async deleteNotification(req, res) {
    await notificationService.deleteNotification(req.params.id, req.user.id);
    res.status(204).send();
  },

  // --- Admin ---------------------------------------------------------------
  async getAllNotifications(req, res) {
    const { type, userId } = req.query;
    res.json(await notificationService.getAllNotifications({ type, userId }, parsePagination(req.query)));
  },

  async getNotificationByIdAdmin(req, res) {
    res.json(await notificationService.getNotificationById(req.params.id));
  },

  async deleteNotificationAdmin(req, res) {
    await notificationService.deleteNotification(req.params.id);
    res.status(204).send();
  },

  async createNotification(req, res) {
    res.status(201).json(await notificationService.createNotification(req.body));
  },

  async updateNotification(req, res) {
    res.json(await notificationService.updateNotification(req.params.id, req.body));
  },
};
