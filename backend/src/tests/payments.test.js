import { jest } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { checkoutSetup, createOrder, getPaymentMethod } from "./helpers/fixtures.js";

const { omiseService } = await import("../services/omiseService.js");
const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { eq } = await import("drizzle-orm");

beforeEach(() => jest.clearAllMocks());

const getOrderRow = (id) => db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
const getPaymentRow = (id) =>
  db.query.paymentTransactions.findFirst({ where: eq(schema.paymentTransactions.id, id) });
const pendingCharge = (id = `chrg_test_${randomUUID().slice(0, 8)}`) =>
  jest.fn(async ({ amount, source }) => ({
    id,
    status: "pending",
    amount,
    source: { id: source, scannable_code: { image: { download_uri: "https://qr.test/x.png" } } },
  }));

/** A PromptPay order whose charge is still pending (QR shown, not yet paid). */
async function pendingPromptPayOrder() {
  const { agent, user } = await loginAs("user");
  const setup = await checkoutSetup(user, { paymentCode: "promptpay" });
  const chargeId = `chrg_test_${randomUUID().slice(0, 8)}`;
  omiseService.createCharge.mockImplementationOnce(pendingCharge(chargeId));
  const res = await agent.post("/api/orders/checkout").send(setup.body());
  expect(res.status).toBe(201);
  const [payment] = await db
    .select()
    .from(schema.paymentTransactions)
    .where(eq(schema.paymentTransactions.orderId, res.body.data.id));
  return { agent, user, order: res.body.data, payment, chargeId };
}

/** A card order that has been charged successfully. */
async function paidOrder() {
  const { agent, user } = await loginAs("user");
  const setup = await checkoutSetup(user, { price: "100.00" });
  const res = await agent.post("/api/orders/checkout").send(setup.body());
  const [payment] = await db
    .select()
    .from(schema.paymentTransactions)
    .where(eq(schema.paymentTransactions.orderId, res.body.data.id));
  return { agent, user, order: res.body.data, payment };
}

describe("3-D Secure card payments", () => {
  test("a card waiting on the bank sends the customer there, and the return confirms it", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { price: "100.00" });
    const chargeId = `chrg_test_${randomUUID().slice(0, 8)}`;
    omiseService.createCharge.mockImplementationOnce(async ({ amount }) => ({
      id: chargeId,
      status: "pending",
      amount,
      authorize_uri: "https://api.omise.co/payments/test/authorize",
    }));

    const res = await agent.post("/api/orders/checkout").send(setup.body());
    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(omiseService.createCharge.mock.calls[0][0].returnUri).toBe(
      `http://localhost:3000/orders/${order.id}?payment=return`
    );
    expect(res.body.data.charge).toMatchObject({ status: "pending", authorizeUri: "https://api.omise.co/payments/test/authorize" });
    expect((await getOrderRow(order.id)).status).toBe("pending");

    // Back from the bank: the page asks for the payment's status, which checks Omise.
    omiseService.getCharge.mockResolvedValueOnce({ id: chargeId, status: "successful", paid: true });
    const [payment] = (await agent.get(`/api/payments/order/${order.id}`)).body;
    expect((await agent.get(`/api/payments/${payment.id}/status`)).body.status).toBe("completed");
    expect(await getOrderRow(order.id)).toMatchObject({ status: "paid", paymentStatus: "completed" });
  });

  test("a charge that already succeeded is not sent to the bank page", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { price: "100.00" });
    omiseService.createCharge.mockImplementationOnce(async ({ amount }) => ({
      id: `chrg_test_${randomUUID().slice(0, 8)}`,
      status: "successful",
      paid: true,
      amount,
      authorize_uri: "https://api.omise.co/payments/test/authorize",
    }));
    const res = await agent.post("/api/orders/checkout").send(setup.body());
    expect(res.body.data.charge.authorizeUri).toBeNull();
    expect(res.body.data.paymentStatus).toBe("completed");
  });
});

