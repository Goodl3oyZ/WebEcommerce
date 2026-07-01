// drizzle/db.js
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "./loadENV.js";
import * as schema from "../models/schema.js";

const pool = new Pool({
  connectionString: ENV.DB.URL,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    ENV.SERVER.NODE_ENV === "production"
      ? {
          rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
        }
      : false,
});

export const db = drizzle(pool, {
  schema: { ...schema, ...schema.allRelations },
});

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

async function testConnection(retries = 0) {
  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful");
    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    if (retries < MAX_RETRIES) {
      console.log(
        `Retrying in ${RETRY_DELAY / 1000} seconds... (${
          retries + 1
        }/${MAX_RETRIES})`
      );
      setTimeout(() => testConnection(retries + 1), RETRY_DELAY);
    } else {
      console.error("❌ Max retries reached. Could not connect to database.");
      process.exit(1);
    }
  }
}

testConnection();

export default db;
