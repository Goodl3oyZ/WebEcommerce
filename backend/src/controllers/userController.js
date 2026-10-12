import { userService } from "../services/userService.js";
import { parsePagination } from "../utils/pagination.js";

// Errors are ApiErrors; Express 5 forwards rejected promises to errorHandler.
export const userController = {
  async getProfile(req, res) {
    res.json(await userService.getProfile(req.user.id));
  },

  async updateProfile(req, res) {
    const user = await userService.updateProfile(req.user.id, req.body, req.file);
    res.json({ success: true, data: user });
  },

  async deleteProfileImage(req, res) {
    const user = await userService.deleteAvatar(req.user.id);
    res.json({ success: true, data: user });
  },

  async getPreferences(req, res) {
    res.json(await userService.getPreferences(req.user.id));
  },

  async updatePreferences(req, res) {
    res.json(await userService.updatePreferences(req.user.id, req.body));
  },

  async getUserOrders(req, res) {
    res.json(await userService.getUserOrders(req.user.id, parsePagination(req.query)));
  },

  async getUserPoints(req, res) {
    res.json(await userService.getUserPoints(req.user.id));
  },

  async getPointsHistory(req, res) {
    res.json(await userService.getPointsHistory(req.user.id, parsePagination(req.query)));
  },

  // --- Admin ---------------------------------------------------------------
  async getUsers(req, res) {
    const { search, role, isActive } = req.query;
    res.json(await userService.getUsers({ search, role, isActive }, parsePagination(req.query)));
  },

  async createUser(req, res) {
    res.status(201).json(await userService.createUser(req.body, req.user));
  },

  async getUserById(req, res) {
    res.json(await userService.getUserById(req.params.userId));
  },

  async updateUserRole(req, res) {
    res.json(await userService.updateUserRole(req.user, req.params.userId, req.body.role));
  },

  async setUserActive(req, res) {
    res.json(await userService.setUserActive(req.user, req.params.userId, req.body.isActive));
  },

  async getAdminUserOrders(req, res) {
    await userService.getUserById(req.params.userId); // 404 for unknown users
    res.json(await userService.getUserOrders(req.params.userId, parsePagination(req.query)));
  },
};
