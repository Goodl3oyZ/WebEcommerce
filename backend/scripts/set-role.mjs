/**
 * Give an existing account a role from the command line, e.g. the first
 * super_admin (only a super_admin can grant admin roles in the app):
 *
 *   npm run user:role -- owner@example.com super_admin
 *   docker exec backend npm run user:role -- owner@example.com super_admin
 *
 * Roles add up (the highest one counts). The user signs in again to get it.
 */
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const ROLES = ["user", "moderator", "admin", "super_admin"];
const [email, role] = process.argv.slice(2);
if (!email || !ROLES.includes(role)) {
  console.error(`Usage: npm run user:role -- <email> <${ROLES.join("|")}>`);
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query("select id from users where lower(email) = lower($1)", [email.trim()]);
  if (!rows.length) {
    console.error(`No account with email ${email}`);
    process.exitCode = 1;
  } else {
    const userId = rows[0].id;
    const { rowCount } = await pool.query(
      // Explicit casts: $2 is used both as a value and in a comparison, and
      // Postgres refuses to infer two different types for it.
      "insert into user_roles (user_id, role) select $1::uuid, $2::varchar where not exists (select 1 from user_roles where user_id = $1::uuid and role = $2::varchar)",
      [userId, role]
    );
    console.log(rowCount ? `${email} is now ${role}. Sign in again to use it.` : `${email} already has ${role}.`);
  }
} finally {
  await pool.end();
}
