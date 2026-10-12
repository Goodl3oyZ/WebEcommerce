import minioClient, { BUCKETS, getFileUrl, toStoredKey } from "../config/minio.js";
import { v4 as uuidv4 } from "uuid";
import { ApiError } from "../utils/ApiError.js";

/**
 * Raster image types we accept. SVG is never accepted: uploads are served from
 * the site's own origin (/media), where an SVG could run script.
 */
export const SAFE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/** Check the file's real content, not just the type the client declared. */
function matchesSignature(buffer, mimetype) {
  const b = buffer ?? Buffer.alloc(0);
  switch (mimetype) {
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/gif":
      return b.subarray(0, 6).toString("ascii").startsWith("GIF8");
    case "image/webp":
      return b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP";
    default:
      return false;
  }
}

export class FileService {
  static async uploadFile(file, bucket, folder = "") {
    if (!SAFE_IMAGE_TYPES.includes(file.mimetype) || !matchesSignature(file.buffer, file.mimetype)) {
      throw ApiError.badRequest("File must be a valid JPEG, PNG, GIF or WebP image");
    }
    // Keep only safe characters: object keys end up in public URLs.
    const safeName = String(file.originalname || "file")
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .slice(-100);
    const fileName = `${folder}/${uuidv4()}-${safeName}`;
    await minioClient.putObject(bucket, fileName, file.buffer, file.buffer.length, {
      "Content-Type": file.mimetype,
    });
    return fileName;
  }

  static getFileUrl(bucket, fileName) {
    return getFileUrl(bucket, fileName);
  }

  static async deleteFile(bucket, fileName) {
    await minioClient.removeObject(bucket, fileName);
  }

  static bucketFor(type) {
    const bucket = BUCKETS[type.toUpperCase()];
    if (!bucket) throw new Error(`Unknown bucket type: ${type}`);
    return bucket;
  }

  /** Files of one owner/entity live under "<type>-<id>/". */
  static folderFor(type, id) {
    return `${type}-${id}`;
  }

  static async uploadByType(file, type, id) {
    return this.uploadFile(file, this.bucketFor(type), this.folderFor(type, id));
  }

  /** Accepts a key or one of our public URLs and returns the key. */
  static toKey(type, value) {
    return toStoredKey(this.bucketFor(type), value);
  }

  static async uploadProfileImage(file, userId) {
    return this.uploadByType(file, "profiles", userId);
  }
}
