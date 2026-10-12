import { TOKEN_TYPES, verifyTypedToken } from "../utils/jwt.js";
import { users } from "../models/schema.js";
import { db } from "../config/db.js";
import { eq } from "drizzle-orm";
import { getHighestRole } from "../utils/roles.js";
import { authService } from "../services/authService.js";

const unauthorized = (res, message, code) =>
  res.status(401).json({ status: "error", message, ...(code && { code }) });

/**
 * Resolve the caller from (in order) a Bearer token, the accessToken cookie,
 * or the express-session. Every path is tied to a server-side session (`sid`)
 * that logout, logout-all, password changes and deactivation revoke.
 * Returns { user, sessionId } or { error: { message, code } }.
 */
export async function resolveCaller(req) {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies?.accessToken;

  let userId;
  let sessionId;
  if (accessToken) {
    let decoded;
    try {
      decoded = verifyTypedToken(TOKEN_TYPES.ACCESS, accessToken);
    } catch (error) {
      // TOKEN_EXPIRED lets the client refresh; the session itself is kept.
      return error.code === "TOKEN_EXPIRED"
        ? { error: { message: "Access token expired", code: "TOKEN_EXPIRED" } }
        : { error: { message: "Invalid token", code: "INVALID_TOKEN" } };
    }
    userId = decoded.id;
    sessionId = decoded.sid;
  } else if (req.session?.user?.id) {
    userId = req.session.user.id;
    sessionId = req.session.user.sid;
  } else {
    return { error: { message: "No authentication found", code: "NO_AUTH" } };
  }

  if (!(await authService.isSessionActive(sessionId))) {
    return { error: { message: "Session has ended. Please log in again.", code: "SESSION_REVOKED" } };
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { roles: true },
  });
  if (!user) return { error: { message: "User not found", code: "USER_NOT_FOUND" } };
  if (!user.isActive) return { error: { message: "Account is deactivated", code: "ACCOUNT_DEACTIVATED" } };

  const { password: _password, ...safeUser } = user;
  return { user: { ...safeUser, role: getHighestRole(user.roles) }, sessionId };
}

/** Requires a logged-in, active user with a live session. */
export const authMiddleware = async (req, res, next) => {
  try {
    const { user, sessionId, error } = await resolveCaller(req);
    if (error) return unauthorized(res, error.message, error.code);
    req.user = user;
    req.sessionId = sessionId;
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * For public routes that behave differently for logged-in users (e.g. admins
 * may see inactive products). Never rejects: bad or missing credentials just
 * mean an anonymous request.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const { user, sessionId } = await resolveCaller(req);
    if (user) {
      req.user = user;
      req.sessionId = sessionId;
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

// Middleware สำหรับตรวจสอบว่าเป็นเจ้าของข้อมูลหรือไม่
export const isOwner = async (req, res, next) => {
  try {
    const userId = String(req.params.id);
    if (String(req.user.id) !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You can only modify your own data.",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
