import { jest } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs } from "./helpers/factories.js";
import { checkoutSetup, createProduct } from "./helpers/fixtures.js";

const { omiseService } = await import("../services/omiseService.js");
const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { eq } = await import("drizzle-orm");

beforeEach(() => jest.clearAllMocks());

const pointsOf = async (userId) =>
  (await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { points: true } })).points;

describe("wishlist", () => {
  test("add (idempotent), change variant, list with stock, remove", async () => {
    const { agent } = await loginAs("user");
    const { product, variant } = await createProduct({ stock: 4 });

    const added = await agent.post("/api/wishlist").send({ productId: product.id });
    expect(added.status).toBe(201);
    expect((await agent.post("/api/wishlist").send({ productId: product.id })).status).toBe(200);

    const changed = await agent.put(`/api/wishlist/${added.body.id}`).send({ variantId: variant.id });
    expect(changed.body.variantId).toBe(variant.id);
    expect((await agent.put(`/api/wishlist/${added.body.id}`).send({ variantId: randomUUID() })).status).toBe(404);

    const list = await agent.get("/api/wishlist");
    expect(list.body).toHaveLength(1);
    expect(list.body[0].product).toMatchObject({ id: product.id, stock: 4 });

    expect((await agent.delete(`/api/wishlist/${added.body.id}`)).status).toBe(204);
    expect((await agent.delete(`/api/wishlist/${added.body.id}`)).status).toBe(404);
  });

  test("move to cart checks stock and empties the wishlist item", async () => {
    const { agent } = await loginAs("user");
    const { product, variant } = await createProduct({ stock: 2 });
    const item = (await agent.post("/api/wishlist").send({ productId: product.id, variantId: variant.id })).body;

    expect((await agent.post(`/api/wishlist/${item.id}/move-to-cart`).send({ quantity: 5 })).status).toBe(409);
    const moved = await agent.post(`/api/wishlist/${item.id}/move-to-cart`).send({ quantity: 2 });
    expect(moved.status).toBe(200);
    expect(moved.body.items[0]).toMatchObject({ variantId: variant.id, quantity: 2 });
    expect((await agent.get("/api/wishlist")).body).toHaveLength(0);
  });

  test("other users' items are invisible; hidden products cannot be added", async () => {
    const { agent } = await loginAs("user");
    const { agent: owner } = await loginAs("user");
    const { product } = await createProduct();
    const hidden = await createProduct({ isActive: false });
    const item = (await owner.post("/api/wishlist").send({ productId: product.id })).body;

    expect((await agent.delete(`/api/wishlist/${item.id}`)).status).toBe(404);
    expect((await agent.post(`/api/wishlist/${item.id}/move-to-cart`).send({})).status).toBe(404);
    expect((await agent.post("/api/wishlist").send({ productId: hidden.product.id })).status).toBe(404);
  });

  test("admin views: all, by user (not the admin's own), by product", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, user } = await loginAs("user");
    const { product } = await createProduct();
    await agent.post("/api/wishlist").send({ productId: product.id });

    const byUser = await admin.get(`/api/wishlist/admin/user/${user.id}`);
    expect(byUser.body.map((i) => i.productId)).toEqual([product.id]);
    const byProduct = await admin.get(`/api/wishlist/admin/product/${product.id}`);
    expect(byProduct.body).toMatchObject({ count: 1 });
    expect(byProduct.body.items[0].user.id).toBe(user.id);
    const all = await admin.get("/api/wishlist/admin/all").query({ limit: 1 });
    expect(all.body.pagination.limit).toBe(1);

    expect((await admin.get(`/api/wishlist/admin/user/${randomUUID()}`)).status).toBe(404);
    expect((await agent.get("/api/wishlist/admin/all")).status).toBe(403);
    expect((await (await newAgent()).get("/api/wishlist")).status).toBe(401);
  });
});

