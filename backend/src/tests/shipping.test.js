import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { checkoutSetup, createAddress, createOrder, createShipping } from "./helpers/fixtures.js";

const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { eq } = await import("drizzle-orm");

/** A customer with a placed (paid) order and its shipment. */
async function shippedOrder() {
  const { agent, user } = await loginAs("user");
  const setup = await checkoutSetup(user);
  const res = await agent.post("/api/orders/checkout").send(setup.body());
  const shipment = await db.query.shipments.findFirst({ where: eq(schema.shipments.orderId, res.body.data.id) });
  return { agent, user, order: res.body.data, shipment };
}

describe("public shipping info", () => {
  test("methods and zones: disabled ones are visible to admins only", async () => {
    const { method, zone } = await createShipping();
    const { method: disabled } = await createShipping();
    await db.update(schema.shippingMethods).set({ isActive: false }).where(eq(schema.shippingMethods.id, disabled.id));
    const anon = await newAgent();
    const { agent: admin } = await loginAs("admin");

    const publicIds = (await anon.get("/api/shipping/methods")).body.map((m) => m.id);
    expect(publicIds).toContain(method.id);
    expect(publicIds).not.toContain(disabled.id);
    expect((await admin.get("/api/shipping/methods")).body.map((m) => m.id)).toContain(disabled.id);
    expect((await anon.get("/api/shipping/zones")).body.map((z) => z.id)).toContain(zone.id);
  });

  test("methods for an address need login and ownership", async () => {
    const { agent, user } = await loginAs("user");
    const { agent: stranger } = await loginAs("user");
    const { method } = await createShipping();
    const address = await createAddress(user.id, method.shippingZoneId);

    expect((await (await newAgent()).get("/api/shipping/methods").query({ addressId: address.id })).status).toBe(401);
    const mine = await agent.get("/api/shipping/methods").query({ addressId: address.id });
    expect(mine.body.map((m) => m.id)).toEqual([method.id]);
    expect((await stranger.get("/api/shipping/methods").query({ addressId: address.id })).status).toBe(400);
  });
});

describe("POST /api/shipping/calculate", () => {
  test("prices come from the address zone; other users' addresses are refused", async () => {
    const { agent, user } = await loginAs("user");
    const { agent: stranger } = await loginAs("user");
    const { method } = await createShipping({ price: "65.00" });
    const address = await createAddress(user.id, method.shippingZoneId);

    const res = await agent
      .post("/api/shipping/calculate")
      .send({ addressId: address.id, items: [{ quantity: 1, weight: -100 }] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ methodId: method.id, methodName: method.name, cost: 65, estimatedDays: null }]);

    expect((await stranger.post("/api/shipping/calculate").send({ addressId: address.id })).status).toBe(400);
    expect((await (await newAgent()).post("/api/shipping/calculate").send({ addressId: address.id })).status).toBe(401);
  });

  test("addresses saved without a zone are resolved from the province", async () => {
    const { agent, user } = await loginAs("user");
    let zone = await db.query.shippingZones.findFirst({ where: eq(schema.shippingZones.name, "East") });
    if (!zone) [zone] = await db.insert(schema.shippingZones).values({ name: "East", baseCost: "40.00" }).returning();
    await db.insert(schema.shippingMethods).values({ name: "East Std", code: `E-${randomUUID().slice(0, 6)}`, price: "40.00", shippingZoneId: zone.id });
    const address = await createAddress(user.id, null);
    await db.update(schema.addresses).set({ province: "ชลบุรี" }).where(eq(schema.addresses.id, address.id));

    const res = await agent.post("/api/shipping/calculate").send({ addressId: address.id });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const fixed = await db.query.addresses.findFirst({ where: eq(schema.addresses.id, address.id) });
    expect(fixed.shippingZoneId).toBe(zone.id);
  });
});

describe("customer tracking", () => {
  test("tracking and order shipment are owner-only (admins may read)", async () => {
    const { agent, order, shipment } = await shippedOrder();
    const { agent: stranger } = await loginAs("user");
    const { agent: admin } = await loginAs("admin");

    const track = await agent.get(`/api/shipping/tracking/${shipment.trackingNumber}`);
    expect(track.status).toBe(200);
    expect(track.body.history[0]).toMatchObject({ status: "pending" });
    expect((await stranger.get(`/api/shipping/tracking/${shipment.trackingNumber}`)).status).toBe(404);
    expect((await admin.get(`/api/shipping/tracking/${shipment.trackingNumber}`)).status).toBe(200);

    expect((await agent.get(`/api/shipping/order/${order.id}`)).body.id).toBe(shipment.id);
    expect((await stranger.get(`/api/shipping/order/${order.id}`)).status).toBe(404);
    expect((await agent.get("/api/shipping/tracking/NOPE")).status).toBe(404);
  });
});

