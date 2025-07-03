import minioClient, { BUCKETS } from "../config/minio.js";
import { v4 as uuidv4 } from "uuid";

export class FileService {
  // Upload file to MinIO
  static async uploadFile(file, bucket, folder = "") {
    try {
      const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
      await minioClient.putObject(bucket, fileName, file.buffer, {
        "Content-Type": file.mimetype,
      });
      return fileName;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  // Get file URL
  static async getFileUrl(bucket, fileName) {
    try {
      return await minioClient.presignedGetObject(
        bucket,
        fileName,
        24 * 60 * 60
      ); // URL valid for 24 hours
    } catch (error) {
      console.error("Error getting file URL:", error);
      throw error;
    }
  }

  // Delete file
  static async deleteFile(bucket, fileName) {
    try {
      await minioClient.removeObject(bucket, fileName);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  // Upload profile image
  static async uploadProfileImage(file, userId) {
    return this.uploadFile(file, BUCKETS.PROFILES, `user-${userId}`);
  }

  // Upload product image
  static async uploadProductImage(file, productId) {
    return this.uploadFile(file, BUCKETS.PRODUCTS, `product-${productId}`);
  }

  // Upload store image
  static async uploadStoreImage(file, storeId) {
    return this.uploadFile(file, BUCKETS.STORES, `store-${storeId}`);
  }

  // Upload review image
  static async uploadReviewImage(file, reviewId) {
    return this.uploadFile(file, BUCKETS.REVIEWS, `review-${reviewId}`);
  }
}
