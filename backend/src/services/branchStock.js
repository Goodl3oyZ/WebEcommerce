import { db } from "../config/db.js";
import { stores, storeInventory } from "../models/schema.js";
import { and, eq, exists, inArray, sql } from "drizzle-orm";

/**
 * variantId -> the most units any single open branch holds. A pickup order is
 * filled by one branch, so this (not the sum) is what can be sold for pickup.
 */
export async function branchStockByVariant(variantIds) {
  const ids = [...new Set(variantIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ variantId: storeInventory.variantId, quantity: sql`max(${storeInventory.quantity})::int` })
    .from(storeInventory)
    .innerJoin(stores, eq(stores.id, storeInventory.storeId))
    .where(and(inArray(storeInventory.variantId, ids), eq(stores.isActive, true)))
    .groupBy(storeInventory.variantId);
  return new Map(rows.map((r) => [r.variantId, r.quantity]));
}

/** Some open branch holds at least one unit of a variant of this product. */
export const heldAtABranch = (productIdColumn) =>
  exists(
    db
      .select({ one: sql`1` })
      .from(storeInventory)
      .innerJoin(stores, eq(stores.id, storeInventory.storeId))
      .where(and(eq(storeInventory.productId, productIdColumn), eq(stores.isActive, true), sql`${storeInventory.quantity} > 0`))
  );
