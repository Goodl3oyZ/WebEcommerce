import { AsyncLocalStorage } from "node:async_hooks";
import { and, count, desc, eq, gte, ilike, lt, lte, or } from "drizzle-orm";
import { db } from "../config/db.js";
import { auditLogs, users } from "../models/schema.js";
import { paginationMeta, parsePagination } from "../utils/pagination.js";

/**
 * The request being handled, set by the auditTrail middleware. Entries written
 * inside it get the caller and request details, and mark the request as
 * recorded so the middleware does not add a second, generic entry.
 */
export const auditContext = new AsyncLocalStorage();

const SECRET_KEY = /pass|secret|token|otp|cvv|card|key/i;
const MAX_STRING = 300;
const MAX_ITEMS = 20;
const MAX_DEPTH = 4;

/** A copy that is safe and small enough to store: secrets hidden, long text cut. */
export function redact(value, depth = 0) {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return "[…]";
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ITEMS).map((item) => redact(item, depth + 1));
    if (value.length > MAX_ITEMS) items.push(`… +${value.length - MAX_ITEMS}`);
    return items;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? "[hidden]" : redact(item, depth + 1)])
  );
}

const requestDetails = (req) =>
  req
    ? {
        actorId: req.user?.id ?? null,
        actorEmail: req.user?.email ?? null,
        actorRole: req.user?.role ?? null,
        method: req.method,
        route: req.route ? `${req.baseUrl}${req.route.path === "/" ? "" : req.route.path}` : req.originalUrl?.split("?")[0],
        ipAddress: req.ip ?? null,
        userAgent: req.headers?.["user-agent"]?.slice(0, 500) ?? null,
      }
    : {};

/**
 * Record one event. Never throws: an audit failure must not undo or fail the
 * change it describes. Inside a request (or given `req`), missing actor and
 * request fields are filled in from it.
 */
export async function writeAuditLog({ req, actorId, actorEmail, actorRole, entity, entityId, action, before, after, statusCode }) {
  const ctx = auditContext.getStore();
  if (ctx) ctx.recorded = true;
  const fromRequest = requestDetails(req ?? ctx?.req);
  const entry = {
    ...fromRequest,
    actorId: actorId ?? fromRequest.actorId ?? null,
    actorEmail: actorEmail ?? fromRequest.actorEmail ?? null,
    actorRole: actorRole ?? fromRequest.actorRole ?? null,
    action,
    entity,
    entityId: entityId ? String(entityId).slice(0, 100) : null,
    statusCode: statusCode ?? null,
    before: redact(before ?? null),
    after: redact(after ?? null),
  };
  try {
    await db.insert(auditLogs).values(entry);
  } catch (error) {
    console.error("Audit log write failed:", error.message, { action, entity });
  }
}

export const auditService = {
  /** Newest first. Filters: actor, entity, action, text search on email/entity id, date range. */
  async list(query = {}) {
    const pagination = parsePagination(query, { defaultLimit: 30, maxLimit: 100 });
    const filters = [];
    if (query.actorId) filters.push(eq(auditLogs.actorId, query.actorId));
    if (query.entity) filters.push(eq(auditLogs.entity, query.entity));
    if (query.action) filters.push(eq(auditLogs.action, query.action));
    if (query.from) filters.push(gte(auditLogs.createdAt, new Date(query.from)));
    if (query.to) filters.push(lte(auditLogs.createdAt, new Date(query.to)));
    if (query.search) {
      const pattern = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
      filters.push(or(ilike(auditLogs.actorEmail, pattern), ilike(auditLogs.entityId, pattern), ilike(auditLogs.route, pattern)));
    }
    const where = filters.length ? and(...filters) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ log: auditLogs, actor: { id: users.id, name: users.name, email: users.email } })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorId, users.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db.select({ total: count() }).from(auditLogs).where(where),
    ]);

    return {
      logs: rows.map(({ log, actor }) => ({ ...log, actor: actor?.id ? actor : null })),
      pagination: paginationMeta(Number(total), pagination),
    };
  },

  /** Delete entries older than `days`; returns how many were removed. */
  async prune(days) {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const removed = await db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff)).returning({ id: auditLogs.id });
    return removed.length;
  },
};

/** Daily clean-up of entries older than AUDIT_RETENTION_DAYS (default 365). */
export function startAuditPruner(days = Number(process.env.AUDIT_RETENTION_DAYS) || 365) {
  const run = () =>
    auditService
      .prune(days)
      .then((removed) => removed && console.info(`[audit] removed ${removed} entries older than ${days} days`))
      .catch((error) => console.error("[audit] prune failed:", error.message));
  run();
  const timer = setInterval(run, 86_400_000);
  timer.unref();
  return () => clearInterval(timer);
}
