import { io as connect } from "socket.io-client";
import { newAgent } from "./helpers/app.js";
import { createUser, loginAs } from "./helpers/factories.js";

const { db } = await import("../config/db.js");
const schema = await import("../models/schema.js");
const { supportService, DEFAULT_SUPPORT_SETTINGS } = await import("../services/supportService.js");

// The queue and agent roster are global, so each test starts from a clean slate.
beforeEach(async () => {
  await db.delete(schema.supportConversations);
  await db.delete(schema.supportAgents);
  await supportService.updateSettings(DEFAULT_SUPPORT_SETTINGS);
});

const start = (agent, message = "สั่งของไปแล้วยังไม่ได้รับ", topic = "order") =>
  agent.post("/api/support/conversations").send({ topic, message });

async function makeAgent(admin, overrides = {}) {
  const staff = await loginAs("moderator");
  const res = await admin.put(`/api/support/admin/agents/${staff.user.id}`).send({ isAgent: true, ...overrides });
  expect(res.status).toBe(200);
  return staff;
}

describe("customer side", () => {
  test("queue position counts the conversation itself (timestamps with microseconds)", async () => {
    const { sql, eq } = await import("drizzle-orm");
    const { agent } = await loginAs("user");
    const created = (await start(agent)).body;
    // JS Dates keep milliseconds only; the database keeps microseconds.
    await db
      .update(schema.supportConversations)
      .set({ createdAt: sql`'2001-02-03 04:05:06.789123'::timestamp` })
      .where(eq(schema.supportConversations.id, created.id));
    expect((await agent.get("/api/support/conversations/current")).body.conversation.queuePosition).toBe(1);
  });

  test("config, start, one open conversation at a time, current and history", async () => {
    const { agent } = await loginAs("user");
    const config = await agent.get("/api/support/config");
    expect(config.status).toBe(200);
    expect(config.body.topics.map((t) => t.id)).toContain("order");

    expect((await start(agent, "hello", "not-a-topic")).status).toBe(400);
    expect((await start(agent, "   ")).status).toBe(400);

    const created = await start(agent);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: "waiting", topic: "order", queuePosition: 1 });
    expect(created.body.messages.map((m) => m.senderRole)).toEqual(["customer", "system"]);

    const again = await start(agent);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("SUPPORT_ALREADY_OPEN");

    const current = await agent.get("/api/support/conversations/current");
    expect(current.body.conversation.id).toBe(created.body.id);
    const history = await agent.get("/api/support/conversations");
    expect(history.body.conversations).toHaveLength(1);

    const closed = await agent.post(`/api/support/conversations/${created.body.id}/close`);
    expect(closed.body.status).toBe("closed");
    expect((await start(agent)).status).toBe(201);
  });

  test("anti-spam: messages in a row and per minute", async () => {
    await supportService.updateSettings({ maxUnanswered: 3, messagesPerMinute: 100 });
    const { agent: admin } = await loginAs("admin");
    const { agent } = await loginAs("user");
    const conv = (await start(agent)).body; // 1st customer message
    const send = (a, body = "ยังรออยู่") => a.post(`/api/support/conversations/${conv.id}/messages`).send({ body });

    expect((await send(agent)).status).toBe(201); // 2nd
    expect((await send(agent)).status).toBe(201); // 3rd
    const blocked = await send(agent);
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("SUPPORT_WAIT_FOR_REPLY");

    // A staff reply (which also claims the chat) lets the customer write again.
    expect((await send(admin, "สวัสดีครับ ขอเลขคำสั่งซื้อด้วยครับ")).status).toBe(201);
    expect((await send(agent, "ORD-123")).status).toBe(201);

    await supportService.updateSettings({ maxUnanswered: 50, messagesPerMinute: 2 });
    const limited = await send(agent);
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("SUPPORT_RATE_LIMIT");

    await supportService.updateSettings({ maxMessageLength: 50, messagesPerMinute: 100 });
    expect((await send(agent, "x".repeat(51))).status).toBe(400);
  });

  test("customers only see their own conversations and no staff endpoints", async () => {
    const { agent } = await loginAs("user");
    const { agent: other } = await loginAs("user");
    const conv = (await start(agent)).body;
    expect((await other.get(`/api/support/conversations/${conv.id}`)).status).toBe(404);
    expect((await other.post(`/api/support/conversations/${conv.id}/messages`).send({ body: "hi" })).status).toBe(404);
    expect((await other.post(`/api/support/conversations/${conv.id}/close`)).status).toBe(404);
    expect((await agent.get("/api/support/admin/conversations")).status).toBe(403);
    expect((await agent.post(`/api/support/admin/conversations/${conv.id}/claim`)).status).toBe(403);
    expect((await agent.put("/api/support/admin/availability").send({ accepting: true })).status).toBe(403);
  });
});

