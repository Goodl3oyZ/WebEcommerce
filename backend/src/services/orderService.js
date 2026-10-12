import { randomBytes } from "node:crypto";
import { db } from "../config/db.js";
import {
  orders,
  orderItems,
  orderStatusHistory,
  orderCoupons,
  products,
  productVariants,
  carts,
  cartItems,
  addresses,
  paymentMethods,
  shippingMethods,
  shipments,
  paymentTransactions,
} from "../models/schema.js";
import { eq, and, desc, sql, gte, lte, ilike, or, inArray } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { ORDER_STATUSES } from "../utils/orderStatus.js";
import { writeAuditLog } from "./auditService.js";
import { shippingService } from "./shippingService.js";
import { paymentService } from "./paymentService.js";
import { settingsService } from "./settingsService.js";
import { couponService } from "./couponService.js";
import { setOrderStatus, cancelOrder, recordMovements } from "./orderLifecycle.js";

/** Minutes a customer has to pay before an unpaid order expires (stock released). */
export const PAYMENT_DEADLINE_MINUTES = Number(process.env.PAYMENT_DEADLINE_MINUTES) || 30;

const RETRYABLE_PG_CODES = new Set(["40P01", "40001"]); // deadlock, serialization failure
const pgCode = (error) => error?.cause?.code ?? error?.code;

