import { db } from "../config/db.js";
import {
  paymentTransactions,
  orders,
  paymentMethods,
  refunds,
  storePickups,
} from "../models/schema.js";
import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { writeAuditLog } from "./auditService.js";
import { omiseService } from "./omiseService.js";
import { toSatang, fromSatang } from "../utils/money.js";
import { paginationMeta } from "../utils/pagination.js";
import { setOrderStatus, cancelOrder } from "./orderLifecycle.js";
import { loyaltyService } from "./loyaltyService.js";

/** Omise charge status -> our payment status. */
export function mapChargeStatus(omiseStatus) {
  switch (omiseStatus) {
    case "successful":
      return "completed";
    case "failed":
    case "reversed":
      return "failed";
    case "expired":
      return "expired";
    default:
      return "pending";
  }
}

const UNPAYABLE_ORDER = ["completed", "refunded", "partially_refunded"];

/** What we keep from a charge: enough to support refunds and show a QR, nothing sensitive. */
const chargeSummary = (charge) => ({
  chargeId: charge.id,
  status: charge.status,
  failureCode: charge.failure_code ?? null,
  failureMessage: charge.failure_message ?? null,
  sourceType: charge.source?.type ?? null,
  qrCodeUrl: charge.source?.scannable_code?.image?.download_uri ?? null,
  cardLast4: charge.card?.last_digits ?? null,
});

function dateRange(column, startDate, endDate) {
  const conditions = [];
  if (startDate) conditions.push(gte(column, new Date(startDate)));
  if (endDate) conditions.push(lte(column, new Date(endDate)));
  return conditions;
}

