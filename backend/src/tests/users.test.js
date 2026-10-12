import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs, DEFAULT_PASSWORD } from "./helpers/factories.js";
import { createOrder } from "./helpers/fixtures.js";

const { db } = await import("../config/db.js");
const { pointsHistory } = await import("../models/schema.js");

// 1x1 transparent PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe("own profile", () => {
  test("GET /api/users/profile returns the user without secrets", async () => {
    const { agent, user } = await loginAs("user");
    const res = await agent.get("/api/users/profile");
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: user.id, email: user.email, role: "user" });
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.stats).toMatchObject({ totalOrders: 0, addressCount: 0 });
  });

  test("profile totalSpent counts only paid orders", async () => {
    const { createOrder } = await import("./helpers/fixtures.js");
    const { agent, user } = await loginAs("user");
    await createOrder(user.id, { total: "100.00", status: "paid", paymentStatus: "completed" });
    await createOrder(user.id, { total: "40.00", status: "cancelled", paymentStatus: "failed" });
    await createOrder(user.id, { total: "25.00" }); // pending, not paid yet

    const res = await agent.get("/api/users/profile");
    expect(res.body.data.stats).toMatchObject({ totalOrders: 3, totalSpent: 100 });
  });

  test("PUT /api/users/profile updates name and phone, ignores email", async () => {
    const { agent, user } = await loginAs("user");
    const res = await agent
      .put("/api/users/profile")
      .field("name", "Renamed User")
      .field("phone", "+66 81-234-5678")
      .field("email", "hijack@test.local");

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: "Renamed User",
      phone: "+66 81-234-5678",
      email: user.email,
    });
    expect(res.body.data.password).toBeUndefined();
  });

  test("PUT /api/users/profile uploads an avatar, served as a public URL", async () => {
    const { agent, user } = await loginAs("user");
    const res = await agent
      .put("/api/users/profile")
      .attach("avatar", PNG, { filename: "me photo.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toMatch(
      new RegExp(`^http://localhost:58333/profiles/profiles-${user.id}/[0-9a-f-]+-me_photo\\.png$`)
    );
    const image = await fetch(res.body.data.avatar);
    expect(image.status).toBe(200);
  });

  test("PUT /api/users/profile rejects SVG avatars and oversized files", async () => {
    const { agent } = await loginAs("user");
    const svg = await agent
      .put("/api/users/profile")
      .attach("avatar", SVG, { filename: "x.svg", contentType: "image/svg+xml" });
    expect(svg.status).toBe(400);

    const big = await agent
      .put("/api/users/profile")
      .attach("avatar", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "big.png",
        contentType: "image/png",
      });
    expect(big.status).toBe(413);
  });

  test("PUT /api/users/profile validates input and needs at least one change", async () => {
    const { agent } = await loginAs("user");
    expect((await agent.put("/api/users/profile").field("phone", "call me")).status).toBe(400);
    expect((await agent.put("/api/users/profile").send({})).status).toBe(400);
  });

  test("DELETE /api/users/profile/image removes the avatar", async () => {
    const { agent } = await loginAs("user");
    expect((await agent.delete("/api/users/profile/image")).status).toBe(404);

    await agent
      .put("/api/users/profile")
      .attach("avatar", PNG, { filename: "a.png", contentType: "image/png" });
    const res = await agent.delete("/api/users/profile/image");
    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toBeNull();
    expect(res.body.data.password).toBeUndefined();
  });

  test("profile routes require authentication", async () => {
    const agent = await newAgent();
    for (const [method, path] of [
      ["get", "/api/users/profile"],
      ["put", "/api/users/profile"],
      ["delete", "/api/users/profile/image"],
      ["get", "/api/users/preferences"],
      ["put", "/api/users/preferences"],
      ["get", "/api/users/orders"],
      ["get", "/api/users/points"],
      ["get", "/api/users/points/history"],
    ]) {
      expect((await agent[method](path)).status).toBe(401);
    }
  });
});

describe("preferences", () => {
  test("returns defaults, then saves and merges updates", async () => {
    const { agent } = await loginAs("user");
    const defaults = await agent.get("/api/users/preferences");
    expect(defaults.status).toBe(200);
    expect(defaults.body).toMatchObject({ language: "th", theme: "light" });

    const first = await agent.put("/api/users/preferences").send({ theme: "dark" });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ language: "th", theme: "dark" });

    const second = await agent
      .put("/api/users/preferences")
      .send({ language: "en", notifications: { email: false } });
    expect(second.body).toMatchObject({ language: "en", theme: "dark", notifications: { email: false } });
  });

  test("rejects unknown fields and empty updates", async () => {
    const { agent } = await loginAs("user");
    expect((await agent.put("/api/users/preferences").send({ currency: "USD" })).status).toBe(400);
    expect((await agent.put("/api/users/preferences").send({})).status).toBe(400);
  });
});

describe("own orders and points", () => {
  test("GET /api/users/orders lists only the user's orders with clamped pagination", async () => {
    const { agent, user } = await loginAs("user");
    const other = await createUser();
    await createOrder(user.id);
    await createOrder(user.id);
    await createOrder(other.id);

    const res = await agent.get("/api/users/orders").query({ limit: 1000, page: "x" });
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.orders.every((o) => o.userId === user.id)).toBe(true);
    expect(res.body.pagination).toMatchObject({ total: 2, page: 1, limit: 100, pages: 1 });
  });

  test("GET /api/users/points and /points/history", async () => {
    const { agent, user } = await loginAs("user", { points: 150 });
    await db.insert(pointsHistory).values({
      userId: user.id,
      points: 150,
      type: "earn",
      description: "Welcome bonus",
    });

    expect((await agent.get("/api/users/points")).body).toEqual({ points: 150 });
    const history = await agent.get("/api/users/points/history");
    expect(history.status).toBe(200);
    expect(history.body.history).toHaveLength(1);
    expect(history.body.pagination.total).toBe(1);
  });
});