describe("POST /api/payments (pay or retry an order)", () => {
  test("paying again with PromptPay returns the open QR instead of a second charge", async () => {
    const { agent, order, payment } = await pendingPromptPayOrder();
    jest.clearAllMocks();

    const res = await agent.post("/api/payments").send({ orderId: order.id, method: "promptpay" });
    expect(res.status).toBe(200);
    expect(res.body.data.payment.id).toBe(payment.id);
    expect(res.body.data.charge.qrCodeUrl).toBe("https://qr.test/x.png");
    expect(omiseService.createCharge).not.toHaveBeenCalled();
  });

  test("charges the server-side order total, ignoring the client amount", async () => {
    const { agent, user } = await loginAs("user");
    const order = await createOrder(user.id, { total: "1234.50" });

    const res = await agent
      .post("/api/payments")
      .send({ orderId: order.id, method: "promptpay", amount: 1, currency: "USD" });

    expect(res.status).toBe(201);
    expect(omiseService.createCharge.mock.calls[0][0]).toMatchObject({ amount: 123450, currency: "thb" });
    expect(Number(res.body.data.payment.amount)).toBe(1234.5);
    expect(res.body.data.payment.status).toBe("completed");
    expect((await getOrderRow(order.id)).paymentStatus).toBe("completed");
  });

  test("a successful payment cannot be repeated (no double charge)", async () => {
    const { agent, user } = await loginAs("user");
    const order = await createOrder(user.id);
    await agent.post("/api/payments").send({ orderId: order.id, method: "promptpay" });
    const again = await agent.post("/api/payments").send({ orderId: order.id, method: "promptpay" });
    expect(again.status).toBe(409);
    expect(omiseService.createCharge).toHaveBeenCalledTimes(1);
  });

  test("switching method replaces the previous pending attempt", async () => {
    const { agent, order, payment } = await pendingPromptPayOrder();
    omiseService.createCharge.mockImplementationOnce(async ({ amount }) => ({
      id: "chrg_test_card_retry",
      status: "successful",
      amount,
    }));

    const res = await agent
      .post("/api/payments")
      .send({ orderId: order.id, method: "credit_card", cardToken: "tokn_test_x" });
    expect(res.status).toBe(201);
    expect(res.body.data.payment.status).toBe("completed");
    expect((await getPaymentRow(payment.id)).status).toBe("superseded");
  });

  test("a declined card returns 402 and keeps the order open", async () => {
    const { agent, user } = await loginAs("user");
    const order = await createOrder(user.id);
    omiseService.createCharge.mockImplementationOnce(async () => ({
      id: "chrg_test_declined",
      status: "failed",
      failure_message: "stolen card",
    }));

    const res = await agent
      .post("/api/payments")
      .send({ orderId: order.id, method: "credit_card", cardToken: "tokn_test" });
    expect(res.status).toBe(402);
    const row = await getOrderRow(order.id);
    expect(row).toMatchObject({ status: "pending", paymentStatus: "failed" });
  });

  test("validates the body and ownership", async () => {
    const { agent } = await loginAs("user");
    const { user: other } = await loginAs("user");
    const othersOrder = await createOrder(other.id);

    expect((await agent.post("/api/payments").send({ orderId: othersOrder.id, method: "credit_card" })).status).toBe(400);
    const res = await agent.post("/api/payments").send({ orderId: othersOrder.id, method: "promptpay" });
    expect(res.status).toBe(404);
    expect(omiseService.createCharge).not.toHaveBeenCalled();
    expect((await (await newAgent()).post("/api/payments").send({})).status).toBe(401);
  });

  test("POST /api/payments/create is a working alias", async () => {
    const { agent, user } = await loginAs("user");
    const order = await createOrder(user.id);
    const res = await agent.post("/api/payments/create").send({ orderId: order.id, method: "promptpay" });
    expect(res.status).toBe(201);
  });
});

