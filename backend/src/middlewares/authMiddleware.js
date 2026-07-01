import { verifyToken } from "../utils/jwt.js";
import { ENV } from "../config/loadENV.js";
import { users, userRoles } from "../models/schema.js";
import { db } from "../config/db.js";
import { eq } from "drizzle-orm";
import { getHighestRole } from "../utils/roles.js";

export const authMiddleware = async (req, res, next) => {
  try {
    let accessToken = null;
    let refreshToken = null;

    // 1. Check Bearer token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.split(" ")[1];
    }

    // 2. If no Bearer token, check cookies
    if (!accessToken) {
      accessToken = req.cookies.accessToken;
      refreshToken = req.cookies.refreshToken;
    }

    // 3. If no tokens found, check session
    if (!accessToken && !req.session.user) {
      return res.status(401).json({
        status: "error",
        message: "No authentication found",
      });
    }

    try {
      // If we have a session but no token, use session data
      if (!accessToken && req.session.user) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, req.session.user.id),
          with: {
            roles: true,
          },
        });

        if (!user) {
          // Clear invalid session
          req.session.destroy();
          return res.status(401).json({
            status: "error",
            message: "User not found",
          });
        }

        // Update session with fresh data
        req.session.user = {
          id: user.id,
          email: user.email,
          name: user.name,
        };
        req.session.touch(); // Extend session lifetime

        req.user = {
          ...user,
          role: getHighestRole(user.roles),
        };
        return next();
      }

      // Verify access token
      const decoded = verifyToken(accessToken, ENV.JWT.SECRET);

      // Get user from database
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
        with: {
          roles: true,
        },
      });

      if (!user) {
        // Clear invalid session
        req.session.destroy();
        return res.status(401).json({
          status: "error",
          message: "User not found",
        });
      }

      // Set user data in request
      req.user = {
        ...user,
        role: getHighestRole(user.roles),
      };

      // Update session if using cookies
      if (refreshToken) {
        req.session.user = {
          id: user.id,
          email: user.email,
          name: user.name,
        };
        req.session.touch(); // Extend session lifetime
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      next();
    } catch (error) {
      console.error("Token verification error:", error);

      if (error.name === "TokenExpiredError") {
        // Clear expired session
        req.session.destroy();
        return res.status(401).json({
          status: "error",
          message: "Access token expired",
        });
      }

      // Clear invalid session
      req.session.destroy();
      return res.status(401).json({
        status: "error",
        message: "Invalid token",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
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
