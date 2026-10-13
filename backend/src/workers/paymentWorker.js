/**
 * Payment maintenance, run every minute by the API process (index.js).
 *
 * 1. Unpaid orders past their payment deadline: ask Omise first (the charge
 *    may have succeeded without us hearing about it); if still unpaid, cancel
 *    the order, which releases its stock exactly once.
 * 2. Orders whose charge outcome is unknown (the create call timed out):
 *    find the charge by its orderId metadata and apply the real result.
 * 3. Successful charges that could not be applied (order already cancelled,
 *    or paid twice): refund them.
 * 4. Orders shipped AUTO_DELIVER_DAYS ago (default 7) that the customer never
 *    confirmed: mark them delivered, so they can be reviewed and are closed.
 *
 * Every step is idempotent and claims its work with compare-and-set updates,
 * so a crash mid-run or two API instances running it at once is safe: the
 * next run simply continues.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, orderStatusHistory, paymentTransactions, shipments } from "../models/schema.js";
import { omiseService } from "../services/omiseService.js";
import { paymentService } from "../services/paymentService.js";
import { cancelOrder, setOrderStatus } from "../services/orderLifecycle.js";
import { PAYMENT_DEADLINE_MINUTES } from "../services/orderService.js";
import { toSatang } from "../utils/money.js";

const BATCH = 50;
export const AUTO_DELIVER_DAYS = Number(process.env.AUTO_DELIVER_DAYS) || 7;
const MAX_REFUND_ATTEMPTS = 5;
// Unknown outcomes are not expired while Omise cannot be reached, unless
// they are this far past the deadline (then the refund path covers it).
const UNKNOWN_GRACE_MS = 24 * 60 * 60 * 1000;

const deadlineOf = sql`coalesce(${orders.paymentDeadline}, ${orders.createdAt} + make_interval(mins => ${PAYMENT_DEADLINE_MINUTES}))`;

const log = (msg, extra) => console.log(`[payment-worker] ${msg}`, extra ?? "");

async function latestPayment(orderId) {
  return db.query.paymentTransactions.findFirst({
    where: eq(paymentTransactions.orderId, orderId),
    orderBy: [sql`${paymentTransactions.timestamp} desc`],
  });
}

/** Apply Omise's view of the order's charge. Returns true when the order is now paid. */
async function reconcile(order) {
  const payment = await latestPayment(order.id);
  if (!payment) return false;
  let charge = null;
  if (payment.transactionId) charge = await omiseService.getCharge(payment.transactionId);
  else if (payment.status === "processing") charge = await omiseService.findChargeForOrder(order.id, order.createdAt);
  if (!charge) return false;
  await db.transaction((tx) => paymentService.applyChargeResult(payment.id, charge, tx));
  const fresh = await db.query.orders.findFirst({ where: eq(orders.id, order.id) });
  return fresh?.paymentStatus === "completed";
}

async function expireOverdue(stats) {
  // Deadlines and the comparison both use the database clock (timestamps have
  // no time zone, so mixing in the API host's clock would skew them).
  const due = await db
    .select({ id: orders.id, overdueSeconds: sql`extract(epoch from (now() - ${deadlineOf}))::int` })
    .from(orders)
    .where(and(eq(orders.status, "pending"), sql`${deadlineOf} < now()`))
    .orderBy(asc(orders.createdAt))
    .limit(BATCH);
  for (const { id, overdueSeconds } of due) {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!order || order.status !== "pending") continue;
    try {
      let paid = false;
      try {
        paid = await reconcile(order);
      } catch (error) {
        const unknown = order.paymentStatus === "processing";
        if (unknown && overdueSeconds * 1000 < UNKNOWN_GRACE_MS) {
          log(`order ${order.id}: cannot reach Omise to confirm an unknown charge, retrying later`, error.message);
          stats.errors += 1;
          continue;
        }
        log(`order ${order.id}: reconciliation failed, expiring anyway`, error.message);
      }
      if (paid) {
        stats.reconciled += 1;
        continue;
      }
      const expired = await db.transaction(async (tx) => {
        const current = await tx.query.orders.findFirst({ where: eq(orders.id, order.id) });
        if (current?.status !== "pending" || current.paymentStatus === "completed") return false;
        await tx
          .update(orders)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(and(eq(orders.id, order.id), sql`${orders.paymentStatus} <> 'completed'`));
        try {
          await cancelOrder(tx, current, { reason: "Payment deadline passed" });
          return true;
        } catch (error) {
          if (error.code === "ORDER_STATE_CHANGED") return false; // paid or cancelled meanwhile
          throw error;
        }
      });
      if (expired) stats.expired += 1;
    } catch (error) {
      stats.errors += 1;
      log(`order ${order.id}: expiry failed`, error.message);
    }
  }
}

