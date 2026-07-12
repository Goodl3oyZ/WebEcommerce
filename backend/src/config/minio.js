import { Client } from "minio";
import { ENV, MINIO_CONFIG } from "./loadENV.js";

const minioClient = new Client({
  endPoint: MINIO_CONFIG.HOST || "localhost",
  port: MINIO_CONFIG.API_PORT,
  useSSL: MINIO_CONFIG.USE_SSL,
  accessKey: MINIO_CONFIG.ROOT_USER,
  secretKey: MINIO_CONFIG.ROOT_PASSWORD,
});

export const BUCKETS = {
  PRODUCTS: "products",
  PROFILES: "profiles",
  STORES: "stores",
  REVIEWS: "reviews",
};

// Ensure all required buckets exist
export const initializeBuckets = async () => {
  try {
    await minioClient.listBuckets();
    console.log("Successfully connected to MinIO");

    for (const bucket of Object.values(BUCKETS)) {
      try {
        const exists = await minioClient.bucketExists(bucket);
        if (!exists) {
          await minioClient.makeBucket(bucket);
          console.log(`Created bucket: ${bucket}`);
        } else {
          console.log(`Bucket already exists: ${bucket}`);
        }
      } catch (bucketError) {
        console.error(`Error handling bucket ${bucket}:`, bucketError);
        throw bucketError;
      }
    }
    console.log("All buckets initialized successfully");
  } catch (error) {
    console.error("Error initializing buckets:", error);
    throw error;
  }
};

export const uploadFile = async (bucket, fileName, fileBuffer, mimeType) => {
  try {
    await minioClient.putObject(bucket, fileName, fileBuffer, {
      "Content-Type": mimeType,
    });
    const url = await minioClient.presignedGetObject(bucket, fileName);
    return url;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const deleteFile = async (bucket, fileName) => {
  try {
    await minioClient.removeObject(bucket, fileName);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

export const getFileUrl = (bucket, fileName) => {
  // If fileName is already a full URL, return it directly to avoid double-prefix
  if (
    typeof fileName === "string" &&
    (fileName.startsWith("http://") || fileName.startsWith("https://"))
  ) {
    return fileName;
  }
  // สร้าง public URL ตรงๆ (ไม่ใช้ presigned)
  const protocol = MINIO_CONFIG.USE_SSL ? "https" : "http";
  let host;
  if (ENV.SERVER.NODE_ENV === "production") {
    host = MINIO_CONFIG.HOST;
  } else {
    host = "localhost";
  }
  const port = MINIO_CONFIG.API_PORT || 9000;
  return `${protocol}://${host}:${port}/${bucket}/${fileName}`;
};


export default minioClient;
