import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
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

async function stockBranch(store, { product, variant }, quantity) {
  await db.insert(schema.storeInventory).values({ storeId: store.id, productId: product.id, variantId: variant.id, quantity });
}

const branchStock = async (store, variant) =>
  (
    await db.query.storeInventory.findFirst({
      where: sql`${schema.storeInventory.storeId} = ${store.id} and ${schema.storeInventory.variantId} = ${variant.id}`,
    })
  )?.quantity;

/** A paid pickup order by a fresh customer, from a branch holding 3 units. */
async function pickupOrder() {
  const { agent, user } = await loginAs("user");
  const setup = await checkoutSetup(user, { price: "100.00", stock: 5 });
  const store = await createBranch();
  await stockBranch(store, setup, 3);
  const { shippingAddressId, shippingMethodId, ...rest } = setup.body();
  const res = await agent.post("/api/orders/checkout").send({ ...rest, pickupStoreId: store.id });
  expect(res.status).toBe(201);
  return { agent, user, setup, store, rest, order: res.body.data };
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
    // The branch's shelf, not the online stock.
    expect(await branchStock(store, setup.variant)).toBe(2);
    expect(await getVariantStock(setup.variant.id)).toBe(5);
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

  test("a branch without enough stock is refused; cancelling puts stock back on its shelf", async () => {
    const { agent, setup, store, rest } = await pickupOrder(); // branch: 2 left
    const tooMany = { ...rest, items: [{ ...rest.items[0], quantity: 3 }], pickupStoreId: store.id };
    const refused = await agent.post("/api/orders/checkout").send(tooMany);
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe("INSUFFICIENT_BRANCH_STOCK");
    const empty = await createBranch();
    expect((await agent.post("/api/orders/checkout").send({ ...rest, pickupStoreId: empty.id })).status).toBe(409);
    expect(await branchStock(store, setup.variant)).toBe(2);

    // An unpaid pickup order releases its units to the branch, not online.
    const { omiseService } = await import("../services/omiseService.js");
    omiseService.createCharge.mockImplementationOnce(async ({ amount }) => ({
      id: `chrg_test_${randomUUID().slice(0, 8)}`,
      status: "pending",
      amount,
      source: { scannable_code: { image: { download_uri: "https://qr.test/x.png" } } },
    }));
    const unpaid = (await agent.post("/api/orders/checkout").send({ ...rest, pickupStoreId: store.id })).body.data;
    expect(await branchStock(store, setup.variant)).toBe(1);
    expect((await agent.post(`/api/orders/${unpaid.id}/cancel`).send({ reason: "changed my mind" })).status).toBe(200);
    expect(await branchStock(store, setup.variant)).toBe(2);
    expect(await getVariantStock(setup.variant.id)).toBe(5);
    const released = await db.query.inventoryMovements.findFirst({
      where: sql`${schema.inventoryMovements.orderId} = ${unpaid.id} and ${schema.inventoryMovements.reason} = 'order_release'`,
    });
    expect(released).toMatchObject({ storeId: store.id, change: 1 });
  });

  test("availability tells which open branches can fill the cart", async () => {
    const { user } = await loginAs("user");
    const setup = await checkoutSetup(user);
    const full = await createBranch();
    const low = await createBranch();
    const closed = await createBranch({ isActive: false });
    await stockBranch(full, setup, 5);
    await stockBranch(low, setup, 1);
    await stockBranch(closed, setup, 9);
    const res = await (await newAgent()).post("/api/stores/availability").send({ items: [{ variantId: setup.variant.id, quantity: 2 }] });
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.stores.map((s) => [s.storeId, s]));
    expect(byId[full.id]).toEqual({ storeId: full.id, available: true, short: [] });
    expect(byId[low.id]).toMatchObject({ available: false, short: [{ variantId: setup.variant.id, requested: 2, available: 1 }] });
    expect(byId[closed.id]).toBeUndefined();
    expect((await (await newAgent()).post("/api/stores/availability").send({ items: [] })).status).toBe(400);
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
