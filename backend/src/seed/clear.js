// clear.js
import { db } from "../config/db.js";
import { sql } from "drizzle-orm";

async function clearTables() {
  try {
    console.log("Starting to clear tables...");

    // Use transaction to ensure all operations succeed or fail together
    await db.transaction(async (tx) => {
      // Get list of existing tables
      const result = await tx.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const existingTables = result.rows.map((row) => row.table_name);
      console.log("Existing tables:", existingTables);

      // Build TRUNCATE statement only for existing tables
      const tablesToTruncate = existingTables.join(", ");

      if (tablesToTruncate) {
        console.log("Force deleting all data from existing tables...");
        await tx.execute(
          sql`TRUNCATE TABLE ${sql.raw(tablesToTruncate)} CASCADE;`
        );
        console.log("All tables cleared successfully!");
      } else {
        console.log("No tables found to clear.");
      }
    });
  } catch (error) {
    console.error("Error clearing tables:", error);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.detail) {
      console.error("Error detail:", error.detail);
    }
    throw error;
  }
}

// Run the clear function
clearTables()
  .then(() => {
    console.log("Clearing completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Clearing failed:", error);
    process.exit(1);
  });