describe("admin user management", () => {
  test("admin routes are forbidden for regular users", async () => {
    const { agent } = await loginAs("user");
    const someone = await createUser();
    for (const [method, path] of [
      ["get", "/api/users"],
      ["post", "/api/users"],
      ["post", "/api/users/create"],
      ["get", `/api/users/${someone.id}`],
      ["get", `/api/users/${someone.id}/orders`],
      ["patch", `/api/users/${someone.id}/status`],
      ["put", `/api/users/${someone.id}/role`],
    ]) {
      expect((await agent[method](path).send({})).status).toBe(403);
    }
  });

  test("GET /api/users filters by role in SQL so totals are correct", async () => {
    const { agent } = await loginAs("admin");
    const tag = randomUUID().slice(0, 8);
    await createUser({ role: "moderator", name: `Mod ${tag}` });
    await createUser({ role: "moderator", name: `Mod ${tag} two` });
    await createUser({ role: "user", name: `User ${tag}` });

    const res = await agent.get("/api/users").query({ search: tag, role: "moderator", limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].role).toBe("moderator");
    expect(res.body.users[0].password).toBeUndefined();
    expect(res.body.pagination).toMatchObject({ total: 2, pages: 2, limit: 1 });
  });

  test("POST /api/users creates users; only super_admin may create admins", async () => {
    const { agent: admin } = await loginAs("admin");
    const { agent: superAdmin } = await loginAs("super_admin");
    const body = (role) => ({
      name: "Created",
      email: `created-${randomUUID().slice(0, 8)}@test.local`,
      password: DEFAULT_PASSWORD,
      role,
    });

    const created = await admin.post("/api/users").send(body("user"));
    expect(created.status).toBe(201);
    expect(created.body.password).toBeUndefined();
    expect((await admin.post("/api/users").send(body("admin"))).status).toBe(403);
    expect((await superAdmin.post("/api/users").send(body("admin"))).status).toBe(201);
    expect((await admin.post("/api/users/create").send(body("user"))).status).toBe(201);

    const duplicate = await admin.post("/api/users").send({ ...body("user"), email: created.body.email });
    expect(duplicate.status).toBe(409);
  });

  test("GET /api/users/:userId and /orders, with 404 for unknown or malformed ids", async () => {
    const { agent } = await loginAs("admin");
    const target = await createUser();
    await createOrder(target.id);

    const user = await agent.get(`/api/users/${target.id}`);
    expect(user.status).toBe(200);
    expect(user.body).toMatchObject({ id: target.id, role: "user" });
    expect(user.body.password).toBeUndefined();

    const orders = await agent.get(`/api/users/${target.id}/orders`);
    expect(orders.status).toBe(200);
    expect(orders.body.orders).toHaveLength(1);

    expect((await agent.get(`/api/users/${randomUUID()}`)).status).toBe(404);
    expect((await agent.get("/api/users/not-a-uuid")).status).toBe(404);
    expect((await agent.get(`/api/users/${randomUUID()}/orders`)).status).toBe(404);
  });

  test("PUT /api/users/:userId/role enforces the role rules", async () => {
    const { agent: admin, user: adminUser } = await loginAs("admin");
    const { agent: superAdmin } = await loginAs("super_admin");
    const target = await createUser();
    const otherAdmin = await createUser({ role: "admin" });

    const promoted = await admin.put(`/api/users/${target.id}/role`).send({ role: "moderator" });
    expect(promoted.status).toBe(200);
    expect(promoted.body.role).toBe("moderator");

    expect((await admin.put(`/api/users/${target.id}/role`).send({ role: "admin" })).status).toBe(403);
    expect((await admin.put(`/api/users/${otherAdmin.id}/role`).send({ role: "user" })).status).toBe(403);
    expect((await admin.put(`/api/users/${adminUser.id}/role`).send({ role: "super_admin" })).status).toBe(400);
    expect((await superAdmin.put(`/api/users/${target.id}/role`).send({ role: "admin" })).status).toBe(200);
    expect((await admin.put(`/api/users/${target.id}/role`).send({ role: "owner" })).status).toBe(400);
  });

  test("PATCH /api/users/:userId/status deactivates and signs the user out", async () => {
    const { agent: admin, user: adminUser } = await loginAs("admin");
    const { agent: targetAgent, user: target } = await loginAs("user");
    const otherAdmin = await createUser({ role: "admin" });

    const res = await admin.patch(`/api/users/${target.id}/status`).send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ isActive: false });
    expect(res.body.password).toBeUndefined();
    expect((await targetAgent.get("/api/users/profile")).status).toBe(401);

    expect((await admin.patch(`/api/users/${adminUser.id}/status`).send({ isActive: false })).status).toBe(400);
    expect((await admin.patch(`/api/users/${otherAdmin.id}/status`).send({ isActive: false })).status).toBe(403);
    expect((await admin.patch(`/api/users/${target.id}/status`).send({ isActive: "no" })).status).toBe(400);
  });
});
