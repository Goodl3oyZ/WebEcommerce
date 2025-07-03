// drizzle.config.js
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

console.log(process.env.DATABASE_URL);

export default defineConfig({
  schema: "./src/models/schema.js",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "",
  },
});
