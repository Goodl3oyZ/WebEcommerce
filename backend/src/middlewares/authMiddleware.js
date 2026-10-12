import { TOKEN_TYPES, verifyTypedToken } from "../utils/jwt.js";
import { users } from "../models/schema.js";
import { db } from "../config/db.js";
import { eq } from "drizzle-orm";
import { getHighestRole } from "../utils/roles.js";
import { authService } from "../services/authService.js";

const unauthorized = (res, message, code) =>
  res.status(401).json({ status: "error", message, ...(code && { code }) });

/**
 * Authenticates the request from (in order) a Bearer token, the accessToken
 * cookie, or the express-session. Every path is tied to a server-side session
 * (`sid`) that logout, logout-all, password changes and deactivation revoke.
 */
export const authMiddleware = async (req, res, next) => {
  try {
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
        // 401 + code lets the client refresh; the session itself is kept.
        return error.code === "TOKEN_EXPIRED"
          ? unauthorized(res, "Access token expired", "TOKEN_EXPIRED")
          : unauthorized(res, "Invalid token", "INVALID_TOKEN");
      }
      userId = decoded.id;
      sessionId = decoded.sid;
    } else if (req.session?.user?.id) {
      userId = req.session.user.id;
      sessionId = req.session.user.sid;
    } else {
      return unauthorized(res, "No authentication found", "NO_AUTH");
    }

    if (!(await authService.isSessionActive(sessionId))) {
      return unauthorized(res, "Session has ended. Please log in again.", "SESSION_REVOKED");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: { roles: true },
    });
    if (!user) {
      return unauthorized(res, "User not found", "USER_NOT_FOUND");
    }
    if (!user.isActive) {
      return unauthorized(res, "Account is deactivated", "ACCOUNT_DEACTIVATED");
    }

    const { password: _password, ...safeUser } = user;
    req.user = { ...safeUser, role: getHighestRole(user.roles) };
    req.sessionId = sessionId;
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
