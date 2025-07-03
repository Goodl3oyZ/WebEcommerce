import { FileService } from "../services/fileService.js";
import { BUCKETS } from "../config/minio.js";
import { db } from "../config/db.js";
import { users } from "../models/schema.js";
import { eq } from "drizzle-orm";

export const uploadController = {
  async uploadAvatar(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const userId = req.user?.id || req.body.userId;
      if (!userId)
        return res.status(400).json({ message: "User ID is required" });

      const fileName = await FileService.uploadProfileImage(req.file, userId);
      // Log fileName and url for debugging
      console.log("[uploadAvatar] fileName:", fileName);
      const url = await FileService.getFileUrl(BUCKETS.PROFILES, fileName);
      console.log("[uploadAvatar] url:", url);

      const [userWithImage] = await db
        .update(users)
        .set({ avatar: url })
        .where(eq(users.id, userId))
        .returning();

      if (!userWithImage)
        return res
          .status(404)
          .json({ message: "User not found or not updated" });

      return res.status(200).json({ url, user: userWithImage });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ message: "Error uploading avatar" });
    }
  },
  async uploadProductImage(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const productId = req.body.productId || "anonymous";
      const fileName = await FileService.uploadProductImage(
        req.file,
        productId
      );
      // Log fileName for debugging
      console.log("[uploadProductImage] fileName:", fileName);
      res.json({ fileName });
    } catch (error) {
      res.status(500).json({ message: "Error uploading product image" });
    }
  },

  async uploadBrandLogo(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const brandId = req.body.brandId || "anonymous";
      const fileName = await FileService.uploadBrandLogo(req.file, brandId);
      const url = await FileService.getFileUrl(BUCKETS.BRANDS, fileName);
      res.json({ url });
    } catch (error) {
      res.status(500).json({ message: "Error uploading brand logo" });
    }
  },

  async uploadStoreImage(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const storeId = req.body.storeId || "anonymous";
      const fileName = await FileService.uploadStoreImage(req.file, storeId);
      const url = await FileService.getFileUrl(BUCKETS.STORES, fileName);
      res.json({ url });
    } catch (error) {
      res.status(500).json({ message: "Error uploading store image" });
    }
  },

  async uploadReviewImage(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const reviewId = req.body.reviewId || "anonymous";
      const fileName = await FileService.uploadReviewImage(req.file, reviewId);
      const url = await FileService.getFileUrl(BUCKETS.REVIEWS, fileName);
      res.json({ url });
    } catch (error) {
      res.status(500).json({ message: "Error uploading review image" });
    }
  },

  // DELETE handlers
  async deleteAvatar(req, res) {
    try {
      const { fileName } = req.body;
      if (!fileName)
        return res.status(400).json({ message: "No fileName provided" });
      await FileService.deleteFile(BUCKETS.PROFILES, fileName);
      res.json({ message: "Avatar deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting avatar" });
    }
  },
  async deleteProductImage(req, res) {
    try {
      const { fileName } = req.body;
      if (!fileName)
        return res.status(400).json({ message: "No fileName provided" });
      await FileService.deleteFile(BUCKETS.PRODUCTS, fileName);
      res.json({ message: "Product image deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting product image" });
    }
  },
  async deleteBrandLogo(req, res) {
    try {
      const { fileName } = req.body;
      if (!fileName)
        return res.status(400).json({ message: "No fileName provided" });
      await FileService.deleteFile(BUCKETS.BRANDS, fileName);
      res.json({ message: "Brand logo deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting brand logo" });
    }
  },
  async deleteStoreImage(req, res) {
    try {
      const { fileName } = req.body;
      if (!fileName)
        return res.status(400).json({ message: "No fileName provided" });
      await FileService.deleteFile(BUCKETS.STORES, fileName);
      res.json({ message: "Store image deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting store image" });
    }
  },
  async deleteReviewImage(req, res) {
    try {
      const { fileName } = req.body;
      if (!fileName)
        return res.status(400).json({ message: "No fileName provided" });
      await FileService.deleteFile(BUCKETS.REVIEWS, fileName);
      res.json({ message: "Review image deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting review image" });
    }
  },

  async updateAvatar(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const userId = req.user?.id || req.body.userId;
      if (!userId)
        return res.status(400).json({ message: "User ID is required" });

      if (req.body.oldFileName) {
        await FileService.deleteFile(BUCKETS.PROFILES, req.body.oldFileName);
      }

      const fileName = await FileService.uploadProfileImage(req.file, userId);
      const url = await FileService.getFileUrl(BUCKETS.PROFILES, fileName);

      // ✅ อัปเดตลง DB
      const [updatedUser] = await db
        .update(users)
        .set({ avatar: url })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res
          .status(404)
          .json({ message: "User not found or not updated" });
      }

      res.json({ url, fileName, user: updatedUser });
    } catch (error) {
      console.error("Error updating avatar:", error);
      res.status(500).json({ message: "Error updating avatar" });
    }
  },
  async updateProductImage(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const productId = req.body.productId || "ADMIN";
      if (req.body.oldFileName) {
        await FileService.deleteFile(BUCKETS.PRODUCTS, req.body.oldFileName);
      }
      const fileName = await FileService.uploadProductImage(
        req.file,
        productId
      );
      res.json({ fileName });
    } catch (error) {
      res.status(500).json({ message: "Error updating product image" });
    }
  },
  async updateBrandLogo(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const brandId = req.body.brandId || "ADMIN";
      if (req.body.oldFileName) {
        await FileService.deleteFile(BUCKETS.BRANDS, req.body.oldFileName);
      }
      const fileName = await FileService.uploadBrandLogo(req.file, brandId);
      const url = await FileService.getFileUrl(BUCKETS.BRANDS, fileName);
      res.json({ url, fileName });
    } catch (error) {
      res.status(500).json({ message: "Error updating brand logo" });
    }
  },
  async updateStoreImage(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const storeId = req.body.storeId || "anonymous";
      if (req.body.oldFileName) {
        await FileService.deleteFile(BUCKETS.STORES, req.body.oldFileName);
      }
      const fileName = await FileService.uploadStoreImage(req.file, storeId);
      const url = await FileService.getFileUrl(BUCKETS.STORES, fileName);
      res.json({ url, fileName });
    } catch (error) {
      res.status(500).json({ message: "Error updating store image" });
    }
  },
  async updateReviewImage(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const reviewId = req.body.reviewId || "anonymous";
      if (req.body.oldFileName) {
        await FileService.deleteFile(BUCKETS.REVIEWS, req.body.oldFileName);
      }
      const fileName = await FileService.uploadReviewImage(req.file, reviewId);
      const url = await FileService.getFileUrl(BUCKETS.REVIEWS, fileName);
      res.json({ url, fileName });
    } catch (error) {
      res.status(500).json({ message: "Error updating review image" });
    }
  },
};