export const paymentService = {
  /**
   * Create a payment record for an order the user owns. The amount is always
   * the order total. A previous attempt still pending is superseded, so a
   * customer can retry (e.g. a new PromptPay QR).
   */
  async createPayment(userId, orderId, paymentMethod, paymentDetails = null, txOrDb = db) {
    const order = await txOrDb.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    });
    if (!order) {
      throw ApiError.notFound("Order not found");
    }
    if (UNPAYABLE_ORDER.includes(order.paymentStatus)) {
      throw new ApiError("Order has already been paid", 409);
    }
    if (order.status === "cancelled") {
      throw new ApiError("Order has been cancelled", 409);
    }

    await txOrDb
      .update(paymentTransactions)
      .set({ status: "superseded", updatedAt: new Date() })
      .where(
        and(eq(paymentTransactions.orderId, orderId), eq(paymentTransactions.status, "pending"))
      );

    const method = await txOrDb.query.paymentMethods.findFirst({
      where: eq(paymentMethods.code, paymentMethod),
    });
    const [payment] = await txOrDb
      .insert(paymentTransactions)
      .values({
        orderId,
        userId,
        amount: order.total,
        currency: "THB",
        paymentMethodId: method?.id ?? order.paymentMethodId ?? null,
        paymentDetails: { method: paymentMethod, ...(paymentDetails ?? {}) },
        status: "pending",
        timestamp: new Date(),
      })
      .returning();
    return payment;
  },

  async updatePayment(paymentId, updateData, txOrDb = db) {
    const allowedFields = ["transactionId", "status", "paymentDetails"];
    const data = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
    );
    const [updated] = await txOrDb
      .update(paymentTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentTransactions.id, paymentId))
      .returning();
    return updated;
  },

  /**
   * Record an Omise charge result on the payment and its order. Idempotent:
   * webhooks, polling and the checkout response can all report the same charge.
   */
  async applyChargeResult(paymentId, charge, txOrDb = db) {
    const status = mapChargeStatus(charge.status);
    const previous = await txOrDb.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.id, paymentId),
      columns: { paymentDetails: true },
    });
    // Merge: a later, sparser charge response must not erase e.g. the QR URL.
    const summary = Object.fromEntries(
      Object.entries(chargeSummary(charge)).filter(([, value]) => value != null)
    );
    const payment = await this.updatePayment(
      paymentId,
      {
        transactionId: charge.id,
        status,
        paymentDetails: { ...(previous?.paymentDetails ?? {}), ...summary },
      },
      txOrDb
    );
    if (!payment?.orderId) return payment;

    const order = await txOrDb.query.orders.findFirst({ where: eq(orders.id, payment.orderId) });
    if (!order) return payment;

    if (status === "completed" && !UNPAYABLE_ORDER.includes(order.paymentStatus)) {
      await txOrDb
        .update(orders)
        .set({ paymentStatus: "completed", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      if (order.status === "pending") {
        await setOrderStatus(txOrDb, order, "paid", { comment: `Payment ${charge.id} received` });
      }
      await loyaltyService.creditForOrder(txOrDb, order);
    } else if (status === "failed" && order.paymentStatus === "pending") {
      // Card declined: the order stays open so the customer can try again.
      await txOrDb
        .update(orders)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
    } else if (status === "expired" && order.status === "pending" && order.paymentStatus !== "completed") {
      // PromptPay QR expired unpaid: give the reserved stock back.
      await txOrDb
        .update(orders)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      await cancelOrder(txOrDb, order, { reason: "Payment expired" });
    }
    return payment;
  },

  /** Charge the payment through Omise and apply the result. */
  async chargePayment(payment, { method, cardToken, description }, txOrDb = db) {
    const amount = toSatang(payment.amount);
    const metadata = { orderId: payment.orderId, paymentId: payment.id };
    let charge;
    if (method === "credit_card" || method === "card") {
      if (!cardToken) throw ApiError.badRequest("Missing card token");
      charge = await omiseService.createCharge({ amount, currency: "thb", card: cardToken, description, metadata });
    } else if (method === "promptpay") {
      const source = await omiseService.createSource({ type: "promptpay", amount, currency: "thb" });
      if (!source?.id) throw new ApiError("Omise source creation failed", 502);
      charge = await omiseService.createCharge({ amount, currency: "thb", source: source.id, description, metadata });
    } else {
      return { payment, charge: null }; // e.g. cash on delivery: nothing to charge now
    }
    const updated = await this.applyChargeResult(payment.id, charge, txOrDb);
    return { payment: updated, charge };
  },

  async getTransactionById(paymentId) {
    const payment = await db.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.id, paymentId),
    });
    if (!payment) {
      throw ApiError.notFound("ไม่พบรายการชำระเงิน");
    }
    return payment;
  },

  async getPaymentById(userId, paymentId) {
    const payment = await db.query.paymentTransactions.findFirst({
      where: and(eq(paymentTransactions.id, paymentId), eq(paymentTransactions.userId, userId)),
    });
    if (!payment) {
      throw ApiError.notFound("ไม่พบรายการชำระเงิน");
    }
    return payment;
  },

  /** Re-check a pending payment with Omise (for when a webhook was missed). */
  async refreshPaymentStatus(userId, paymentId) {
    const payment = userId
      ? await this.getPaymentById(userId, paymentId)
      : await this.getTransactionById(paymentId);
    if (payment.status !== "pending" || !payment.transactionId) {
      return payment;
    }
    const charge = await omiseService.getCharge(payment.transactionId);
    return this.applyChargeResult(payment.id, charge);
  },

  async getPaymentStatus(userId, paymentId) {
    const payment = await this.refreshPaymentStatus(userId, paymentId);
    return {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      transactionId: payment.transactionId,
      qrCodeUrl: payment.paymentDetails?.qrCodeUrl ?? null,
      updatedAt: payment.updatedAt,
    };
  },

  async getOrderPayments(userId, orderId, { isAdmin = false } = {}) {
    const order = await db.query.orders.findFirst({
      where: isAdmin ? eq(orders.id, orderId) : and(eq(orders.id, orderId), eq(orders.userId, userId)),
    });
    if (!order) {
      throw ApiError.notFound("Order not found");
    }
    return db.query.paymentTransactions.findMany({
      where: eq(paymentTransactions.orderId, orderId),
      orderBy: [desc(paymentTransactions.createdAt)],
    });
  },

  /** Admin override. Keeps the order's payment status in step with the payment. */
  async updatePaymentStatus(actorId, paymentId, status, transactionId) {
    const payment = await this.getTransactionById(paymentId);
    if (status === "refunded") {
      throw ApiError.badRequest("Use POST /api/payments/:id/refund so the money is actually returned");
    }
    return db.transaction(async (tx) => {
      const updated = await this.updatePayment(paymentId, { status, transactionId }, tx);
      if (status === "completed" && payment.orderId) {
        const order = await tx.query.orders.findFirst({ where: eq(orders.id, payment.orderId) });
        if (order && order.paymentStatus !== "completed") {
          await tx
            .update(orders)
            .set({ paymentStatus: "completed", paidAt: new Date(), updatedAt: new Date() })
            .where(eq(orders.id, order.id));
          if (order.status === "pending") {
            await setOrderStatus(tx, order, "paid", { comment: "Payment confirmed by admin", actorId });
          }
          await loyaltyService.creditForOrder(tx, order);
        }
      } else if (status === "failed" && payment.orderId) {
        await tx
          .update(orders)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(and(eq(orders.id, payment.orderId), eq(orders.paymentStatus, "pending")));
      }
      await writeAuditLog({
        actorId,
        entity: "payments",
        entityId: paymentId,
        action: "update_status",
        before: { status: payment.status },
        after: { status },
      });
      return updated;
    });
  },

  /**
   * Refund through Omise (when the payment went through Omise), then record it.
   * Supports partial refunds; the total refunded can never exceed the payment.
   */
  async refundPayment(actorId, paymentId, amount, reason) {
    const payment = await this.getTransactionById(paymentId);
    if (!["completed", "partially_refunded"].includes(payment.status)) {
      throw ApiError.badRequest("รายการนี้ไม่สามารถคืนเงินได้");
    }
    const paidSatang = toSatang(payment.amount);
    const alreadySatang = toSatang(payment.refundAmount);
    const refundSatang = amount == null ? paidSatang - alreadySatang : toSatang(amount);
    if (refundSatang <= 0 || alreadySatang + refundSatang > paidSatang) {
      throw ApiError.badRequest("จำนวนเงินคืนต้องไม่เกินยอดชำระ");
    }

    let providerRefund = null;
    if (payment.transactionId?.startsWith("chrg_")) {
      providerRefund = await omiseService.createRefund(payment.transactionId, refundSatang);
    }

    const totalRefunded = alreadySatang + refundSatang;
    const fullyRefunded = totalRefunded === paidSatang;
    const status = fullyRefunded ? "refunded" : "partially_refunded";

    return db.transaction(async (tx) => {
      const [updatedPayment] = await tx
        .update(paymentTransactions)
        .set({
          status,
          refundAmount: fromSatang(totalRefunded),
          refundReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, paymentId))
        .returning();

      let refundRecord = null;
      if (payment.orderId) {
        const order = await tx.query.orders.findFirst({ where: eq(orders.id, payment.orderId) });
        await tx
          .update(orders)
          .set({
            paymentStatus: status,
            refundAmount: fromSatang(totalRefunded),
            refundReason: reason,
            refundedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, payment.orderId));
        if (fullyRefunded && order && order.status !== "refunded") {
          await setOrderStatus(tx, order, "refunded", { comment: reason, actorId });
        }
        if (fullyRefunded && order) await loyaltyService.reverseForOrder(tx, order);
        [refundRecord] = await tx
          .insert(refunds)
          .values({
            orderId: payment.orderId,
            amount: fromSatang(refundSatang),
            reason,
            status: "completed",
            processedBy: actorId ?? null,
            processedAt: new Date(),
          })
          .returning();
      }

      await writeAuditLog({
        actorId,
        entity: "payments",
        entityId: paymentId,
        action: "refund",
        before: { status: payment.status, refunded: payment.refundAmount },
        after: { status, refunded: fromSatang(totalRefunded), reason, providerRefundId: providerRefund?.id },
      });

      return { payment: updatedPayment, refund: refundRecord, providerRefundId: providerRefund?.id ?? null };
    });
  },

  async getPaymentMethods() {
    return db.query.paymentMethods.findMany({
      where: eq(paymentMethods.isActive, true),
      columns: { id: true, name: true, code: true, description: true },
    });
  },

  async getPaymentHistory(userId, pagination) {
    const where = eq(paymentTransactions.userId, userId);
    const [transactions, total] = await Promise.all([
      db.query.paymentTransactions.findMany({
        where,
        orderBy: [desc(paymentTransactions.timestamp)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(paymentTransactions).where(where),
    ]);
    return { transactions, total: total[0].count, ...paginationMeta(total[0].count, pagination) };
  },

  async getAllTransactions({ status, startDate, endDate }, pagination) {
    const conditions = dateRange(paymentTransactions.timestamp, startDate, endDate);
    if (status) conditions.push(eq(paymentTransactions.status, status));
    const where = conditions.length ? and(...conditions) : undefined;

    const [transactions, total] = await Promise.all([
      db.query.paymentTransactions.findMany({
        where,
        orderBy: [desc(paymentTransactions.timestamp)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db.select({ count: sql`count(*)::int` }).from(paymentTransactions).where(where),
    ]);
    return { transactions, total: total[0].count, ...paginationMeta(total[0].count, pagination) };
  },

  /** Totals and per-status counts, optionally limited to one store's pickup orders. */
  async getPaymentStatistics({ startDate, endDate, storeId } = {}) {
    const conditions = dateRange(paymentTransactions.timestamp, startDate, endDate);
    if (storeId) {
      conditions.push(
        inArray(
          paymentTransactions.orderId,
          db.select({ id: storePickups.orderId }).from(storePickups).where(eq(storePickups.storeId, storeId))
        )
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        status: paymentTransactions.status,
        count: sql`count(*)::int`,
        amount: sql`coalesce(sum(${paymentTransactions.amount}), 0)`,
      })
      .from(paymentTransactions)
      .where(where)
      .groupBy(paymentTransactions.status);

    const statusCounts = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    const sumOf = (statuses) =>
      rows.filter((r) => statuses.includes(r.status)).reduce((sum, r) => sum + toSatang(r.amount), 0);
    return {
      // Money actually received (completed or later refunded), not every attempt.
      totalAmount: Number(fromSatang(sumOf(["completed", "refunded", "partially_refunded"]))),
      totalTransactions: rows.reduce((sum, r) => sum + r.count, 0),
      statusCounts,
    };
  },

  /** Payments for orders picked up at a store. */
  async getStorePayments(storeId, { status, startDate, endDate }) {
    const conditions = [
      inArray(
        paymentTransactions.orderId,
        db.select({ id: storePickups.orderId }).from(storePickups).where(eq(storePickups.storeId, storeId))
      ),
      ...dateRange(paymentTransactions.timestamp, startDate, endDate),
    ];
    if (status) conditions.push(eq(paymentTransactions.status, status));
    return db.query.paymentTransactions.findMany({
      where: and(...conditions),
      orderBy: [desc(paymentTransactions.timestamp)],
    });
  },

  /**
   * Omise webhook. The request body is not trusted: only the charge id is
   * taken from it and the charge is fetched from Omise, so a forged event
   * cannot mark an order as paid.
   */
  async handleWebhook(event) {
    const chargeId = event?.data?.object === "charge" ? event.data.id : null;
    if (event?.object !== "event" || !chargeId) {
      return { handled: false, reason: "ignored" };
    }
    const payment = await db.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.transactionId, chargeId),
    });
    if (!payment) {
      return { handled: false, reason: "unknown charge" };
    }
    const charge = await omiseService.getCharge(chargeId);
    await db.transaction((tx) => this.applyChargeResult(payment.id, charge, tx));
    return { handled: true };
  },
};