describe("loyalty", () => {
  test("points are earned when an order is paid, once, and reversed on full refund", async () => {
    const { agent, user } = await loginAs("user");
    const { agent: admin } = await loginAs("admin");
    const setup = await checkoutSetup(user, { price: "1000.00" }); // total 1120 (50 shipping + 70 VAT)

    const order = (await agent.post("/api/orders/checkout").send(setup.body())).body.data;
    expect(await pointsOf(user.id)).toBe(112);

    const balance = await agent.get("/api/loyalty/points");
    expect(balance.body).toMatchObject({ points: 112, tier: "bronze", nextTier: { name: "silver", pointsNeeded: 388 } });
    const history = await agent.get("/api/loyalty/history");
    expect(history.body.items[0]).toMatchObject({ type: "credit", points: 112, orderId: order.id });

    // A replayed webhook for the same order does not credit again.
    const [payment] = await db.select().from(schema.paymentTransactions).where(eq(schema.paymentTransactions.orderId, order.id));
    omiseService.getCharge.mockResolvedValueOnce({ id: payment.transactionId, status: "successful" });
    await (await newAgent())
      .post("/api/payments/webhook/omise")
      .send({ object: "event", data: { object: "charge", id: payment.transactionId } });
    expect(await pointsOf(user.id)).toBe(112);

    await admin.post(`/api/payments/${payment.id}/refund`).send({ reason: "Returned" });
    expect(await pointsOf(user.id)).toBe(0);
  });

  test("redeeming deducts points and issues a usable single-use coupon", async () => {
    const { agent, user } = await loginAs("user", { points: 120 });

    const rewards = await agent.get("/api/loyalty/rewards");
    expect(rewards.body.map((r) => r.id)).toEqual(["discount-10", "free-shipping", "discount-20"]);

    const res = await agent.post("/api/loyalty/rewards/redeem/discount-10");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ pointsDeducted: 100, remainingPoints: 20, coupon: { type: "percentage", value: 10 } });
    expect(await pointsOf(user.id)).toBe(20);

    const valid = await agent.get("/api/coupons/validate").query({ code: res.body.coupon.code, amount: 500 });
    expect(valid.body).toMatchObject({ valid: true, discount: 50 });

    expect((await agent.post("/api/loyalty/rewards/redeem/discount-10")).status).toBe(400);
    expect((await agent.post("/api/loyalty/rewards/redeem/nope")).status).toBe(404);
  });

  test("concurrent redemptions cannot overspend", async () => {
    const { agent, user } = await loginAs("user", { points: 100 });
    const results = await Promise.all([
      agent.post("/api/loyalty/rewards/redeem/discount-10"),
      agent.post("/api/loyalty/rewards/redeem/discount-10"),
      agent.post("/api/loyalty/rewards/redeem/discount-10"),
    ]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await pointsOf(user.id)).toBe(0);
  });

  test("admin: statistics and tiers; catalog edits are not supported (501)", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent } = await loginAs("user");
    await createUser({ points: 30 });

    const stats = await admin.get("/api/loyalty/statistics");
    expect(stats.status).toBe(200);
    expect(stats.body.outstandingPoints).toBeGreaterThanOrEqual(30);
    expect((await admin.get("/api/loyalty/tiers")).body.map((t) => t.name)).toEqual(["bronze", "silver", "gold"]);

    for (const [method, path] of [
      ["post", "/api/loyalty/tiers"],
      ["put", "/api/loyalty/tiers/gold"],
      ["post", "/api/loyalty/rewards"],
      ["put", "/api/loyalty/rewards/discount-10"],
      ["delete", "/api/loyalty/rewards/discount-10"],
    ]) {
      const res = await admin[method](path).send({ name: "x" });
      expect(res.status).toBe(501);
      expect(res.body.code).toBe("NOT_SUPPORTED");
      expect((await agent[method](path).send({})).status).toBe(403);
    }
    expect((await agent.get("/api/loyalty/statistics")).status).toBe(403);
  });
});
