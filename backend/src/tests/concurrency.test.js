/**
 * Purchases under contention, against the real database. Requests are fired
 * in parallel (Promise.all) so the races are real, not simulated.
 */
import { jest } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { createAddress, createProduct, createShipping, getPaymentMethod, getVariantStock } from "./helpers/fixtures.js";

const { omiseService } = await import("../services/omiseService.js");
const { paymentService } = await import("../services/paymentService.js");
const { runPaymentMaintenance } = await import("../workers/paymentWorker.js");
const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { and, eq, sql } = await import("drizzle-orm");

beforeEach(() => jest.clearAllMocks());

/** A signed-in customer with an address, shipping method and card payment. */
async function buyer(paymentCode = "card") {
  const { agent, user } = await loginAs("user");
  const { method } = await createShipping();
  const address = await createAddress(user.id, method.shippingZoneId);
  const payment = await getPaymentMethod(paymentCode);
  const body = (items, extra = {}) => ({
    shippingAddressId: address.id,
    shippingMethodId: method.id,
    paymentMethodId: payment.id,
    items,
    ...(paymentCode === "card" && { omiseToken: "tokn_test" }),
    ...extra,
  });
  return { agent, user, body };
}
const line = ({ product, variant }, quantity = 1) => ({ productId: product.id, variantId: variant.id, quantity });

const movements = async (variantId) => {
  const rows = await db.select().from(schema.inventoryMovements).where(eq(schema.inventoryMovements.variantId, variantId));
  return { net: rows.reduce((s, r) => s + r.change, 0), reserves: rows.filter((r) => r.reason === "order_reserve").length, releases: rows.filter((r) => r.reason === "order_release").length };
};
const orderRow = (id) => db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
const pendingCharge = (id) => async ({ amount, source }) => ({ id, status: "pending", amount, source: { id: source, scannable_code: { image: { download_uri: "https://qr.test/x.png" } } } });

/** A PromptPay order whose QR is shown but not paid. */
async function unpaidPromptPayOrder({ stock = 5 } = {}) {
  const item = await createProduct({ stock });
  const customer = await buyer("promptpay");
  const chargeId = `chrg_test_${randomUUID().slice(0, 8)}`;
  omiseService.createCharge.mockImplementationOnce(pendingCharge(chargeId));
  const res = await customer.agent.post("/api/orders/checkout").send(customer.body([line(item)]));
  expect(res.status).toBe(201);
  return { ...customer, item, order: res.body.data, chargeId };
}
const overdue = (orderId) =>
  db.update(schema.orders).set({ paymentDeadline: sql`now() - interval '1 minute'` }).where(eq(schema.orders.id, orderId));
const webhook = (chargeId) =>
  newAgent().then((a) => a.post("/api/payments/webhook/omise").send({ object: "event", key: "charge.complete", data: { object: "charge", id: chargeId } }));

describe("checkout under contention", () => {
  test("two customers, one unit left: exactly one order, the other gets 409", async () => {
    const item = await createProduct({ stock: 1 });
    const [a, b] = await Promise.all([buyer(), buyer()]);
    const results = await Promise.all([a, b].map((c) => c.agent.post("/api/orders/checkout").send(c.body([line(item)]))));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409).body.code).toBe("INSUFFICIENT_STOCK");
    expect(await getVariantStock(item.variant.id)).toBe(0);
  });

  test("20 customers, 5 units: 5 orders, never negative, every unit audited", async () => {
    const item = await createProduct({ stock: 5 });
    const customers = await Promise.all(Array.from({ length: 20 }, () => buyer()));
    const results = await Promise.all(customers.map((c) => c.agent.post("/api/orders/checkout").send(c.body([line(item)]))));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(5);
    expect(statuses.filter((s) => s === 409)).toHaveLength(15);
    expect(statuses.every((s) => s === 201 || s === 409)).toBe(true); // no 500s
    expect(await getVariantStock(item.variant.id)).toBe(0);
    expect(await movements(item.variant.id)).toMatchObject({ net: -5, reserves: 5, releases: 0 });
  });

  test("baskets with the same SKUs in opposite order do not deadlock", async () => {
    const x = await createProduct({ stock: 100 });
    const y = await createProduct({ stock: 100 });
    const customers = await Promise.all(Array.from({ length: 10 }, () => buyer()));
    const results = await Promise.all(
      customers.map((c, i) =>
        c.agent.post("/api/orders/checkout").send(c.body(i % 2 ? [line(x), line(y)] : [line(y), line(x)]))
      )
    );
    expect(results.map((r) => r.status)).toEqual(Array(10).fill(201));
    expect(await getVariantStock(x.variant.id)).toBe(90);
    expect(await getVariantStock(y.variant.id)).toBe(90);
  });

  test("the same Idempotency-Key sent 5 times at once creates one order and one charge", async () => {
    const item = await createProduct({ stock: 10 });
    const c = await buyer();
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => c.agent.post("/api/orders/checkout").set("Idempotency-Key", key).send(c.body([line(item)])))
    );
    expect(results.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
    const rows = await db.select().from(schema.orders).where(and(eq(schema.orders.userId, c.user.id), eq(schema.orders.idempotencyKey, key)));
    expect(rows).toHaveLength(1);
    expect(omiseService.createCharge).toHaveBeenCalledTimes(1);
    expect(await getVariantStock(item.variant.id)).toBe(9);
  });
});

