import { randomUUID } from "node:crypto";

/** Insert an order directly for `userId` with the given totals/status. */
export async function createOrder(userId, overrides = {}) {
  const { db } = await import("../../config/db.js");
  const { orders } = await import("../../models/schema.js");
  const total = overrides.total ?? "1000.00";
  const [order] = await db
    .insert(orders)
    .values({
      userId,
      orderNumber: `TEST-${randomUUID().slice(0, 12)}`,
      subtotal: total,
      shippingCost: "0.00",
      tax: "0.00",
      total,
      ...overrides,
    })
    .returning();
  return order;
}
