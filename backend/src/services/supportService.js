/**
 * Customer support chat.
 *
 * - A signed-in customer opens one conversation at a time, on a topic the
 *   admins configured, and waits in a queue.
 * - Assignment: "auto" gives the oldest waiting conversation to the accepting
 *   agent with the fewest active ones, up to each agent's limit; "manual"
 *   leaves the queue to staff (agents claim, admins assign).
 * - Anti-spam: per-minute message limit, a cap on messages in a row without
 *   an agent reply, a maximum length, and the topic list itself.
 */
import { and, asc, count, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { supportAgents, supportConversations, supportMessages, userRoles, users } from "../models/schema.js";
import { ApiError } from "../utils/ApiError.js";
import { getHighestRole, isAdminRole } from "../utils/roles.js";
import { settingsService } from "./settingsService.js";
import { emitTo, isStaffRole, setConversationAccessCheck } from "../realtime/index.js";

const SETTINGS_KEY = "support";

export const DEFAULT_SUPPORT_SETTINGS = {
  enabled: true,
  assignmentMode: "auto", // auto | manual
  maxActivePerAgent: 5,
  messagesPerMinute: 6,
  maxUnanswered: 5,
  maxMessageLength: 1000,
  topics: [
    { id: "order", label: "คำสั่งซื้อและการจัดส่ง" },
    { id: "payment", label: "การชำระเงิน" },
    { id: "product", label: "สอบถามสินค้า" },
    { id: "account", label: "บัญชีและการเข้าสู่ระบบ" },
    { id: "howto", label: "วิธีใช้งานเว็บไซต์" },
    { id: "other", label: "เรื่องอื่น ๆ" },
  ],
};

const OPEN = ["waiting", "active"];
const tooMany = (message, code) => new ApiError(429, message, null, code);

// ---------------------------------------------------------------- helpers

async function roleOf(userId) {
  const rows = await db.query.userRoles.findMany({ where: eq(userRoles.userId, userId) });
  return getHighestRole(rows);
}

const publicUser = (u) => u && { id: u.id, name: u.name, avatar: u.avatar ?? null };

async function getConversationRow(id) {
  const conv = await db.query.supportConversations.findFirst({
    where: eq(supportConversations.id, id),
    with: { user: true, agent: true },
  });
  if (!conv) throw ApiError.notFound("Conversation not found");
  return conv;
}

/** Customers see their own; staff see all. */
function assertCanView(caller, conv) {
  if (conv.userId === caller.id || isStaffRole(caller.role)) return;
  throw ApiError.notFound("Conversation not found");
}

async function queuePosition(conv) {
  if (conv.status !== "waiting") return null;
  const [{ n }] = await db
    .select({ n: count() })
    .from(supportConversations)
    .where(and(eq(supportConversations.status, "waiting"), sql`${supportConversations.createdAt} <= ${conv.createdAt}`));
  return Number(n);
}

async function present(conv, { withMessages = false } = {}) {
  const [last] = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.conversationId, conv.id))
    .orderBy(desc(supportMessages.createdAt))
    .limit(1);
  const out = {
    id: conv.id,
    topic: conv.topic,
    status: conv.status,
    customer: publicUser(conv.user),
    agent: publicUser(conv.agent),
    createdAt: conv.createdAt,
    lastMessageAt: conv.lastMessageAt,
    closedAt: conv.closedAt,
    queuePosition: await queuePosition(conv),
    lastMessage: last ? { body: last.body.slice(0, 140), senderRole: last.senderRole, createdAt: last.createdAt } : null,
  };
  if (withMessages) {
    const rows = await db.query.supportMessages.findMany({
      where: eq(supportMessages.conversationId, conv.id),
      with: { sender: true },
      orderBy: [asc(supportMessages.createdAt)],
    });
    out.messages = rows.map(presentMessage);
  }
  return out;
}

const presentMessage = (m) => ({
  id: m.id,
  conversationId: m.conversationId,
  senderRole: m.senderRole,
  senderName: m.senderRole === "agent" ? m.sender?.name ?? "ทีมงาน" : m.senderRole === "customer" ? m.sender?.name ?? null : null,
  body: m.body,
  createdAt: m.createdAt,
});