describe("assignment", () => {
  test("auto: the least busy accepting agent gets it, up to their limit; closing frees a slot", async () => {
    const { agent: admin } = await loginAs("admin");
    const a = await makeAgent(admin, { maxActive: 1 });
    const b = await makeAgent(admin, { maxActive: 1 });

    const c1 = (await start((await loginAs("user")).agent)).body;
    const c2 = (await start((await loginAs("user")).agent)).body;
    const c3customer = await loginAs("user");
    const c3 = (await start(c3customer.agent)).body;

    const owners = [c1, c2].map((c) => c.agent?.id).sort();
    expect(owners).toEqual([a.user.id, b.user.id].sort());
    expect(c1.status).toBe("active");
    expect(c3).toMatchObject({ status: "waiting", agent: null });

    // The agent of c1 closes it: the oldest waiting chat (c3) goes to them.
    const c1Agent = c1.agent.id === a.user.id ? a : b;
    expect((await c1Agent.agent.post(`/api/support/conversations/${c1.id}/close`)).status).toBe(200);
    const after = await c3customer.agent.get(`/api/support/conversations/${c3.id}`);
    expect(after.body).toMatchObject({ status: "active", agent: { id: c1Agent.user.id } });
  });

  test("agents who are not accepting get nothing; availability toggle", async () => {
    const { agent: admin } = await loginAs("admin");
    const staff = await makeAgent(admin, { accepting: false });
    const conv = (await start((await loginAs("user")).agent)).body;
    expect(conv.status).toBe("waiting");

    expect((await staff.agent.get("/api/support/admin/me")).body).toMatchObject({ isAgent: true, accepting: false, active: 0 });
    const on = await staff.agent.put("/api/support/admin/availability").send({ accepting: true });
    expect(on.body).toMatchObject({ accepting: true, active: 1 });
    expect((await (await loginAs("user")).agent.get("/api/support/admin/me")).status).toBe(403);
  });

  test("manual: queue, claim, taken, admin assign and return to queue", async () => {
    const { agent: admin } = await loginAs("admin");
    const settings = await admin.put("/api/support/admin/settings").send({ assignmentMode: "manual" });
    expect(settings.body.assignmentMode).toBe("manual");
    const a = await makeAgent(admin);
    const b = await makeAgent(admin);
    const conv = (await start((await loginAs("user")).agent)).body;
    expect(conv.status).toBe("waiting");

    const queue = await a.agent.get("/api/support/admin/conversations").query({ status: "waiting" });
    expect(queue.body.conversations.map((c) => c.id)).toEqual([conv.id]);

    const claimed = await a.agent.post(`/api/support/admin/conversations/${conv.id}/claim`);
    expect(claimed.body).toMatchObject({ status: "active", agent: { id: a.user.id } });
    const taken = await b.agent.post(`/api/support/admin/conversations/${conv.id}/claim`);
    expect(taken.status).toBe(409);
    expect((await b.agent.post(`/api/support/conversations/${conv.id}/messages`).send({ body: "hi" })).status).toBe(403);
    const mine = await a.agent.get("/api/support/admin/conversations").query({ assigned: "me" });
    expect(mine.body.conversations).toHaveLength(1);

    expect((await a.agent.post(`/api/support/admin/conversations/${conv.id}/assign`).send({ agentId: b.user.id })).status).toBe(403);
    const moved = await admin.post(`/api/support/admin/conversations/${conv.id}/assign`).send({ agentId: b.user.id });
    expect(moved.body.agent.id).toBe(b.user.id);
    const back = await admin.post(`/api/support/admin/conversations/${conv.id}/assign`).send({ agentId: null });
    expect(back.body).toMatchObject({ status: "waiting", agent: null });

    const { user: customer } = await loginAs("user");
    expect((await admin.post(`/api/support/admin/conversations/${conv.id}/assign`).send({ agentId: customer.id })).status).toBe(400);
  });

  test("agent limit applies to claims; removing an agent returns their chats to the queue", async () => {
    const { agent: admin } = await loginAs("admin");
    await admin.put("/api/support/admin/settings").send({ assignmentMode: "manual", maxActivePerAgent: 1 });
    const a = await makeAgent(admin);
    const first = (await start((await loginAs("user")).agent)).body;
    const second = (await start((await loginAs("user")).agent)).body;
    expect((await a.agent.post(`/api/support/admin/conversations/${first.id}/claim`)).status).toBe(200);
    const full = await a.agent.post(`/api/support/admin/conversations/${second.id}/claim`);
    expect(full.status).toBe(409);
    expect(full.body.code).toBe("SUPPORT_AGENT_FULL");

    const agents = await admin.get("/api/support/admin/agents");
    expect(agents.body.agents.find((x) => x.userId === a.user.id)).toMatchObject({ isAgent: true, active: 1, effectiveLimit: 1 });

    await admin.put(`/api/support/admin/agents/${a.user.id}`).send({ isAgent: false });
    const requeued = await admin.get(`/api/support/conversations/${first.id}`);
    expect(requeued.body).toMatchObject({ status: "waiting", agent: null });
  });

  test("settings and roster are admin-only", async () => {
    const { agent: admin } = await loginAs("admin");
    const staff = await makeAgent(admin);
    expect((await staff.agent.get("/api/support/admin/settings")).status).toBe(403);
    expect((await staff.agent.put("/api/support/admin/settings").send({ maxActivePerAgent: 9 })).status).toBe(403);
    expect((await staff.agent.get("/api/support/admin/agents")).status).toBe(403);
    expect((await staff.agent.put(`/api/support/admin/agents/${staff.user.id}`).send({ maxActive: 9 })).status).toBe(403);

    const got = await admin.get("/api/support/admin/settings");
    expect(got.body).toMatchObject({ assignmentMode: "auto", maxActivePerAgent: 5 });
    const dup = await admin.put("/api/support/admin/settings").send({ topics: [{ id: "a", label: "A" }, { id: "a", label: "B" }] });
    expect(dup.status).toBe(400);
    expect((await admin.put("/api/support/admin/settings").send({})).status).toBe(400);
  });
});

