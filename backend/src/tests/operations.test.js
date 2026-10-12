import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs } from "./helpers/factories.js";
import { checkoutSetup, createProduct } from "./helpers/fixtures.js";

const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { ENV } = await import("../config/loadENV.js");

const newStore = async (name = `Branch ${randomUUID().slice(0, 6)}`) =>
  (await db.insert(schema.stores).values({ name }).returning())[0];

describe("notifications", () => {
  test("admins send to recipients (deduplicated) or broadcast; empty sends are refused", async () => {
    const { agent: admin } = await loginAs("admin");
    const a = await createUser();
    const b = await createUser();
    const body = { type: "promotion", title: "Sale", message: "50% off", priority: "high" };

    const targeted = await admin.post("/api/notifications").send({ ...body, userId: a.id, recipients: [a.id, b.id] });
    expect(targeted.status).toBe(201);
    expect(targeted.body.sent).toBe(2);
    expect(targeted.body.notifications[0].priority).toBe("high");

    const broadcast = await admin.post("/api/notifications").send({ ...body, broadcast: true });
    expect(broadcast.body.sent).toBeGreaterThanOrEqual(2);

    expect((await admin.post("/api/notifications").send(body)).status).toBe(400);
    expect((await admin.post("/api/notifications").send({ ...body, recipients: [randomUUID()] })).status).toBe(400);
  });

  test("customers read, mark read and delete only their own", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, user } = await loginAs("user");
    const { agent: other } = await loginAs("user");
    const sent = (await admin.post("/api/notifications").send({ type: "order", title: "A", message: "x", recipients: [user.id] })).body;
    await admin.post("/api/notifications").send({ type: "order", title: "B", message: "y", recipients: [user.id] });
    const id = sent.notifications[0].id;

    const list = await agent.get("/api/notifications");
    expect(list.body).toMatchObject({ unreadCount: 2 });
    expect((await agent.get(`/api/notifications/${id}`)).body.title).toBe("A");
    expect((await other.get(`/api/notifications/${id}`)).status).toBe(404);

    expect((await agent.put(`/api/notifications/${id}/read`)).body.isRead).toBe(true);
    expect((await agent.patch(`/api/notifications/${id}/read`)).status).toBe(200);
    expect((await agent.get("/api/notifications").query({ unreadOnly: "true" })).body.notifications).toHaveLength(1);
    expect((await agent.put("/api/notifications/read-all").send({})).body.updated).toBe(1);
    expect((await agent.patch("/api/notifications/read-all").send({ notificationIds: [id] })).body.updated).toBe(0);

    expect((await other.delete(`/api/notifications/${id}`)).status).toBe(404);
    expect((await agent.delete(`/api/notifications/${id}`)).status).toBe(204);
  });

  test("admin views, edits (priority kept in metadata) and deletes any", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, user } = await loginAs("user");
    const id = (await admin.post("/api/notifications").send({ type: "system", title: "T", message: "m", userId: user.id })).body
      .notifications[0].id;

    expect((await admin.get("/api/notifications/admin/all").query({ userId: user.id })).body.notifications).toHaveLength(1);
    expect((await admin.get(`/api/notifications/admin/${id}`)).body.id).toBe(id);
    expect((await admin.put(`/api/notifications/${id}`).send({ priority: "low" })).body.priority).toBe("low");
    expect((await admin.patch(`/api/notifications/${id}`).send({ title: "T2" })).body).toMatchObject({ title: "T2", priority: "low" });
    expect((await admin.delete(`/api/notifications/admin/${id}`)).status).toBe(204);
    expect((await admin.get(`/api/notifications/admin/${id}`)).status).toBe(404);

    for (const [method, path] of [
      ["get", "/api/notifications/admin/all"],
      ["post", "/api/notifications"],
      ["put", `/api/notifications/${id}`],
      ["delete", `/api/notifications/admin/${id}`],
    ]) {
      expect((await agent[method](path).send({})).status).toBe(403);
    }
  });
});

