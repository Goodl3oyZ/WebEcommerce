import { jest } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs } from "./helpers/factories.js";
import {
  checkoutSetup,
  createAddress,
  createCoupon,
  createProduct,
  getVariantStock,
} from "./helpers/fixtures.js";

const { omiseService } = await import("../services/omiseService.js");
const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { eq } = await import("drizzle-orm");

const { settingsService } = await import("../services/settingsService.js");

beforeEach(() => jest.clearAllMocks());

/** Next charge stays pending (PromptPay QR shown, not paid yet). */
const unpaidPromptPay = () =>
  omiseService.createCharge.mockImplementationOnce(async ({ amount, source }) => ({
    id: `chrg_test_${randomUUID().slice(0, 8)}`,
    status: "pending",
    amount,
    source: { id: source, scannable_code: { image: { download_uri: "https://qr.test/x.png" } } },
  }));

const setStatus = (orderId, values) =>
  db.update(schema.orders).set(values).where(eq(schema.orders.id, orderId));
const getOrderRow = (orderId) => db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });

/** A logged-in buyer with a ready checkout and one placed (paid) order. */
async function placedOrder(options = {}) {
  const { agent, user } = await loginAs("user");
  const setup = await checkoutSetup(user, options);
  const res = await agent.post("/api/orders/checkout").send(setup.body());
  expect(res.status).toBe(201);
  return { agent, user, setup, order: res.body.data };
}

describe("POST /api/orders/checkout", () => {
  test("computes every amount on the server and ignores client totals", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { price: "100.00", stock: 5, shippingPrice: "50.00" });

    const res = await agent
      .post("/api/orders/checkout")
      .send(setup.body({ shippingCost: -500, paymentAmount: 1 }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      subtotal: "100.00",
      shippingCost: "50.00",
      tax: "7.00",
      total: "157.00",
      status: "paid",
      paymentStatus: "completed",
    });
    expect(res.body.data.orderNumber).toMatch(/^ORD\d{8}-[0-9A-Z]{8}$/);
    expect(omiseService.createCharge.mock.calls[0][0]).toMatchObject({ amount: 15700, currency: "thb" });
    expect(await getVariantStock(setup.variant.id)).toBe(4);
  });

  test("applies a coupon (discount before VAT) and enforces its per-user limit", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { price: "100.00", stock: 10 });
    const coupon = await createCoupon({ type: "percentage", value: "10", perUserLimit: 1 });
    const items = [{ productId: setup.product.id, variantId: setup.variant.id, quantity: 2 }];

    const res = await agent
      .post("/api/orders/checkout")
      .send(setup.body({ items, couponCode: coupon.code.toLowerCase() }));
    expect(res.status).toBe(201);
    // 200 - 20 discount = 180; VAT 12.60; + 50 shipping
    expect(res.body.data).toMatchObject({ subtotal: "200.00", discount: "20.00", tax: "12.60", total: "242.60" });

    const again = await agent.post("/api/orders/checkout").send(setup.body({ couponCode: coupon.code }));
    expect(again.status).toBe(400);
    expect(again.body.message).toMatch(/already used/);
  });

  test("rejects an invalid coupon without reserving stock", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { stock: 3 });
    const res = await agent.post("/api/orders/checkout").send(setup.body({ couponCode: "NOPE" }));
    expect(res.status).toBe(400);
    expect(await getVariantStock(setup.variant.id)).toBe(3);
  });

  test("refuses to oversell, including repeated lines for one variant", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { stock: 5 });
    const line = { productId: setup.product.id, variantId: setup.variant.id, quantity: 3 };

    const res = await agent.post("/api/orders/checkout").send(setup.body({ items: [line, line] }));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INSUFFICIENT_STOCK");
    expect(await getVariantStock(setup.variant.id)).toBe(5);
  });

  test("rejects inactive products, foreign addresses and missing variants", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user);
    const inactive = await createProduct({ isActive: false });
    const other = await createUser();
    const foreignAddress = await createAddress(other.id, setup.shippingMethod.shippingZoneId);

    const inactiveRes = await agent.post("/api/orders/checkout").send(
      setup.body({ items: [{ productId: inactive.product.id, variantId: inactive.variant.id, quantity: 1 }] })
    );
    expect(inactiveRes.status).toBe(404);

    const addressRes = await agent
      .post("/api/orders/checkout")
      .send(setup.body({ shippingAddressId: foreignAddress.id }));
    expect(addressRes.status).toBe(400);

    const noVariant = await agent
      .post("/api/orders/checkout")
      .send(setup.body({ items: [{ productId: setup.product.id, quantity: 1 }] }));
    expect(noVariant.status).toBe(400);
  });

  test("a declined card cancels the order and gives the stock back", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { stock: 2 });
    omiseService.createCharge.mockImplementationOnce(async ({ amount }) => ({
      id: "chrg_test_declined",
      status: "failed",
      failure_message: "insufficient funds",
      amount,
    }));

    const res = await agent.post("/api/orders/checkout").send(setup.body());
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("PAYMENT_DECLINED");
    expect(await getVariantStock(setup.variant.id)).toBe(2);

    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.userId, user.id));
    expect(order.status).toBe("cancelled");
  });

  test("an Omise error cancels the order and gives the stock back", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { stock: 2 });
    omiseService.createCharge.mockRejectedValueOnce(new Error("Omise is down"));

    const res = await agent.post("/api/orders/checkout").send(setup.body());
    expect(res.status).toBe(402);
    expect(await getVariantStock(setup.variant.id)).toBe(2);
  });

  test("PromptPay leaves the order pending with a QR code", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { paymentCode: "promptpay" });
    omiseService.createCharge.mockImplementationOnce(async ({ amount, source }) => ({
      id: "chrg_test_pp",
      status: "pending",
      amount,
      source: { id: source, scannable_code: { image: { download_uri: "https://qr.test/1.png" } } },
    }));

    const res = await agent.post("/api/orders/checkout").send(setup.body());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "pending", paymentStatus: "pending" });
    expect(res.body.data.charge.qrCodeUrl).toBe("https://qr.test/1.png");
  });

  test("cash on delivery is not offered", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { paymentCode: "cod" });
    const res = await agent.post("/api/orders/checkout").send(setup.body());
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not available/);
    expect(omiseService.createCharge).not.toHaveBeenCalled();
    const methods = (await agent.get("/api/payments/methods")).body.map((m) => m.code.toLowerCase());
    expect(methods).not.toContain("cod");
  });

  test("maintenance mode refuses new orders", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user);
    // Mocked rather than saved: other test files share the database.
    const spy = jest.spyOn(settingsService, "getSettings").mockResolvedValueOnce({ maintenance: true });
    const res = await agent.post("/api/orders/checkout").send(setup.body());
    spy.mockRestore();
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("MAINTENANCE");
  });

  test("removes the purchased items from the cart", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user);
    await agent.post("/api/cart/items").send({ productId: setup.product.id, variantId: setup.variant.id, quantity: 1 });
    expect((await agent.get("/api/cart")).body.items).toHaveLength(1);

    await agent.post("/api/orders/checkout").send(setup.body());
    expect((await agent.get("/api/cart")).body.items).toHaveLength(0);
  });
});

