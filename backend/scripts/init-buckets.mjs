/**
 * Create the object-storage buckets the app needs (idempotent).
 * Works against any S3-compatible server (SeaweedFS in production).
 */
import { initializeBuckets } from "../src/config/minio.js";

const MAX_ATTEMPTS = 30;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    await initializeBuckets();
    process.exit(0);
  } catch (error) {
    if (attempt === MAX_ATTEMPTS) {
      console.error("Giving up on bucket initialization:", error.message);
      process.exit(1);
    }
    console.log(`Storage not ready (${attempt}/${MAX_ATTEMPTS}), retrying in 2s...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
