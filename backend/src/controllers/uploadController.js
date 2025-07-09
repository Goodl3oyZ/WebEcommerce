import { FileService } from "../services/fileService.js";
import { BUCKETS } from "../config/minio.js";
import { db } from "../config/db.js";
import { users } from "../models/schema.js";
import { eq } from "drizzle-orm";

// ฟังก์ชันช่วยสำหรับอัปโหลดไฟล์
const handleUpload = async (req, res, type, idFieldName, updateDbFunc) => {
  try {
    console.log("==== UPLOAD DEBUG ====");
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const id = req.user?.id || req.body[idFieldName];
    if (!id)
      return res.status(400).json({ message: `${idFieldName} is required` });

    const fileName = await FileService.uploadByType(req.file, type, id);
    const url = FileService.getFileUrl(BUCKETS[type.toUpperCase()], fileName);

    if (updateDbFunc) {
      const updatedRecord = await updateDbFunc(id, url);
      if (!updatedRecord)
        return res
          .status(404)
          .json({ message: "Record not found or not updated" });
      return res.status(200).json({ url, user: updatedRecord });
    }

    return res.status(200).json({ url, fileName, imageUrl: url });
  } catch (error) {
    console.error(`Error uploading file for ${type}:`, error);
    res.status(500).json({ message: `Error uploading file for ${type}` });
  }
};

// ฟังก์ชันช่วยสำหรับลบไฟล์
const handleDelete = async (req, res, type) => {
  try {
    const { fileName } = req.body;
    if (!fileName)
      return res.status(400).json({ message: "No fileName provided" });

    await FileService.deleteFile(BUCKETS[type.toUpperCase()], fileName);
    res.json({ message: "File deleted" });
  } catch (error) {
    console.error(`Error deleting file for ${type}:`, error);
    res.status(500).json({ message: `Error deleting file for ${type}` });
  }
};

// ฟังก์ชันช่วยสำหรับอัปเดตไฟล์ (ลบไฟล์เก่า + อัปโหลดไฟล์ใหม่ + อัปเดต DB ถ้ามี)
const handleUpdate = async (req, res, type, idFieldName, updateDbFunc) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const id = req.user?.id || req.body[idFieldName];
    if (!id)
      return res.status(400).json({ message: `${idFieldName} is required` });

    if (req.body.oldFileName) {
      await FileService.deleteFile(
        BUCKETS[type.toUpperCase()],
        req.body.oldFileName
      );
    }

    const fileName = await FileService.uploadByType(req.file, type, id);
    const url = FileService.getFileUrl(BUCKETS[type.toUpperCase()], fileName);

    if (updateDbFunc) {
      const updatedRecord = await updateDbFunc(id, url);
      if (!updatedRecord)
        return res
          .status(404)
          .json({ message: "Record not found or not updated" });
      return res
        .status(200)
        .json({ url, fileName, imageUrl: url, user: updatedRecord });
    }

    return res.status(200).json({ url, fileName, imageUrl: url });
  } catch (error) {
    console.error(`Error updating file for ${type}:`, error);
    res.status(500).json({ message: `Error updating file for ${type}` });
  }
};

// ตัวอย่างฟังก์ชันอัปเดต DB สำหรับ avatar (user)
const updateUserAvatar = async (userId, url) => {
  const [updatedUser] = await db
    .update(users)
    .set({ avatar: url })
    .where(eq(users.id, userId))
    .returning();
  return updatedUser;
};

export const uploadController = {
  // Avatar (Profile Image)
  uploadAvatar: (req, res) =>
    handleUpload(req, res, "profiles", "userId", updateUserAvatar),
  updateAvatar: (req, res) =>
    handleUpdate(req, res, "profiles", "userId", updateUserAvatar),
  deleteAvatar: (req, res) => handleDelete(req, res, "profiles"),

  // Product Image
  uploadProductImage: (req, res) =>
    handleUpload(req, res, "products", "productId"),
  updateProductImage: (req, res) =>
    handleUpdate(req, res, "products", "productId"),
  deleteProductImage: (req, res) => handleDelete(req, res, "products"),

  // Brand Logo
  uploadBrandLogo: (req, res) => handleUpload(req, res, "brands", "brandId"),
  updateBrandLogo: (req, res) => handleUpdate(req, res, "brands", "brandId"),
  deleteBrandLogo: (req, res) => handleDelete(req, res, "brands"),

  // Store Image
  uploadStoreImage: (req, res) => handleUpload(req, res, "stores", "storeId"),
  updateStoreImage: (req, res) => handleUpdate(req, res, "stores", "storeId"),
  deleteStoreImage: (req, res) => handleDelete(req, res, "stores"),

  // Review Image
  uploadReviewImage: (req, res) =>
    handleUpload(req, res, "reviews", "reviewId"),
  updateReviewImage: (req, res) =>
    handleUpdate(req, res, "reviews", "reviewId"),
  deleteReviewImage: (req, res) => handleDelete(req, res, "reviews"),
};
