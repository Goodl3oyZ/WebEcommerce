import { db } from "../config/db.js";
import {
  paymentTransactions,
  orders,
  paymentMethods,
  storePaymentSettings,
  refunds,
} from "../models/schema.js";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { writeAuditLog } from "./auditService.js";

export const paymentService = {
  async createPayment(
    userId,
    orderId,
    paymentMethod,
    paymentDetails,
    txOrDb = db
  ) {
    try {
      console.log("[createPayment] called with", {
        userId,
        orderId,
        paymentMethod,
        paymentDetails,
      });
      const order = await txOrDb.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
      });
      console.log("[createPayment] order query result", order);
      if (!order) {
        console.error("[createPayment] Order not found", { userId, orderId });
        throw ApiError.notFound("Order not found");
      }
      if (["completed", "refunded"].includes(order.paymentStatus)) {
        throw new ApiError("Order has already been paid", 409);
      }
      const existingPayment = await txOrDb.query.paymentTransactions.findFirst({
        where: and(
          eq(paymentTransactions.orderId, orderId),
          eq(paymentTransactions.status, "pending")
        ),
      });
      console.log(
        "[createPayment] existingPayment query result",
        existingPayment
      );
      if (existingPayment) {
        console.error("[createPayment] Payment already exists", { orderId });
        throw new ApiError("Payment already exists", 409);
      }
      const [payment] = await txOrDb
        .insert(paymentTransactions)
        .values({
          orderId,
          userId,
          amount: order.total,
          paymentMethod,
          paymentDetails,
          status: "pending",
          timestamp: new Date(),
        })
        .returning();
      console.log("[createPayment] payment insert result", payment);
      return payment;
    } catch (err) {
      console.error("[createPayment] Error:", err);
      throw err;
    }
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
      where: and(
        eq(paymentTransactions.id, paymentId),
        eq(paymentTransactions.userId, userId)
      ),
    });

    if (!payment) {
      throw ApiError.notFound("ไม่พบรายการชำระเงิน");
    }

    return payment;
  },

  async getOrderPayments(userId, orderId) {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const payments = await db.query.paymentTransactions.findMany({
      where: eq(paymentTransactions.orderId, orderId),
    });

    return payments;
  },

  async updatePaymentStatus(userId, paymentId, status, transactionId) {
    try {
      const payment = await this.getPaymentById(userId, paymentId);
      const validStatuses = ["pending", "completed", "failed", "refunded"];
      if (!validStatuses.includes(status)) {
        throw new Error("Invalid payment status");
      }
      const [updatedPayment] = await db
        .update(paymentTransactions)
        .set({
          status,
          transactionId,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, paymentId))
        .returning();
      return updatedPayment;
    } catch (err) {
      throw err;
    }
  },

  async refundPayment(userId, paymentId, amount, reason, actorId) {
    const payment = userId
      ? await this.getPaymentById(userId, paymentId)
      : await this.getTransactionById(paymentId);
    if (payment.status !== "completed") {
      throw ApiError.badRequest("รายการนี้ไม่สามารถคืนเงินได้");
    }
    if (amount > Number(payment.amount)) {
      throw ApiError.badRequest("จำนวนเงินคืนต้องไม่เกินยอดชำระ");
    }

    return db.transaction(async (tx) => {
      const [refundedPayment] = await tx
        .update(paymentTransactions)
        .set({
          status: "refunded",
          refundAmount: String(amount),
          refundReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, paymentId))
        .returning();

      if (payment.orderId) {
        await tx
          .update(orders)
          .set({
            status: "refunded",
            paymentStatus: "refunded",
            refundAmount: String(amount),
            refundReason: reason,
            refundedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, payment.orderId));

        await tx.insert(refunds).values({
          orderId: payment.orderId,
          amount: String(amount),
          reason,
          status: "completed",
          processedBy: actorId || userId || null,
          processedAt: new Date(),
        });
      }

      await writeAuditLog({
        actorId: actorId || userId,
        entity: "payments",
        entityId: paymentId,
        action: "refund",
        before: { status: payment.status, amount: payment.amount },
        after: { status: "refunded", refundAmount: amount, reason },
      });

      return refundedPayment;
    });
  },

  async getPaymentMethods() {
    const methods = await db.query.paymentMethods.findMany({
      where: eq(paymentMethods.isActive, true),
    });

    return methods;
  },

  async validatePaymentMethod(method, details) {
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.code, method),
    });

    if (!paymentMethod) {
      throw new Error("Invalid payment method");
    }

    const validation = {
      isValid: true,
      message: "Payment method is valid",
    };

    switch (method) {
      case "credit_card":
        if (!details.cardNumber || !details.expiryDate || !details.cvv) {
          validation.isValid = false;
          validation.message = "Missing required credit card details";
        }
        break;
      case "bank_transfer":
        if (!details.accountNumber || !details.bankCode) {
          validation.isValid = false;
          validation.message = "Missing required bank transfer details";
        }
        break;
    }

    return validation;
  },

  async getPaymentHistory(userId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      db.query.paymentTransactions.findMany({
        where: eq(paymentTransactions.userId, userId),
        orderBy: [desc(paymentTransactions.timestamp)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(paymentTransactions)
        .where(eq(paymentTransactions.userId, userId)),
    ]);

    return {
      transactions,
      total: Number(total[0].count),
      page,
      limit,
    };
  },

  async addPaymentMethod(userId, type, provider, details) {
    const validation = await this.validatePaymentMethod(type, details);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const [method] = await db
      .insert(paymentMethods)
      .values({
        userId,
        type,
        provider,
        details,
        isActive: true,
      })
      .returning();

    return method;
  },

  async updatePaymentMethod(userId, methodId, details) {
    const method = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, methodId),
        eq(paymentMethods.userId, userId)
      ),
    });

    if (!method) {
      throw new Error("Payment method not found");
    }

    const validation = await this.validatePaymentMethod(method.type, details);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const [updatedMethod] = await db
      .update(paymentMethods)
      .set({
        details,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, methodId))
      .returning();

    return updatedMethod;
  },

  async removePaymentMethod(userId, methodId) {
    const method = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, methodId),
        eq(paymentMethods.userId, userId)
      ),
    });

    if (!method) {
      throw new Error("Payment method not found");
    }

    const [deletedMethod] = await db
      .update(paymentMethods)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, methodId))
      .returning();

    return deletedMethod;
  },

  async getAllTransactions({
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate,
  }) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (status) {
      conditions.push(eq(paymentTransactions.status, status));
    }
    if (startDate) {
      conditions.push(gte(paymentTransactions.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(paymentTransactions.timestamp, endDate));
    }

    const [transactions, total] = await Promise.all([
      db.query.paymentTransactions.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(paymentTransactions.timestamp)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(paymentTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    return {
      transactions,
      total: Number(total[0].count),
      page,
      limit,
    };
  },

  async getPaymentStatistics(startDate, endDate) {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(paymentTransactions.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(paymentTransactions.timestamp, endDate));
    }

    const [totalAmount, totalTransactions, statusCounts] = await Promise.all([
      db
        .select({ total: sql`sum(amount)` })
        .from(paymentTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      db
        .select({ count: sql`count(*)` })
        .from(paymentTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      db
        .select({
          status: paymentTransactions.status,
          count: sql`count(*)`,
        })
        .from(paymentTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(paymentTransactions.status),
    ]);

    return {
      totalAmount: Number(totalAmount[0].total) || 0,
      totalTransactions: Number(totalTransactions[0].count) || 0,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = Number(curr.count);
        return acc;
      }, {}),
    };
  },

  async getStorePayments(storeId, { status, startDate, endDate }) {
    const conditions = [eq(paymentTransactions.storeId, storeId)];

    if (status) {
      conditions.push(eq(paymentTransactions.status, status));
    }
    if (startDate) {
      conditions.push(gte(paymentTransactions.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(paymentTransactions.timestamp, endDate));
    }

    const payments = await db.query.paymentTransactions.findMany({
      where: and(...conditions),
      orderBy: [desc(paymentTransactions.timestamp)],
    });

    return payments;
  },

  async getPaymentStats({ storeId, startDate, endDate }) {
    const conditions = [];
    if (storeId) {
      conditions.push(eq(paymentTransactions.storeId, storeId));
    }
    if (startDate) {
      conditions.push(gte(paymentTransactions.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(paymentTransactions.timestamp, endDate));
    }

    const [totalAmount, totalPayments, statusCounts] = await Promise.all([
      db
        .select({ total: sql`sum(amount)` })
        .from(paymentTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      db
        .select({ count: sql`count(*)` })
        .from(paymentTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      db
        .select({
          status: paymentTransactions.status,
          count: sql`count(*)`,
        })
        .from(paymentTransactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(paymentTransactions.status),
    ]);

    return {
      totalAmount: Number(totalAmount[0].total) || 0,
      totalPayments: Number(totalPayments[0].count) || 0,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = Number(curr.count);
        return acc;
      }, {}),
    };
  },

  async updatePayment(paymentId, updateData) {
    const allowedFields = [
      "transactionId",
      "status",
      "updatedAt",
      "paymentDetails",
      "currency",
      "amount",
    ];
    let filteredData = Object.fromEntries(
      Object.entries(updateData).filter(
        ([key, value]) => allowedFields.includes(key) && value !== undefined
      )
    );
    filteredData.updatedAt = new Date();
    console.log("updatePayment filteredData:", filteredData);
    const [updated] = await db
      .update(paymentTransactions)
      .set(filteredData)
      .where(eq(paymentTransactions.id, paymentId))
      .returning();
    return updated;
  },

  async updatePaymentByChargeId(chargeId, updateData) {
    const [updated] = await db
      .update(paymentTransactions)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.transactionId, chargeId))
      .returning();
    if (!updated) return null;
    if (updated.orderId) {
      let orderStatus = undefined;
      let paymentStatus = undefined;
      if (updateData.status === "completed") {
        orderStatus = "paid";
        paymentStatus = "completed";
      } else if (updateData.status === "failed") {
        orderStatus = "cancelled";
        paymentStatus = "failed";
      } else if (updateData.status === "refunded") {
        orderStatus = "refunded";
        paymentStatus = "refunded";
      }
      if (orderStatus && paymentStatus) {
        await db
          .update(orders)
          .set({ status: orderStatus, paymentStatus, updatedAt: new Date() })
          .where(eq(orders.id, updated.orderId));
      }
    }
    return updated;
  },

  async processRefund(paymentId, { amount, reason, processedBy }) {
    return await db.transaction(async (tx) => {
      const payment = await tx.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.id, paymentId),
      });

      if (!payment) {
        throw ApiError.notFound("ไม่พบรายการชำระเงิน");
      }

      const refundAmt = amount ? String(amount) : payment.amount;

      const [refundRecord] = await tx
        .insert(refunds)
        .values({
          orderId: payment.orderId,
          amount: refundAmt,
          reason: reason || "Admin initiated refund",
          status: "completed",
          processedBy: processedBy || null,
          processedAt: new Date(),
        })
        .returning();

      const [updatedPayment] = await tx
        .update(paymentTransactions)
        .set({
          status: "refunded",
          refundAmount: refundAmt,
          refundReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, paymentId))
        .returning();

      if (payment.orderId) {
        await tx
          .update(orders)
          .set({
            status: "refunded",
            paymentStatus: "refunded",
            refundAmount: refundAmt,
            refundReason: reason,
            refundedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, payment.orderId));
      }

      await writeAuditLog({
        actorId: processedBy,
        entity: "payments",
        entityId: paymentId,
        action: "refund",
        before: { status: payment.status },
        after: { status: "refunded", amount: refundAmt, reason },
      });

      return {
        payment: updatedPayment,
        refund: refundRecord,
      };
    });
  },
};