// Realtime lives in this file: support data is global, so it must not run in parallel with the tests above.
const { httpServer } = await import("../app.js");

let url;
const sockets = [];

beforeAll(async () => {
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${httpServer.address().port}`;
});
afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await new Promise((resolve) => httpServer.close(resolve));
});

/** Log in over HTTP and return the agent plus its cookie header for the socket. */
async function session(role) {
  const user = await createUser({ role });
  const agent = await newAgent();
  const res = await agent.post("/api/auth/login").send({ email: user.email, password: user.plainPassword });
  expect(res.status).toBe(200);
  const cookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
  return { user, agent, cookie };
}

function open(cookie) {
  const socket = connect(url, { transports: ["websocket"], extraHeaders: cookie ? { cookie } : {}, reconnection: false });
  sockets.push(socket);
  return socket;
}

const once = (socket, event, timeout = 5000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`no ${event} within ${timeout}ms`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });

describe("realtime (Socket.IO)", () => {
  test("rejects connections without a valid session", async () => {
    const err = await once(open(null), "connect_error");
    expect(err.message).toBe("NO_AUTH");
    const bad = await once(open("accessToken=garbage"), "connect_error");
    expect(bad.message).toBe("INVALID_TOKEN");
  });

  test("customer and staff receive messages live; outsiders cannot join the room", async () => {
    const customer = await session("user");
    const staff = await session("moderator");
    const outsider = await session("user");

    const customerSocket = open(customer.cookie);
    const staffSocket = open(staff.cookie);
    const outsiderSocket = open(outsider.cookie);
    await Promise.all([once(customerSocket, "connect"), once(staffSocket, "connect"), once(outsiderSocket, "connect")]);

    const staffSeesNew = once(staffSocket, "support:conversation");
    const created = await customer.agent.post("/api/support/conversations").send({ topic: "order", message: "ของยังไม่ถึง" });
    expect(created.status).toBe(201);
    expect((await staffSeesNew).id).toBe(created.body.id);

    const joined = await new Promise((resolve) => outsiderSocket.emit("support:join", created.body.id, resolve));
    expect(joined.ok).toBe(false);

    // The reply also claims the chat, so a "joined" system message arrives first.
    const received = [];
    const gotReply = new Promise((resolve) =>
      customerSocket.on("support:message", (m) => {
        received.push(m);
        if (m.senderRole === "agent") resolve(m);
      })
    );
    const reply = await staff.agent.post(`/api/support/conversations/${created.body.id}/messages`).send({ body: "กำลังตรวจสอบให้ครับ" });
    expect(reply.status).toBe(201);
    expect(await gotReply).toMatchObject({ senderRole: "agent", body: "กำลังตรวจสอบให้ครับ" });
    // Events from creating the chat may still be in flight; the reply ends with these two.
    expect(received.slice(-2).map((m) => m.senderRole)).toEqual(["system", "agent"]);
  });
});