describe("admin shipments", () => {
  test("updates move the order along and are recorded in the history", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, order, shipment } = await shippedOrder();

    const shipped = await admin
      .put(`/api/shipping/${shipment.id}`)
      .send({ status: "in_transit", location: "Bangkok hub", description: "Left the warehouse" });
    expect(shipped.status).toBe(200);
    let row = await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id) });
    expect(row).toMatchObject({ status: "shipped", shippingStatus: "in_transit" });

    await admin.put(`/api/shipping/${shipment.id}`).send({ status: "delivered" });
    row = await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id) });
    expect(row.status).toBe("delivered");

    const detail = await admin.get(`/api/shipping/${shipment.id}`);
    expect(detail.body.actualDelivery).toBeTruthy();
    expect(detail.body.history.map((h) => h.status)).toEqual(["delivered", "in_transit", "pending"]);
    expect((await agent.get(`/api/shipping/tracking/${shipment.trackingNumber}`)).body.status).toBe("delivered");
    expect((await admin.put(`/api/shipping/${shipment.id}`).send({ status: "lost" })).status).toBe(400);
  });

  test("create (one per order), list, stats and labels", async () => {
    const { agent: admin } = await loginAs("admin");
    const { user } = await loginAs("user");
    const { order: withShipment } = await shippedOrder();
    const order = await createOrder(user.id);

    const created = await admin.post("/api/shipping").send({ orderId: order.id, carrier: "Kerry" });
    expect(created.status).toBe(201);
    expect(created.body.trackingNumber).toMatch(/^TRK/);
    expect((await admin.post("/api/shipping").send({ orderId: order.id, carrier: "Flash" })).status).toBe(409);
    expect((await admin.post("/api/shipping").send({ orderId: withShipment.id, carrier: "Flash" })).status).toBe(409);
    expect((await admin.post("/api/shipping").send({ orderId: randomUUID(), carrier: "Flash" })).status).toBe(404);

    const list = await admin.get("/api/shipping").query({ search: order.orderNumber });
    expect(list.body.shipments.map((s) => s.id)).toEqual([created.body.id]);
    const stats = await admin.get("/api/shipping/stats");
    expect(stats.body.total).toBeGreaterThanOrEqual(2);

    const label = await admin.post(`/api/shipping/${created.body.id}/label`);
    expect(label.status).toBe(201);
    expect(label.body).toMatchObject({ trackingNumber: created.body.trackingNumber, carrier: "Kerry", orderNumber: order.orderNumber });
    expect((await admin.get(`/api/shipping/${created.body.id}/label`)).body.trackingNumber).toBe(created.body.trackingNumber);
    expect((await admin.get(`/api/shipping/${randomUUID()}`)).status).toBe(404);
  });

  test("method and zone management (zone required, unique codes/names, soft delete)", async () => {
    const { agent: admin } = await loginAs("admin");
    const zoneName = `Zone ${randomUUID().slice(0, 6)}`;

    const zone = await admin.post("/api/shipping/zones").send({ name: zoneName, baseCost: 30, description: "Test" });
    expect(zone.status).toBe(201);
    expect((await admin.post("/api/shipping/zones").send({ name: zoneName, baseCost: 1 })).status).toBe(409);
    expect((await admin.put(`/api/shipping/zones/${zone.body.id}`).send({ baseCost: 35 })).body.baseCost).toBe("35.00");

    const code = `exp-${randomUUID().slice(0, 6)}`;
    expect((await admin.post("/api/shipping/methods").send({ name: "Express", code, price: 99 })).status).toBe(400);
    const method = await admin
      .post("/api/shipping/methods")
      .send({ name: "Express", code, price: 99, shippingZoneId: zone.body.id });
    expect(method.status).toBe(201);
    expect(method.body.code).toBe(code.toUpperCase());
    expect((await admin.post("/api/shipping/methods").send({ name: "Dup", code, price: 1, shippingZoneId: zone.body.id })).status).toBe(409);
    expect((await admin.put(`/api/shipping/methods/${method.body.id}`).send({ price: 120 })).body.price).toBe("120.00");
    expect((await admin.put(`/api/shipping/methods/${method.body.id}`).send({ shippingZoneId: randomUUID() })).status).toBe(400);

    expect((await admin.delete(`/api/shipping/methods/${method.body.id}`)).body.isActive).toBe(false);
    expect((await admin.delete(`/api/shipping/zones/${zone.body.id}`)).body.isActive).toBe(false);
    expect((await admin.delete(`/api/shipping/zones/${randomUUID()}`)).status).toBe(404);
  });

  test("admin endpoints are forbidden for customers", async () => {
    const { agent } = await loginAs("user");
    const id = randomUUID();
    for (const [method, path] of [
      ["get", "/api/shipping/stats"],
      ["get", "/api/shipping"],
      ["post", "/api/shipping"],
      ["get", `/api/shipping/${id}`],
      ["put", `/api/shipping/${id}`],
      ["get", `/api/shipping/${id}/label`],
      ["post", `/api/shipping/${id}/label`],
      ["post", "/api/shipping/methods"],
      ["put", `/api/shipping/methods/${id}`],
      ["delete", `/api/shipping/methods/${id}`],
      ["post", "/api/shipping/zones"],
      ["put", `/api/shipping/zones/${id}`],
      ["delete", `/api/shipping/zones/${id}`],
    ]) {
      expect((await agent[method](path).send({ status: "pending" })).status).toBe(403);
    }
  });
});
