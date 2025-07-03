// drizzle/db.js
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "./loadENV.js";
import * as schema from "../models/schema.js";

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: ENV.DB.URL,
  ssl: false,
});

// Create a Drizzle ORM instance with schema and relations
export const db = drizzle(pool, {
  schema: {
    ...schema,
    relations: schema.relations,
  },
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
