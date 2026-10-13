/**
 * Delivers notifications after they are committed: pushes them to the user's
 * open tabs over Socket.IO and, for important order updates, sends an email.
 *
 * Events arrive through Postgres LISTEN/NOTIFY (see orderNotifications.js), so
 * nothing is delivered for a transaction that rolled back. With several
 * backend instances every one pushes to its own sockets, and a Redis key makes
 * sure only one of them sends the email.
 */
import pg from "pg";
import { eq } from "drizzle-orm";
import { db, connectionOptions } from "../config/db.js";
import { redis } from "../config/redis.js";
import { ENV } from "../config/loadENV.js";
import { notifications, userPreferences, users } from "../models/schema.js";
import { emitTo } from "../realtime/index.js";
import { sendEmail } from "../utils/email.js";
import { settingsService } from "./settingsService.js";
import { NOTIFICATION_CHANNEL } from "./orderNotifications.js";

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Has the user turned order emails off? (Profile > notifications) */
async function wantsOrderEmails(userId) {
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
    columns: { notifications: true },
  });
  return prefs?.notifications?.orderEmails !== false;
}

export function renderNotificationEmail({ siteName, title, message, url }) {
  const name = escapeHtml(siteName);
  return {
    subject: `${title} · ${siteName}`,
    text: `${title}\n\n${message}\n\nดูรายละเอียด: ${url}\n\n${siteName}`,
    html: `<!doctype html>
<html lang="th"><body style="margin:0;background:#f4f4f2;font-family:Helvetica,Arial,sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
        <tr><td style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#555">${name}</td></tr>
        <tr><td style="padding-top:20px;font-size:22px;font-weight:700">${escapeHtml(title)}</td></tr>
        <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#333">${escapeHtml(message)}</td></tr>
        <tr><td style="padding-top:28px">
          <a href="${escapeHtml(url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px">ดูคำสั่งซื้อ</a>
        </td></tr>
        <tr><td style="padding-top:28px;font-size:12px;color:#888">ปิดอีเมลแจ้งเตือนคำสั่งซื้อได้ที่หน้าการแจ้งเตือนในบัญชีของคุณ</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

async function emailOnce(notificationId, userId) {
  // First instance to claim the key sends it; kept a day to cover redelivery.
  const claimed = await redis.set(`notification-email:${notificationId}`, "1", { NX: true, EX: 86_400 });
  if (claimed !== "OK") return;
  if (!(await wantsOrderEmails(userId))) return;

  const [notification, user, settings] = await Promise.all([
    db.query.notifications.findFirst({ where: eq(notifications.id, notificationId) }),
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { email: true, isActive: true } }),
    settingsService.getPublicSettings(),
  ]);
  if (!notification || !user?.email || user.isActive === false) return;

  const link = notification.metadata?.link ?? "/orders";
  const email = renderNotificationEmail({
    siteName: settings.siteName,
    title: notification.title,
    message: notification.message,
    url: `${ENV.SERVER.FRONTEND_URL}${link}`,
  });
  await sendEmail({ to: user.email, ...email });
}

export async function deliverNotification(event) {
  // Sent by admins: to everyone signed in, or to a list of users.
  if (event?.all) return emitTo([], "notification:new", {});
  if (Array.isArray(event?.userIds)) {
    if (event.userIds.length) emitTo(event.userIds.map((id) => `user:${id}`), "notification:new", {});
    return;
  }
  if (!event?.id || !event?.userId) return;
  emitTo([`user:${event.userId}`], "notification:new", { id: event.id });
  if (event.email) {
    await emailOnce(event.id, event.userId).catch((error) =>
      console.error("Notification email failed:", error.message)
    );
  }
}

/** Listen for committed notifications. Returns a stop function. */
export function startNotificationListener() {
  let client = null;
  let stopped = false;
  let retry = null;

  const connect = async () => {
    client = new pg.Client(connectionOptions);
    client.on("notification", (msg) => {
      if (msg.channel !== NOTIFICATION_CHANNEL) return;
      let event;
      try {
        event = JSON.parse(msg.payload);
      } catch {
        return;
      }
      deliverNotification(event);
    });
    client.on("error", (error) => {
      console.error("Notification listener error:", error.message);
      reconnect();
    });
    try {
      await client.connect();
      await client.query(`LISTEN ${NOTIFICATION_CHANNEL}`);
    } catch (error) {
      console.error("Notification listener could not connect:", error.message);
      reconnect();
    }
  };

  const reconnect = () => {
    const old = client;
    client = null;
    old?.end().catch(() => {});
    if (stopped || retry) return;
    retry = setTimeout(() => {
      retry = null;
      connect();
    }, 5_000);
  };

  connect();
  return () => {
    stopped = true;
    clearTimeout(retry);
    client?.end().catch(() => {});
  };
}