async function addMessage(conversationId, { senderId = null, senderRole, body }) {
  const [message] = await db.insert(supportMessages).values({ conversationId, senderId, senderRole, body }).returning();
  await db
    .update(supportConversations)
    .set({ lastMessageAt: message.createdAt, updatedAt: new Date() })
    .where(eq(supportConversations.id, conversationId));
  const withSender = senderId
    ? { ...message, sender: await db.query.users.findFirst({ where: eq(users.id, senderId) }) }
    : message;
  return presentMessage(withSender);
}

/** Tell the customer, the conversation room and all staff that something changed. */
async function broadcast(conversationId, message = null) {
  const conv = await getConversationRow(conversationId);
  const summary = await present(conv);
  if (message) emitTo([`conv:${conv.id}`, `user:${conv.userId}`, "staff"], "support:message", message);
  emitTo([`user:${conv.userId}`, "staff"], "support:conversation", summary);
  return summary;
}

// ------------------------------------------------------------- settings

export const supportService = {
  async getSettings() {
    const all = await settingsService.getSettings();
    return { ...DEFAULT_SUPPORT_SETTINGS, ...(all[SETTINGS_KEY] ?? {}) };
  },

  /** What customers need: is chat on, which topics, which limits. */
  async getPublicConfig() {
    const s = await this.getSettings();
    return {
      enabled: s.enabled,
      topics: s.topics,
      maxMessageLength: s.maxMessageLength,
      messagesPerMinute: s.messagesPerMinute,
      maxUnanswered: s.maxUnanswered,
    };
  },

  async updateSettings(changes) {
    const current = await this.getSettings();
    const next = { ...current, ...changes };
    const ids = next.topics.map((t) => t.id);
    if (new Set(ids).size !== ids.length) throw ApiError.badRequest("Topic ids must be unique");
    await settingsService.updateSettings({ [SETTINGS_KEY]: next });
    if (next.assignmentMode === "auto") await this.autoAssign();
    return next;
  },

  // ------------------------------------------------------------ customer

  async startConversation(customer, { topic, message }) {
    const s = await this.getSettings();
    if (!s.enabled) throw new ApiError(503, "Live chat is currently unavailable", null, "SUPPORT_DISABLED");
    if (!s.topics.some((t) => t.id === topic)) throw ApiError.badRequest("Please choose one of the listed topics");
    this.assertLength(message, s);
    const existing = await db.query.supportConversations.findFirst({
      where: and(eq(supportConversations.userId, customer.id), inArray(supportConversations.status, OPEN)),
    });
    if (existing) {
      throw new ApiError(409, "You already have an open conversation", { conversationId: existing.id }, "SUPPORT_ALREADY_OPEN");
    }

    const [conv] = await db.insert(supportConversations).values({ userId: customer.id, topic }).returning();
    const first = await addMessage(conv.id, { senderId: customer.id, senderRole: "customer", body: message.trim() });
    await addMessage(conv.id, {
      senderRole: "system",
      body: "รับเรื่องแล้ว ทีมงานจะเข้ามาตอบโดยเร็วที่สุด คุณปิดหน้านี้ได้ ข้อความจะยังอยู่",
    });
    await broadcast(conv.id, first);
    if (s.assignmentMode === "auto") await this.autoAssign();
    return present(await getConversationRow(conv.id), { withMessages: true });
  },

  /** The customer's open conversation (or the latest closed one), with messages. */
  async getCurrent(customer) {
    const conv = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.userId, customer.id),
      with: { user: true, agent: true },
      orderBy: [desc(supportConversations.createdAt)],
    });
    return conv ? present(conv, { withMessages: true }) : null;
  },

  async listMine(customer) {
    const rows = await db.query.supportConversations.findMany({
      where: eq(supportConversations.userId, customer.id),
      with: { user: true, agent: true },
      orderBy: [desc(supportConversations.createdAt)],
      limit: 20,
    });
    return Promise.all(rows.map((c) => present(c)));
  },

  async getConversation(caller, id) {
    const conv = await getConversationRow(id);
    assertCanView(caller, conv);
    return present(conv, { withMessages: true });
  },

  assertLength(body, settings) {
    const text = String(body ?? "").trim();
    if (!text) throw ApiError.badRequest("Message is empty");
    if (text.length > settings.maxMessageLength) {
      throw ApiError.badRequest(`Message is too long (max ${settings.maxMessageLength} characters)`);
    }
  },

  async postMessage(caller, id, body) {
    const s = await this.getSettings();
    this.assertLength(body, s);
    const conv = await getConversationRow(id);
    assertCanView(caller, conv);
    if (conv.status === "closed") throw ApiError.badRequest("This conversation is closed");

    const isCustomer = conv.userId === caller.id;
    if (isCustomer) {
      const since = new Date(Date.now() - 60_000);
      const [{ n: lastMinute }] = await db
        .select({ n: count() })
        .from(supportMessages)
        .where(and(eq(supportMessages.senderId, caller.id), gte(supportMessages.createdAt, since)));
      if (Number(lastMinute) >= s.messagesPerMinute) {
        throw tooMany("You are sending messages too quickly. Please wait a moment.", "SUPPORT_RATE_LIMIT");
      }
      const [lastAgent] = await db
        .select({ at: supportMessages.createdAt })
        .from(supportMessages)
        .where(and(eq(supportMessages.conversationId, id), eq(supportMessages.senderRole, "agent")))
        .orderBy(desc(supportMessages.createdAt))
        .limit(1);
      const [{ n: unanswered }] = await db
        .select({ n: count() })
        .from(supportMessages)
        .where(
          and(
            eq(supportMessages.conversationId, id),
            eq(supportMessages.senderRole, "customer"),
            ...(lastAgent ? [sql`${supportMessages.createdAt} > ${lastAgent.at}`] : [])
          )
        );
      if (Number(unanswered) >= s.maxUnanswered) {
        throw tooMany("Please wait for our team to reply before sending more messages.", "SUPPORT_WAIT_FOR_REPLY");
      }
      const message = await addMessage(id, { senderId: caller.id, senderRole: "customer", body: body.trim() });
      await broadcast(id, message);
      return message;
    }

    // Staff: the assigned agent or an admin; replying to an unassigned
    // conversation claims it.
    if (!conv.assignedAgentId) await this.claim(caller, id);
    else if (conv.assignedAgentId !== caller.id && !isAdminRole(caller.role)) {
      throw ApiError.forbidden("This conversation is assigned to another agent");
    }
    const message = await addMessage(id, { senderId: caller.id, senderRole: "agent", body: body.trim() });
    await broadcast(id, message);
    return message;
  },

  async close(caller, id) {
    const conv = await getConversationRow(id);
    assertCanView(caller, conv);
    if (conv.status === "closed") return present(conv);
    const byCustomer = conv.userId === caller.id;
    if (!byCustomer && conv.assignedAgentId && conv.assignedAgentId !== caller.id && !isAdminRole(caller.role)) {
      throw ApiError.forbidden("This conversation is assigned to another agent");
    }
    await db
      .update(supportConversations)
      .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
      .where(eq(supportConversations.id, id));
    const message = await addMessage(id, {
      senderRole: "system",
      body: byCustomer ? "ลูกค้าปิดการสนทนา" : `${caller.name ?? "ทีมงาน"} ปิดการสนทนา`,
    });
    const summary = await broadcast(id, message);
    if ((await this.getSettings()).assignmentMode === "auto") await this.autoAssign();
    return summary;
  },

  // ---------------------------------------------------------------- staff

  async listForStaff(caller, { status = "open", assigned } = {}) {
    const conditions = [];
    if (status === "open") conditions.push(inArray(supportConversations.status, OPEN));
    else if (status !== "all") conditions.push(eq(supportConversations.status, status));
    if (assigned === "me") conditions.push(eq(supportConversations.assignedAgentId, caller.id));
    else if (assigned === "unassigned") conditions.push(sql`${supportConversations.assignedAgentId} is null`);
    else if (assigned) conditions.push(eq(supportConversations.assignedAgentId, assigned));
    const rows = await db.query.supportConversations.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { user: true, agent: true },
      // Oldest waiting first (fair queue); otherwise most recent activity first.
      orderBy: status === "waiting" ? [asc(supportConversations.createdAt)] : [desc(supportConversations.lastMessageAt)],
      limit: 100,
    });
    return Promise.all(rows.map((c) => present(c)));
  },

  async assertAgent(userId) {
    const role = await roleOf(userId);
    if (!isStaffRole(role)) throw ApiError.badRequest("Only staff accounts can handle chats");
    return role;
  },

  /** An agent takes a waiting conversation (within their limit unless admin). */
  async claim(caller, id) {
    const conv = await getConversationRow(id);
    if (conv.status === "closed") throw ApiError.badRequest("This conversation is closed");
    if (conv.assignedAgentId === caller.id) return present(conv);
    if (conv.assignedAgentId && !isAdminRole(caller.role)) {
      throw new ApiError(409, "Another agent already has this conversation", null, "SUPPORT_TAKEN");
    }
    if (!isAdminRole(caller.role)) {
      const { active, limit } = await this.agentLoad(caller.id);
      if (active >= limit) throw new ApiError(409, `You already have ${active} active chats (limit ${limit})`, null, "SUPPORT_AGENT_FULL");
    }
    return this.assignTo(id, caller, `${caller.name ?? "ทีมงาน"} เข้ามาดูแลเรื่องนี้แล้ว`);
  },

  /** Admin: give a conversation to an agent, or back to the queue (agentId null). */
  async assign(admin, id, agentId) {
    const conv = await getConversationRow(id);
    if (conv.status === "closed") throw ApiError.badRequest("This conversation is closed");
    if (!agentId) {
      await db
        .update(supportConversations)
        .set({ assignedAgentId: null, status: "waiting", updatedAt: new Date() })
        .where(eq(supportConversations.id, id));
      const message = await addMessage(id, { senderRole: "system", body: "ส่งเรื่องกลับเข้าคิว รอทีมงานคนถัดไป" });
      const summary = await broadcast(id, message);
      if ((await this.getSettings()).assignmentMode === "auto") await this.autoAssign();
      return summary;
    }
    await this.assertAgent(agentId);
    const agent = await db.query.users.findFirst({ where: eq(users.id, agentId) });
    if (!agent) throw ApiError.notFound("Agent not found");
    return this.assignTo(id, agent, `${agent.name} เข้ามาดูแลเรื่องนี้แล้ว`);
  },

  async assignTo(id, agent, note) {
    await db
      .update(supportConversations)
      .set({ assignedAgentId: agent.id, status: "active", updatedAt: new Date() })
      .where(eq(supportConversations.id, id));
    const message = await addMessage(id, { senderRole: "system", body: note });
    emitTo([`user:${agent.id}`], "support:assigned", { conversationId: id });
    return broadcast(id, message);
  },

  async agentLoad(userId) {
    const s = await this.getSettings();
    const agent = await db.query.supportAgents.findFirst({ where: eq(supportAgents.userId, userId) });
    const [{ n }] = await db
      .select({ n: count() })
      .from(supportConversations)
      .where(and(eq(supportConversations.assignedAgentId, userId), eq(supportConversations.status, "active")));
    return { active: Number(n), limit: agent?.maxActive ?? s.maxActivePerAgent };
  },

  /**
   * Fill free agent slots from the queue, oldest first, always giving the
   * next conversation to the accepting agent with the fewest active chats.
   */
  async autoAssign() {
    const s = await this.getSettings();
    if (s.assignmentMode !== "auto" || !s.enabled) return 0;
    const agents = await db.query.supportAgents.findMany({ where: eq(supportAgents.accepting, true), with: { user: true } });
    const pool = [];
    for (const a of agents) {
      if (!a.user?.isActive || !isStaffRole(await roleOf(a.userId))) continue;
      const { active, limit } = await this.agentLoad(a.userId);
      if (active < limit) pool.push({ user: a.user, active, limit });
    }
    if (pool.length === 0) return 0;
    const waiting = await db.query.supportConversations.findMany({
      where: eq(supportConversations.status, "waiting"),
      orderBy: [asc(supportConversations.createdAt)],
      limit: 200,
    });
    let assigned = 0;
    for (const conv of waiting) {
      const free = pool.filter((p) => p.active < p.limit).sort((a, b) => a.active - b.active);
      if (free.length === 0) break;
      const pick = free[0];
      await this.assignTo(conv.id, pick.user, `${pick.user.name} เข้ามาดูแลเรื่องนี้แล้ว`);
      pick.active += 1;
      assigned += 1;
    }
    return assigned;
  },

  /** Staff accounts with their agent settings and current load. */
  async listAgents() {
    const staff = await db
      .select({ id: users.id, name: users.name, email: users.email, isActive: users.isActive, role: userRoles.role })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .where(inArray(userRoles.role, ["admin", "super_admin", "moderator"]));
    const byUser = new Map();
    for (const row of staff) {
      const prev = byUser.get(row.id);
      const role = prev ? getHighestRole([prev.role, row.role]) : row.role;
      byUser.set(row.id, { ...row, role });
    }
    const agents = await db.query.supportAgents.findMany();
    const agentById = new Map(agents.map((a) => [a.userId, a]));
    const s = await this.getSettings();
    const out = [];
    for (const u of byUser.values()) {
      const agent = agentById.get(u.id);
      const { active } = await this.agentLoad(u.id);
      out.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isAgent: Boolean(agent),
        accepting: agent?.accepting ?? false,
        maxActive: agent?.maxActive ?? null,
        effectiveLimit: agent?.maxActive ?? s.maxActivePerAgent,
        active,
      });
    }
    return out.sort((a, b) => Number(b.isAgent) - Number(a.isAgent) || a.name.localeCompare(b.name));
  },

  /** Admin: add/remove an agent or change their limit and availability. */
  async updateAgent(userId, { isAgent, accepting, maxActive }) {
    await this.assertAgent(userId);
    if (isAgent === false) {
      await db.delete(supportAgents).where(eq(supportAgents.userId, userId));
      // Their active chats go back to the queue.
      const theirs = await db.query.supportConversations.findMany({
        where: and(eq(supportConversations.assignedAgentId, userId), ne(supportConversations.status, "closed")),
      });
      for (const c of theirs) await this.assign({ role: "admin" }, c.id, null);
      return (await this.listAgents()).find((a) => a.userId === userId);
    }
    const values = {
      ...(accepting !== undefined && { accepting }),
      ...(maxActive !== undefined && { maxActive }),
    };
    await db
      .insert(supportAgents)
      .values({ userId, accepting: accepting ?? true, maxActive: maxActive ?? null })
      .onConflictDoUpdate({ target: supportAgents.userId, set: Object.keys(values).length ? values : { accepting: sql`${supportAgents.accepting}` } });
    if ((await this.getSettings()).assignmentMode === "auto") await this.autoAssign();
    return (await this.listAgents()).find((a) => a.userId === userId);
  },

  /** Staff: my own agent status and load. */
  async getMe(caller) {
    const agent = await db.query.supportAgents.findFirst({ where: eq(supportAgents.userId, caller.id) });
    const { active, limit } = await this.agentLoad(caller.id);
    return {
      userId: caller.id,
      name: caller.name,
      role: caller.role,
      isAgent: Boolean(agent),
      accepting: agent?.accepting ?? false,
      maxActive: agent?.maxActive ?? null,
      effectiveLimit: limit,
      active,
    };
  },

  /** Staff: "I'm available" toggle (makes them an agent if they were not). */
  async setAvailability(caller, accepting) {
    return this.updateAgent(caller.id, { accepting });
  },
};

setConversationAccessCheck(async (user, conversationId) => {
  const conv = await db.query.supportConversations.findFirst({ where: eq(supportConversations.id, conversationId) });
  return Boolean(conv && (conv.userId === user.id || isStaffRole(user.role)));
});
