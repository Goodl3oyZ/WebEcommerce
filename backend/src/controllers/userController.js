import { db } from "../config/db.js";
import {
  users,
  userPreferences,
  orders,
  pointsHistory,
} from "../models/schema.js";
import { userService } from "../services/userService.js"; // Import userService
import { eq } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { FileService } from "../services/fileService.js";

export const userController = {
  // Get user profile
  async getProfile(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const userId = req.user.id;
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const { password: _, ...safeUser } = user;

      return res.json({
        success: true,
        data: {
          user: {
            ...safeUser,
            role: req.user.role,
            createdAt: user.createdAt?.toISOString(),
            updatedAt: user.updatedAt?.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("Error getting profile:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get profile",
      });
    }
  },

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        name,
        email,
        phone,
        bio,
        address,
        city,
        state,
        country,
        postalCode,
      } = req.body;

      // Update user data
      const [updatedUser] = await db
        .update(users)
        .set({
          name,
          email,
          phone,
          bio,
          address,
          city,
          state,
          country,
          postalCode,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      // Handle profile image upload if provided
      if (req.file) {
        const fileName = await FileService.uploadByType(
          req.file,
          "profiles",
          userId
        );
        const [userWithImage] = await db
          .update(users)
          .set({ avatar: fileName })
          .where(eq(users.id, userId))
          .returning();

        // Get public URL for the image
        const imageUrl = FileService.getFileUrl("profiles", fileName);
        userWithImage.avatar = imageUrl;

        return res.json({
          success: true,
          data: userWithImage,
        });
      }

      return res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update profile",
      });
    }
  },

  // Get user preferences
  async getPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const preferences = await userService.getPreferences(userId);
      res.json(preferences);
    } catch (error) {
      next(error);
    }
  },

  // Update user preferences
  async updatePreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const updates = req.body;
      const updatedPreferences = await userService.updatePreferences(
        userId,
        updates
      );
      res.json(updatedPreferences);
    } catch (error) {
      next(error);
    }
  },

  // Get user orders
  async getUserOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query;
      const orders = await userService.getUserOrders(userId, { page, limit });
      res.json(orders);
    } catch (error) {
      next(error);
    }
  },

  // Get user points
  async getUserPoints(req, res, next) {
    try {
      const userId = req.user.id;
      const points = await userService.getUserPoints(userId);
      res.json(points);
    } catch (error) {
      next(error);
    }
  },

  // Get points history
  async getPointsHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query;
      const history = await userService.getPointsHistory(userId, {
        page,
        limit,
      });
      res.json(history);
    } catch (error) {
      next(error);
    }
  },

  // Get all users (Admin only)
  async getUsers(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const users = await userService.getUsers({ page, limit, search });
      res.json(users);
    } catch (error) {
      next(error);
    }
  },

  // Create new user (Admin only)
  async createUser(req, res, next) {
    try {
      const userData = req.body;
      const newUser = await userService.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  },

  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await userService.getUserById(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // Update user role (Admin only)
  async updateUserRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const updatedUser = await userService.updateUser(userId, { role });
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  },

  // Delete profile image
  async deleteProfileImage(req, res) {
    try {
      const userId = req.user.id;
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || !user.avatar) {
        return res.status(404).json({
          success: false,
          error: "Profile image not found",
        });
      }

      // Delete from MinIO
      await FileService.deleteFile("profiles", user.avatar);

      // Update user record
      const [updatedUser] = await db
        .update(users)
        .set({ avatar: null })
        .where(eq(users.id, userId))
        .returning();

      return res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error deleting profile image:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to delete profile image",
      });
    }
  },
};