describe("store inventory", () => {
  test("create, list by store/product, set, adjust (never below zero), low stock", async () => {
    const { agent } = await loginAs("admin");
    const store = await newStore();
    const { product, variant } = await createProduct();

    const item = await agent.post("/api/inventory").send({ storeId: store.id, productId: product.id, variantId: variant.id, quantity: 8 });
    expect(item.status).toBe(201);
    expect((await agent.post("/api/inventory").send({ storeId: store.id, productId: product.id, variantId: variant.id })).status).toBe(409);

    expect((await agent.get(`/api/inventory/location/${store.id}`)).body.items.map((i) => i.id)).toEqual([item.body.id]);
    expect((await agent.get(`/api/inventory/product/${product.id}`)).body.items).toHaveLength(1);
    expect((await agent.get(`/api/inventory/${item.body.id}`)).body.store.id).toBe(store.id);
    expect((await agent.get("/api/inventory")).status).toBe(200);

    expect((await agent.put(`/api/inventory/${item.body.id}`).send({ quantity: 6 })).body.quantity).toBe(6);
    expect((await agent.post(`/api/inventory/${item.body.id}/adjust`).send({ quantity: -4, reason: "Damaged" })).body.quantity).toBe(2);
    expect((await agent.post(`/api/inventory/${item.body.id}/adjust`).send({ quantity: -3, reason: "x" })).status).toBe(400);

    const low = await agent.get("/api/inventory/low-stock").query({ threshold: 2 });
    expect(low.body.items.map((i) => i.id)).toContain(item.body.id);
  });

  test("transfers move stock atomically and never to the same store", async () => {
    const { agent } = await loginAs("admin");
    const from = await newStore();
    const to = await newStore();
    const { product, variant } = await createProduct();
    const source = (await agent.post("/api/inventory").send({ storeId: from.id, productId: product.id, variantId: variant.id, quantity: 5 })).body;

    expect((await agent.post(`/api/inventory/${source.id}/transfer`).send({ toStoreId: from.id, quantity: 1 })).status).toBe(400);
    expect((await agent.post(`/api/inventory/${source.id}/transfer`).send({ toStoreId: to.id, quantity: 9 })).status).toBe(400);

    const moved = await agent.post(`/api/inventory/${source.id}/transfer`).send({ toStoreId: to.id, quantity: 3 });
    expect(moved.body.source.quantity).toBe(2);
    expect(moved.body.destination).toMatchObject({ storeId: to.id, quantity: 3 });
    const again = await agent.post(`/api/inventory/${source.id}/transfer`).send({ toStoreId: to.id, quantity: 2 });
    expect(again.body.destination.quantity).toBe(5);
    expect((await agent.post(`/api/inventory/${source.id}/transfer`).send({ toStoreId: randomUUID(), quantity: 1 })).status).toBe(400);
  });

  test("admin-only", async () => {
    const { agent } = await loginAs("user");
    expect((await agent.get("/api/inventory")).status).toBe(403);
    expect((await agent.get("/api/inventory/low-stock")).status).toBe(403);
  });
});

describe("suppliers", () => {
  test("CRUD and linked products", async () => {
    const { agent } = await loginAs("admin");
    const { product } = await createProduct();
    const name = `Supplier ${randomUUID().slice(0, 6)}`;
    const supplier = await agent.post("/api/suppliers").send({
      name,
      contactPerson: "Ann",
      email: "ann@supplier.test",
      phone: "021234567",
      address: { street: "1 Road", city: "Bangkok", state: "BKK", postalCode: "10110", country: "TH" },
    });
    expect(supplier.status).toBe(201);
    const id = supplier.body.id;

    expect((await agent.get("/api/suppliers").query({ search: name })).body.suppliers).toHaveLength(1);
    expect((await agent.put(`/api/suppliers/${id}`).send({ status: "inactive" })).body.status).toBe("inactive");

    const link = await agent.post(`/api/suppliers/${id}/products`).send({ productId: product.id, sku: "S-1", cost: 50, leadTime: 7, minimumOrder: 10 });
    expect(link.status).toBe(201);
    expect((await agent.post(`/api/suppliers/${id}/products`).send({ productId: product.id, sku: "S-1", cost: 1, leadTime: 1, minimumOrder: 1 })).status).toBe(409);
    expect((await agent.post(`/api/suppliers/${id}/products`).send({ productId: randomUUID(), sku: "S-2", cost: 1, leadTime: 1, minimumOrder: 1 })).status).toBe(404);

    expect((await agent.get(`/api/suppliers/${id}/products`)).body[0].product.name).toBe(product.name);
    expect((await agent.put(`/api/suppliers/${id}/products/${product.id}`).send({ cost: 45 })).body.cost).toBe("45.00");
    expect((await agent.get(`/api/suppliers/${id}`)).body.name).toBe(name);
    expect((await agent.delete(`/api/suppliers/${id}/products/${product.id}`)).status).toBe(200);
    expect((await agent.delete(`/api/suppliers/${id}`)).status).toBe(200);
    expect((await agent.get(`/api/suppliers/${id}`)).status).toBe(404);
  });

  test("admin-only", async () => {
    const { agent } = await loginAs("user");
    expect((await agent.get("/api/suppliers")).status).toBe(403);
  });
});