describe("POST /api/payments/webhook/omise", () => {
  test("a forged 'successful' event cannot mark an order paid", async () => {
    const { order, chargeId } = await pendingPromptPayOrder();
    omiseService.getCharge.mockResolvedValueOnce({ id: chargeId, status: "pending" });

    const res = await (await newAgent()).post("/api/payments/webhook/omise").send({
      object: "event",
      key: "charge.complete",
      data: { object: "charge", id: chargeId, status: "successful", metadata: { orderId: order.id } },
    });

    expect(res.status).toBe(200);
    expect(omiseService.getCharge).toHaveBeenCalledWith(chargeId);
    expect((await getOrderRow(order.id)).paymentStatus).toBe("pending");
  });

  test("marks the order paid when Omise confirms the charge", async () => {
    const { order, chargeId } = await pendingPromptPayOrder();
    omiseService.getCharge.mockResolvedValueOnce({ id: chargeId, status: "successful" });

    const res = await (await newAgent())
      .post("/api/payments/webhook/omise")
      .send({ object: "event", key: "charge.complete", data: { object: "charge", id: chargeId } });

    expect(res.body).toMatchObject({ received: true, handled: true });
    expect(await getOrderRow(order.id)).toMatchObject({ status: "paid", paymentStatus: "completed" });
  });

  test("an expired PromptPay charge cancels the order and releases stock", async () => {
    const { order, chargeId } = await pendingPromptPayOrder();
    omiseService.getCharge.mockResolvedValueOnce({ id: chargeId, status: "expired" });

    await (await newAgent())
      .post("/api/payments/webhook/omise")
      .send({ object: "event", key: "charge.complete", data: { object: "charge", id: chargeId } });

    expect(await getOrderRow(order.id)).toMatchObject({ status: "cancelled", paymentStatus: "failed" });
  });

  test("ignores unknown charges and malformed events", async () => {
    const agent = await newAgent();
    const unknown = await agent
      .post("/api/payments/webhook/omise")
      .send({ object: "event", data: { object: "charge", id: "chrg_unknown" } });
    expect(unknown.body).toMatchObject({ handled: false });
    const junk = await agent.post("/api/payments/webhook/omise").send({ hello: "world" });
    expect(junk.status).toBe(200);
    expect(junk.body.handled).toBe(false);
    expect(omiseService.getCharge).not.toHaveBeenCalled();
  });
});

