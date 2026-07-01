import minioClient, { BUCKETS, getFileUrl } from "../config/minio.js";
import { v4 as uuidv4 } from "uuid";

export class FileService {
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

  static getFileUrl(bucket, fileName) {
    // เรียกใช้ getFileUrl จาก minio.js (public URL)
    return getFileUrl(bucket, fileName);
  }

  static async deleteFile(bucket, fileName) {
    try {
      await minioClient.removeObject(bucket, fileName);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  // ฟังก์ชันนี้ใช้แทนฟังก์ชัน upload เฉพาะแบบต่างๆ
  // โดยส่ง bucket และ folder เป็น parameter มา
  static async uploadByType(file, type, id) {
    const bucket = BUCKETS[type.toUpperCase()];
    if (!bucket) throw new Error(`Unknown bucket type: ${type}`);
    const folder = `${type}-${id}`;
    return this.uploadFile(file, bucket, folder);
  }

  static async uploadProfileImage(file, userId) {
    return this.uploadByType(file, "profiles", userId);
  }
}