async function reconcileUnknown(stats) {
  // Unknown outcomes before their deadline: confirm early so customers are not kept waiting.
  const unknown = await db.query.orders.findMany({
    where: and(eq(orders.status, "pending"), eq(orders.paymentStatus, "processing")),
    limit: BATCH,
  });
  for (const order of unknown) {
    try {
      if (await reconcile(order)) stats.reconciled += 1;
    } catch (error) {
      stats.errors += 1;
      log(`order ${order.id}: could not confirm the charge yet`, error.message);
    }
  }
}

async function refundUnapplied(stats) {
  const due = await db
    .select()
    .from(paymentTransactions)
    .where(sql`(${paymentTransactions.paymentDetails}->>'refundDue') = 'true'`)
    .limit(BATCH);
  for (const payment of due) {
    // Claim it: only one worker may send this refund.
    const [claimed] = await db
      .update(paymentTransactions)
      .set({
        paymentDetails: sql`${paymentTransactions.paymentDetails} || '{"refundDue": false, "refundInProgress": true}'::jsonb`,
        updatedAt: new Date(),
      })
      .where(and(eq(paymentTransactions.id, payment.id), sql`(${paymentTransactions.paymentDetails}->>'refundDue') = 'true'`))
      .returning();
    if (!claimed) continue;
    const details = claimed.paymentDetails ?? {};
    try {
      const refund = await omiseService.createRefund(claimed.transactionId, toSatang(claimed.amount));
      await db.transaction(async (tx) => {
        await tx
          .update(paymentTransactions)
          .set({
            status: "refunded",
            paymentDetails: { ...details, refundInProgress: false, refundedLate: true, refundId: refund?.id ?? null },
            updatedAt: new Date(),
          })
          .where(eq(paymentTransactions.id, claimed.id));
        const order = await tx.query.orders.findFirst({ where: eq(orders.id, claimed.orderId) });
        if (order?.status === "cancelled") {
          await tx.update(orders).set({ paymentStatus: "refunded", updatedAt: new Date() }).where(eq(orders.id, order.id));
        }
        if (order) {
          await tx.insert(orderStatusHistory).values({
            orderId: order.id,
            status: order.status,
            comment: `Refunded ${claimed.amount} THB automatically (${details.refundReason ?? "payment not applied"}), charge ${claimed.transactionId}`,
          });
        }
      });
      stats.refunded += 1;
      log(`refunded charge ${claimed.transactionId} (${details.refundReason})`);
    } catch (error) {
      const attempts = (details.refundAttempts ?? 0) + 1;
      const giveUp = attempts >= MAX_REFUND_ATTEMPTS;
      await db
        .update(paymentTransactions)
        .set({
          paymentDetails: {
            ...details,
            refundInProgress: false,
            refundDue: !giveUp,
            refundFailed: giveUp,
            refundAttempts: attempts,
            refundError: String(error.message).slice(0, 300),
          },
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, claimed.id));
      stats.errors += 1;
      log(`refund of ${claimed.transactionId} failed (attempt ${attempts}${giveUp ? ", needs an admin" : ""})`, error.message);
    }
  }
}

/** Close shipped orders nobody confirmed after AUTO_DELIVER_DAYS (database clock). */
async function autoCompleteDeliveries(stats) {
  const due = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.status, "shipped"),
        sql`coalesce(
          (select max(h.created_at) from order_status_history h where h.order_id = ${orders.id} and h.status = 'shipped'),
          ${orders.updatedAt}
        ) <= now() - make_interval(days => ${AUTO_DELIVER_DAYS})`
      )
    )
    .orderBy(asc(orders.updatedAt))
    .limit(BATCH);

  for (const { id } of due) {
    try {
      await db.transaction(async (tx) => {
        const order = await tx.query.orders.findFirst({ where: eq(orders.id, id) });
        if (order?.status !== "shipped") return;
        await setOrderStatus(tx, order, "delivered", {
          comment: `Delivered automatically ${AUTO_DELIVER_DAYS} days after shipping`,
          extra: { shippingStatus: "delivered" },
        });
        await tx
          .update(shipments)
          .set({ status: "delivered", actualDelivery: new Date(), updatedAt: new Date() })
          .where(eq(shipments.orderId, id));
      });
      stats.delivered += 1;
    } catch (error) {
      if (error.code === "ORDER_STATE_CHANGED") continue; // the customer confirmed meanwhile
      stats.errors += 1;
      log(`auto-delivery of ${id} failed`, error.message);
    }
  }
}

/** One maintenance pass. Safe to call concurrently and repeatedly. */
export async function runPaymentMaintenance() {
  const stats = { expired: 0, reconciled: 0, refunded: 0, delivered: 0, errors: 0 };
  await reconcileUnknown(stats);
  await expireOverdue(stats);
  await refundUnapplied(stats);
  await autoCompleteDeliveries(stats);
  if (stats.expired || stats.reconciled || stats.refunded || stats.delivered || stats.errors) log("pass", stats);
  return stats;
}

/** Run every `intervalMs` (default 60 s) without overlapping passes. */
export function startPaymentWorker(intervalMs = Number(process.env.PAYMENT_WORKER_INTERVAL_MS) || 60_000) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await runPaymentMaintenance();
    } catch (error) {
      log("pass failed", error.message);
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
