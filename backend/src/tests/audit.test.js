import { randomUUID } from "node:crypto";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs } from "./helpers/factories.js";

const { auditService, redact } = await import("../services/auditService.js");

const name = (base) => `${base} ${randomUUID().slice(0, 8)}`;

/** Entries are written after the response is sent, so wait for them briefly. */
async function entriesFor(agent, query, expected = 1) {
  for (let i = 0; i < 40; i += 1) {
    const res = await agent.get("/api/admin/audit-logs").query(query);
    if (res.body.logs?.length >= expected) return res.body.logs;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return (await agent.get("/api/admin/audit-logs").query(query)).body.logs;
}

describe("audit log", () => {
  test("staff changes are recorded with who, what and the target id", async () => {
    const { agent, user } = await loginAs("admin");
    const created = await agent.post("/api/categories").send({ name: name("Audit"), description: "x" });
    expect(created.status).toBe(201);
    const id = created.body.id;
    await agent.put(`/api/categories/${id}`).send({ name: name("Audit renamed") });
    await agent.delete(`/api/categories/${id}`);

    const logs = await entriesFor(agent, { actorId: user.id, entity: "categories" }, 3);
    expect(logs.map((log) => log.action)).toEqual(["delete", "update", "create"]);
    for (const log of logs) {
      expect(log).toMatchObject({ entityId: id, actorEmail: user.email, actorRole: "admin", actor: { id: user.id } });
    }
    expect(logs[2]).toMatchObject({ method: "POST", route: "/api/categories", statusCode: 201 });
    expect(logs[1].route).toBe("/api/categories/:id");
    expect(logs[2].after.description).toBe("x");
  });

  test("failed requests, reads, and customers' own actions are not recorded", async () => {
    const { agent: admin, user: adminUser } = await loginAs("admin");
    const { agent: customer, user } = await loginAs("user");

    await admin.post("/api/categories").send({}); // 400
    await admin.get("/api/categories");
    await customer.post("/api/categories").send({ name: name("Nope") }); // 403
    await customer.put("/api/users/profile").send({ name: "New name" });
    // A later recorded change proves the earlier writes had their chance to land.
    await admin.post("/api/categories").send({ name: name("Marker") });

    const adminLogs = await entriesFor(admin, { actorId: adminUser.id, entity: "categories" });
    expect(adminLogs).toHaveLength(1);
    const customerLogs = (await admin.get("/api/admin/audit-logs").query({ actorId: user.id })).body.logs;
    expect(customerLogs.map((log) => log.action)).toEqual(["login"]);
  });

  test("sign-ins, failed sign-ins and password changes are recorded", async () => {
    const { agent: admin } = await loginAs("admin");
    const user = await createUser();
    const anon = await newAgent();
    await anon.post("/api/auth/login").send({ email: user.email, password: "Wrong-password1!" });
    const signedIn = await anon.post("/api/auth/login").send({ email: user.email, password: user.plainPassword });
    expect(signedIn.status).toBe(200);
    await anon
      .post("/api/auth/change-password")
      .send({ currentPassword: user.plainPassword, newPassword: "Anotherpass9!", confirmPassword: "Anotherpass9!" });

    const logs = await entriesFor(admin, { entity: "auth", search: user.email }, 3);
    expect(logs.map((log) => log.action)).toEqual(["password_change", "login", "login_failed"]);
    expect(logs[2]).toMatchObject({ actorId: null, actorEmail: user.email, after: { code: "INVALID_CREDENTIALS" } });
    expect(logs[1]).toMatchObject({ actorId: user.id, ipAddress: expect.any(String) });
    // Passwords never reach the log.
    expect(JSON.stringify(logs)).not.toContain(user.plainPassword);
  });

  test("filters and access", async () => {
    const { agent: admin, user } = await loginAs("admin");
    await admin.post("/api/categories").send({ name: name("Filter") });
    const logs = await entriesFor(admin, { actorId: user.id, action: "create" });
    expect(logs.every((log) => log.action === "create")).toBe(true);
    const page = await admin.get("/api/admin/audit-logs").query({ limit: 1, to: "2000-01-01" });
    expect(page.body).toMatchObject({ logs: [], pagination: { total: 0, limit: 1 } });
    expect((await admin.get("/api/admin/audit-logs").query({ actorId: "nope" })).status).toBe(400);

    const { agent: moderator } = await loginAs("moderator");
    const { agent: customer } = await loginAs("user");
    expect((await moderator.get("/api/admin/audit-logs")).status).toBe(403);
    expect((await customer.get("/api/admin/audit-logs")).status).toBe(403);
    expect((await (await newAgent()).get("/api/admin/audit-logs")).status).toBe(401);
  });

  test("redact hides secrets and shortens long values", () => {
    const out = redact({ password: "p", newPassword: "p", apiKey: "k", nested: { token: "t", ok: "x".repeat(400) }, list: Array(25).fill(1) });
    expect(out).toMatchObject({ password: "[hidden]", newPassword: "[hidden]", apiKey: "[hidden]", nested: { token: "[hidden]" } });
    expect(out.nested.ok).toHaveLength(301);
    expect(out.list).toHaveLength(21);
  });

  test("prune removes only old entries", async () => {
    const { agent } = await loginAs("admin");
    await agent.post("/api/categories").send({ name: name("Recent") });
    await entriesFor(agent, { entity: "categories" });
    expect(await auditService.prune(1)).toBeGreaterThanOrEqual(0);
    expect((await agent.get("/api/admin/audit-logs").query({ entity: "categories" })).body.logs.length).toBeGreaterThan(0);
  });
});
