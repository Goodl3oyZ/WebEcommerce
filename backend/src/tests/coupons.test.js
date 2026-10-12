import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { loginAs } from "./helpers/factories.js";
import { checkoutSetup, createCoupon } from "./helpers/fixtures.js";

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();
const couponBody = (overrides = {}) => ({
  code: `promo${randomUUID().slice(0, 6)}`,
  type: "percentage",
  value: 15,
  startDate: iso(-1),
  endDate: iso(30),
  ...overrides,
});

describe("customer coupon endpoints", () => {
  test("GET /validate is case-insensitive and caps the discount", async () => {
    const { agent } = await loginAs("user");
    const pct = await createCoupon({ type: "percentage", value: "20", maxDiscount: "50" });
    const fixed = await createCoupon({ type: "fixed_amount", value: "500" });

    const res = await agent.get("/api/coupons/validate").query({ code: pct.code.toLowerCase(), amount: 1000 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ valid: true, discount: 50 });

    // A fixed discount never exceeds the amount.
    const small = await agent.get("/api/coupons/validate").query({ code: fixed.code, amount: 120 });
    expect(small.body.discount).toBe(120);
  });

  test("GET /validate rejects expired, inactive, under-minimum and exhausted coupons", async () => {
    const { agent, user } = await loginAs("user");
    const expired = await createCoupon({ startDate: new Date(Date.now() - 3 * DAY), endDate: new Date(Date.now() - DAY) });
    const inactive = await createCoupon({ isActive: false });
    const minimum = await createCoupon({ minPurchase: "500" });
    const limited = await createCoupon({ usageLimit: 1 });

    for (const coupon of [expired, inactive]) {
      expect((await agent.get("/api/coupons/validate").query({ code: coupon.code, amount: 100 })).status).toBe(400);
    }
    const under = await agent.get("/api/coupons/validate").query({ code: minimum.code, amount: 100 });
    expect(under.status).toBe(400);
    expect(under.body.message).toMatch(/Minimum purchase/);

    const setup = await checkoutSetup(user);
    expect((await agent.post("/api/orders/checkout").send(setup.body({ couponCode: limited.code }))).status).toBe(201);
    const exhausted = await agent.get("/api/coupons/validate").query({ code: limited.code, amount: 100 });
    expect(exhausted.status).toBe(400);
    expect(exhausted.body.message).toMatch(/usage limit/);

    expect((await agent.get("/api/coupons/validate").query({ code: "X" })).status).toBe(400);
  });

  test("GET /available lists only currently usable coupons", async () => {
    const { agent } = await loginAs("user");
    const live = await createCoupon();
    const future = await createCoupon({ startDate: new Date(Date.now() + DAY), endDate: new Date(Date.now() + 2 * DAY) });

    const res = await agent.get("/api/coupons/available");
    const codes = res.body.map((c) => c.code);
    expect(codes).toContain(live.code);
    expect(codes).not.toContain(future.code);
  });

  test("customer endpoints need login; admin endpoints need admin", async () => {
    expect((await (await newAgent()).get("/api/coupons/available")).status).toBe(401);
    const { agent } = await loginAs("user");
    const coupon = await createCoupon();
    for (const [method, path] of [
      ["get", "/api/coupons"],
      ["post", "/api/coupons"],
      ["get", "/api/coupons/statistics"],
      ["get", `/api/coupons/${coupon.id}`],
      ["put", `/api/coupons/${coupon.id}`],
      ["patch", `/api/coupons/${coupon.id}`],
      ["delete", `/api/coupons/${coupon.id}`],
      ["post", `/api/coupons/${coupon.id}/activate`],
      ["post", `/api/coupons/${coupon.id}/deactivate`],
      ["get", `/api/coupons/${coupon.id}/usage`],
    ]) {
      expect((await agent[method](path).send({})).status).toBe(403);
    }
  });
});

