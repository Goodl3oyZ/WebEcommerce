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
  inventoryMovements,
  storeInventory,
  storePickups,
} from "../models/schema.js";
import { assertOrderTransition } from "../utils/orderStatus.js";
import { ApiError } from "../utils/ApiError.js";
import { notifyOrderStatus } from "./orderNotifications.js";

/** Audit trail for stock changes made by orders. */
export async function recordMovements(tx, rows) {
  if (rows.length) await tx.insert(inventoryMovements).values(rows);
}

/**
 * Put an order's reserved stock back where it came from: the pickup branch's
 * shelf for a pickup order, the online stock otherwise.
 */
export async function releaseOrderStock(tx, orderId) {
  const items = await tx
    .select({ productId: orderItems.productId, variantId: orderItems.variantId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const pickup = await tx.query.storePickups.findFirst({ where: eq(storePickups.orderId, orderId) });
  const storeId = pickup?.storeId ?? null;
  // Same lock order as checkout (by variant id) to avoid deadlocks.
  const lines = items.filter((i) => i.variantId).sort((a, b) => a.variantId.localeCompare(b.variantId));
  for (const item of lines) {
    if (storeId) {
      const [restocked] = await tx
        .update(storeInventory)
        .set({ quantity: sql`${storeInventory.quantity} + ${item.quantity}`, updatedAt: new Date() })
        .where(and(eq(storeInventory.storeId, storeId), eq(storeInventory.variantId, item.variantId)))
        .returning({ id: storeInventory.id });
      // The branch stopped tracking the variant meanwhile: track it again.
      if (!restocked) {
        await tx
          .insert(storeInventory)
          .values({ storeId, productId: item.productId, variantId: item.variantId, quantity: item.quantity });
      }
    } else {
      await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId));
    }
  }
  await recordMovements(
    tx,
    lines.map((i) => ({ variantId: i.variantId, orderId, storeId, change: i.quantity, reason: "order_release" }))
  );
}

/** Move an order to a new status, recording history. Validates the transition. */
export async function setOrderStatus(tx, order, status, { comment, actorId, extra = {} } = {}) {
  assertOrderTransition(order.status, status, order.fulfillment);
  // Compare-and-set: only if nobody changed the status since `order` was read.
  // Concurrent cancel / expire / payment therefore cannot both win.
  const [updated] = await tx
    .update(orders)
    .set({ status, ...extra, updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning();
  if (!updated) {
    throw new ApiError(409, "The order was changed by another action. Please refresh.", null, "ORDER_STATE_CHANGED");
  }
  if (order.status !== status) {
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status,
      comment: comment || `Status updated to ${status}`,
      createdBy: actorId ?? null,
    });
    await notifyOrderStatus(tx, order.status, updated, actorId);
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
