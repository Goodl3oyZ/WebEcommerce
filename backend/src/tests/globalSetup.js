import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { applyTestEnv, testEnv } from "./testEnv.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const run = (cmd) => execSync(cmd, { cwd: backendRoot, stdio: "inherit", env: process.env });

export default async function globalSetup() {
  applyTestEnv();

  // CI can provide its own Postgres/Redis/S3 and set TEST_SKIP_INFRA=1.
  if (process.env.TEST_SKIP_INFRA !== "1") {
    run("docker compose -f docker-compose.test.yml up -d --wait");
  }

  // Fresh schema on every run. Postgres restarts once after first-time init,
  // so retry the connection briefly.
  let client;
  for (let attempt = 1; ; attempt++) {
    client = new pg.Client({ connectionString: testEnv.DATABASE_URL });
    try {
      await client.connect();
      await client.query("SELECT 1");
      break;
    } catch (error) {
      await client.end().catch(() => {});
      if (attempt >= 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.end();
  run("npx drizzle-kit push --force");
  run("node scripts/init-buckets.mjs");

  // Clear per-worker route-hit files from the previous run.
  fs.rmSync(path.join(backendRoot, "coverage", "route-hits"), { recursive: true, force: true });
}
