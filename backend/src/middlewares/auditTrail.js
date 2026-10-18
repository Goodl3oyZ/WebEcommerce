import { auditContext, writeAuditLog } from "../services/auditService.js";

const STAFF = new Set(["moderator", "admin", "super_admin"]);
const VERBS = { POST: "create", PUT: "update", PATCH: "update", DELETE: "delete" };

// A staff member's own shopping and routine inbox actions, not changes to the
// shop. Sign-in events are recorded by the auth controller instead.
const SKIP = [
  /^\/api\/auth\//,
  /^\/oauth\//,
  /^\/api\/(cart|wishlist|addresses)(\/|$)/,
  /^\/api\/users\/(profile|preferences)/,
  /^\/api\/loyalty\/rewards\/redeem/,
  /^\/api\/support\/conversations/,
  /^\/api\/support\/admin\/availability$/,
  /^\/api\/notifications\/(read-all|[^/]+\/read)$/,
];

const MOUNT_ENTITY = /^\/(?:api\/)?([^/]+)/;

/** The id the change applies to: from the URL, or the id of what was created. */
function targetId(req, responseBody) {
  const params = req.params || {};
  const fromUrl = params.id ?? Object.values(params)[0];
  if (fromUrl) return fromUrl;
  const body = responseBody?.data ?? responseBody;
  return body?.id ?? Object.values(body || {}).find((value) => value && typeof value === "object" && value.id)?.id;
}

/**
 * Record every successful POST/PUT/PATCH/DELETE made by staff, after the
 * response is sent: who, which route, the target id and the request body
 * (secrets hidden). Handlers that write a more specific entry themselves
 * (writeAuditLog inside the request) replace this generic one.
 */
export function auditTrail(req, res, next) {
  const verb = VERBS[req.method];
  if (!verb) return next();

  const ctx = { req, recorded: false };
  let responseBody;
  const json = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return json(body);
  };

  res.on("finish", () => {
    if (ctx.recorded || res.statusCode >= 400 || !STAFF.has(req.user?.role)) return;
    const route = req.route ? `${req.baseUrl}${req.route.path === "/" ? "" : req.route.path}` : req.originalUrl.split("?")[0];
    if (SKIP.some((pattern) => pattern.test(route))) return;

    auditContext.run(ctx, () =>
      writeAuditLog({
        action: verb,
        entity: (req.baseUrl || route).match(MOUNT_ENTITY)?.[1] ?? "unknown",
        entityId: targetId(req, responseBody),
        statusCode: res.statusCode,
        after: req.body && Object.keys(req.body).length ? req.body : null,
      })
    );
  });

  auditContext.run(ctx, next);
}