describe("admin dashboard and seeding", () => {
  test("dashboard counts paid orders only, with real alerts", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, user } = await loginAs("user");
    const setup = await checkoutSetup(user, { price: "300.00", stock: 3 });
    await agent.post("/api/orders/checkout").send(setup.body());

    const res = await admin.get("/api/admin/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.salesSummary.today.count).toBeGreaterThanOrEqual(1);
    expect(res.body.salesSummary.today.total).toBeGreaterThan(0);
    // Other test files also create low-stock variants, so only check the list is populated
    // (it is capped at 10) and our variant really is low.
    expect(res.body.inventory.lowStock.length).toBeGreaterThan(0);
    expect(res.body.inventory.lowStock.every((v) => v.stock > 0 && v.stock <= 5)).toBe(true);
    expect(res.body.notifications.map((n) => n.type)).toEqual(expect.arrayContaining(["low_stock", "new_order"]));
    expect((await agent.get("/api/admin/dashboard")).status).toBe(403);
  });

  test("seeding is super-admin only, needs confirmation and is off in production", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent: superAdmin } = await loginAs("super_admin");

    expect((await admin.post("/api/admin/seed").send({ seedType: "address" })).status).toBe(403);
    expect((await superAdmin.post("/api/admin/seed").send({ seedType: "bogus" })).status).toBe(400);
    const unconfirmed = await superAdmin.post("/api/admin/seed").send({ seedType: "main" });
    expect(unconfirmed.status).toBe(400);
    expect(unconfirmed.body.code).toBe("CONFIRMATION_REQUIRED");

    const previous = ENV.SERVER.NODE_ENV;
    ENV.SERVER.NODE_ENV = "production";
    try {
      const blocked = await superAdmin.post("/api/admin/seed").send({ seedType: "main", confirm: "DELETE EXISTING DATA" });
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe("SEED_DISABLED");
    } finally {
      ENV.SERVER.NODE_ENV = previous;
    }
  });
});

describe("reports", () => {
  test("sales, orders, inventory, customer and supplier reports", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, user } = await loginAs("user");
    // Big enough to be today's top customer regardless of other test files' orders.
    const setup = await checkoutSetup(user, { price: "90000.00" });
    const order = (await agent.post("/api/orders/checkout").send(setup.body())).body.data;
    const today = new Date().toISOString().slice(0, 10);
    const range = { startDate: today, endDate: today };

    const sales = await admin.get("/api/reports/sales").query(range);
    expect(sales.status).toBe(200);
    expect(sales.body.totalRevenue).toBeGreaterThanOrEqual(Number(order.total));
    expect(sales.body.dailySales[0]).toMatchObject({ date: today });
    expect(sales.body.topProducts.length).toBeGreaterThan(0);
    expect((await admin.get("/api/reports/sales").query({ groupBy: "month" })).body.groupBy).toBe("month");

    const orders = await admin.get("/api/reports/orders").query(range);
    expect(orders.body.statusBreakdown.some((s) => s.status === "paid")).toBe(true);

    const inventory = await admin.get("/api/reports/inventory");
    expect(inventory.body).toEqual(expect.objectContaining({ totalProducts: expect.any(Number), lowStockItems: expect.any(Array) }));
    const store = await newStore();
    expect((await admin.get("/api/reports/inventory").query({ storeId: store.id })).body.totalProducts).toBe(0);

    const customers = await admin.get("/api/reports/customer").query(range);
    expect(customers.body.topCustomers.some((c) => c.email === user.email)).toBe(true);
    const suppliers = await admin.get("/api/reports/supplier");
    expect(suppliers.body).toEqual(expect.objectContaining({ totalSuppliers: expect.any(Number) }));

    // The deprecated /api/report alias still answers.
    expect((await admin.get("/api/report/sales").query(range)).status).toBe(200);
    expect((await admin.get("/api/reports/sales").query({ startDate: "yesterday" })).status).toBe(400);
    expect((await agent.get("/api/reports/sales")).status).toBe(403);
  });
});

describe("settings", () => {
  test("persisted settings; public subset readable by anyone", async () => {
    const { agent: admin } = await loginAs("admin");
    const anon = await newAgent();
    const name = `Shop ${randomUUID().slice(0, 6)}`;

    expect((await admin.put("/api/settings").send({ siteName: name, currency: "thb" })).body.data).toMatchObject({ siteName: name, currency: "THB" });
    // maintenance stays false: it now blocks checkout, and other test files share the database.
    expect((await admin.patch("/api/settings").send({ maintenance: false })).body.data).toMatchObject({ siteName: name, maintenance: false });
    expect((await admin.patch("/api/settings").send({ maintenance: "yes" })).status).toBe(400);
    expect((await admin.get("/api/settings")).body.data.siteName).toBe(name);
    expect((await anon.get("/api/settings/public")).body.data).toMatchObject({ siteName: name, maintenance: false });

    // Stored in the database, not process memory.
    const rows = await db.select().from(schema.appSettings);
    expect(rows.find((r) => r.key === "siteName").value).toBe(name);

    expect((await admin.put("/api/settings").send({ unknown: 1 })).status).toBe(400);
    expect((await (await loginAs("user")).agent.get("/api/settings")).status).toBe(403);
  });
});
