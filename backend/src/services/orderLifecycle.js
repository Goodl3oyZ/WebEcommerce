/**
 * Order state changes shared by the order and payment services (kept here to
 * avoid a circular import between them). Every function takes the transaction.
 */
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  orders,
  orderItems,
  orderStatusHistory,
  productVariants,
  paymentTransactions,
} from "../models/schema.js";
import { assertOrderTransition } from "../utils/orderStatus.js";

/** Put an order's reserved stock back into inventory. */
export async function releaseOrderStock(tx, orderId) {
  const items = await tx
    .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (!item.variantId) continue;
    await tx
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
      .where(eq(productVariants.id, item.variantId));
  }
}

/** Move an order to a new status, recording history. Validates the transition. */
export async function setOrderStatus(tx, order, status, { comment, actorId, extra = {} } = {}) {
  assertOrderTransition(order.status, status);
  const [updated] = await tx
    .update(orders)
    .set({ status, ...extra, updatedAt: new Date() })
    .where(eq(orders.id, order.id))
    .returning();
  if (order.status !== status) {
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status,
      comment: comment || `Status updated to ${status}`,
      createdBy: actorId ?? null,
    });
  }
  return updated;
}

/** Cancel an order: release stock and void any payment still waiting. */
export async function cancelOrder(tx, order, { reason, actorId } = {}) {
  const updated = await setOrderStatus(tx, order, "cancelled", {
    comment: reason || "Order cancelled",
    actorId,
    extra: { cancellationReason: reason ?? null, cancelledAt: new Date() },
  });
  await releaseOrderStock(tx, order.id);
  await tx
    .update(paymentTransactions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(paymentTransactions.orderId, order.id),
        inArray(paymentTransactions.status, ["pending", "processing"])
      )
    );
  return updated;
}
