import { redis } from "../config/redis.js";

const KEY = "audit:events";
const MAX = 2000;

export async function writeAuditLog({
  actorId,
  entity,
  entityId,
  action,
  before,
  after,
}) {
  const entry = {
    actorId: actorId || null,
    entity,
    entityId: entityId || null,
    action,
    before: before ?? null,
    after: after ?? null,
    at: new Date().toISOString(),
  };

  try {
    if (redis?.isOpen) {
      await redis.lPush(KEY, JSON.stringify(entry));
      await redis.lTrim(KEY, 0, MAX - 1);
    } else {
      console.info("[audit]", entry);
    }
  } catch (error) {
    console.error("Audit log write failed:", error.message);
  }
}
