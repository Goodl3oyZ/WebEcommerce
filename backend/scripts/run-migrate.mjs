/**
 * Apply SQL files from ./migrations (after `npm run generate`).
 * Primary workflow uses schema.js + `npm run migrate` (drizzle-kit push).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const migrationsFolder = path.resolve("./migrations");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");

if (!fs.existsSync(journalPath)) {
  console.log(
    "No migrations/meta/_journal.json found; skip SQL migrator (use npm run migrate / drizzle-kit push).",
  );
  process.exit(0);
}

async function maybeBaselineExistingSchema(pool) {

  const { rows: existingTables } = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'users'
     LIMIT 1`,
  );
  if (existingTables.length === 0) {
    return;
  }

  await pool.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const { rows: applied } = await pool.query(
    "SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations",
  );
  if (applied[0].count > 0) {
    return;
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  console.log(
    "Existing schema detected with empty migration journal; recording baseline ...",
  );

  for (const entry of journal.entries) {
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    const query = fs.readFileSync(sqlPath, "utf8");
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    await pool.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when],
    );
  }
}

const pool = new Pool({ connectionString, ssl: false });
const db = drizzle(pool);

try {
  await maybeBaselineExistingSchema(pool);
  console.log("Applying migrations from ./migrations ...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrations applied successfully.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  await pool.end();
}
