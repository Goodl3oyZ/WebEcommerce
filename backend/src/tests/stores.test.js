import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { checkoutSetup, createProduct } from "./helpers/fixtures.js";

const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");

const storeBody = (overrides = {}) => ({
  name: `Branch ${randomUUID().slice(0, 6)}`,
  address: "1 Rama IV",
  city: "Bangkok",
  phone: "02-123-4567",
  email: "branch@example.com",
  ...overrides,
});

describe("stores (branches)", () => {
  test("admin creates, updates, deactivates; inactive branches are admin-only", async () => {
    const { agent: admin } = await loginAs("admin");
    const anon = await newAgent();

    const created = await admin
      .post("/api/stores")
      .send(storeBody({ logo: "http://localhost:58333/stores/stores-x/logo.png", settings: { openingHours: "09-18" } }));
    expect(created.status).toBe(201);
    expect(created.body.logo).toBe("http://localhost:58333/stores/stores-x/logo.png");
    const id = created.body.id;

    expect((await anon.get("/api/stores").query({ search: created.body.name })).body.items).toHaveLength(1);
    expect((await anon.get(`/api/stores/${id}`)).body.name).toBe(created.body.name);

    expect((await admin.put(`/api/stores/${id}`).send({ city: "Chiang Mai" })).body.city).toBe("Chiang Mai");
    expect((await admin.patch(`/api/stores/${id}`).send({ phone: "053-111-222" })).body.phone).toBe("053-111-222");
    expect((await admin.patch(`/api/stores/${id}`).send({ email: "nope" })).status).toBe(400);
    expect((await admin.patch(`/api/stores/${id}`).send({ ownerId: randomUUID() })).status).toBe(400);

    const deleted = await admin.delete(`/api/stores/${id}`);
    expect(deleted.body.data.isActive).toBe(false);
    expect((await anon.get(`/api/stores/${id}`)).status).toBe(404);
    expect((await anon.get("/api/stores").query({ search: created.body.name })).body.items).toHaveLength(0);
    expect((await admin.get(`/api/stores/${id}`)).status).toBe(200);
    expect((await admin.delete(`/api/stores/${randomUUID()}`)).status).toBe(404);
  });

  test("products in stock at a branch, and its reviews", async () => {
    const { agent: admin } = await loginAs("admin");
    const { user } = await loginAs("user");
    const store = (await admin.post("/api/stores").send(storeBody())).body;
    const inStock = await createProduct();
    const soldOut = await createProduct();
    await db.insert(schema.storeInventory).values([
      { storeId: store.id, productId: inStock.product.id, variantId: inStock.variant.id, quantity: 4 },
      { storeId: store.id, productId: soldOut.product.id, variantId: soldOut.variant.id, quantity: 0 },
    ]);
    await db.insert(schema.storeReviews).values({ storeId: store.id, userId: user.id, rating: 5, comment: "Friendly" });
    const anon = await newAgent();

    const products = await anon.get(`/api/stores/${store.id}/products`);
    expect(products.body.products.map((p) => p.product.id)).toEqual([inStock.product.id]);
    expect(products.body.products[0]).toMatchObject({ quantity: 4, variant: { id: inStock.variant.id } });

    const reviews = await anon.get(`/api/stores/${store.id}/reviews`);
    expect(reviews.body).toMatchObject({ averageRating: 5 });
    expect(reviews.body.reviews[0].user).toMatchObject({ id: user.id, name: user.name });
    expect((await anon.get(`/api/stores/${randomUUID()}/products`)).status).toBe(404);
  });

  test("orders, analytics and settings for a branch", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, user } = await loginAs("user");
    const store = (await admin.post("/api/stores").send(storeBody())).body;
    const setup = await checkoutSetup(user, { price: "200.00" });
    const order = (await agent.post("/api/orders/checkout").send(setup.body())).body.data;
    await db.insert(schema.storePickups).values({ orderId: order.id, storeId: store.id, status: "ready" });

    const orders = await admin.get(`/api/stores/${store.id}/orders`);
    expect(orders.body.orders.map((o) => o.id)).toEqual([order.id]);
    expect(orders.body.orders[0].pickup.status).toBe("ready");

    const analytics = await admin.get(`/api/stores/${store.id}/analytics`);
    expect(analytics.body).toMatchObject({ totalOrders: 1, totalSales: Number(order.total) });
    expect(analytics.body.topProducts[0]).toMatchObject({ productId: setup.product.id, quantity: 1 });
    expect((await admin.get(`/api/stores/${store.id}/analytics`).query({ startDate: "last week" })).status).toBe(400);

    const first = await admin.put(`/api/stores/${store.id}/settings`).send({ pickupHours: "10-20" });
    expect(first.body.settings).toEqual({ pickupHours: "10-20" });
    const merged = await admin.put(`/api/stores/${store.id}/settings`).send({ allowCod: true });
    expect(merged.body.settings).toEqual({ pickupHours: "10-20", allowCod: true });
  });

  test("management is admin-only", async () => {
    const { agent } = await loginAs("user");
    const id = randomUUID();
    for (const [method, path] of [
      ["post", "/api/stores"],
      ["put", `/api/stores/${id}`],
      ["patch", `/api/stores/${id}`],
      ["delete", `/api/stores/${id}`],
      ["get", `/api/stores/${id}/orders`],
      ["get", `/api/stores/${id}/analytics`],
      ["put", `/api/stores/${id}/settings`],
    ]) {
      expect((await agent[method](path).send({ name: "x" })).status).toBe(403);
    }
  });
});