describe("admin coupon management", () => {
  test("POST / creates with an uppercase code and validates the rules", async () => {
    const { agent } = await loginAs("admin");
    const body = couponBody({ type: "fixed", value: 100, usageLimit: 10, perUserLimit: 1 });

    const res = await agent.post("/api/coupons").send(body);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ code: body.code.toUpperCase(), type: "fixed_amount", usageLimit: 10, perUserLimit: 1 });

    expect((await agent.post("/api/coupons").send({ ...body, code: body.code.toLowerCase() })).status).toBe(409);
    expect((await agent.post("/api/coupons").send(couponBody({ value: 150 }))).status).toBe(400);
    expect((await agent.post("/api/coupons").send(couponBody({ startDate: iso(5), endDate: iso(1) }))).status).toBe(400);
    expect((await agent.post("/api/coupons").send(couponBody({ endDate: "next week" }))).status).toBe(400);
  });

  test("GET /, /:id, PUT and PATCH /:id", async () => {
    const { agent } = await loginAs("admin");
    const coupon = await createCoupon({ type: "percentage", value: "10" });

    expect((await agent.get("/api/coupons").query({ search: coupon.code })).body).toHaveLength(1);
    expect((await agent.get(`/api/coupons/${coupon.id}`)).body.code).toBe(coupon.code);
    expect((await agent.get(`/api/coupons/${randomUUID()}`)).status).toBe(404);
    expect((await agent.get("/api/coupons/not-a-uuid")).status).toBe(404);

    const put = await agent.put(`/api/coupons/${coupon.id}`).send({ value: 25, code: "renamed-" + coupon.code });
    expect(put.body).toMatchObject({ value: "25.00", code: ("RENAMED-" + coupon.code).toUpperCase() });

    // Merged with the stored type (percentage), 150 is invalid.
    expect((await agent.patch(`/api/coupons/${coupon.id}`).send({ value: 150 })).status).toBe(400);
    // An end date before the stored start date is invalid too.
    expect((await agent.patch(`/api/coupons/${coupon.id}`).send({ endDate: iso(-10) })).status).toBe(400);
    expect((await agent.patch(`/api/coupons/${coupon.id}`).send({ maxDiscount: 30 })).body.maxDiscount).toBe("30.00");
    expect((await agent.patch(`/api/coupons/${coupon.id}`).send({})).status).toBe(400);
  });

  test("activate, deactivate and delete (soft)", async () => {
    const { agent } = await loginAs("admin");
    const coupon = await createCoupon();

    expect((await agent.post(`/api/coupons/${coupon.id}/deactivate`)).body.isActive).toBe(false);
    expect((await agent.post(`/api/coupons/${coupon.id}/activate`)).body.isActive).toBe(true);
    const deleted = await agent.delete(`/api/coupons/${coupon.id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toMatchObject({ isActive: false, usageCount: 0 });
    expect((await agent.post(`/api/coupons/${randomUUID()}/activate`)).status).toBe(404);
  });

  test("GET /:id/usage and /statistics reflect checkouts", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent, user } = await loginAs("user");
    const coupon = await createCoupon({ type: "fixed_amount", value: "30" });
    const setup = await checkoutSetup(user, { price: "100.00" });
    const order = await agent.post("/api/orders/checkout").send(setup.body({ couponCode: coupon.code }));
    expect(order.status).toBe(201);

    const usage = await admin.get(`/api/coupons/${coupon.id}/usage`);
    expect(usage.status).toBe(200);
    expect(usage.body.items[0]).toMatchObject({ orderId: order.body.data.id, discountAmount: "30.00", userEmail: user.email });
    expect(usage.body.total).toBe(1);

    const stats = await admin.get("/api/coupons/statistics");
    expect(stats.status).toBe(200);
    expect(stats.body.timesUsed).toBeGreaterThanOrEqual(1);
    expect(stats.body.totalDiscount).toBeGreaterThanOrEqual(30);
  });
});