describe("duplicate payment events and cancellations", () => {
  test("5 identical webhooks at once: paid once, one history entry, points once", async () => {
    const { order, chargeId } = await unpaidPromptPayOrder();
    const results = await Promise.all(Array.from({ length: 5 }, () => webhook(chargeId)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await orderRow(order.id)).toMatchObject({ status: "paid", paymentStatus: "completed" });
    const paid = await db.select().from(schema.orderStatusHistory).where(and(eq(schema.orderStatusHistory.orderId, order.id), eq(schema.orderStatusHistory.status, "paid")));
    expect(paid).toHaveLength(1);
    const credits = await db.select().from(schema.pointsHistory).where(and(eq(schema.pointsHistory.orderId, order.id), eq(schema.pointsHistory.type, "credit")));
    expect(credits).toHaveLength(1);
  });

  test("5 cancels at once release the stock exactly once", async () => {
    const { agent, order, item } = await unpaidPromptPayOrder({ stock: 3 });
    expect(await getVariantStock(item.variant.id)).toBe(2);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => agent.post(`/api/orders/${order.id}/cancel`).send({ reason: "Changed my mind" }))
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.every((r) => [200, 400, 409].includes(r.status))).toBe(true);
    expect(await getVariantStock(item.variant.id)).toBe(3);
    expect(await movements(item.variant.id)).toMatchObject({ net: 0, releases: 1 });
  });
});

describe("payment worker (expiry, reconciliation, refunds)", () => {
  test("an overdue unpaid order expires once; a payment arriving later is refunded once", async () => {
    const { order, item, chargeId } = await unpaidPromptPayOrder({ stock: 4 });
    await overdue(order.id);
    omiseService.getCharge.mockResolvedValue({ id: chargeId, status: "pending" });
    await Promise.all([runPaymentMaintenance(), runPaymentMaintenance()]);
    expect(await orderRow(order.id)).toMatchObject({ status: "cancelled" });
    expect(await getVariantStock(item.variant.id)).toBe(4);
    expect((await movements(item.variant.id)).releases).toBe(1);

    // The customer pays the old QR after all.
    omiseService.getCharge.mockResolvedValue({ id: chargeId, status: "successful", paid: true });
    expect((await webhook(chargeId)).status).toBe(200);
    await Promise.all([runPaymentMaintenance(), runPaymentMaintenance()]);
    await runPaymentMaintenance();
    expect(omiseService.createRefund).toHaveBeenCalledTimes(1);
    expect(omiseService.createRefund).toHaveBeenCalledWith(chargeId, expect.any(Number));
    expect(await orderRow(order.id)).toMatchObject({ status: "cancelled", paymentStatus: "refunded" });
    omiseService.getCharge.mockReset();
  });

  test("an overdue order that was actually paid is confirmed, not expired", async () => {
    const { order, item, chargeId } = await unpaidPromptPayOrder({ stock: 4 });
    await overdue(order.id);
    omiseService.getCharge.mockResolvedValueOnce({ id: chargeId, status: "successful", paid: true });
    const stats = await runPaymentMaintenance();
    expect(stats.reconciled).toBeGreaterThanOrEqual(1);
    expect(await orderRow(order.id)).toMatchObject({ status: "paid" });
    expect(await getVariantStock(item.variant.id)).toBe(3);
  });

  test("expiry racing a successful payment ends consistent either way", async () => {
    const { order, item, chargeId } = await unpaidPromptPayOrder({ stock: 4 });
    await overdue(order.id);
    omiseService.getCharge.mockResolvedValue({ id: chargeId, status: "pending" });
    const payment = await db.query.paymentTransactions.findFirst({ where: eq(schema.paymentTransactions.orderId, order.id) });
    await Promise.all([
      runPaymentMaintenance(),
      db.transaction((tx) => paymentService.applyChargeResult(payment.id, { id: chargeId, status: "successful", paid: true }, tx)),
    ]);
    omiseService.getCharge.mockReset();
    const final = await orderRow(order.id);
    const stock = await getVariantStock(item.variant.id);
    const latest = await db.query.paymentTransactions.findFirst({ where: eq(schema.paymentTransactions.id, payment.id) });
    if (final.status === "paid") {
      expect(stock).toBe(3); // still reserved for the paid order
    } else {
      expect(final.status).toBe("cancelled");
      expect(stock).toBe(4);
      expect(latest.paymentDetails.refundDue).toBe(true); // the money goes back
    }
  });

  test("a lost Omise response is confirmed from Omise by orderId", async () => {
    const item = await createProduct({ stock: 2 });
    const c = await buyer();
    omiseService.createCharge.mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }));
    const res = await c.agent.post("/api/orders/checkout").send(c.body([line(item)]));
    expect(res.status).toBe(202);
    const orderId = res.body.data.id;
    // The worker sees every unconfirmed order in the shared test database; answer only for ours.
    omiseService.findChargeForOrder.mockImplementation(async (id) =>
      id === orderId ? { id: "chrg_test_found", status: "successful", paid: true, metadata: { orderId } } : null
    );
    await runPaymentMaintenance();
    omiseService.findChargeForOrder.mockImplementation(async () => null);
    expect(omiseService.findChargeForOrder).toHaveBeenCalledWith(orderId, expect.anything());
    expect(await orderRow(orderId)).toMatchObject({ status: "paid", paymentStatus: "completed" });
    expect(await getVariantStock(item.variant.id)).toBe(1);
  });

  test("the database itself refuses negative stock", async () => {
    const item = await createProduct({ stock: 1 });
    await expect(
      db.update(schema.productVariants).set({ stock: sql`${schema.productVariants.stock} - 2` }).where(eq(schema.productVariants.id, item.variant.id))
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });
});