describe("reading orders", () => {
  test("GET /api/orders lists only the user's orders, filterable by status", async () => {
    const { agent, order } = await placedOrder();
    await placedOrder(); // someone else's

    const res = await agent.get("/api/orders").query({ status: "paid", limit: 500 });
    expect(res.status).toBe(200);
    expect(res.body.data.orders.map((o) => o.id)).toEqual([order.id]);
    expect(res.body.data.pagination.limit).toBe(100);
    expect((await agent.get("/api/orders").query({ status: "bogus" })).status).toBe(400);
  });

  test("GET /api/orders/:id, /status and /tracking are owner-only (admins may read)", async () => {
    const { agent, order } = await placedOrder();
    const { agent: stranger } = await loginAs("user");
    const { agent: admin } = await loginAs("admin");

    expect((await agent.get(`/api/orders/${order.id}`)).status).toBe(200);
    const status = await agent.get(`/api/orders/${order.id}/status`);
    expect(status.body.data.history.map((h) => h.status)).toEqual(expect.arrayContaining(["pending", "paid"]));
    const tracking = await agent.get(`/api/orders/${order.id}/tracking`);
    expect(tracking.body.data.trackingNumber).toBe(order.trackingNumber);

    for (const path of ["", "/status", "/tracking"]) {
      expect((await stranger.get(`/api/orders/${order.id}${path}`)).status).toBe(404);
      expect((await admin.get(`/api/orders/${order.id}${path}`)).status).toBe(200);
    }
    expect((await agent.get("/api/orders/not-a-uuid")).status).toBe(404);
  });

  test("DELETE /api/orders/:id is refused", async () => {
    const { agent, order } = await placedOrder();
    const res = await agent.delete(`/api/orders/${order.id}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("HARD_DELETE_PROHIBITED");
  });

  test("order routes require authentication", async () => {
    const res = await (await newAgent()).get("/api/orders");
    expect(res.status).toBe(401);
  });
});

describe("customer actions", () => {
  test("cancel: unpaid pending orders only; stock is released", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { paymentCode: "promptpay", stock: 3 });
    unpaidPromptPay();
    const { body } = await agent.post("/api/orders/checkout").send(setup.body());
    expect(await getVariantStock(setup.variant.id)).toBe(2);

    const res = await agent.post(`/api/orders/${body.data.id}/cancel`).send({ reason: "Changed my mind" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
    expect(await getVariantStock(setup.variant.id)).toBe(3);

    const { agent: paidAgent, order: paid } = await placedOrder();
    const refused = await paidAgent.post(`/api/orders/${paid.id}/cancel`).send({ reason: "x" });
    expect(refused.status).toBe(400);
    expect((await agent.post(`/api/orders/${body.data.id}/cancel`).send({})).status).toBe(400);
  });

  test("refund request: delivered orders only, amount within the total", async () => {
    const { agent, order } = await placedOrder();
    const early = await agent.post(`/api/orders/${order.id}/refund`).send({ reason: "Broken" });
    expect(early.status).toBe(400);

    await setStatus(order.id, { status: "delivered" });
    const tooMuch = await agent.post(`/api/orders/${order.id}/refund`).send({ reason: "Broken", amount: 99999 });
    expect(tooMuch.status).toBe(400);

    const res = await agent.post(`/api/orders/${order.id}/refund`).send({ reason: "Broken", amount: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "refund_requested", refundAmount: "50.00" });
    // The request does not move money or mark the order refunded.
    expect((await getOrderRow(order.id)).paymentStatus).toBe("completed");
  });

  test("PATCH /:id/status: customers can only confirm delivery of their shipped order", async () => {
    const { agent, order } = await placedOrder();
    const { agent: stranger } = await loginAs("user");

    // The old ?x=/admin/ bypass no longer grants admin rights.
    const hack = await agent.patch(`/api/orders/${order.id}/status?x=/admin/`).send({ status: "refunded" });
    expect(hack.status).toBe(400);
    expect((await agent.patch(`/api/orders/${order.id}/status`).send({ status: "delivered" })).status).toBe(400);

    await setStatus(order.id, { status: "shipped" });
    expect((await stranger.patch(`/api/orders/${order.id}/status`).send({ status: "delivered" })).status).toBe(404);
    const res = await agent.patch(`/api/orders/${order.id}/status`).send({ status: "delivered" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "delivered", shippingStatus: "delivered" });
  });
});

describe("admin order management", () => {
  test("admin routes are forbidden for customers", async () => {
    const { agent, order } = await placedOrder();
    for (const [method, path] of [
      ["get", "/api/orders/admin/all"],
      ["get", "/api/orders/admin/stats"],
      ["put", `/api/orders/admin/${order.id}/status`],
      ["patch", `/api/orders/admin/${order.id}/status`],
      ["put", `/api/orders/admin/${order.id}/shipping`],
    ]) {
      expect((await agent[method](path).send({ status: "processing", trackingNumber: "X" })).status).toBe(403);
    }
  });

  test("GET /admin/all searches by order number; /admin/stats counts revenue from paid orders", async () => {
    const { agent: admin } = await loginAs("admin");
    const { order } = await placedOrder({ price: "200.00" });

    const list = await admin.get("/api/orders/admin/all").query({ search: order.orderNumber });
    expect(list.status).toBe(200);
    expect(list.body.orders.map((o) => o.id)).toEqual([order.id]);

    const stats = await admin.get("/api/orders/admin/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.paid).toBeGreaterThanOrEqual(1);
    expect(stats.body.totalAmount).toBeGreaterThanOrEqual(Number(order.total));
    expect((await admin.get("/api/orders/admin/stats").query({ startDate: "yesterday" })).status).toBe(400);
  });

  test("status changes follow the allowed transitions (PUT and PATCH)", async () => {
    const { agent: admin } = await loginAs("admin");
    const { order } = await placedOrder();

    expect((await admin.put(`/api/orders/admin/${order.id}/status`).send({ status: "delivered" })).status).toBe(400);
    const processing = await admin.put(`/api/orders/admin/${order.id}/status`).send({ status: "processing" });
    expect(processing.body.data.status).toBe("processing");
    const shipped = await admin
      .patch(`/api/orders/admin/${order.id}/status`)
      .send({ status: "shipped", trackingNumber: "TH123" });
    expect(shipped.body.data).toMatchObject({ status: "shipped", trackingNumber: "TH123" });
    expect((await admin.put(`/api/orders/admin/${order.id}/status`).send({ status: "paid" })).status).toBe(400);
  });

  test("a paid order must be refunded through payments, not by status", async () => {
    const { agent: admin } = await loginAs("admin");
    const { order } = await placedOrder();
    for (const status of ["cancelled", "refunded"]) {
      expect((await admin.put(`/api/orders/admin/${order.id}/status`).send({ status })).status).toBe(400);
    }
  });

  test("cancelling an unpaid order releases its stock", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { paymentCode: "promptpay", stock: 4 });
    unpaidPromptPay();
    const { body } = await agent.post("/api/orders/checkout").send(setup.body());

    const res = await admin.put(`/api/orders/admin/${body.data.id}/status`).send({ status: "cancelled", notes: "Out of area" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
    expect(await getVariantStock(setup.variant.id)).toBe(4);
  });

  test("PUT /admin/:id/shipping updates tracking and ships a paid order", async () => {
    const { agent: admin } = await loginAs("admin");
    const { order } = await placedOrder();

    const res = await admin
      .put(`/api/orders/admin/${order.id}/shipping`)
      .send({ trackingNumber: "KERRY-1", carrier: "Kerry", status: "shipped" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: "shipped", trackingNumber: "KERRY-1", carrier: "Kerry" });

    const shipment = await db.query.shipments.findFirst({ where: eq(schema.shipments.orderId, order.id) });
    expect(shipment).toMatchObject({ trackingNumber: "KERRY-1", status: "shipped" });
    expect((await admin.put(`/api/orders/admin/${randomUUID()}/shipping`).send({ trackingNumber: "X" })).status).toBe(404);
  });
});
