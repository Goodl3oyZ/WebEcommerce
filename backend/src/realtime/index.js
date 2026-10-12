/**
 * Socket.IO wiring. Every socket is authenticated with the same session-backed
 * token as the REST API; messages are sent over REST (validation and rate
 * limits live there) and pushed to clients from here.
 *
 * Rooms: "user:<id>" (each user's devices), "staff" (every support agent),
 * "conv:<id>" (people viewing one conversation).
 */
import { parse as parseCookies } from "cookie";
import { resolveCaller } from "../middlewares/authMiddleware.js";

export const STAFF_ROLES = ["admin", "super_admin", "moderator"];
export const isStaffRole = (role) => STAFF_ROLES.includes(role);

let io = null;

/** Who may join a conversation's room (set by the support service). */
let canView = async () => false;
export const setConversationAccessCheck = (fn) => {
  canView = fn;
};

export function setupRealtime(server) {
  io = server;

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || "");
      const token = socket.handshake.auth?.token;
      const { user, error } = await resolveCaller({
        headers: token ? { authorization: `Bearer ${token}` } : {},
        cookies,
      });
      if (error) return next(new Error(error.code || "UNAUTHORIZED"));
      socket.data.user = { id: user.id, name: user.name, role: user.role };
      return next();
    } catch {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const { user } = socket.data;
    socket.join(`user:${user.id}`);
    if (isStaffRole(user.role)) socket.join("staff");

    socket.on("support:join", async (conversationId, ack) => {
      const allowed = typeof conversationId === "string" && (await canView(user, conversationId).catch(() => false));
      if (allowed) socket.join(`conv:${conversationId}`);
      if (typeof ack === "function") ack({ ok: allowed });
    });
    socket.on("support:leave", (conversationId) => {
      if (typeof conversationId === "string") socket.leave(`conv:${conversationId}`);
    });
    socket.on("support:typing", (conversationId) => {
      if (typeof conversationId !== "string" || !socket.rooms.has(`conv:${conversationId}`)) return;
      socket.to(`conv:${conversationId}`).emit("support:typing", {
        conversationId,
        name: isStaffRole(user.role) ? user.name : null,
        fromStaff: isStaffRole(user.role),
      });
    });
  });
}

/** Push an event to some rooms; a no-op before setupRealtime (scripts). */
export function emitTo(rooms, event, payload) {
  if (!io) return;
  let target = io;
  for (const room of rooms) target = target.to(room);
  target.emit(event, payload);
}
