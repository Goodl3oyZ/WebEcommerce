import { randomUUID } from "node:crypto";
import { loginAs } from "./helpers/factories.js";
import { checkoutSetup, getVariantStock } from "./helpers/fixtures.js";

const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { eq, sql } = await import("drizzle-orm");

async function createBranch(overrides = {}) {
  const [store] = await db
    .insert(schema.stores)
    .values({ name: `Siam ${randomUUID().slice(0, 6)}`, address: "1 Rama I", city: "Bangkok", ...overrides })
    .returning();
  return store;
}

/** A paid pickup order by a fresh customer. */
async function pickupOrder() {
  const { agent, user } = await loginAs("user");
  const setup = await checkoutSetup(user, { price: "100.00", stock: 5 });
  const store = await createBranch();
  const { shippingAddressId, shippingMethodId, ...rest } = setup.body();
  const res = await agent.post("/api/orders/checkout").send({ ...rest, pickupStoreId: store.id });
  expect(res.status).toBe(201);
  return { agent, user, setup, store, order: res.body.data };
}

describe("click & collect", () => {
  test("a pickup order has no address, shipping method, fee or shipment", async () => {
    const { agent, setup, store, order } = await pickupOrder();
    expect(order).toMatchObject({
      fulfillment: "pickup",
      shippingCost: "0.00",
      total: "107.00",
      shippingAddressId: null,
      shippingMethodId: null,
      trackingNumber: null,
      status: "paid",
    });
    expect(await getVariantStock(setup.variant.id)).toBe(4);
    expect(await db.query.shipments.findFirst({ where: eq(schema.shipments.orderId, order.id) })).toBeUndefined();

    const detail = (await agent.get(`/api/orders/${order.id}`)).body.data;
    expect(detail.pickup).toMatchObject({ status: "pending", store: { id: store.id, name: store.name } });
    expect(detail.pickups).toBeUndefined();
    const list = (await agent.get("/api/orders")).body.data.orders;
    expect(list.find((o) => o.id === order.id).pickup.store.name).toBe(store.name);
  });

  test("checkout needs a branch, or an address and shipping method", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user);
    const { shippingAddressId, shippingMethodId, ...rest } = setup.body();

    expect((await agent.post("/api/orders/checkout").send(rest)).status).toBe(400);
    expect((await agent.post("/api/orders/checkout").send({ ...rest, shippingAddressId })).status).toBe(400);
    const closed = await createBranch({ isActive: false });
    const res = await agent.post("/api/orders/checkout").send({ ...rest, pickupStoreId: closed.id });
    expect(res.status).toBe(400);
    expect(await getVariantStock(setup.variant.id)).toBe(10);
  });

  test("staff mark it ready (customer told) and then collected", async () => {
    const { agent: customer, user, store, order } = await pickupOrder();
    const { agent: admin } = await loginAs("admin");
    const pickup = (status) => admin.put(`/api/orders/admin/${order.id}/pickup`).send({ status });

    expect((await customer.put(`/api/orders/admin/${order.id}/pickup`).send({ status: "ready" })).status).toBe(403);
    expect((await pickup("collected")).status).toBe(400); // not ready yet
    expect((await admin.put(`/api/orders/admin/${order.id}/status`).send({ status: "shipped" })).status).toBe(400);
    expect(
      (await admin.put(`/api/orders/admin/${order.id}/shipping`).send({ trackingNumber: "TH1", status: "shipped" })).status
    ).toBe(400);

    const ready = await pickup("ready");
    expect(ready.status).toBe(200);
    expect(ready.body.data).toMatchObject({ status: "processing", pickup: { status: "ready" } });
    expect(ready.body.data.pickup.readyAt).toBeTruthy();
    const note = await db.query.notifications.findFirst({
      where: sql`${schema.notifications.userId} = ${user.id} and ${schema.notifications.title} = 'สินค้าพร้อมให้รับที่สาขา'`,
    });
    expect(note.message).toContain(store.name);
    expect((await pickup("ready")).status).toBe(200); // repeat is harmless

    const collected = await pickup("collected");
    expect(collected.body.data).toMatchObject({ status: "delivered", shippingStatus: "delivered", pickup: { status: "collected" } });
    expect(collected.body.data.pickup.pickupDate).toBeTruthy();

    // A collected order can still be refunded like any delivered order.
    expect((await customer.post(`/api/orders/${order.id}/refund`).send({ reason: "broken" })).status).toBe(200);
  });

  test("the generic status update hands a pickup over only once it is ready", async () => {
    const { order } = await pickupOrder();
    const { agent: admin } = await loginAs("admin");
    await admin.put(`/api/orders/admin/${order.id}/status`).send({ status: "processing" });
    expect((await admin.put(`/api/orders/admin/${order.id}/status`).send({ status: "delivered" })).status).toBe(400);
    await admin.put(`/api/orders/admin/${order.id}/pickup`).send({ status: "ready" });
    expect((await admin.put(`/api/orders/admin/${order.id}/status`).send({ status: "delivered" })).status).toBe(200);
    const row = await db.query.storePickups.findFirst({ where: eq(schema.storePickups.orderId, order.id) });
    expect(row.status).toBe("collected");
  });

  test("delivery orders cannot use the pickup endpoint", async () => {
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user);
    const order = (await agent.post("/api/orders/checkout").send(setup.body())).body.data;
    expect(order.fulfillment).toBe("delivery");
    const { agent: admin } = await loginAs("admin");
    expect((await admin.put(`/api/orders/admin/${order.id}/pickup`).send({ status: "ready" })).status).toBe(400);
    expect((await admin.put(`/api/orders/admin/${order.id}/pickup`).send({ status: "gone" })).status).toBe(400);
  });
});