/** Run a transaction, retrying a few times on deadlocks/serialization conflicts. */
async function withRetry(run, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= attempts || !RETRYABLE_PG_CODES.has(pgCode(error))) throw error;
      console.warn(`[checkout] retrying after ${pgCode(error)} (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, 25 * 2 ** attempt + Math.random() * 25));
    }
  }
}

/** Cancel unless someone else already moved the order on (exactly-once release). */
async function cancelIfPending(orderId, reason) {
  await db.transaction(async (tx) => {
    const current = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!current || current.status !== "pending") return;
    try {
      await cancelOrder(tx, current, { reason });
    } catch (error) {
      if (error.code !== "ORDER_STATE_CHANGED") throw error;
    }
  });
}
import { getFileUrl, BUCKETS } from "../config/minio.js";
import { toSatang, fromSatang, percentOf } from "../utils/money.js";
import { paginationMeta } from "../utils/pagination.js";

const VAT_PERCENT = 7;
const ONLINE_PAYMENT_CODES = { card: "credit_card", credit_card: "credit_card", promptpay: "promptpay" };

/** ORD20261012-7K3M9QX2: date + 8 random base32 chars (collisions are negligible). */
export function generateOrderNumber(now = new Date()) {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const random = [...randomBytes(8)].map((b) => alphabet[b % 32]).join("");
  return `ORD${datePart}-${random}`;
}

const orderDetails = {
  items: {
    with: {
      product: { with: { brand: true, category: true } },
      variant: true,
    },
  },
  shippingAddress: true,
  billingAddress: true,
  paymentMethod: true,
};

function withImageUrls(order) {
  for (const item of order.items ?? []) {
    const product = item.product;
    if (!product?.imageUrl) continue;
    product.imageUrl = Array.isArray(product.imageUrl)
      ? product.imageUrl.map((img) => (img ? getFileUrl(BUCKETS.PRODUCTS, img) : null))
      : getFileUrl(BUCKETS.PRODUCTS, product.imageUrl);
  }
  return order;
}

/** Combine repeated lines for the same variant so stock is checked once. */
function mergeItems(items) {
  const byVariant = new Map();
  for (const item of items) {
    if (!item.variantId) {
      throw ApiError.badRequest("Every item needs a variantId (size/colour) to be purchased");
    }
    const existing = byVariant.get(item.variantId);
    if (existing) existing.quantity += item.quantity;
    else byVariant.set(item.variantId, { ...item });
  }
  return [...byVariant.values()];
}

export const orderService = {
  async getOrders(userId, { status }, pagination, txOrDb = db) {
    const where = and(eq(orders.userId, userId), status ? eq(orders.status, status) : undefined);
    const [orderList, total] = await Promise.all([
      txOrDb.query.orders.findMany({
        where,
        with: orderDetails,
        limit: pagination.limit,
        offset: pagination.offset,
        orderBy: [desc(orders.createdAt)],
      }),
      txOrDb.select({ count: sql`count(*)::int` }).from(orders).where(where),
    ]);
    const meta = paginationMeta(total[0].count, pagination);
    return {
      orders: orderList.map(withImageUrls),
      totalPages: meta.pages,
      currentPage: meta.page,
      totalItems: meta.total,
      pagination: meta,
    };
  },

  /** An order the user owns (admins may read any order). */
  async getOrderById(userId, orderId, txOrDb = db, { isAdmin = false } = {}) {
    const order = await txOrDb.query.orders.findFirst({
      where: isAdmin ? eq(orders.id, orderId) : and(eq(orders.id, orderId), eq(orders.userId, userId)),
      with: orderDetails,
    });
    if (!order) {
      throw ApiError.notFound("Order not found");
    }
    return withImageUrls(order);
  },

  /**
   * Checkout. Prices, shipping, discount, tax and total are all computed here
   * from the database; anything the client sends for them is ignored.
   */
  async createOrder(userId, orderData) {
    if ((await settingsService.getSettings()).maintenance) {
      throw new ApiError(503, "The store is temporarily closed for maintenance", null, "MAINTENANCE");
    }
    const items = mergeItems(orderData.items ?? []);
    if (items.length === 0) {
      throw ApiError.badRequest("Order must contain at least one item");
    }
    // Reserve rows in one global order (by variant id) so two checkouts with
    // the same products can never deadlock on each other.
    items.sort((a, b) => a.variantId.localeCompare(b.variantId));
    const shippingAddressId = orderData.shippingAddressId;
    const billingAddressId = orderData.billingAddressId ?? shippingAddressId;

    // Idempotency: a retried checkout (double click, network retry) with the
    // same key returns the first order instead of creating and charging again.
    const idempotencyKey = orderData.idempotencyKey?.trim() || null;
    const replay = async () => {
      const existing = await db.query.orders.findFirst({
        where: and(eq(orders.userId, userId), eq(orders.idempotencyKey, idempotencyKey)),
      });
      return existing ? { ...(await this.getOrderById(userId, existing.id)), replayed: true } : null;
    };
    if (idempotencyKey) {
      const previous = await replay();
      if (previous) return previous;
    }

    let created;
    try {
      created = await withRetry(() => db.transaction(async (tx) => {
      const [shippingAddress, billingAddress] = await Promise.all([
        tx.query.addresses.findFirst({
          where: and(eq(addresses.id, shippingAddressId), eq(addresses.userId, userId)),
        }),
        tx.query.addresses.findFirst({
          where: and(eq(addresses.id, billingAddressId), eq(addresses.userId, userId)),
        }),
      ]);
      if (!shippingAddress || !billingAddress) {
        throw ApiError.badRequest("Invalid shipping or billing address");
      }

      const shippingMethod = await tx.query.shippingMethods.findFirst({
        where: eq(shippingMethods.id, orderData.shippingMethodId),
      });
      if (!shippingMethod?.isActive) {
        throw ApiError.badRequest("Invalid shipping method");
      }
      const paymentMethod = await tx.query.paymentMethods.findFirst({
        where: eq(paymentMethods.id, orderData.paymentMethodId),
      });
      if (!paymentMethod?.isActive) {
        throw ApiError.badRequest("Invalid payment method");
      }
      // Only online payments are offered (no cash on delivery).
      if (!ONLINE_PAYMENT_CODES[paymentMethod.code?.toLowerCase()]) {
        throw ApiError.badRequest("This payment method is not available");
      }

      // Reserve stock atomically: the update only succeeds if enough is left.
      let subtotal = 0;
      const lines = [];
      for (const item of items) {
        const variant = await tx.query.productVariants.findFirst({
          where: and(eq(productVariants.id, item.variantId), eq(productVariants.productId, item.productId)),
          with: { product: true },
        });
        if (!variant || variant.product?.isActive === false) {
          throw ApiError.notFound(`Product variant not found: ${item.variantId}`);
        }
        const [reserved] = await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
          .where(and(eq(productVariants.id, variant.id), gte(productVariants.stock, item.quantity)))
          .returning({ id: productVariants.id });
        if (!reserved) {
          throw new ApiError(
            `Insufficient stock for ${variant.product.name} (${variant.color} ${variant.size}). Available: ${variant.stock}`,
            409,
            null,
            "INSUFFICIENT_STOCK"
          );
        }
        const price = toSatang(variant.price);
        subtotal += price * item.quantity;
        lines.push({ ...item, price, lineTotal: price * item.quantity });
      }

      const shippingOptions = await shippingService.calculateShippingCost(shippingAddressId, items);
      const shippingOption = shippingOptions.find((m) => m.methodId === shippingMethod.id);
      if (!shippingOption) {
        throw ApiError.badRequest("Shipping method not available for this address");
      }
      const shippingCost = toSatang(shippingOption.cost);

      let coupon = null;
      let discount = 0;
      if (orderData.couponCode) {
        ({ coupon, discountSatang: discount } = await couponService.resolve(
          orderData.couponCode,
          subtotal,
          userId,
          tx
        ));
      }
      const tax = percentOf(subtotal - discount, VAT_PERCENT);
      const total = subtotal - discount + shippingCost + tax;

      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          orderNumber: generateOrderNumber(),
          status: "pending",
          paymentStatus: "pending",
          shippingStatus: "pending",
          subtotal: fromSatang(subtotal),
          shippingCost: fromSatang(shippingCost),
          discount: fromSatang(discount),
          tax: fromSatang(tax),
          total: fromSatang(total),
          shippingAddressId,
          billingAddressId,
          shippingMethodId: shippingMethod.id,
          paymentMethodId: paymentMethod.id,
          notes: orderData.notes ?? null,
          idempotencyKey,
          // Database clock, like created_at, so the worker compares like with like.
          paymentDeadline: sql`now() + make_interval(mins => ${PAYMENT_DEADLINE_MINUTES})`,
        })
        .returning();
      await recordMovements(
        tx,
        lines.map((l) => ({ variantId: l.variantId, orderId: order.id, change: -l.quantity, reason: "order_reserve" }))
      );

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          price: fromSatang(line.price),
          subtotal: fromSatang(line.lineTotal),
        }))
      );
      if (coupon) {
        await tx
          .insert(orderCoupons)
          .values({ orderId: order.id, couponId: coupon.id, discountAmount: fromSatang(discount) });
      }
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        status: "pending",
        comment: "Order created",
        createdBy: userId,
      });

      const shipment = await shippingService.createShippingLabel(order.id, shippingMethod.id, tx);
      await tx
        .update(orders)
        .set({ trackingNumber: shipment.trackingNumber, carrier: shippingMethod.name })
        .where(eq(orders.id, order.id));

      // The purchased variants leave the cart.
      const cart = await tx.query.carts.findFirst({ where: eq(carts.userId, userId) });
      if (cart) {
        await tx.delete(cartItems).where(
          and(
            eq(cartItems.cartId, cart.id),
            inArray(cartItems.variantId, lines.map((l) => l.variantId))
          )
        );
      }

      const paymentCode = ONLINE_PAYMENT_CODES[paymentMethod.code?.toLowerCase()] ?? paymentMethod.code;
      const payment = await paymentService.createPayment(userId, order.id, paymentCode, null, tx);
      return { order, payment, paymentCode };
      }));
    } catch (error) {
      // Two identical requests raced: the loser returns the winner's order.
      if (idempotencyKey && pgCode(error) === "23505") {
        const previous = await replay();
        if (previous) return previous;
      }
      throw error;
    }
    const { order, payment, paymentCode } = created;

    // Charge after the order is committed, so money is never taken for an order
    // that rolled back. If the charge cannot start or is declined, the order is
    // cancelled to release the reserved stock (the customer can order again).
    let charge = null;
    if (ONLINE_PAYMENT_CODES[paymentCode]) {
      try {
        ({ charge } = await paymentService.chargePayment(payment, {
          method: paymentCode,
          cardToken: orderData.omiseToken,
          description: `Order ${order.orderNumber}`,
        }));
      } catch (error) {
        if (error.code === "PAYMENT_UNCERTAIN") {
          // The charge may exist: keep the order and its stock, mark it as being
          // confirmed; the payment worker reconciles it with Omise.
          await db
            .update(orders)
            .set({ paymentStatus: "processing", updatedAt: new Date() })
            .where(and(eq(orders.id, order.id), eq(orders.paymentStatus, "pending")));
          await db
            .update(paymentTransactions)
            .set({ status: "processing", updatedAt: new Date() })
            .where(and(eq(paymentTransactions.id, payment.id), eq(paymentTransactions.status, "pending")));
          return { ...(await this.getOrderById(userId, order.id)), paymentUncertain: true };
        }
        await db
          .update(orders)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(and(eq(orders.id, order.id), inArray(orders.paymentStatus, ["pending", "processing"])));
        await cancelIfPending(order.id, `Payment error: ${error.message}`);
        throw new ApiError(`Payment failed: ${error.message}`, 402, null, "PAYMENT_FAILED");
      }
      if (charge.status === "failed") {
        // Declined card: release the reservation; the customer can check out again.
        await cancelIfPending(order.id, `Payment declined: ${charge.failure_message ?? "card declined"}`);
        throw new ApiError(
          `Payment declined: ${charge.failure_message ?? "card declined"}`,
          402,
          null,
          "PAYMENT_DECLINED"
        );
      }
    }

    const finalOrder = await this.getOrderById(userId, order.id);
    if (charge) {
      finalOrder.charge = {
        id: charge.id,
        status: charge.status,
        qrCodeUrl: charge.source?.scannable_code?.image?.download_uri ?? null,
        // Kept for existing clients that read the raw Omise shape.
        source: charge.source ?? null,
      };
    }
    return finalOrder;
  },

  /** Customers may cancel until the order is paid or being processed. */
  async cancelOrder(userId, orderId, reason) {
    return db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
      });
      if (!order) throw ApiError.notFound("Order not found");
      if (order.status !== "pending" || order.paymentStatus === "completed") {
        throw ApiError.badRequest(
          "This order can no longer be cancelled. Please request a refund instead."
        );
      }
      return cancelOrder(tx, order, { reason, actorId: userId });
    });
  },

  /** Customer asks for a refund of a delivered order; an admin decides. */
  async requestRefund(userId, orderId, { amount, reason }) {
    return db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
      });
      if (!order) throw ApiError.notFound("Order not found");
      if (order.status !== "delivered") {
        throw ApiError.badRequest("Only delivered orders can be refunded");
      }
      const requested = amount == null ? toSatang(order.total) : toSatang(amount);
      if (requested <= 0 || requested > toSatang(order.total)) {
        throw ApiError.badRequest("Refund amount exceeds order total");
      }
      return setOrderStatus(tx, order, "refund_requested", {
        comment: `Refund requested: ${reason}`,
        actorId: userId,
        extra: { refundReason: reason, refundAmount: fromSatang(requested) },
      });
    });
  },

  /** Customer confirms they received a shipped order. */
  async confirmDelivery(userId, orderId) {
    return db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
      });
      if (!order) throw ApiError.notFound("Order not found");
      if (order.status !== "shipped") {
        throw ApiError.badRequest("Only shipped orders can be marked as delivered");
      }
      return setOrderStatus(tx, order, "delivered", {
        comment: "Delivery confirmed by customer",
        actorId: userId,
        extra: { shippingStatus: "delivered" },
      });
    });
  },

  /** Admin status change with the side effects each status implies. */
  async updateOrderStatus(orderId, { status, notes, trackingNumber, actorId }) {
    const updated = await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
      if (!order) throw ApiError.notFound("ไม่พบออเดอร์");

      if (status === "refunded" && ["completed", "partially_refunded"].includes(order.paymentStatus)) {
        throw ApiError.badRequest(
          "This order was paid online. Refund it with POST /api/payments/:id/refund so the money is returned."
        );
      }
      if (status === "cancelled") {
        if (order.paymentStatus === "completed") {
          throw ApiError.badRequest("Refund the payment before cancelling a paid order.");
        }
        return cancelOrder(tx, order, { reason: notes, actorId });
      }

      const extra = {};
      if (notes) extra.statusNotes = notes;
      if (trackingNumber) extra.trackingNumber = trackingNumber;
      if (status === "shipped") extra.shippingStatus = "shipped";
      if (status === "delivered") extra.shippingStatus = "delivered";
      return setOrderStatus(tx, order, status, { comment: notes, actorId, extra });
    });

    await writeAuditLog({
      actorId,
      entity: "orders",
      entityId: orderId,
      action: "update_status",
      after: { status },
    });
    return updated;
  },

  /** Admin: carrier/tracking details, mirrored onto the shipment record. */
  async updateShippingInfo(orderId, { trackingNumber, carrier, status, estimatedDelivery }, actorId) {
    return db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
      if (!order) throw ApiError.notFound("ไม่พบออเดอร์");
      if (["cancelled", "refunded"].includes(order.status)) {
        throw ApiError.badRequest(`Cannot update shipping for a ${order.status} order`);
      }

      const changes = { trackingNumber, updatedAt: new Date() };
      if (carrier) changes.carrier = carrier;
      if (status) changes.shippingStatus = status;
      if (estimatedDelivery) changes.estimatedDelivery = new Date(estimatedDelivery);
      const [updated] = await tx.update(orders).set(changes).where(eq(orders.id, orderId)).returning();

      const shipment = await tx.query.shipments.findFirst({ where: eq(shipments.orderId, orderId) });
      const shipmentChanges = {
        trackingNumber,
        ...(carrier && { carrier }),
        ...(status && { status }),
        ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
        ...(status === "delivered" && { actualDelivery: new Date() }),
        updatedAt: new Date(),
      };
      if (shipment) {
        await tx.update(shipments).set(shipmentChanges).where(eq(shipments.id, shipment.id));
      } else {
        await tx.insert(shipments).values({ orderId, ...shipmentChanges });
      }

      // Shipping it moves a paid/processing order forward.
      if (status === "shipped" && ["paid", "confirmed", "processing"].includes(order.status)) {
        const intermediate =
          order.status === "processing"
            ? updated
            : await setOrderStatus(tx, order, "processing", { actorId, comment: "Preparing shipment" });
        return setOrderStatus(tx, intermediate, "shipped", {
          actorId,
          comment: `Shipped with ${carrier ?? order.carrier ?? "carrier"} (${trackingNumber})`,
        });
      }
      return updated;
    });
  },

  async getAllOrders({ status, search }, pagination, txOrDb = db) {
    const conditions = [];
    if (status) conditions.push(eq(orders.status, status));
    if (search) {
      conditions.push(
        or(ilike(orders.orderNumber, `%${search}%`), sql`${orders.id}::text ILIKE ${`%${search}%`}`)
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [orderList, total] = await Promise.all([
      txOrDb.query.orders.findMany({
        where,
        with: orderDetails,
        limit: pagination.limit,
        offset: pagination.offset,
        orderBy: [desc(orders.createdAt)],
      }),
      txOrDb.select({ count: sql`count(*)::int` }).from(orders).where(where),
    ]);
    const list = orderList.map(withImageUrls);
    return { items: list, orders: list, pagination: paginationMeta(total[0].count, pagination) };
  },

  async getOrderStats({ startDate, endDate }, txOrDb = db) {
    const conditions = [];
    if (startDate) conditions.push(gte(orders.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(orders.createdAt, new Date(endDate)));

    const counts = Object.fromEntries(
      ORDER_STATUSES.map((s) => [s, sql`(count(*) filter (where ${orders.status} = ${s}))::int`])
    );
    const [stats] = await txOrDb
      .select({
        total: sql`count(*)::int`,
        // Revenue counts orders that were paid, minus refunds.
        totalAmount: sql`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} in ('completed','partially_refunded','refunded')), 0) - coalesce(sum(${orders.refundAmount}) filter (where ${orders.paymentStatus} in ('partially_refunded','refunded')), 0)`,
        ...counts,
      })
      .from(orders)
      .where(conditions.length ? and(...conditions) : undefined);
    return { ...stats, totalAmount: Number(stats.totalAmount) };
  },

  async getOrderStatus(userId, orderId, { isAdmin = false } = {}) {
    const order = await this.getOrderById(userId, orderId, db, { isAdmin });
    const history = await db.query.orderStatusHistory.findMany({
      where: eq(orderStatusHistory.orderId, orderId),
      orderBy: [desc(orderStatusHistory.createdAt)],
    });
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      history,
    };
  },

  async getOrderTracking(userId, orderId, { isAdmin = false } = {}) {
    await this.getOrderById(userId, orderId, db, { isAdmin }); // ownership
    const shipment = await db.query.shipments.findFirst({ where: eq(shipments.orderId, orderId) });
    if (!shipment) {
      throw ApiError.notFound("ไม่พบข้อมูลการจัดส่งสำหรับออเดอร์นี้");
    }
    return shipment;
  },
};