describe("reading payments", () => {
  test("GET /:id, /:id/status and POST /:id/verify (refresh from Omise)", async () => {
    const { agent, order, payment, chargeId } = await pendingPromptPayOrder();
    const { agent: stranger } = await loginAs("user");
    const { agent: admin } = await loginAs("admin");

    expect((await agent.get(`/api/payments/${payment.id}`)).body.id).toBe(payment.id);
    expect((await stranger.get(`/api/payments/${payment.id}`)).status).toBe(404);
    expect((await admin.get(`/api/payments/${payment.id}`)).status).toBe(200);

    omiseService.getCharge.mockResolvedValueOnce({ id: chargeId, status: "pending" });
    const pending = await agent.get(`/api/payments/${payment.id}/status`);
    expect(pending.body).toMatchObject({ status: "pending", qrCodeUrl: "https://qr.test/x.png" });

    omiseService.getCharge.mockResolvedValueOnce({ id: chargeId, status: "successful" });
    const verified = await agent.post(`/api/payments/${payment.id}/verify`).send({});
    expect(verified.body.status).toBe("completed");
    expect((await getOrderRow(order.id)).status).toBe("paid");

    expect((await stranger.get(`/api/payments/${payment.id}/status`)).status).toBe(404);
    expect((await agent.get("/api/payments/not-a-uuid")).status).toBe(404);
  });

  test("GET /order/:orderId is owner-only (admins may read)", async () => {
    const { agent, order } = await paidOrder();
    const { agent: stranger } = await loginAs("user");
    const { agent: admin } = await loginAs("admin");
    const res = await agent.get(`/api/payments/order/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect((await stranger.get(`/api/payments/order/${order.id}`)).status).toBe(404);
    expect((await admin.get(`/api/payments/order/${order.id}`)).status).toBe(200);
  });

  test("GET /history and /methods", async () => {
    const { agent, payment } = await paidOrder();
    const history = await agent.get("/api/payments/history");
    expect(history.body.transactions.map((t) => t.id)).toEqual([payment.id]);

    await getPaymentMethod("card");
    const methods = await agent.get("/api/payments/methods");
    expect(methods.body.some((m) => m.code === "card")).toBe(true);
  });

  test("DELETE /:id is refused", async () => {
    const { agent, payment } = await paidOrder();
    expect((await agent.delete(`/api/payments/${payment.id}`)).body.code).toBe("HARD_DELETE_PROHIBITED");
  });
});

describe("admin payments", () => {
  test("statistics, transactions and store payments are admin-only", async () => {
    const { agent } = await loginAs("user");
    for (const path of [
      "/api/payments/stats",
      "/api/payments/admin/transactions",
      "/api/payments/admin/statistics",
      `/api/payments/store/${randomUUID()}`,
    ]) {
      expect((await agent.get(path)).status).toBe(403);
    }
  });

  test("statistics count money received; transactions filter by status", async () => {
    const { agent: admin } = await loginAs("admin");
    const { payment } = await paidOrder();

    const stats = await admin.get("/api/payments/admin/statistics");
    expect(stats.status).toBe(200);
    expect(stats.body.statusCounts.completed).toBeGreaterThanOrEqual(1);
    expect(stats.body.totalAmount).toBeGreaterThanOrEqual(Number(payment.amount));
    expect((await admin.get("/api/payments/stats")).status).toBe(200);

    const list = await admin.get("/api/payments/admin/transactions").query({ status: "completed", limit: 1000 });
    expect(list.status).toBe(200);
    expect(list.body.limit).toBe(100);
    expect(list.body.transactions.every((t) => t.status === "completed")).toBe(true);
  });

  test("GET /store/:storeId returns payments for orders picked up at that store", async () => {
    const { agent: admin } = await loginAs("admin");
    const { order, payment } = await paidOrder();
    const [store] = await db.insert(schema.stores).values({ name: "Siam Branch" }).returning();
    await db.insert(schema.storePickups).values({ orderId: order.id, storeId: store.id });

    const res = await admin.get(`/api/payments/store/${store.id}`);
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.id)).toEqual([payment.id]);

    const stats = await admin.get("/api/payments/stats").query({ storeId: store.id });
    expect(stats.body.totalTransactions).toBe(1);
  });

  test("PUT /:id/status confirms a payment and syncs the order", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent } = await loginAs("user");
    const { order, payment } = await pendingPromptPayOrder();

    expect((await agent.put(`/api/payments/${payment.id}/status`).send({ status: "completed" })).status).toBe(403);
    const res = await admin.put(`/api/payments/${payment.id}/status`).send({ status: "completed" });
    expect(res.status).toBe(200);
    expect(await getOrderRow(order.id)).toMatchObject({ status: "paid", paymentStatus: "completed" });
    expect((await admin.put(`/api/payments/${payment.id}/status`).send({ status: "refunded" })).status).toBe(400);
  });

  test("POST /:id/refund returns money through Omise, partially then fully", async () => {
    const { agent: admin } = await loginAs("admin");
    const { order, payment } = await paidOrder(); // total 157.00

    const partial = await admin.post(`/api/payments/${payment.id}/refund`).send({ amount: 57, reason: "Damaged" });
    expect(partial.status).toBe(200);
    expect(omiseService.createRefund).toHaveBeenCalledWith(payment.transactionId, 5700);
    expect(partial.body.data.payment).toMatchObject({ status: "partially_refunded", refundAmount: "57.00" });

    const tooMuch = await admin.post(`/api/payments/${payment.id}/refund`).send({ amount: 101, reason: "x" });
    expect(tooMuch.status).toBe(400);

    const rest = await admin.post(`/api/payments/${payment.id}/refund`).send({ reason: "Returned" });
    expect(rest.status).toBe(200);
    expect(omiseService.createRefund).toHaveBeenLastCalledWith(payment.transactionId, 10000);
    expect(await getOrderRow(order.id)).toMatchObject({ status: "refunded", paymentStatus: "refunded" });

    expect((await admin.post(`/api/payments/${payment.id}/refund`).send({ reason: "again" })).status).toBe(400);
  });

  test("refunds are admin-only and need a completed payment", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, payment } = await pendingPromptPayOrder();
    expect((await agent.post(`/api/payments/${payment.id}/refund`).send({ reason: "x" })).status).toBe(403);
    expect((await admin.post(`/api/payments/${payment.id}/refund`).send({ reason: "x" })).status).toBe(400);
  });
});
